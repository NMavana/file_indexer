import { invoke } from "@tauri-apps/api/core";
import { WebviewWindow } from "@tauri-apps/api/webviewWindow";
import { open } from "@tauri-apps/plugin-dialog";
import { convertFileSrc } from "@tauri-apps/api/core";
import "./style.css";

type FileEntry = { name: string; path: string; extension: string; size: number; is_dir: boolean; modified?: string | null };
type IndexSummary = { folder: string; count: number; reused: boolean };
type SearchResponse = { files: FileEntry[]; total: number; limited: boolean };
type FileDetails = { name: string; path: string; size: number; modified: string | null; mime: string; preview: string | null; is_dir: boolean; permissions?: string | null; owner?: string | null };

const app = document.querySelector<HTMLDivElement>("#app")!;
const savedState = JSON.parse(localStorage.getItem("ui-state") || "{}") as { folder?: string; query?: string; displayMode?: string; showHidden?: boolean; selectedPath?: string };
const ALL_INDEXES = "__all_indexes__";
const gridView = localStorage.getItem("grid-view") === "true";
const mediaPreview = (key: string) => localStorage.getItem(key) !== "false";
const uiScale = Math.min(1.4, Math.max(0.8, Number(localStorage.getItem("ui-scale") || "1")));
document.documentElement.style.setProperty("--ui-scale", String(uiScale));
let currentFolder = "";
let selectedEntry: FileEntry | null = null;
let searchTimer: number | undefined;
const systemLanguage = navigator.language.toLowerCase().startsWith("fr") ? "fr" : "en";
let language: "fr" | "en" = (localStorage.getItem("language") as "fr" | "en") || systemLanguage;
let darkTheme = localStorage.getItem("theme") === "dark";
if (darkTheme) document.body.classList.add("dark-theme");
const palette = localStorage.getItem("palette") || "default";
const applyPalette = (value: string) => {
  document.body.classList.remove("palette-default", "palette-ocean", "palette-emerald", "palette-rose");
  document.body.classList.add(`palette-${["default", "ocean", "emerald", "rose"].includes(value) ? value : "default"}`);
};
applyPalette(palette);
window.addEventListener("storage", (event) => {
  if (event.key === "palette" && event.newValue) applyPalette(event.newValue);
});
window.addEventListener("focus", () => applyPalette(localStorage.getItem("palette") || "default"));

const t = {
  fr: { file: "Fichier", edit: "Édition", view: "Vue", index: "Index", help: "Aide", about: "À propos", settings: "Paramètres", choose: "Changer de dossier racine", search: "Rechercher par nom de fichier...", hidden: "Fichiers masqués", display: "Afficher", all: "Fichiers et dossiers", files: "Fichiers", directories: "Dossiers", history: "Dossiers récemment indexés", refresh: "Réindexer", removeIndex: "Supprimer le dossier indexé", status: "Sélectionnez un dossier pour commencer l’indexation.", results: "Résultats", inspector: "Inspecteur d’aperçu", metadata: "Métadonnées", empty: "Aucun fichier à afficher.", location: "Ouvrir l’emplacement", copy: "Copier le chemin absolu", open: "Ouvrir avec l’application par défaut", preview: "Sélectionnez un résultat pour voir son aperçu.", bytes: "octets", top: "Revenir en haut", noPreview: "Aucun aperçu disponible", folder: "Dossier", text: "Texte", image: "Image" },
  en: { file: "File", edit: "Edit", view: "View", index: "Index", help: "Help", about: "About", settings: "Settings", choose: "Change root folder", search: "Search by file name...", hidden: "Hidden files", display: "Display", all: "Files and folders", files: "Files", directories: "Folders", history: "Recently indexed folders", refresh: "Re-index", removeIndex: "Remove indexed folder", status: "Select a folder to start indexing.", results: "Results", inspector: "Preview inspector", metadata: "Metadata", empty: "No files to display.", location: "Open location", copy: "Copy absolute path", open: "Open with default application", preview: "Select a result to see its preview.", bytes: "bytes", top: "Back to top", noPreview: "No preview available", folder: "Folder", text: "Text", image: "Image" },
};

