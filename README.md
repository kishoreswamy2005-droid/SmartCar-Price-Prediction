# SmartCar — Used Car Price Prediction

A full-stack web application that predicts used-car resale prices in Indian rupees
using the **exact trained model** from the project notebook
(`SmartCar_Used_Car_Price_Prediction (1).ipynb`) and `smartcar_best_model.joblib`.
The React frontend talks to a FastAPI backend that loads the saved scikit-learn
pipeline unchanged — every price shown is a real model output, never a hardcoded
value — and stores every prediction in MongoDB for the dashboard, history and
analytics views.

---

## 1. Features

- **Dashboard** — KPI cards (total predictions, average / highest / lowest price)
  computed from stored MongoDB records, plus five live charts: predicted-price
  distribution, prediction activity over time, brand price comparison, fuel-type
  price analysis and manufacturing-year analysis. Dataset-backed charts come from
  the 6,926-row cleaned dataset; prediction charts reflect real stored records.
- **Prediction form** — all 13 model features in Section A (car name, year,
  kilometres driven, fuel, seller type, transmission, owner) and Section B
  (mileage, engine, max power, torque, seats), a **searchable car-name combobox**
  fed by the 2,058 dataset names, sample-data loader, reset, inline Zod
  validation, server-side 422 field errors, loading states and toasts.
- **Prediction result** — exact model output formatted in Indian currency
  (`₹5,45,000`), full-precision value, prediction ID, car details, `car_age`
  derived from reference year 2026, print-friendly summary
  (*Print Prediction Summary*) and links to history.
- **Prediction history** — server-side search (name / ID / fuel), fuel and
  price-range filters, sortable columns (aria-sort), pagination, view-details
  dialog, single delete and clear-all, each behind a confirmation dialog with
  distinct empty states for "no records" vs "no matches".
- **Analytics** — dataset insights: overview statistics, brand prices, fuel
  analysis, year analysis, price distribution and usage analysis (age vs price,
  km vs price, transmission split), all computed from the real CSV.
- **About & Model** — model information, dataset provenance and evaluation
  metrics **transcribed verbatim from the notebook** (best model: Linear
  Regression, MAE ₹95,267, R² 0.7034). Metrics are served from
  `backend/data/model_metrics.json` and are never recomputed or invented.
- **Theme & responsiveness** — light/dark mode with persistence, tested at
  375 / 430 / 768 / 1024 / 1440 px with no horizontal overflow, mobile drawer
  navigation and desktop sidebar.

## 2. Technology Stack

| Layer      | Technologies |
|------------|--------------|
| Frontend   | React 19, TypeScript, Vite 8, Tailwind CSS 3.4, shadcn-ui style components (hand-written, Radix primitives), Lucide icons, Recharts 3, React Router 7, React Hook Form 7 + Zod 4, sonner toasts |
| Backend    | FastAPI, Pydantic 2, Pandas, NumPy, scikit-learn **1.6.1 (pinned)**, Joblib, Motor (async MongoDB) |
| Database   | MongoDB (local `mongodb://127.0.0.1:27017`, database `smartcar`, collection `predictions`) |
| ML artifact| `smartcar_best_model.joblib` (fitted `ColumnTransformer` + `LinearRegression` pipeline, loaded unchanged — no retraining) |
| Testing    | pytest + httpx (backend), Vitest + Testing Library + jsdom (frontend unit/integration), Playwright (E2E + responsive) |

## 3. Architecture

```
┌─────────────────────────────┐        ┌──────────────────────────────────┐
│  React SPA (Vite :5173)     │  /api  │  FastAPI (:8000)                │
│  pages → services → types   │──────► │  routes → services → utils      │
│  Recharts · RHF+Zod · theme │ proxy  │  model_service (joblib, pinned) │
└─────────────────────────────┘        │  analytics_service (pandas)     │
                                       │  history_service (motor)        │
                                       └───────┬──────────────┬───────────┘
                                               │              │
                                     smartcar_best_model   MongoDB
                                     .joblib + dataset     predictions
                                     + model_metrics.json
```

