"""Supabase Storage client for uploaded media (photos, videos, audio, PDFs).

Keeps routes/uploads.py simple: hand it a file, get back a public URL.
Swapping storage providers later only touches this file. Uses the Storage
REST API directly (no supabase-py dependency needed for this one call).
"""
import mimetypes
import os
import uuid

import requests

SUPABASE_URL = os.environ.get("SUPABASE_URL", "").rstrip("/")
SUPABASE_SERVICE_KEY = os.environ.get("SUPABASE_SERVICE_KEY")
SUPABASE_BUCKET = os.environ.get("SUPABASE_BUCKET", "pegasus-uploads")


def _require_config():
    if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
        raise RuntimeError(
            "SUPABASE_URL / SUPABASE_SERVICE_KEY não configuradas em backend/.env "
            "— necessárias para guardar arquivos enviados (fotos, vídeos, áudios)."
        )


def upload(file_storage, ext):
    """Uploads a Werkzeug FileStorage's bytes and returns its public URL."""
    _require_config()
    filename = f"{uuid.uuid4().hex}.{ext}"
    content_type = (
        file_storage.mimetype or mimetypes.guess_type(filename)[0] or "application/octet-stream"
    )
    file_storage.stream.seek(0)
    data = file_storage.read()

    resp = requests.post(
        f"{SUPABASE_URL}/storage/v1/object/{SUPABASE_BUCKET}/{filename}",
        headers={
            "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
            "apikey": SUPABASE_SERVICE_KEY,
            "Content-Type": content_type,
        },
        data=data,
        timeout=30,
    )
    if resp.status_code not in (200, 201):
        raise RuntimeError(
            f"Falha ao enviar arquivo para o Supabase Storage ({resp.status_code}): {resp.text[:200]}"
        )

    return f"{SUPABASE_URL}/storage/v1/object/public/{SUPABASE_BUCKET}/{filename}"
