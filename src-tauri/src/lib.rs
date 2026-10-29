use serde::{Deserialize, Serialize};
use std::collections::hash_map::DefaultHasher;
use std::fs::{self, File, OpenOptions};
use std::hash::{Hash, Hasher};
use std::io::{BufRead, BufReader, BufWriter, Write};
use std::path::{Path, PathBuf};
use std::process::Command;
use tauri::{AppHandle, Manager};
use walkdir::WalkDir;
#[cfg(unix)]
use std::os::unix::fs::MetadataExt;

const MAX_RESULTS: usize = 200;
const MAX_HISTORY: usize = 12;

#[derive(Debug, Clone, Serialize, Deserialize)]
struct FileEntry {
    name: String,
    path: String,
    extension: String,
    size: u64,
    #[serde(default)]
    is_dir: bool,
    #[serde(default)]
    modified: Option<String>,
}

#[derive(Debug, Serialize)]
struct IndexSummary {
    folder: String,
    count: usize,
    reused: bool,
}

#[derive(Debug, Serialize)]
struct SearchResponse {
    files: Vec<FileEntry>,
    total: usize,
    limited: bool,
}

#[derive(Debug, Serialize)]
struct FileDetails {
    name: String,
    path: String,
    size: u64,
    modified: Option<String>,
    mime: String,
    preview: Option<String>,
    is_dir: bool,
    permissions: Option<String>,
    owner: Option<String>,
    group: Option<String>,
    media: Option<MediaMetadata>,
    pdf: Option<PdfMetadata>,
}

#[derive(Debug, Serialize)]
struct MediaMetadata {
    width: Option<u32>,
    height: Option<u32>,
    duration_seconds: Option<f64>,
}

#[derive(Debug, Serialize)]
struct PdfMetadata {
    page_count: Option<u32>,
}

fn mime_for(path: &Path, is_dir: bool) -> String {
    if is_dir {
        return "inode/directory".to_string();
    }
    match path.extension().and_then(|value| value.to_str()).unwrap_or_default().to_lowercase().as_str() {
        "png" => "image/png", "jpg" | "jpeg" => "image/jpeg", "gif" => "image/gif", "webp" => "image/webp",
        "svg" => "image/svg+xml", "pdf" => "application/pdf", "json" => "application/json",
        "mp4" => "video/mp4", "webm" => "video/webm", "mov" => "video/quicktime",
        "mp3" => "audio/mpeg", "wav" => "audio/wav", "ogg" => "audio/ogg",
        "rs" => "text/x-rust", "ts" | "tsx" => "text/typescript", "js" | "jsx" => "text/javascript",
        "html" | "htm" => "text/html", "css" => "text/css", "md" | "txt" | "log" => "text/plain",
        _ => "application/octet-stream",
    }.to_string()
}

fn modified_string(metadata: &fs::Metadata) -> Option<String> {
    metadata.modified().ok().and_then(|time| time.duration_since(std::time::UNIX_EPOCH).ok().map(|duration| duration.as_secs().to_string()))
}

fn storage_dir(app: &AppHandle) -> Result<PathBuf, String> {
    let directory = app.path().app_data_dir().map_err(|error| format!("Impossible de trouver le dossier de données : {error}"))?;
    fs::create_dir_all(directory.join("indexes")).map_err(|error| format!("Impossible de créer le cache : {error}"))?;
    Ok(directory)
}

fn index_path(app: &AppHandle, folder: &str) -> Result<PathBuf, String> {
    let mut hasher = DefaultHasher::new();
    folder.hash(&mut hasher);
    Ok(storage_dir(app)?.join("indexes").join(format!("{:x}.jsonl", hasher.finish())))
}

fn history_path(app: &AppHandle) -> Result<PathBuf, String> {
    Ok(storage_dir(app)?.join("recent-folders.json"))
}

fn favorites_path(app: &AppHandle) -> Result<PathBuf, String> {
    Ok(storage_dir(app)?.join("favorite-folders.json"))
}

fn read_favorites(app: &AppHandle) -> Result<Vec<String>, String> {
    let path = favorites_path(app)?;
    if !path.exists() {
        return Ok(Vec::new());
    }
    let content = fs::read_to_string(path).map_err(|error| format!("Impossible de lire les favoris : {error}"))?;
    serde_json::from_str(&content).map_err(|error| format!("Favoris invalides : {error}"))
}

fn write_favorites(app: &AppHandle, favorites: &[String]) -> Result<(), String> {
    let path = favorites_path(app)?;
    let content = serde_json::to_string_pretty(favorites).map_err(|error| format!("Impossible d’enregistrer les favoris : {error}"))?;
    fs::write(path, content).map_err(|error| format!("Impossible d’enregistrer les favoris : {error}"))
}