- The browser only ever talks to one origin: in development Vite proxies
  `/api` to FastAPI (no CORS issues); in production set `VITE_API_BASE_URL`.
- `car_age = REFERENCE_YEAR(2026) − year` is derived **server-side**; the
  request contract carries the other 12 features.
- The model pipeline is loaded once at startup and shared; predictions are
  deterministic and reproducible.
- Analytics read the CSV once at startup and aggregate with pandas — no
  per-request file reads.

## 4. Project Structure

```
.
├── README.md                    ← this file
├── .env.example                 ← environment template (all defaults)
├── .gitignore
├── smartcar_best_model.joblib   ← original trained model (do not modify)
├── SmartCar_Used_Car_Price_Prediction (1).ipynb   ← original notebook (do not modify)
├── prompt.txt
├── .venv/                       ← Python 3.11 virtual environment
│
├── backend/
│   ├── requirements.txt         ← pinned dependencies
│   ├── pytest.ini
│   ├── app/
│   │   ├── main.py              ← FastAPI app, CORS, startup, error handlers
│   │   ├── config.py            ← pydantic-settings (.env)
│   │   ├── database.py          ← Motor client helpers
│   │   ├── routes/              ← health/dashboard, prediction, history, analytics, model
│   │   ├── schemas/             ← Pydantic request/response models
│   │   ├── services/            ← model, prediction, history, analytics logic
│   │   └── utils/               ← model_loader, data_validation
│   ├── data/
│   │   ├── Car details v3.csv   ← dataset (8,128 raw → 6,926 cleaned rows)
│   │   └── model_metrics.json   ← notebook metrics, verbatim
│   ├── models/
│   │   └── smartcar_best_model.joblib
│   └── tests/                   ← 88 pytest tests (7 files)
│
└── frontend/
    ├── package.json             ← scripts: dev, build, test, e2e
    ├── vite.config.ts           ← React plugin, /api proxy, vitest config
    ├── playwright.config.ts     ← E2E config (auto-starts servers if needed)
    ├── e2e/                     ← 5 Playwright specs (navigation, predict,
    │                              history, responsive @ 5 viewports)
    └── src/
        ├── pages/               ← Dashboard, PredictCar, PredictionHistory,
        │                          Analytics, AboutModel, NotFound
        ├── components/
        │   ├── layout/          ← AppShell (sidebar/drawer), nav, ThemeToggle
        │   ├── prediction/      ← PredictionForm, CarNameCombobox, PredictionResult
        │   ├── dashboard/       ← KpiCard
        │   ├── charts/          ← Recharts wrappers + ChartCard/tooltip
        │   └── ui/              ← shadcn-style primitives
        ├── services/            ← api.ts (typed fetch), prediction/analytics services
        ├── lib/                 ← predictionSchema (Zod), utils
        ├── hooks/               ← useTheme, useDebounce
        ├── types/               ← shared API types
        ├── utils/format.ts      ← ₹ / number / date formatting (en-IN)
        └── test/                ← Vitest setup, fixtures, page tests
```

## 5. Installation

### Prerequisites

- **Python 3.11** (the venv in this repo is 3.11; scikit-learn 1.6.1 wheel)
- **Node.js 20+** and npm
- **MongoDB 6+** running locally (or a connection string for a remote instance)

### Backend setup

```powershell
cd backend
python -m venv ..\.venv          # already created in this repo: .venv
..\.venv\Scripts\python.exe -m pip install -r requirements.txt
```

`scikit-learn==1.6.1` is pinned because the joblib artifact was fitted with
that exact minor version — joblib refuses (or mis-loads) other versions.

### Frontend setup

```powershell
cd frontend
npm install
```

### MongoDB setup

```powershell
# Windows service (already running in this environment)
net start MongoDB

# Or run manually
mongod --dbpath "C:\data\db"
```

The app works with a fresh database — collections and indexes are created on
first write. If MongoDB is down, the API still serves model predictions and
dataset analytics; history/dashboard degrade gracefully with an explicit
"database unavailable" state instead of failing.

### Environment configuration

