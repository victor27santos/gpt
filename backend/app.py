"""Pegasus backend: persistence + AI routes consumed by the React front-end.

Run with: python app.py  (reads ANTHROPIC_API_KEY / ANTHROPIC_MODEL from .env)
"""
import os
import socket
from pathlib import Path

from dotenv import load_dotenv
from flask import Flask, jsonify, send_from_directory
from flask_cors import CORS
from werkzeug.exceptions import HTTPException

load_dotenv()

import db
from routes.ai import bp as ai_bp
from routes.entries import bp as entries_bp
from routes.events import bp as events_bp
from routes.fichas import bp as fichas_bp
from routes.library import bp as library_bp
from routes.sectors import bp as sectors_bp
from routes.uploads import bp as uploads_bp

UPLOAD_DIR = Path(__file__).parent / "uploads"

app = Flask(__name__)
app.config["MAX_CONTENT_LENGTH"] = 25 * 1024 * 1024  # 25MB, matches routes/uploads.py
CORS(app)

db.init_db()
UPLOAD_DIR.mkdir(exist_ok=True)

for blueprint in (ai_bp, sectors_bp, fichas_bp, entries_bp, events_bp, library_bp, uploads_bp):
    app.register_blueprint(blueprint)


@app.get("/uploads/<path:filename>")
def serve_upload(filename):
    return send_from_directory(UPLOAD_DIR, filename)


@app.errorhandler(Exception)
def handle_unexpected_error(exc):
    # Never leak stack traces / file paths to clients on the LAN. The full
    # traceback still goes to the server's own console via app.logger.
    if isinstance(exc, HTTPException):
        return exc
    app.logger.exception("Erro não tratado")
    return jsonify({"error": "Erro interno no servidor. Veja o log do backend para detalhes."}), 500


def _lan_ip():
    # Doesn't actually send anything (UDP), just asks the OS which local
    # interface it would use to reach the internet, to report the address
    # other devices on the LAN should use.
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        s.connect(("8.8.8.8", 80))
        return s.getsockname()[0]
    except OSError:
        return None
    finally:
        s.close()


if __name__ == "__main__":
    debug = os.environ.get("FLASK_DEBUG") == "1"
    host = os.environ.get("HOST", "0.0.0.0")
    port = int(os.environ.get("PORT", "5000"))

    if host in ("0.0.0.0", "::"):
        lan_ip = _lan_ip()
        print(f" * Backend acessível nesta máquina em: http://127.0.0.1:{port}")
        if lan_ip:
            print(f" * Backend acessível pela rede local em: http://{lan_ip}:{port}")
            print(f"   (outros dispositivos devem abrir o front-end em http://{lan_ip}:5173)")
        print(" * Defina HOST=127.0.0.1 no .env para restringir a apenas esta máquina.")

    app.run(host=host, port=port, debug=debug)
