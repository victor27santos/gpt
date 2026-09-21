from flask import Blueprint, g, jsonify, request

import db
from auth import require_auth
from roles import ROLES

bp = Blueprint("sectors", __name__)


@bp.get("/api/sectors")
@require_auth
def list_sectors():
    return jsonify(db.get_sectors_full())


@bp.post("/api/sectors/<sector_id>/pendings")
@require_auth
def create_pending(sector_id):
    body = request.get_json(force=True, silent=True) or {}
    if not (body.get("description") or "").strip():
        return jsonify({"error": "Campo 'description' é obrigatório."}), 400
    body["author"] = g.current_user["name"]
    pending = db.create_pending(sector_id, body)
    if not pending:
        return jsonify({"error": "Setor não encontrado."}), 404
    return jsonify(pending), 201


@bp.patch("/api/pendings/<int:pending_id>/status")
@require_auth
def update_pending_status(pending_id):
    body = request.get_json(force=True, silent=True) or {}
    status = body.get("status")
    if not status:
        return jsonify({"error": "Campo 'status' é obrigatório."}), 400
    pending = db.update_pending_status(pending_id, status, g.current_user["name"])
    if not pending:
        return jsonify({"error": "Pendência não encontrada."}), 404
    return jsonify(pending)


@bp.post("/api/pendings/<int:pending_id>/updates")
@require_auth
def add_pending_update(pending_id):
    body = request.get_json(force=True, silent=True) or {}
    text = (body.get("text") or "").strip()
    if not text:
        return jsonify({"error": "Campo 'text' é obrigatório."}), 400
    pending = db.add_pending_update(pending_id, text, g.current_user["name"])
    if not pending:
        return jsonify({"error": "Pendência não encontrada."}), 404
    return jsonify(pending)


@bp.post("/api/sectors/<sector_id>/improvements")
@require_auth
def create_improvement(sector_id):
    body = request.get_json(force=True, silent=True) or {}
    if not (body.get("title") or "").strip():
        return jsonify({"error": "Campo 'title' é obrigatório."}), 400
    body["author"] = g.current_user["name"]
    body["authorRole"] = ROLES.get(g.current_user["roleId"], {}).get("label")
    improvement = db.create_improvement(sector_id, body)
    if not improvement:
        return jsonify({"error": "Setor não encontrado."}), 404
    return jsonify(improvement), 201


@bp.post("/api/improvements/<int:improvement_id>/comments")
@require_auth
def add_improvement_comment(improvement_id):
    body = request.get_json(force=True, silent=True) or {}
    text = (body.get("text") or "").strip()
    if not text:
        return jsonify({"error": "Campo 'text' é obrigatório."}), 400
    author_role = ROLES.get(g.current_user["roleId"], {}).get("label")
    improvement = db.add_improvement_comment(improvement_id, text, g.current_user["name"], author_role)
    if not improvement:
        return jsonify({"error": "Melhoria não encontrada."}), 404
    return jsonify(improvement)
