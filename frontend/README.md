# SmartCar Frontend

React + TypeScript SPA for the SmartCar used-car price prediction app.
See the **[root README](../README.md)** for the full project documentation
(architecture, backend setup, API reference, troubleshooting).

## Quick start

```powershell
npm install
npm run dev          # http://localhost:5173 (proxies /api → 127.0.0.1:8000)
```

The backend must be running (see root README §6). The dev server binds
`localhost` — open **http://localhost:5173**, not `127.0.0.1:5173`.

## Scripts

| Command | Purpose |
|---------|---------|
| `npm run dev` | Vite dev server with `/api` proxy |
| `npm run build` | Type-check (`tsc -b`) + production bundle to `dist/` |
| `npm run preview` | Serve the production build (same proxy) |
| `npm run lint` | oxlint |
| `npm test` | Vitest unit + integration suite (60 tests) |
| `npm run test:watch` | Vitest in watch mode |
| `npm run e2e` | Playwright E2E + responsive suite (59 tests; auto-starts servers) |
| `npm run e2e:ui` | Playwright interactive UI mode |
| `npm run e2e:report` | Open the last Playwright HTML report |

## Layout

- `src/pages` — Dashboard, PredictCar, PredictionHistory, Analytics, AboutModel, NotFound
- `src/components` — `layout` (AppShell/sidebar/drawer), `prediction` (form, combobox, result), `charts` (Recharts), `ui` (shadcn-style primitives)
- `src/services` — typed fetch wrapper + endpoint calls
- `src/lib/predictionSchema` — Zod schema mirroring the FastAPI contract
- `src/test` — Vitest setup, fixtures and page tests; `e2e/` holds Playwright specs

Styling is Tailwind 3.4 with HSL design tokens (light + dark mode, persisted
in `localStorage` under `smartcar-theme`). Currency formatting uses the Indian
numbering system (`₹5,45,000`).
