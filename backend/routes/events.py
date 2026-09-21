from flask import Blueprint, jsonify, request

import db

bp = Blueprint("events", __name__)


@bp.get("/api/events")
def list_events():
    return jsonify(db.list_events())


@bp.post("/api/events")
def create_event():
    body = request.get_json(force=True, silent=True) or {}
    if not (body.get("title") or "").strip() or not (body.get("date") or "").strip():
        return jsonify({"error": "Campos 'title' e 'date' são obrigatórios."}), 400
    return jsonify(db.create_event(body)), 201
