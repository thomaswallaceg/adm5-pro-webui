# adm5-pro-webui

A small web UI for a single FlashForge Adventurer 5M Pro. It shows the camera, temperatures and print
progress, and lets you set temperatures, toggle the light, home the axes, change filtration, and start,
pause, resume or cancel prints from files already on the printer.

There is no login. Anyone who can reach the server on your network can control the printer.

## Why there is a server

The page can't talk to the printer directly:

- The printer's HTTP API (port 8898) sends no CORS headers, so a browser won't let a page read its replies.
- Some controls (home axes, temperatures) use the printer's TCP API (port 8899), which browsers can't open.
- The printer's camera (port 8080) serves one viewer at a time. The server holds that one connection and
  shares it with every open page.

The server uses [`@ghosttypes/ff-api`](https://www.npmjs.com/package/@ghosttypes/ff-api), polls the
printer every 3 seconds, and serves the cached status to all pages.

## Requirements

- Node.js 22.18 or later (the server runs its TypeScript directly, with no build step)
- pnpm

## Running it

```bash
pnpm install
pnpm build   # builds the page into dist/
pnpm start   # serves it on http://0.0.0.0:8000
```

Open the page and enter the printer's IP address, serial number and check code. They are saved in
`data/printer.json`, which is gitignored.

Environment variables:

| Variable | Default | Purpose |
|---|---|---|
| `PORT` | `8000` | Port the server listens on |
| `HOST` | `0.0.0.0` | Address the server listens on |
| `DATA_DIR` | `data` | Where `printer.json` is stored |

## Development

```bash
pnpm dev     # server with --watch on :8000, Vite with hot reload on :5173
pnpm check   # svelte-check for the page, tsc for the server
```

Vite forwards `/api` requests to the server, so open http://localhost:5173 while developing.

## Layout

```text
server/        Node HTTP server (no framework)
  index.ts     routes, static files, shutdown
  printer.ts   FiveMClient connection, polling, commands, thumbnails
  camera.ts    shares the printer's MJPEG stream between viewers
  snapshot.ts  maps ff-api's FFMachineInfo to the API's status shape
  config.ts    loads and saves data/printer.json
shared/
  types.ts     API types used by both the server and the page
src/           Svelte 5 page (Vite + Tailwind CSS v4)
  lib/         API calls, polling state, formatting, toasts
  components/  panels, dialogs and controls
```