app.innerHTML = `
  <div class="app-shell">
    <header class="top-header">
      <div class="titlebar"><div class="brand"><div class="brand-icon">FI</div><strong>File Indexer <span>v0.8.8</span></strong></div></div>
      <nav class="menu-bar">
        <button class="menu-item active" type="button" data-menu="file-menu">${t[language].file}</button>
        <button class="menu-item" type="button" data-menu="edit-menu">${t[language].edit}</button>
        <button class="menu-item" type="button" data-menu="view-menu">${t[language].view}</button>
        <button class="menu-item" type="button" data-menu="index-menu">${t[language].index}</button>
        <button id="about-menu" class="menu-item" type="button">${t[language].about}</button><span class="menu-spacer"></span><button id="language-menu" class="menu-item utility-button" type="button" title="${language === "fr" ? "Passer en anglais" : "Switch to French"}">🌐 ${language.toUpperCase()}</button><button id="theme-menu" class="menu-item utility-button" type="button" title="${darkTheme ? "Light theme" : "Dark theme"}">${darkTheme ? "☀" : "☾"}</button><button id="settings-menu" class="menu-item" type="button">⚙ ${t[language].settings}</button>
        <div id="file-menu" class="menu-dropdown"><button data-action="choose">${t[language].choose}</button></div><div id="edit-menu" class="menu-dropdown"><button data-action="clear-search">${language === "fr" ? "Effacer la recherche" : "Clear search"}</button></div><div id="view-menu" class="menu-dropdown"><button data-action="toggle-hidden">${t[language].hidden}</button></div><div id="index-menu" class="menu-dropdown"><button data-action="reindex">${t[language].refresh}</button><button data-action="remove-index">${t[language].removeIndex}</button></div>
        <div id="about-panel" class="about-panel"><div class="about-heading"><strong>${t[language].about} · File Indexer</strong><button id="close-about" type="button">×</button></div><div class="about-version">Version 0.8.8 · MIT License</div><p>Private, local-first file indexing for Linux.</p><div class="about-profiles"><div class="profile-card"><div class="profile-avatar"><img src="/avatars/nmavana.svg" alt="NMavana profile"><span>NM</span></div><strong>NMavana</strong><small>Maintainer</small></div><div class="profile-card"><div class="profile-avatar"><img src="/avatars/copilot.svg" alt="Copilot profile"><span>CP</span></div><strong>Copilot</strong><small>AI assistant</small></div></div><small class="about-copyright">© 2026 NMavana &amp; Copilot</small></div>
      </nav>
      <div class="directory-bar"><div class="path-field"><span>Path:</span><input id="folder" readonly value="" /><button id="copy-folder" title="${t[language].copy}">▣</button></div><button id="refresh" class="secondary" type="button" disabled>↻ ${t[language].refresh}</button></div>
      <div class="search-bar"><label class="search"><span>⌕</span><input id="search" type="search" placeholder="${t[language].search}" disabled /><kbd>Ctrl + F</kbd></label><label class="display-filter">${t[language].display}<select id="display-mode"><option value="files">${t[language].files}</option><option value="directories">${t[language].directories}</option><option value="all">${t[language].all}</option></select></label><button id="view-mode" class="view-mode" type="button" title="List / grid">${gridView ? "☷" : "▦"}</button><label class="checkbox"><input id="show-hidden" type="checkbox" /> ${t[language].hidden}</label></div>
    </header>
    <main class="workspace">
      <aside class="sidebar"><section class="volume-card"><strong>◉ &nbsp;Volumes indexés</strong><span id="volume-count">0 éléments</span></section><button id="sidebar-add" class="sidebar-button">＋ ${t[language].choose}</button><button id="favorite-current" class="sidebar-button" disabled>☆ Ajouter aux favoris</button><select id="history" aria-label="${t[language].history}"><option value="">${t[language].history}</option></select><select id="favorites-list" aria-label="Favorites"><option value="">☆ Favoris</option></select></aside>
      <section class="results-pane"><div class="results-heading"><strong>${t[language].results}</strong><span id="count" class="count">0</span></div><div class="table-head"><span></span><span>Nom du fichier</span><span>Chemin absolu</span><span>Type</span><span>Taille</span><span>Modifié le</span></div><div id="list" class="list empty">${t[language].empty}</div></section><div id="inspector-resizer" class="panel-resizer" role="separator" aria-label="Resize inspector"></div>
      <aside class="inspector"><div class="inspector-header"><strong>◉ &nbsp;${t[language].inspector}</strong><kbd>Space</kbd></div><div id="inspector-content" class="inspector-content"><div class="inspector-empty">${t[language].preview}</div></div></aside>
    </main>
    <footer class="status-bar"><span id="status">${t[language].status}</span></footer>
    <button id="back-to-top" class="back-to-top" type="button">${t[language].top} ↑</button>
  </div>
`;

