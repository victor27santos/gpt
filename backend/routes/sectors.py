from flask import Blueprint, jsonify, request

import db

bp = Blueprint("sectors", __name__)


@bp.get("/api/sectors")
def list_sectors():
    return jsonify(db.get_sectors_full())


@bp.post("/api/sectors/<sector_id>/pendings")
def create_pending(sector_id):
    body = request.get_json(force=True, silent=True) or {}
    if not (body.get("description") or "").strip():
        return jsonify({"error": "Campo 'description' é obrigatório."}), 400
    pending = db.create_pending(sector_id, body)
    if not pending:
        return jsonify({"error": "Setor não encontrado."}), 404
    return jsonify(pending), 201


@bp.patch("/api/pendings/<int:pending_id>/status")
def update_pending_status(pending_id):
    body = request.get_json(force=True, silent=True) or {}
    status = body.get("status")
    if not status:
        return jsonify({"error": "Campo 'status' é obrigatório."}), 400
    pending = db.update_pending_status(pending_id, status, body.get("author"))
    if not pending:
        return jsonify({"error": "Pendência não encontrada."}), 404
    return jsonify(pending)


@bp.post("/api/pendings/<int:pending_id>/updates")
def add_pending_update(pending_id):
    body = request.get_json(force=True, silent=True) or {}
    text = (body.get("text") or "").strip()
    if not text:
        return jsonify({"error": "Campo 'text' é obrigatório."}), 400
    pending = db.add_pending_update(pending_id, text, body.get("author"))
    if not pending:
        return jsonify({"error": "Pendência não encontrada."}), 404
    return jsonify(pending)


@bp.post("/api/sectors/<sector_id>/improvements")
def create_improvement(sector_id):
    body = request.get_json(force=True, silent=True) or {}
    if not (body.get("title") or "").strip():
        return jsonify({"error": "Campo 'title' é obrigatório."}), 400
    improvement = db.create_improvement(sector_id, body)
    if not improvement:
        return jsonify({"error": "Setor não encontrado."}), 404
    return jsonify(improvement), 201


@bp.post("/api/improvements/<int:improvement_id>/comments")
def add_improvement_comment(improvement_id):
    body = request.get_json(force=True, silent=True) or {}
    text = (body.get("text") or "").strip()
    if not text:
        return jsonify({"error": "Campo 'text' é obrigatório."}), 400
    improvement = db.add_improvement_comment(
        improvement_id, text, body.get("author"), body.get("authorRole")
    )
    if not improvement:
        return jsonify({"error": "Melhoria não encontrada."}), 404
    return jsonify(improvement)