Copy `.env.example` to `.env` (project root or `backend/`) and adjust. Every
value has a working default — the app runs with **no** `.env` at all.

| Variable | Default | Purpose |
|----------|---------|---------|
| `HOST` / `PORT` | `127.0.0.1` / `8000` | Uvicorn bind |
| `DEBUG` | `true` | Verbose error payloads |
| `CORS_ORIGINS` | `http://localhost:5173,...` | Allowed origins |
| `MONGO_URI` | `mongodb://127.0.0.1:27017` | MongoDB connection |
| `MONGO_DB_NAME` | `smartcar` | Database name |
| `MONGO_COLLECTION` | `predictions` | Collection name |
| `MODEL_PATH` | `models/smartcar_best_model.joblib` | Model artifact (relative to `backend/`) |
| `DATASET_PATH` | `data/Car details v3.csv` | Dataset for analytics |
| `REFERENCE_YEAR` | `2026` | `car_age = REFERENCE_YEAR − year` (must stay 2026) |

Frontend: optional `VITE_API_BASE_URL` (empty ⇒ same-origin `/api` proxy).

## 6. Running the Application

**Terminal 1 — backend**

```powershell
cd backend
$env:PYTHONIOENCODING='utf-8'
..\.venv\Scripts\python.exe -m uvicorn app.main:app --port 8000
```

**Terminal 2 — frontend**

```powershell
cd frontend
npm run dev
```

Open **http://localhost:5173** (use `localhost`, not `127.0.0.1` — the dev
server may bind IPv6). The header's "API online" pill confirms the backend,
model and database are reachable.

Production build: `npm run build` (type-checks then bundles to `frontend/dist`),
served by `npm run preview` (same `/api` proxy).

## 7. API Documentation

Interactive docs at **http://127.0.0.1:8000/docs** (Swagger UI).

| Method | Path | Description |
|--------|------|-------------|
| `GET`  | `/api/health` | Status, model loaded?, DB connected?, dataset rows (6,926) |
| `POST` | `/api/predict` | Predict a price → `201` + stored `PredictionRecord` |
| `GET`  | `/api/predictions` | Paginated history. Query: `page`, `page_size`, `search`, `fuel`, `min_price`, `max_price`, `sort_by` (`created_at`\|`predicted_price`\|`car_name`\|`year`\|`km_driven`), `sort_dir` (`asc`\|`desc`) |
| `GET`  | `/api/predictions/fuel-options` | Distinct fuels present in stored records |
| `GET`  | `/api/predictions/{id}` | Single record (`404` if missing) |
| `DELETE` | `/api/predictions/{id}` | Delete one record |
| `DELETE` | `/api/predictions` | Clear all history → `{deleted, count}` |
| `GET`  | `/api/dashboard/stats` | KPIs from stored predictions (safe when empty) |
| `GET`  | `/api/dashboard/charts` | Price distribution + activity series from stored predictions |
| `GET`  | `/api/meta/options` | Form options: fuel/seller/transmission/owner/seats, year range, reference year, 2,058 car names |
| `GET`  | `/api/analytics/overview` | Dataset stats + top brands |
| `GET`  | `/api/analytics/brand-prices` | Average/median price per brand |
| `GET`  | `/api/analytics/fuel-analysis` | Price stats per fuel type |
| `GET`  | `/api/analytics/year-analysis` | Price stats per year (+ `car_age`) |
| `GET`  | `/api/analytics/price-distribution` | Histogram buckets + mean/median |
| `GET`  | `/api/analytics/usage-analysis` | Age vs price, km vs price, transmission split |
| `GET`  | `/api/model/info` | Model metadata + notebook evaluation metrics (verbatim) |

**`POST /api/predict` request (12 posted features; `car_age` derived server-side):**

```json
{
  "name": "Maruti Swift Dzire VDI",
  "year": 2014,
  "km_driven": 145500,
  "fuel": "Diesel",
  "seller_type": "Individual",
  "transmission": "Manual",
  "owner": "First Owner",
  "mileage": 23.4,
  "engine": 1248,
  "max_power": 74,
  "torque": "190Nm@ 2000rpm",
  "seats": 5
}
```

