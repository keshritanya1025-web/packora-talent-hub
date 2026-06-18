import os
import streamlit as st
import pandas as pd
import numpy as np
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

st.set_page_config(page_title="Packfora Analytics", layout="wide")

st.title("📊 Packfora Talent Hub Analytics")

# --- Supabase connection ---
@st.cache_resource
def get_supabase() -> Client:
    url = os.getenv("SUPABASE_URL") or os.getenv("VITE_SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_PUBLISHABLE_KEY") or os.getenv("VITE_SUPABASE_PUBLISHABLE_KEY")
    if not url or not key:
        st.error("Supabase credentials not found in environment variables.")
        st.stop()
    return create_client(url, key)

try:
    supabase = get_supabase()
except Exception as e:
    st.error(f"Failed to connect to Supabase: {e}")
    st.stop()

# --- KPI Cards ---
col1, col2, col3, col4 = st.columns(4)

with col1:
    try:
        count = supabase.table("candidates").select("*", count="exact").execute()
        st.metric("Total Candidates", count.count or 0)
    except Exception:
        st.metric("Total Candidates", "—")

with col2:
    try:
        count = supabase.table("requisitions").select("*", count="exact").execute()
        st.metric("Open Requisitions", count.count or 0)
    except Exception:
        st.metric("Open Requisitions", "—")

with col3:
    try:
        count = supabase.table("interviews").select("*", count="exact").execute()
        st.metric("Interviews Scheduled", count.count or 0)
    except Exception:
        st.metric("Interviews Scheduled", "—")

with col4:
    try:
        count = supabase.table("offers").select("*", count="exact").execute()
        st.metric("Offers Sent", count.count or 0)
    except Exception:
        st.metric("Offers Sent", "—")

st.divider()

# --- Data Preview ---
st.subheader("📝 Recent Candidates")
try:
    response = supabase.table("candidates").select("*").order("created_at", desc=True).limit(10).execute()
    df = pd.DataFrame(response.data)
    if not df.empty:
        st.dataframe(df, use_container_width=True)
    else:
        st.info("No candidates found yet.")
except Exception as e:
    st.warning(f"Could not load candidates: {e}")

st.caption("Connected to Packfora Supabase backend via git-deployed Streamlit on Render.")
