from flask import Blueprint, jsonify, request

import db
from auth import require_auth

bp = Blueprint("events", __name__)


@bp.get("/api/events")
@require_auth
def list_events():
    return jsonify(db.list_events())


@bp.post("/api/events")
@require_auth
def create_event():
    body = request.get_json(force=True, silent=True) or {}
    if not (body.get("title") or "").strip() or not (body.get("date") or "").strip():
        return jsonify({"error": "Campos 'title' e 'date' são obrigatórios."}), 400
    return jsonify(db.create_event(body)), 201


@bp.put("/api/events/<int:event_id>")
@require_auth
def update_event(event_id):
    body = request.get_json(force=True, silent=True) or {}
    if "title" in body and not (body.get("title") or "").strip():
        return jsonify({"error": "Campo 'title' não pode ficar vazio."}), 400
    if "date" in body and not (body.get("date") or "").strip():
        return jsonify({"error": "Campo 'date' não pode ficar vazio."}), 400
    updated = db.update_event(event_id, body)
    if not updated:
        return jsonify({"error": "Agendamento não encontrado."}), 404
    return jsonify(updated)


@bp.delete("/api/events/<int:event_id>")
@require_auth
def delete_event(event_id):
    if not db.delete_event(event_id):
        return jsonify({"error": "Agendamento não encontrado."}), 404
    return "", 204
