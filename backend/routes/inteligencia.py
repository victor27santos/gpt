from flask import Blueprint, jsonify

import db
import inteligencia
from auth import require_auth

bp = Blueprint("inteligencia", __name__)


@bp.get("/api/inteligencia")
@require_auth
def painel():
    fichas, pendings, sectors, subs = db.get_intelligence_inputs()
    return jsonify(inteligencia.analisar(fichas, pendings, sectors, subs))
