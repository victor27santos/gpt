from flask import Blueprint, g, jsonify, request

import db
from auth import require_auth

bp = Blueprint("entries", __name__)


@bp.get("/api/entries")
@require_auth
def list_entries():
    return jsonify(db.list_entries())


@bp.post("/api/entries")
@require_auth
def create_entry():
    body = request.get_json(force=True, silent=True) or {}
    body["author"] = g.current_user["name"]
    return jsonify(db.create_entry(body)), 201


@bp.put("/api/entries/<int:entry_id>")
@require_auth
def update_entry(entry_id):
    body = request.get_json(force=True, silent=True) or {}
    body["lastEditor"] = g.current_user["name"]
    updated = db.update_entry(entry_id, body)
    if not updated:
        return jsonify({"error": "Registro não encontrado."}), 404
    return jsonify(updated)


@bp.delete("/api/entries/<int:entry_id>")
@require_auth
def delete_entry(entry_id):
    if not db.delete_entry(entry_id):
        return jsonify({"error": "Registro não encontrado."}), 404
    return "", 204
