# Ghostframe Architecture

This project is split into two runtimes:

- Electron Main (Node/Electron): window management, IPC, services (AI, screenshots, automation, settings, anti-analysis)
- Renderer (Vite + React): UI, feature hooks, and interactions via window.ghostframe

Current outputs build to:

- out/electron: compiled Electron main and preload
- out/renderer: bundled renderer app

IPC channels and payloads are defined in `src/types/ghostframe.d.ts`.

Project structure:

- apps/electron: Electron main process sources
- apps/renderer: React renderer app
- out/electron: compiled Electron main and preload
- out/renderer: bundled renderer app
