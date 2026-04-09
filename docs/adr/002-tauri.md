# ADR 002: Tauri 2 for Desktop Shell

## Status

Accepted

## Context

Foldur is a privacy-first, local-first application. Users import files from their filesystem, data stays on their machine, and the UI should feel like a native desktop application. We need a desktop application framework that supports React/TypeScript frontends.

## Decision

Use Tauri 2 as the desktop application framework, with a React + Vite + TypeScript frontend running in the system WebView.

## Rationale

- **Small binary size**: Tauri apps are 3-10 MB vs Electron's 100-200 MB, because Tauri uses the OS's native WebView instead of bundling Chromium.
- **Rust backend**: Tauri's Rust core provides strong native capabilities -- file system access, system dialogs, SQLite via plugins -- without requiring a separate backend process.
- **Privacy alignment**: No bundled browser engine means a smaller attack surface. The Rust backend gives fine-grained control over what the webview can access through a capability-based permission system.
- **Local file ergonomics**: Tauri's dialog and filesystem plugins make it straightforward to implement the file import flow with native OS file pickers.
- **Plugin ecosystem**: Official plugins for SQL, dialog, filesystem, and logging cover all V1 needs.

## Alternatives Considered

- **Electron**: More mature ecosystem and broader WebView compatibility, but significantly larger binary, higher memory usage, and weaker local-first ergonomics. The Chromium bundle undermines the "lightweight local tool" positioning.
- **Pure web app**: Would fight the local-first story. Browser sandboxing limits filesystem access, local database options are weaker (IndexedDB), and offline operation is harder to guarantee.
- **Native app (Swift/Kotlin)**: Maximum native feel but requires platform-specific codebases, losing the cross-platform benefit. The TypeScript ecosystem for adapters and pipeline logic is too valuable to abandon.

## Consequences

- The frontend must work within system WebView constraints (Safari WebView on macOS, WebView2 on Windows, WebKitGTK on Linux). This is generally fine for modern React apps but may occasionally require polyfills.
- Rust knowledge is needed for Tauri backend modifications, though V1 relies primarily on existing plugins.
- Development requires both the Rust toolchain and Node.js toolchain installed.
