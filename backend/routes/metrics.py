from flask import Blueprint, g, jsonify

import db
from auth import require_auth

bp = Blueprint("metrics", __name__)


@bp.get("/api/metrics")
@require_auth
def metrics():
    if g.current_user.get("roleId") != "coord":
        return jsonify({"error": "Apenas a Coordenação pode ver os indicadores."}), 403
    return jsonify(db.get_metrics())