const sidebarAdd = document.querySelector<HTMLButtonElement>("#sidebar-add")!;
const searchInput = document.querySelector<HTMLInputElement>("#search")!;
const showHiddenInput = document.querySelector<HTMLInputElement>("#show-hidden")!;
const displayModeInput = document.querySelector<HTMLSelectElement>("#display-mode")!;
const resultLimit = () => Math.min(2000, Math.max(200, Number(localStorage.getItem("search-limit") || "200")));
const historySelect = document.querySelector<HTMLSelectElement>("#history")!;
const refreshButton = document.querySelector<HTMLButtonElement>("#refresh")!;
const folderInput = document.querySelector<HTMLInputElement>("#folder")!;
const copyFolderButton = document.querySelector<HTMLButtonElement>("#copy-folder")!;
const statusElement = document.querySelector<HTMLSpanElement>("#status")!;
const listElement = document.querySelector<HTMLDivElement>("#list")!;
const countElement = document.querySelector<HTMLSpanElement>("#count")!;
const volumeCount = document.querySelector<HTMLSpanElement>("#volume-count")!;
const inspectorContent = document.querySelector<HTMLDivElement>("#inspector-content")!;
const settingsButton = document.querySelector<HTMLButtonElement>("#settings-menu")!;
const aboutButton = document.querySelector<HTMLButtonElement>("#about-menu")!;
const aboutPanel = document.querySelector<HTMLDivElement>("#about-panel")!;
const backToTopButton = document.querySelector<HTMLButtonElement>("#back-to-top")!;
const viewModeButton = document.querySelector<HTMLButtonElement>("#view-mode")!;
const favoriteCurrentButton = document.querySelector<HTMLButtonElement>("#favorite-current")!;
const favoritesList = document.querySelector<HTMLSelectElement>("#favorites-list")!;
const languageButton = document.querySelector<HTMLButtonElement>("#language-menu")!;
const themeButton = document.querySelector<HTMLButtonElement>("#theme-menu")!;

