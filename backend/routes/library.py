from flask import Blueprint, jsonify, request

import db

bp = Blueprint("library", __name__)


@bp.get("/api/library")
def list_docs():
    return jsonify(db.list_library_docs())


@bp.post("/api/library")
def create_doc():
    body = request.get_json(force=True, silent=True) or {}
    if not (body.get("title") or "").strip():
        return jsonify({"error": "Campo 'title' é obrigatório."}), 400
    return jsonify(db.create_library_doc(body)), 201