Response `201`: `prediction_id`, `predicted_price` (raw model output, INR),
`currency`, `car_details` (with `car_age`), `created_at`, `model_name`,
`disclaimer`. Validation failures return `422` with
`{detail, errors: [{field, message}]}` which the form renders inline.

## 8. Testing

### Backend — 88 tests

```powershell
cd backend
..\.venv\Scripts\python.exe -m pytest        # 88 passed (~20s)
```

Covers: model loads, prediction correctness (deterministic values), invalid and
missing inputs, MongoDB CRUD, history pagination/filtering/sort, analytics
against real dataset aggregates, error handling, and an end-to-end flow.

### Frontend unit + integration — 60 tests

```powershell
cd frontend
npm test            # or: npx vitest run
```

Covers: formatting helpers (Indian grouping `₹5,45,000`), the Zod schema,
all five pages loading from mocked APIs, navigation, theme switching, 404,
form validation, sample → loading → result with real POST-body assertions,
422 field errors, network-failure toast, and the full history workflow
(search debounce, filters, sort, pagination, delete/cancel/clear dialogs,
detail dialog).

### End-to-end + responsive — 59 tests

```powershell
cd frontend
npm run e2e         # Playwright; starts backend+frontend if not already running
npm run e2e:report  # HTML report
```

Runs against the **real backend, real model and real MongoDB**: page loads,
navigation, browser history, theme persistence, validation, a full prediction
round-trip (cleaned up afterwards), API contract checks (including the
notebook's MAE/R²), history isolation/search/sort/delete flows, and every page
at **375 / 430 / 768 / 1024 / 1440 px** asserting no horizontal overflow,
correctly sized charts and working mobile drawer / desktop sidebar.

## 9. Troubleshooting

| Symptom | Fix |
|---------|-----|
| `model_error` in `/api/health` | Ensure `backend/models/smartcar_best_model.joblib` exists and `scikit-learn==1.6.1` is installed (`pip install -r requirements.txt`). Do not retrain or edit the model. |
| `database_error` in `/api/health` | Start MongoDB (`net start MongoDB`) or fix `MONGO_URI`. Predictions and dataset analytics still work without it; history/dashboard show a clear degraded state. |
| Frontend can't reach the API | Keep the Vite dev server on **http://localhost:5173** (its proxy targets `127.0.0.1:8000`). For a hosted backend set `VITE_API_BASE_URL`. |
| Port already in use | `uvicorn --port 8001` + update the Vite proxy target, or stop the previous process. |
| Playwright: "server not started" | Start backend and frontend first, or let the config start them (it reuses running servers automatically). Chromium must be installed: `npx playwright install chromium`. |
| Windows console shows `?` for `₹` | Prefix backend commands with `$env:PYTHONIOENCODING='utf-8'`. |
| Build warning: chunk > 500 kB | Expected — Recharts is bundled into the main chunk. Functional, not an error. |
| `car_age` looks "wrong" | It is `2026 − year`, matching training-time derivation (`REFERENCE_YEAR=2026`). |

## 10. Known Limitations (inherited from the trained model)

These are properties of the saved notebook pipeline, faithfully reproduced by
the backend — not application bugs:

- **`mileage`, `engine`, `max_power`, `seats` have no effect on the output.**
  The notebook's numeric-extraction regex was double-escaped, so those columns
  were all-NaN at fit time; the fitted `SimpleImputer` therefore drops them at
  inference. The API accepts and stores them (the form and history display
  them), but changing them does not change the price.
- **Unknown car names collapse to a default price.** The name encoder is
  one-hot over the 2,058 dataset names; unseen names map to the same constant
  prediction (~₹6,98,224 for the reference inputs). Known names differ from
  each other. The combobox steers users toward dataset names.
- **Predictions are deterministic** — identical input ⇒ identical output.
- The notebook's evaluation metrics (MAE ₹95,267, R² 0.7034 for the selected
  Linear Regression) are reported verbatim and were not recomputed here.
