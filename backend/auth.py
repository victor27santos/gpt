"""JWT session handling for the Pegasus API."""
import os
import time
from functools import wraps

import jwt
from flask import g, jsonify, request

SECRET_KEY = os.environ.get("SECRET_KEY")
TOKEN_TTL_SECONDS = 60 * 60 * 24 * 30  # 30 days


def _require_secret():
    if not SECRET_KEY:
        raise RuntimeError(
            "SECRET_KEY não configurada. Copie backend/.env.example para backend/.env "
            "e gere uma chave (veja o comentário no arquivo)."
        )
    return SECRET_KEY


def make_token(user):
    payload = {
        "sub": user["id"],
        "name": user["name"],
        "username": user["username"],
        "roleId": user["role_id"],
        "exp": int(time.time()) + TOKEN_TTL_SECONDS,
    }
    return jwt.encode(payload, _require_secret(), algorithm="HS256")


def decode_token(token):
    return jwt.decode(token, _require_secret(), algorithms=["HS256"])


def require_auth(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        auth_header = request.headers.get("Authorization", "")
        if not auth_header.startswith("Bearer "):
            return jsonify({"error": "Não autenticado. Faça login novamente."}), 401
        token = auth_header[len("Bearer "):]
        try:
            payload = decode_token(token)
        except jwt.ExpiredSignatureError:
            return jsonify({"error": "Sessão expirada. Faça login novamente."}), 401
        except jwt.InvalidTokenError:
            return jsonify({"error": "Sessão inválida. Faça login novamente."}), 401
        g.current_user = payload
        return fn(*args, **kwargs)

    return wrapper