void restoreState();
sidebarAdd.addEventListener("click", chooseFolder);
historySelect.addEventListener("change", () => { if (historySelect.value === ALL_INDEXES) void selectAllIndexes(); else if (historySelect.value) void indexFolder(historySelect.value, false); });
favoritesList.addEventListener("change", () => { if (favoritesList.value) void indexFolder(favoritesList.value, false); });
refreshButton.addEventListener("click", () => void indexFolder(currentFolder, true));
viewModeButton.addEventListener("click", () => { localStorage.setItem("grid-view", String(!document.body.classList.contains("grid-view"))); document.body.classList.toggle("grid-view"); viewModeButton.textContent = document.body.classList.contains("grid-view") ? "☷" : "▦"; });
favoriteCurrentButton.addEventListener("click", () => void toggleFavorite());
showHiddenInput.addEventListener("change", scheduleSearch);
displayModeInput.addEventListener("change", scheduleSearch);
searchInput.addEventListener("input", scheduleSearch);
copyFolderButton.addEventListener("click", () => void copyPath(currentFolder));
window.addEventListener("scroll", () => backToTopButton.classList.toggle("visible", window.scrollY > 240));
backToTopButton.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));
settingsButton.addEventListener("click", () => {
  const settings = new WebviewWindow("settings", { url: "settings.html", title: t[language].settings, width: 980, height: 760, minWidth: 760, minHeight: 560, resizable: true });
  settings.once("tauri://error", (event) => setStatus(String(event.payload)));
});
aboutButton.addEventListener("click", () => aboutPanel.classList.toggle("open"));
document.querySelector<HTMLButtonElement>("#close-about")?.addEventListener("click", () => aboutPanel.classList.remove("open"));
document.querySelectorAll<HTMLButtonElement>("[data-menu]").forEach((button) => button.addEventListener("click", (event) => { event.stopPropagation(); const menu = document.getElementById(button.dataset.menu!); document.querySelectorAll(".menu-dropdown.open").forEach((item) => { if (item !== menu) item.classList.remove("open"); }); menu?.classList.toggle("open"); }));
document.addEventListener("click", () => document.querySelectorAll(".menu-dropdown.open").forEach((menu) => menu.classList.remove("open")));
languageButton.addEventListener("click", () => {
  localStorage.setItem("ui-state", JSON.stringify({ folder: currentFolder, query: searchInput.value, displayMode: displayModeInput.value, showHidden: showHiddenInput.checked, selectedPath: selectedEntry?.path }));
  localStorage.setItem("language", language === "fr" ? "en" : "fr");
  window.location.reload();
});
themeButton.addEventListener("click", () => {
  darkTheme = !darkTheme;
  localStorage.setItem("theme", darkTheme ? "dark" : "light");
  document.body.classList.toggle("dark-theme", darkTheme);
  themeButton.textContent = darkTheme ? "☀" : "☾";
  themeButton.title = darkTheme ? "Light theme" : "Dark theme";
});
document.querySelector<HTMLButtonElement>('[data-action="choose"]')?.addEventListener("click", chooseFolder);
document.querySelector<HTMLButtonElement>('[data-action="clear-search"]')?.addEventListener("click", () => { searchInput.value = ""; scheduleSearch(); });
document.querySelector<HTMLButtonElement>('[data-action="toggle-hidden"]')?.addEventListener("click", () => { showHiddenInput.checked = !showHiddenInput.checked; scheduleSearch(); });
document.querySelector<HTMLButtonElement>('[data-action="reindex"]')?.addEventListener("click", () => void indexFolder(currentFolder, true));
document.querySelector<HTMLButtonElement>('[data-action="remove-index"]')?.addEventListener("click", () => void removeIndexedFolder());
document.body.classList.toggle("grid-view", gridView);
const inspectorResizer = document.querySelector<HTMLElement>("#inspector-resizer")!;
let resizing = false;
inspectorResizer.addEventListener("pointerdown", (event) => { resizing = true; inspectorResizer.setPointerCapture(event.pointerId); });
inspectorResizer.addEventListener("pointermove", (event) => { if (resizing) document.documentElement.style.setProperty("--inspector-width", `${Math.max(240, Math.min(520, window.innerWidth - event.clientX))}px`); });
inspectorResizer.addEventListener("pointerup", () => { resizing = false; });
document.addEventListener("keydown", (event) => {
  const searchShortcut = localStorage.getItem("shortcut-search") || "/";
  if (event.key === searchShortcut && document.activeElement !== searchInput) { event.preventDefault(); searchInput.focus(); }
  const chooseShortcut = (localStorage.getItem("shortcut-choose") || "Ctrl+O").toLowerCase();
  if (chooseShortcut === `ctrl+${event.key.toLowerCase()}` && event.ctrlKey) { event.preventDefault(); void chooseFolder(); }
});

