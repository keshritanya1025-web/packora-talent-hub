# Streamlit Analytics Dashboard

This directory contains a **Streamlit** app deployed via git (Render Blueprint).

## Files

| File | Purpose |
|------|---------|
| `app.py` | Main Streamlit application entry point |
| `requirements.txt` | Python dependencies |

## Deployment (Render)

1. Push this repo to GitHub/GitLab.
2. In Render Dashboard → **Blueprints** → **New Blueprint Instance**.
3. Connect your repo.
4. Render reads `../render.yaml` and provisions both the Node app **and** this Streamlit service (`packfora-analytics`).

## Local Development

```bash
cd streamlit
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
streamlit run app.py
```

Open http://localhost:8501.

## Environment Variables

Set these in the Render Dashboard for the `packfora-analytics` service:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY` (or `SUPABASE_PUBLISHABLE_KEY` / `VITE_SUPABASE_*`)
