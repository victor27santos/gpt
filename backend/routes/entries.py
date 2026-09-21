from flask import Blueprint, jsonify, request

import db

bp = Blueprint("entries", __name__)


@bp.get("/api/entries")
def list_entries():
    return jsonify(db.list_entries())


@bp.post("/api/entries")
def create_entry():
    body = request.get_json(force=True, silent=True) or {}
    return jsonify(db.create_entry(body)), 201


@bp.put("/api/entries/<int:entry_id>")
def update_entry(entry_id):
    body = request.get_json(force=True, silent=True) or {}
    updated = db.update_entry(entry_id, body)
    if not updated:
        return jsonify({"error": "Registro não encontrado."}), 404
    return jsonify(updated)


@bp.delete("/api/entries/<int:entry_id>")
def delete_entry(entry_id):
    if not db.delete_entry(entry_id):
        return jsonify({"error": "Registro não encontrado."}), 404
    return "", 204
