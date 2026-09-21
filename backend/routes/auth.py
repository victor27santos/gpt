from flask import Blueprint, g, jsonify, request
from werkzeug.security import check_password_hash, generate_password_hash

import db
from auth import make_token, require_auth
from roles import ROLES

bp = Blueprint("auth", __name__)


def _public_user(user):
    return {"name": user["name"], "username": user["username"], "roleId": user["role_id"]}


@bp.post("/api/auth/register")
def register():
    body = request.get_json(force=True, silent=True) or {}
    name = (body.get("name") or "").strip()
    username = (body.get("username") or "").strip().lower()
    password = body.get("password") or ""
    role_id = body.get("roleId")

    if not name or not username:
        return jsonify({"error": "Preencha nome e usuário."}), 400
    if len(password) < 6:
        return jsonify({"error": "A senha precisa ter pelo menos 6 caracteres."}), 400
    if role_id not in ROLES:
        return jsonify({"error": "Perfil inválido."}), 400

    user = db.create_user(name, username, generate_password_hash(password), role_id)
    if not user:
        return jsonify({"error": "Esse nome de usuário já existe. Escolha outro."}), 409

    token = make_token(user)
    return jsonify({"token": token, "user": _public_user(user)}), 201


@bp.post("/api/auth/login")
def login():
    body = request.get_json(force=True, silent=True) or {}
    username = (body.get("username") or "").strip().lower()
    password = body.get("password") or ""

    user = db.get_user_by_username(username)
    if not user or not check_password_hash(user["password_hash"], password):
        return jsonify({"error": "Usuário ou senha incorretos."}), 401

    token = make_token(user)
    return jsonify({"token": token, "user": _public_user(user)})


@bp.get("/api/auth/me")
@require_auth
def me():
    user = db.get_user_by_id(g.current_user["sub"])
    if not user:
        return jsonify({"error": "Usuário não encontrado."}), 404
    return jsonify({"user": _public_user(user)})
