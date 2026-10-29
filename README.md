# File Indexer

> A fast, private desktop file indexer and search tool for Linux.

[![License: MIT](https://img.shields.io/badge/License-MIT-4f46e5.svg)](LICENSE)
[![Tauri](https://img.shields.io/badge/Tauri-2-24c8db.svg)](https://tauri.app/)
[![Platform](https://img.shields.io/badge/platform-Linux-111827.svg)](#supported-platform)
[![Offline](https://img.shields.io/badge/offline-100%25-16a34a.svg)](#privacy)
[![Cloud](https://img.shields.io/badge/cloud-none-0f172a.svg)](#privacy)
[![Privacy](https://img.shields.io/badge/privacy-local--first-4f46e5.svg)](#privacy)
[![Telemetry](https://img.shields.io/badge/telemetry-none-334155.svg)](#privacy)

File Indexer indexes a local folder recursively and lets you search files and directories instantly. Everything stays on your computer: no account, telemetry, or remote upload is required.

![Settings preview](docs/assets/settings-preview.png)

## Tags

`offline` `no-cloud` `local-first` `privacy-first` `desktop-app` `tauri` `linux`
`file-indexing` `file-search` `open-source` `deb` `rpm`

## Features

- Recursive local indexing without following symbolic links;
- case-insensitive search with optional special-character normalization;
- hidden-file visibility control;
- file, directory, and combined result filters;
- list and grid result views;
- persistent history and favorite folders;
- detached settings window with French and English interfaces;
- light and dark themes;
- image, text, PDF, audio, and video previews;
- Linux permissions and owner metadata;
- native opening, location reveal, and absolute-path copying;
- memory-conscious on-disk JSONL indexes and a bounded result list.
- configurable result limits from 200 to 2,000 with a memory-use warning;
- search across all folders retained in the local index history;
- selectable Indigo, Ocean, Emerald, and Rose color palettes with light and dark variants;
- safe removal of a local index without deleting the original folder or files.

## What makes File Indexer different?

File Indexer is designed for the practical problem of searching a **messy, user-selected folder**: project directories, download folders, external drives, photo collections, archives, and mixed folders containing both files and subdirectories. It does not try to be a system-wide search daemon or a cloud document platform.

| Application | Main approach | Best suited for | How File Indexer differs |
|---|---|---|---|
| **File Indexer** | On-demand recursive folder index, local JSONL cache, Rust-side search | A specific folder or workspace that needs fast, private searching | Focused scope, no cloud, no background watcher, and a desktop inspector for the selected result |
| **FSearch** | Fast filename search using a local database | Broad filename lookup on Linux | File Indexer emphasizes selected-folder workflows, previews, favorites, and metadata |
| **Catfish** | Desktop search front end using system search tools | Simple ad-hoc desktop searches | File Indexer maintains its own folder index and offers richer result inspection |
| **Recoll** | Configurable desktop search with content indexing | Full-text search across large document collections | File Indexer currently focuses on names, paths, extensions, and filesystem metadata rather than building a full-text content index |
| **Tracker / GNOME Search** | Desktop-integrated background indexing | System-wide desktop search and application integration | File Indexer is explicit and user-controlled: you choose which folder to index |
| **KFind** | Graphical search by filesystem criteria | One-off searches using filters | File Indexer keeps a reusable folder history and search results in a dedicated index |

This is a product-positioning comparison, not a performance benchmark. Search speed and memory usage depend on the filesystem, folder size, storage device, and enabled preview features.

## How indexing and search work

1. You choose a root folder from the native folder picker.
2. File Indexer walks that folder recursively without following symbolic links.
3. It records file and directory metadata in a compact JSONL index stored in the application's local data directory.
4. The Rust backend applies case-insensitive filtering, hidden-file rules, display-mode filters, and optional special-character normalization.
5. The interface receives a bounded number of matching rows at a time (200 by default, configurable up to 2,000 with a memory warning), keeping the result DOM bounded.
6. Selecting a result loads its metadata and only the limited preview required by the inspector. Binary files are not read entirely into memory by the indexer.

The index can be reused when the same folder is opened again. A manual refresh performs a new scan when you need to update the index.

### Does File Indexer watch folders with inotify, or rescan on a schedule?

**Neither.** In the current version, File Indexer does **not** register an `inotify`/`fanotify` watcher and does **not** run a scheduled background rescan.

Indexing is user-controlled:

- the first scan happens when you choose a folder;
- opening a folder from history can reuse its existing local index;
- the **Re-index** action performs a fresh scan on demand;
- no filesystem event stream, daemon, cloud service, or scheduled job runs in the background.

This behavior is intentional: it keeps the application predictable, offline, and lighter on system resources. A future real-time watcher would be an opt-in feature and would be documented separately.

## Privacy

File Indexer is a local-first application. Indexed paths and preferences are stored in the application's local data directory. File contents are not uploaded to a server.

## Technical specifications

| Area | Current behavior |
|---|---|
| Runtime | Tauri 2 desktop application |
| Backend | Rust |
| Frontend | TypeScript, Vite, HTML, and CSS |
| Primary platform | 64-bit Linux |
| Index scope | User-selected folder and its descendants |
| Symlinks | Not followed during recursive indexing |
| Search | Case-insensitive filename/path search with optional special-character normalization |
| Index storage | Local JSONL files in the application data directory |
| Result limit | 200 rows returned to the frontend per search |
| Configurable result limit | 200-2,000 rows; higher values can increase memory usage |
| Global search | Searches all folders retained in local index history |
| Index removal | Removes only the local JSONL index, history entry, and favorite; never the original files |
| Color palettes | Indigo, Ocean, Emerald, and Rose, each with light/dark styling |
| Preview limits | Text preview is bounded; images and media use local asset URLs |
| Network requirement | None at runtime |
| Telemetry | None |
| Cloud account | None |
| Background watcher | Not currently used |
| Scheduled scan | Not currently used |

## Installation

Prebuilt `.deb` and `.rpm` packages are published manually in the [GitHub Releases](../../releases) section. They are intentionally not committed to this source repository.

For each release, upload the packages matching the target architecture. The source repository intentionally does not commit binary packages; attach them manually to the GitHub Release:

| Package | Architecture | Example |
|---|---|---|
| Debian package | amd64 | `File Indexer_0.8.8_amd64.deb` |
| RPM package | x86_64 | `File Indexer-0.8.8-1.x86_64.rpm` |

ARM64 packages, when available, should be uploaded with an explicit `arm64` or `aarch64` suffix. The source archive can also be attached to a Release:

```text
File-Indexer-v0.8.0-source.zip
```

The source archive contains the application source only; generated dependencies, build directories, and binary packages are excluded.

Download the package matching your architecture, then install it on Debian or Ubuntu:

```bash
sudo apt install ./File-Indexer_<version>_amd64.deb
```

For RPM-based distributions:

```bash
sudo dnf install ./File-Indexer-<version>-1.x86_64.rpm
```

### Version 0.8.8 release highlights

- Added the **Remove indexed folder** action under the Index menu. It removes only File Indexer's local JSONL index, history entry, and favorite; it never deletes the selected folder or any file on disk.
- Added **All indexes** search across the folders retained in local history, using sequential streaming reads and the same result cap.
- Added configurable search result limits from 200 to 2,000 with an explicit memory-use warning.
- Applied all color palettes consistently across the main application and Settings in both light and dark themes.
- Added offline local profile artwork for the About panel.
- Improved Settings scrolling, fixed navigation, palette controls, default reset confirmation, and Settings opening reliability.
- Added PDF, audio, video, Linux permissions/owner metadata, favorites, list/grid views, and configurable shortcuts to the current feature set.

Release assets for `v0.8.8`:

- `File Indexer_0.8.8_amd64.deb`
- `File Indexer-0.8.8-1.x86_64.rpm`

## Development

### Requirements

- Node.js 20 or newer;
- Rust stable and Cargo;
- Tauri Linux dependencies (WebKitGTK, GTK, and related development packages).

```bash
npm install
npm run build
npm run tauri dev
```

### Build a Debian package locally

```bash
npm run tauri build -- --bundles deb
```

The package is generated under `src-tauri/target/release/bundle/deb/`. Build outputs are ignored by Git and should be uploaded manually to a GitHub Release instead.

## Supported platform

The primary supported platform is 64-bit Debian/Ubuntu Linux. Other Linux distributions may work when the required Tauri runtime libraries are available.

## Contributing

Contributions are welcome. Please read [CONTRIBUTING.md](CONTRIBUTING.md) before opening an issue or pull request.

## License

File Indexer is released under the [MIT License](LICENSE).
