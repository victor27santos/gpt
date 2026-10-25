from flask import Blueprint, jsonify, request

import object_storage
from auth import require_auth

bp = Blueprint("uploads", __name__)

ALLOWED_EXTENSIONS = {"png", "jpg", "jpeg", "gif", "webp", "mp4", "webm", "mov", "mp3", "wav", "ogg", "pdf"}
MAX_SIZE = 25 * 1024 * 1024  # 25MB


@bp.post("/api/uploads")
@require_auth
def upload_file():
    if "file" not in request.files:
        return jsonify({"error": "Nenhum arquivo enviado."}), 400
    file = request.files["file"]
    if file.filename == "":
        return jsonify({"error": "Nome de arquivo vazio."}), 400

    ext = file.filename.rsplit(".", 1)[-1].lower() if "." in file.filename else ""
    if ext not in ALLOWED_EXTENSIONS:
        return jsonify({"error": f"Tipo de arquivo não permitido: .{ext}"}), 400

    file.seek(0, 2)  # SEEK_END
    size = file.tell()
    file.seek(0)
    if size > MAX_SIZE:
        return jsonify({"error": "Arquivo maior que 25MB."}), 400

    try:
        url = object_storage.upload(file, ext)
    except Exception as exc:
        return jsonify({"error": str(exc)}), 502

    return jsonify({"url": url}), 201
