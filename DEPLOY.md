# Deploy Guide

## 1) Configure environment variables

In the server/CI environment, configure:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

Use `.env.example` as reference.

## 2) Generate catalog artifacts (optional, local step)

```bash
python main.py
```

This creates:

- `catalogo_completo.json`
- `catalogo_completo.csv`

`main.py` now writes strict JSON (no `NaN`) for safer automation.

## 3) Validate import without writing data

```bash
npm run import:catalogo:dry
```

## 4) Import catalog to Supabase

```bash
npm run import:catalogo
```

By default the import replaces existing products (`products` table), then inserts the full catalog in chunks.

## 5) Deploy app

```bash
npm run build
```

Push to `main` to trigger production deployment (Amplify uses `amplify.yml`).