fn read_history(app: &AppHandle) -> Result<Vec<String>, String> {
    let path = history_path(app)?;
    if !path.exists() {
        return Ok(Vec::new());
    }
    let content = fs::read_to_string(path).map_err(|error| format!("Impossible de lire l’historique : {error}"))?;
    serde_json::from_str(&content).map_err(|error| format!("Historique invalide : {error}"))
}

fn remember_folder(app: &AppHandle, folder: &str) -> Result<(), String> {
    let mut history = read_history(app)?;
    history.retain(|item| item != folder);
    history.insert(0, folder.to_string());
    history.truncate(MAX_HISTORY);
    let path = history_path(app)?;
    let content = serde_json::to_string_pretty(&history).map_err(|error| format!("Impossible d’enregistrer l’historique : {error}"))?;
    fs::write(path, content).map_err(|error| format!("Impossible d’enregistrer l’historique : {error}"))
}

fn count_index(path: &Path) -> Result<usize, String> {
    let file = File::open(path).map_err(|error| format!("Impossible de lire l’index : {error}"))?;
    Ok(BufReader::new(file).lines().filter(|line| line.is_ok()).count())
}

fn index_has_directories(path: &Path) -> Result<bool, String> {
    let file = File::open(path).map_err(|error| format!("Impossible de lire l’index : {error}"))?;
    for line in BufReader::new(file).lines() {
        let line = line.map_err(|error| format!("Impossible de lire l’index : {error}"))?;
        let entry: FileEntry = serde_json::from_str(&line).map_err(|error| format!("Index invalide : {error}"))?;
        if entry.is_dir {
            return Ok(true);
        }
    }
    Ok(false)
}

#[tauri::command]
fn list_recent_folders(app: AppHandle) -> Result<Vec<String>, String> {
    read_history(&app)
}

#[tauri::command]
fn list_favorite_folders(app: AppHandle) -> Result<Vec<String>, String> {
    read_favorites(&app)
}

#[tauri::command]
fn set_folder_favorite(app: AppHandle, folder: String, favorite: bool) -> Result<Vec<String>, String> {
    let mut favorites = read_favorites(&app)?;
    favorites.retain(|item| item != &folder);
    if favorite {
        favorites.insert(0, folder);
    }
    write_favorites(&app, &favorites)?;
    Ok(favorites)
}

#[tauri::command]
fn toggle_folder_favorite(app: AppHandle, folder: String) -> Result<bool, String> {
    let mut favorites = read_favorites(&app)?;
    let is_favorite = if let Some(index) = favorites.iter().position(|item| item == &folder) {
        favorites.remove(index);
        false
    } else {
        favorites.insert(0, folder);
        true
    };
    write_favorites(&app, &favorites)?;
    Ok(is_favorite)
}

#[tauri::command]
fn index_folder(app: AppHandle, folder: String, force: bool) -> Result<IndexSummary, String> {
    let root = Path::new(&folder);
    if !root.is_dir() {
        return Err("Le chemin sélectionné n’est pas un dossier.".to_string());
    }

    let target = index_path(&app, &folder)?;
    if target.exists() && !force && index_has_directories(&target)? {
        let count = count_index(&target)?;
        remember_folder(&app, &folder)?;
        return Ok(IndexSummary { folder, count, reused: true });
    }

    let temporary = target.with_extension("tmp");
    let file = OpenOptions::new().create(true).write(true).truncate(true).open(&temporary)
        .map_err(|error| format!("Impossible de créer l’index : {error}"))?;
    let mut writer = BufWriter::new(file);
    let mut count = 0;

    for item in WalkDir::new(root).follow_links(false) {
        let entry = item.map_err(|error| format!("Erreur de lecture : {error}"))?;
        if entry.path() == root {
            continue;
        }
        let is_dir = entry.file_type().is_dir();
        let metadata = fs::metadata(entry.path()).map_err(|error| format!("Erreur de métadonnées : {error}"))?;
        let extension = entry.path().extension().and_then(|value| value.to_str()).map_or_else(String::new, |value| format!(".{value}"));
        let record = FileEntry {
            name: entry.file_name().to_string_lossy().into_owned(),
            path: entry.path().to_string_lossy().into_owned(),
            extension,
            size: if is_dir { 0 } else { metadata.len() },
            is_dir,
            modified: modified_string(&metadata),
        };
        serde_json::to_writer(&mut writer, &record).map_err(|error| format!("Impossible d’écrire l’index : {error}"))?;
        writer.write_all(b"\n").map_err(|error| format!("Impossible d’écrire l’index : {error}"))?;
        count += 1;
    }

    writer.flush().map_err(|error| format!("Impossible de finaliser l’index : {error}"))?;
    fs::rename(&temporary, &target).map_err(|error| format!("Impossible de sauvegarder l’index : {error}"))?;
    remember_folder(&app, &folder)?;
    Ok(IndexSummary { folder, count, reused: false })
}