async function restoreState() {
  await loadHistory();
  if (!savedState.folder) return;
  searchInput.value = savedState.query || "";
  displayModeInput.value = savedState.displayMode || "files";
  showHiddenInput.checked = savedState.showHidden === true;
  await indexFolder(savedState.folder, false);
}
async function chooseFolder() { try { const selected = await open({ directory: true, multiple: false, title: t[language].choose }); if (typeof selected === "string") await indexFolder(selected, false); } catch (error) { setStatus(String(error)); } }
async function loadHistory() { try { const folders = await invoke<string[]>("list_recent_folders"); historySelect.innerHTML = `<option value="">${t[language].history}</option><option value="${ALL_INDEXES}">${language === "fr" ? "Tous les index" : "All indexes"}</option>${folders.map((folder) => `<option value="${escapeHtml(folder)}">${escapeHtml(folder)}</option>`).join("")}`; } catch (error) { setStatus(String(error)); } }
async function loadFavorites() { try { const folders = await invoke<string[]>("list_favorite_folders"); favoritesList.innerHTML = `<option value="">☆ Favoris</option>${folders.map((folder) => `<option value="${escapeHtml(folder)}">${escapeHtml(folder)}</option>`).join("")}`; } catch (error) { setStatus(String(error)); } }
async function toggleFavorite() { if (!currentFolder) return; try { const favorite = await invoke<boolean>("toggle_folder_favorite", { folder: currentFolder }); favoriteCurrentButton.textContent = favorite ? "★ Retirer des favoris" : "☆ Ajouter aux favoris"; await loadFavorites(); } catch (error) { setStatus(String(error)); } }
async function selectAllIndexes() { currentFolder = ALL_INDEXES; folderInput.value = language === "fr" ? "Tous les index" : "All indexes"; volumeCount.textContent = language === "fr" ? "Recherche globale" : "Global search"; favoriteCurrentButton.disabled = true; historySelect.value = ALL_INDEXES; setStatus(language === "fr" ? "Recherche dans tous les index locaux…" : "Searching all local indexes…"); await search(); }
async function indexFolder(folder: string, force: boolean) { setBusy(true); setStatus(force ? "Mise à jour de l’index…" : "Indexation en cours…"); try { const summary = await invoke<IndexSummary>("index_folder", { folder, force }); currentFolder = summary.folder; folderInput.value = currentFolder; volumeCount.textContent = `${summary.count} éléments`; favoriteCurrentButton.disabled = false; historySelect.value = currentFolder; await loadHistory(); await loadFavorites(); historySelect.value = currentFolder; setStatus(`${summary.count} éléments ${summary.reused ? "chargés depuis l’index local" : "indexés"}.`); await search(); } catch (error) { setStatus(String(error)); } finally { setBusy(false); } }
async function removeIndexedFolder() {
  if (!currentFolder || currentFolder === ALL_INDEXES) {
    setStatus(language === "fr" ? "Sélectionnez un dossier indexé." : "Select an indexed folder.");
    return;
  }
  const confirmed = window.confirm(language === "fr"
    ? `Supprimer l’index local de « ${currentFolder} » ? Le dossier réel ne sera pas supprimé.`
    : `Remove the local index for "${currentFolder}"? The real folder will not be deleted.`);
  if (!confirmed) return;
  try {
    await invoke("delete_indexed_folder", { folder: currentFolder });
    currentFolder = "";
    folderInput.value = "";
    volumeCount.textContent = "0 éléments";
    favoriteCurrentButton.disabled = true;
    searchInput.value = "";
    listElement.className = "list empty";
    listElement.textContent = t[language].empty;
    await loadHistory();
    await loadFavorites();
    setStatus(language === "fr" ? "Index local supprimé." : "Local index removed.");
  } catch (error) {
    setStatus(String(error));
  }
}
function scheduleSearch() { window.clearTimeout(searchTimer); searchTimer = window.setTimeout(() => void search(), 120); }
async function search() { if (!currentFolder) return; try { const limit = resultLimit(); const response = await invoke<SearchResponse>("search_files", { folder: currentFolder, query: searchInput.value, showHidden: showHiddenInput.checked, displayMode: displayModeInput.value, ignoreSpecial: localStorage.getItem("ignore-special") === "true", maxResults: limit }); countElement.textContent = `${response.total}${response.limited ? ` (${limit})` : ""}`; if (!response.files.length) { listElement.className = "list empty"; listElement.textContent = t[language].empty; return; } listElement.className = "list"; listElement.innerHTML = response.files.map(renderRow).join(""); listElement.querySelectorAll<HTMLElement>(".file-row").forEach((row) => { row.addEventListener("click", () => selectEntry(response.files[Number(row.dataset.index)])); row.addEventListener("dblclick", () => void nativeOpen(response.files[Number(row.dataset.index)].path, false)); }); const restored = response.files.find((entry) => entry.path === savedState.selectedPath); if (restored) await selectEntry(restored); } catch (error) { setStatus(String(error)); } }
function renderRow(entry: FileEntry, index: number) { return `<article class="file-row" tabindex="0" data-index="${index}" data-path="${escapeHtml(entry.path)}"><span class="file-badge">${entry.is_dir ? "DIR" : escapeHtml(entry.extension.replace(".", "").slice(0, 5).toUpperCase() || "FILE")}</span><span class="file-name" title="${escapeHtml(entry.name)}">${escapeHtml(entry.name)}</span><span class="file-path" title="${escapeHtml(entry.path)}">${escapeHtml(entry.path)}</span><span class="file-type">${entry.is_dir ? t[language].folder : mimeLabel(entry.extension)}</span><span class="file-size">${entry.is_dir ? "—" : formatBytes(entry.size)}</span><span class="file-date">${formatDate(entry.modified)}</span></article>`; }
async function selectEntry(entry: FileEntry) { selectedEntry = entry; document.querySelectorAll(".file-row.selected").forEach((row) => row.classList.remove("selected")); const row = [...document.querySelectorAll<HTMLElement>(".file-row")].find((item) => item.dataset.path === entry.path); row?.classList.add("selected"); try { const details = await invoke<FileDetails>("inspect_file", { path: entry.path }); renderInspector(details); } catch (error) { setStatus(String(error)); } }
function renderInspector(details: FileDetails) { const source = convertFileSrc(details.path); const media = details.mime.startsWith("image/") ? `<img class="preview-image" src="${source}" alt="${escapeHtml(details.name)}" />` : details.mime === "application/pdf" && mediaPreview("preview-pdf") ? `<iframe class="preview-document" src="${source}" title="${escapeHtml(details.name)}"></iframe>` : details.mime.startsWith("audio/") && mediaPreview("preview-audio") ? `<audio class="preview-media" controls src="${source}"></audio>` : details.mime.startsWith("video/") && mediaPreview("preview-video") ? `<video class="preview-media" controls src="${source}"></video>` : details.preview ? `<pre class="preview-text">${escapeHtml(details.preview)}</pre>` : `<div class="preview-placeholder">${details.is_dir ? "📁" : "▧"}<strong>${escapeHtml(details.name)}</strong><span>${details.is_dir ? t[language].folder : t[language].noPreview}</span></div>`; const permission = localStorage.getItem("permission-format") === "text" ? permissionText(details.permissions) : details.permissions || "—"; const linuxMetadata = localStorage.getItem("show-linux-metadata") !== "false" ? `<div><span>Permissions :</span><strong>${escapeHtml(permission)}</strong></div><div><span>Propriétaire :</span><strong>${escapeHtml(details.owner || "—")}</strong></div>` : ""; inspectorContent.innerHTML = `<div class="preview-card">${media}</div><section class="metadata"><h3>${t[language].metadata}</h3><div><span>Taille brute :</span><strong>${details.size.toLocaleString()} ${t[language].bytes} (${formatBytes(details.size)})</strong></div><div><span>Type :</span><strong>${escapeHtml(details.mime)}</strong></div><div><span>Modifié le :</span><strong>${formatDate(details.modified)}</strong></div>${linuxMetadata}<div class="location"><span>Emplacement :</span><code>${escapeHtml(details.path)}</code></div></section><div class="inspector-actions"><button id="open-location">${t[language].location}</button><button id="copy-selected">${t[language].copy}</button><button id="open-selected">${t[language].open}</button></div>`; document.querySelector("#open-location")?.addEventListener("click", () => void nativeOpen(details.path, !details.is_dir)); document.querySelector("#copy-selected")?.addEventListener("click", () => void copyPath(details.path)); document.querySelector("#open-selected")?.addEventListener("click", () => void nativeOpen(details.path, false)); }
async function nativeOpen(path: string, reveal: boolean) { try { await invoke("open_path_native", { path, reveal }); } catch (error) { setStatus(String(error)); } }
async function copyPath(path: string) { try { await navigator.clipboard.writeText(path); setStatus(t[language].copy); } catch (error) { setStatus(String(error)); } }
function setBusy(busy: boolean) { sidebarAdd.disabled = busy; refreshButton.disabled = busy || !currentFolder; searchInput.disabled = busy || !currentFolder; historySelect.disabled = busy; }
function permissionText(value?: string | null) { if (!value || value.length < 3) return "—"; const bits = value.slice(-3).split("").map(Number); return bits.map((digit) => ["---", "--x", "-w-", "-wx", "r--", "r-x", "rw-", "rwx"][digit] || "---").join(" "); }
function setStatus(message: string) { statusElement.textContent = message; }
function mimeLabel(extension: string) { return extension ? extension.toUpperCase() : "FILE"; }
function formatBytes(bytes: number) { if (bytes < 1024) return `${bytes} B`; if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`; if (bytes < 1073741824) return `${(bytes / 1048576).toFixed(1)} MB`; return `${(bytes / 1073741824).toFixed(1)} GB`; }
function formatDate(value?: string | null) { if (!value) return "—"; const date = new Date(Number(value) * 1000); return Number.isNaN(date.valueOf()) ? "—" : date.toLocaleString(); }
function escapeHtml(value: string) { return value.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[character]!); }
