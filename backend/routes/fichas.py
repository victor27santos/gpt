from flask import Blueprint, jsonify, request

import db
from auth import require_auth

bp = Blueprint("fichas", __name__)


@bp.get("/api/fichas")
@require_auth
def list_fichas():
    return jsonify(db.list_fichas())


@bp.post("/api/fichas")
@require_auth
def create_ficha():
    body = request.get_json(force=True, silent=True) or {}
    if not (body.get("equipamento") or "").strip() or not (body.get("patrimonio") or "").strip():
        return jsonify({"error": "Campos 'equipamento' e 'patrimonio' são obrigatórios."}), 400
    return jsonify(db.create_ficha(body)), 201