#[tauri::command]
fn inspect_file(path: String) -> Result<FileDetails, String> {
    let target = Path::new(&path);
    let metadata = fs::metadata(target).map_err(|error| format!("Impossible de lire les métadonnées : {error}"))?;
    let is_dir = metadata.is_dir();
    let mime = mime_for(target, is_dir);
    let preview = if !is_dir && (mime.starts_with("text/") || mime == "application/json") {
        fs::read_to_string(target).ok().map(|content| content.chars().take(16_384).collect())
    } else {
        None
    };
    let (permissions, owner, group) = unix_file_metadata(&metadata);
    let media = if !is_dir && (mime.starts_with("image/") || mime.starts_with("video/") || mime.starts_with("audio/")) {
        media_metadata(target, &mime)
    } else {
        None
    };
    let pdf = if !is_dir && mime == "application/pdf" {
        pdf_metadata(target)
    } else {
        None
    };
    Ok(FileDetails {
        name: target.file_name().map(|value| value.to_string_lossy().into_owned()).unwrap_or_else(|| path.clone()),
        path,
        size: metadata.len(),
        modified: modified_string(&metadata),
        mime,
        preview,
        is_dir,
        permissions,
        owner,
        group,
        media,
        pdf,
    })
}

#[cfg(unix)]
fn unix_file_metadata(metadata: &fs::Metadata) -> (Option<String>, Option<String>, Option<String>) {
    let mode = metadata.mode();
    let permissions = Some(format!("{:04o}", mode & 0o7777));
    let owner = lookup_account("/etc/passwd", metadata.uid());
    let group = lookup_account("/etc/group", metadata.gid());
    (permissions, owner, group)
}

#[cfg(not(unix))]
fn unix_file_metadata(_: &fs::Metadata) -> (Option<String>, Option<String>, Option<String>) {
    (None, None, None)
}

#[cfg(unix)]
fn lookup_account(file: &str, id: u32) -> Option<String> {
    fs::read_to_string(file).ok()?.lines().find_map(|line| {
        let mut fields = line.split(':');
        let name = fields.next()?;
        let _password = fields.next()?;
        let value = if file.ends_with("passwd") { fields.next()?.parse::<u32>().ok()? } else {
            fields.next()?.parse::<u32>().ok()?
        };
        (value == id).then(|| name.to_string())
    })
}

fn read_prefix(path: &Path, max: usize) -> Option<Vec<u8>> {
    use std::io::Read;
    let mut file = File::open(path).ok()?;
    let mut data = vec![0; max];
    let length = file.read(&mut data).ok()?;
    data.truncate(length);
    Some(data)
}

fn image_metadata(path: &Path) -> Option<MediaMetadata> {
    let data = read_prefix(path, 1_048_576)?;
    let (width, height) = if data.starts_with(b"\x89PNG\r\n\x1a\n") && data.len() >= 24 {
        (Some(u32::from_be_bytes(data[16..20].try_into().ok()?)), Some(u32::from_be_bytes(data[20..24].try_into().ok()?)))
    } else if data.starts_with(b"GIF") && data.len() >= 10 {
        (Some(u16::from_le_bytes(data[6..8].try_into().ok()?) as u32), Some(u16::from_le_bytes(data[8..10].try_into().ok()?) as u32))
    } else if data.starts_with(b"RIFF") && data.len() >= 30 && &data[8..12] == b"WEBP" {
        (Some(u16::from_le_bytes(data[26..28].try_into().ok()?) as u32 + 1), Some(u16::from_le_bytes(data[28..30].try_into().ok()?) as u32 + 1))
    } else if data.starts_with(&[0xff, 0xd8]) {
        let mut offset = 2;
        let mut dimensions = None;
        while offset + 9 < data.len() {
            if data[offset] != 0xff {
                offset += 1;
                continue;
            }

            let marker = data[offset + 1];
            offset += 2;
            if marker == 0xd8 || marker == 0xd9 {
                continue;
            }
            let length = u16::from_be_bytes(data[offset..offset + 2].try_into().ok()?) as usize;
            if length < 2 || offset + length > data.len() {
                break;
            }
            if (0xc0..=0xc3).contains(&marker) || (0xc5..=0xc7).contains(&marker) || (0xc9..=0xcb).contains(&marker) || (0xcd..=0xcf).contains(&marker) {
                dimensions = Some((
                    u16::from_be_bytes(data[offset + 3..offset + 5].try_into().ok()?) as u32,
                    u16::from_be_bytes(data[offset + 5..offset + 7].try_into().ok()?) as u32,
                ));
                break;
            }
            offset += length;
        }
        dimensions.map(|(width, height)| (Some(width), Some(height))).unwrap_or((None, None))
    } else {
        (None, None)
    };
    Some(MediaMetadata { width, height, duration_seconds: None })
}

