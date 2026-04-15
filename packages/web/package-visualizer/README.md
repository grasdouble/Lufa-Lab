# Package Visualizer

A tool to browse the contents of npm or GitHub Registry packages — file tree, syntax-highlighted source files, README, and more.

<p align="center">
  <a href="https://youtu.be/kOFsZOv8PNk">
    <img src="https://img.youtube.com/vi/kOFsZOv8PNk/0.jpg" alt="Demo vidéo" />
  </a>
</p>

## Packages

| Package | Description |
|---|---|
| [`client/`](./client/) | React + Vite + TypeScript web app (port `5173`) |
| [`server/`](./server/) | Express + TypeScript API (port `3001`) |
| [`vscode-extension/`](./vscode-extension/) | VSCode extension — browse packages without leaving the editor |

Each package has its own README with setup and development instructions.

## Getting started

From the **Lufa-Lab** monorepo root:

```bash
pnpm install
```

### Web app (client + server)

```bash
pnpm --filter @package-visualizer/root dev
```

This starts both the Express server (port `3001`) and the Vite client (port `5173`) concurrently.

The server requires a GitHub OAuth App — see [`server/README.md`](./server/README.md).

### VSCode extension

```bash
pnpm --filter @package-visualizer/root dev:vscode
```

This starts the watch mode for both the extension host and the React webview bundle. Then press **F5** in VSCode to launch an Extension Development Host.

See [`vscode-extension/README.md`](./vscode-extension/README.md) for full details.

