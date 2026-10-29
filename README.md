# File Indexer

> A fast, private desktop file indexer and search tool for Linux.

[![License: MIT](https://img.shields.io/badge/License-MIT-4f46e5.svg)](LICENSE)
[![Tauri](https://img.shields.io/badge/Tauri-2-24c8db.svg)](https://tauri.app/)
[![Platform](https://img.shields.io/badge/platform-Linux-111827.svg)](#supported-platform)

File Indexer indexes a local folder recursively and lets you search files and directories instantly. Everything stays on your computer: no account, telemetry, or remote upload is required.

![Settings preview](docs/assets/settings-preview.png)

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

## Privacy

File Indexer is a local-first application. Indexed paths and preferences are stored in the application's local data directory. File contents are not uploaded to a server.

## Installation

Prebuilt `.deb` and `.rpm` packages are published manually in the [GitHub Releases](../../releases) section. They are intentionally not committed to this source repository.

For each release, upload the packages matching the target architecture:

| Package | Architecture | Example |
|---|---|---|
| Debian package | amd64 | `File Indexer_0.8.0_amd64.deb` |
| RPM package | x86_64 | `File Indexer-0.8.0-1.x86_64.rpm` |

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
