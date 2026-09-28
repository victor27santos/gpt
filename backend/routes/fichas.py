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


@bp.put("/api/fichas/<int:ficha_id>")
@require_auth
def update_ficha(ficha_id):
    body = request.get_json(force=True, silent=True) or {}
    if "equipamento" in body and not (body.get("equipamento") or "").strip():
        return jsonify({"error": "Campo 'equipamento' não pode ficar vazio."}), 400
    if "patrimonio" in body and not (body.get("patrimonio") or "").strip():
        return jsonify({"error": "Campo 'patrimonio' não pode ficar vazio."}), 400
    updated = db.update_ficha(ficha_id, body)
    if not updated:
        return jsonify({"error": "Ficha não encontrada."}), 404
    return jsonify(updated)


@bp.delete("/api/fichas/<int:ficha_id>")
@require_auth
def delete_ficha(ficha_id):
    if not db.delete_ficha(ficha_id):
        return jsonify({"error": "Ficha não encontrada."}), 404
    return "", 204
