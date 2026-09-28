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


@bp.put("/api/library/<int:doc_id>")
@require_auth
def update_doc(doc_id):
    body = request.get_json(force=True, silent=True) or {}
    if "title" in body and not (body.get("title") or "").strip():
        return jsonify({"error": "Campo 'title' não pode ficar vazio."}), 400
    updated = db.update_library_doc(doc_id, body)
    if not updated:
        return jsonify({"error": "Documento não encontrado."}), 404
    return jsonify(updated)


@bp.delete("/api/library/<int:doc_id>")
@require_auth
def delete_doc(doc_id):
    if not db.delete_library_doc(doc_id):
        return jsonify({"error": "Documento não encontrado."}), 404
    return "", 204
