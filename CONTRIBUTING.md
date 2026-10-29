# Contributing to File Indexer

Thank you for helping improve File Indexer.

## Before you start

1. Search existing issues and pull requests before opening a new one.
2. For a large feature, open an issue first so the design can be discussed.
3. Keep changes focused and avoid committing generated build output.

## Development workflow

```bash
npm install
npm run build
cargo check --manifest-path src-tauri/Cargo.toml
```

Run the application locally with:

```bash
npm run tauri dev
```

## Pull requests

Please include:

- a clear description of the user-visible change;
- the tests or build commands you ran;
- screenshots for visual changes;
- notes about memory, indexing, or platform behavior when relevant.

Use focused commits and do not include `.deb` files, `dist/`, `node_modules/`, or `src-tauri/target/`.

## Code style

- Follow the existing TypeScript, CSS, and Rust patterns.
- Prefer small, explicit changes over broad refactors.
- Keep user-facing text available in French and English when applicable.
- Do not add telemetry or remote data collection without an explicit design discussion.

## Reporting issues

Include your Linux distribution, desktop environment, File Indexer version, reproduction steps, and relevant logs. Do not include private file paths or sensitive data in public issues.
