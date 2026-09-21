from flask import Blueprint, g, jsonify, request

import db
from auth import require_auth

bp = Blueprint("library", __name__)


@bp.get("/api/library")
@require_auth
def list_docs():
    return jsonify(db.list_library_docs())


@bp.post("/api/library")
@require_auth
def create_doc():
    body = request.get_json(force=True, silent=True) or {}
    if not (body.get("title") or "").strip():
        return jsonify({"error": "Campo 'title' é obrigatório."}), 400
    body["author"] = g.current_user["name"]
    return jsonify(db.create_library_doc(body)), 201