fn media_metadata(path: &Path, mime: &str) -> Option<MediaMetadata> {
    if mime.starts_with("image/") {
        return image_metadata(path);
    }
    let dimensions = Command::new("ffprobe")
        .args(["-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height", "-of", "csv=p=0"])
        .arg(path)
        .output().ok()?;
    let stdout = String::from_utf8_lossy(&dimensions.stdout).into_owned();
    let values = stdout.trim().split(',').collect::<Vec<_>>();
    let width = values.first().and_then(|value| value.trim().parse().ok());
    let height = values.get(1).and_then(|value| value.trim().parse().ok());
    let duration_output = Command::new("ffprobe")
        .args(["-v", "error", "-show_entries", "format=duration", "-of", "default=noprint_wrappers=1:nokey=1"])
        .arg(path)
        .output().ok()?;
    let duration_seconds = String::from_utf8_lossy(&duration_output.stdout).trim().parse().ok();
    Some(MediaMetadata { width, height, duration_seconds })
}

fn pdf_metadata(path: &Path) -> Option<PdfMetadata> {
    let output = Command::new("pdfinfo").arg(path).output().ok()?;
    let text = String::from_utf8_lossy(&output.stdout);
    let page_count = text.lines().find_map(|line| line.strip_prefix("Pages:")?.trim().parse().ok());
    Some(PdfMetadata { page_count })
}

#[tauri::command]
fn open_path_native(path: String, reveal: bool) -> Result<(), String> {
    let target = Path::new(&path);
    let target = if reveal && !target.is_dir() {
        target.parent().unwrap_or(target)
    } else {
        target
    };
    if !target.exists() {
        return Err("Le chemin n’existe plus.".to_string());
    }

    Command::new("xdg-open")
        .arg(target)
        .spawn()
        .map(|_| ())
        .map_err(|error| format!("Impossible d’ouvrir le chemin : {error}"))
}

fn normalize_search(value: &str, ignore_special: bool) -> String {
    let value = value.to_lowercase();
    if ignore_special {
        value.chars().filter(|character| character.is_alphanumeric() || character.is_whitespace()).collect()
    } else {
        value
    }
}

#[tauri::command]
fn search_files(app: AppHandle, folder: String, query: String, show_hidden: bool, display_mode: String, ignore_special: bool) -> Result<SearchResponse, String> {
    let target = index_path(&app, &folder)?;
    let file = File::open(target).map_err(|error| format!("Index introuvable, veuillez réindexer le dossier : {error}"))?;
    let normalized_query = normalize_search(query.trim(), ignore_special);
    let mut files = Vec::new();
    let mut total = 0;

    for line in BufReader::new(file).lines() {
        let line = line.map_err(|error| format!("Impossible de lire l’index : {error}"))?;
        let entry: FileEntry = serde_json::from_str(&line).map_err(|error| format!("Index invalide : {error}"))?;
        let hidden = Path::new(&entry.name).file_name().and_then(|name| name.to_str()).is_some_and(|name| name.starts_with('.'));
        let matches_type = match display_mode.as_str() {
            "directories" => entry.is_dir,
            "files" => !entry.is_dir,
            _ => true,
        };
        let matches = (show_hidden || !hidden) && matches_type;
        let matches = matches && (normalized_query.is_empty() || normalize_search(&entry.name, ignore_special).contains(&normalized_query) || normalize_search(&entry.extension, ignore_special).contains(&normalized_query));
        if !matches {
            continue;
        }
        total += 1;
        if files.len() < MAX_RESULTS {
            files.push(entry);
        }
    }

    Ok(SearchResponse { files, total, limited: total > MAX_RESULTS })
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![list_recent_folders, list_favorite_folders, set_folder_favorite, toggle_folder_favorite, index_folder, search_files, inspect_file, open_path_native])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
