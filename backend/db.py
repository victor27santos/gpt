"""SQLite persistence for the whole Pegasus backend.

Single connection-per-call style (sqlite3, short-lived connections) is
plenty for a small hospital team on one server; no ORM needed at this size.
"""
import sqlite3
from datetime import datetime, timezone
from pathlib import Path

DB_PATH = Path(__file__).parent / "data" / "pegasus.db"


def get_conn():
    DB_PATH.parent.mkdir(exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def _today():
    return datetime.now(timezone.utc).strftime("%d/%m/%Y")


SCHEMA = """
CREATE TABLE IF NOT EXISTS sectors (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    areas TEXT,
    description TEXT,
    has_sub_sectors INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS sub_sectors (
    id TEXT PRIMARY KEY,
    sector_id TEXT NOT NULL REFERENCES sectors(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT
);
CREATE TABLE IF NOT EXISTS pendings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sector_id TEXT NOT NULL REFERENCES sectors(id) ON DELETE CASCADE,
    sub_sector_id TEXT,
    type TEXT,
    description TEXT NOT NULL,
    reason TEXT,
    status TEXT NOT NULL DEFAULT 'Aberto',
    author TEXT,
    date TEXT,
    last_editor TEXT,
    last_edit_date TEXT
);
CREATE TABLE IF NOT EXISTS pending_updates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    pending_id INTEGER NOT NULL REFERENCES pendings(id) ON DELETE CASCADE,
    text TEXT NOT NULL,
    author TEXT,
    date TEXT
);
CREATE TABLE IF NOT EXISTS improvements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sector_id TEXT NOT NULL REFERENCES sectors(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    author TEXT,
    author_role TEXT,
    date TEXT
);
CREATE TABLE IF NOT EXISTS improvement_comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    improvement_id INTEGER NOT NULL REFERENCES improvements(id) ON DELETE CASCADE,
    text TEXT NOT NULL,
    author TEXT,
    author_role TEXT,
    date TEXT
);
CREATE TABLE IF NOT EXISTS fichas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    equipamento TEXT,
    fabricante TEXT,
    modelo TEXT,
    patrimonio TEXT,
    setor TEXT,
    instalacao TEXT,
    ultima_calib TEXT,
    prox_calib TEXT,
    status TEXT,
    especificacoes TEXT
);
CREATE TABLE IF NOT EXISTS ficha_custom_fields (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ficha_id INTEGER NOT NULL REFERENCES fichas(id) ON DELETE CASCADE,
    key TEXT,
    value TEXT
);
CREATE TABLE IF NOT EXISTS entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT,
    equipment TEXT,
    category TEXT,
    description TEXT,
    solution TEXT,
    media_url TEXT,
    media_type TEXT,
    date TEXT,
    author TEXT,
    created_at TEXT,
    last_editor TEXT,
    last_edit_date TEXT
);
CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT,
    date TEXT,
    assigned_to TEXT,
    priority TEXT DEFAULT 'normal',
    description TEXT
);
CREATE TABLE IF NOT EXISTS library_docs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT,
    equipment TEXT,
    sector_id TEXT,
    category TEXT,
    type TEXT,
    date TEXT,
    author TEXT,
    desc TEXT,
    media_url TEXT
);
CREATE TABLE IF NOT EXISTS knowledge (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT,
    equipment TEXT,
    description TEXT,
    solution TEXT,
    category TEXT,
    author TEXT,
    created_at TEXT
);
CREATE TABLE IF NOT EXISTS email_triage (
    original_assunto TEXT PRIMARY KEY,
    original_remetente TEXT,
    urgencia TEXT,
    categoria TEXT,
    equipamento TEXT,
    resumo TEXT,
    acao_sugerida TEXT,
    triaged_at TEXT
);
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role_id TEXT NOT NULL,
    created_at TEXT
);
"""


def init_db():
    conn = get_conn()
    conn.executescript(SCHEMA)
    conn.commit()
    conn.close()
    _seed_if_empty()


def _seed_if_empty():
    conn = get_conn()
    count = conn.execute("SELECT COUNT(*) AS c FROM sectors").fetchone()["c"]
    if count > 0:
        conn.close()
        return

    sectors_seed = [
        ("floor-7", "7º Andar", "Internação", "Unidade de internação geral.", 0, []),
        (
            "floor-5", "5º Andar", "Internação e UTI", "Unidade mista de alta complexidade.", 1,
            [("uti_5", "UTI Adulto", "Cuidado intensivo e Terapia Renal.")],
        ),
        (
            "floor-2", "2º Andar", "Centro Cirúrgico", "Bloco operatório de alta complexidade.", 1,
            [("cc_principal", "CC Principal", "Cirurgias de grande porte.")],
        ),
        (
            "floor-0", "Térreo", "CDI, Farmácia e PS", "Áreas de apoio crítico.", 1,
            [("cdi", "CDI", "Centro de Diagnóstico por Imagem.")],
        ),
    ]
    for sid, name, areas, desc, has_sub, subs in sectors_seed:
        conn.execute(
            "INSERT INTO sectors (id, name, areas, description, has_sub_sectors) VALUES (?, ?, ?, ?, ?)",
            (sid, name, areas, desc, has_sub),
        )
        for sub_id, sub_name, sub_desc in subs:
            conn.execute(
                "INSERT INTO sub_sectors (id, sector_id, name, description) VALUES (?, ?, ?, ?)",
                (sub_id, sid, sub_name, sub_desc),
            )

    fichas_seed = [
        (
            "Monitor Multiparamétrico", "Dixtal", "DX2020", "100123", "UTI Adulto",
            "2023-05-10", "2025-10-15", "2026-10-15", "Ativo",
            "ECG, SpO2, PNI, PI, Capnografia.",
            [("Tensão", "Bivolt Automático"), ("Bateria", "Li-ion 4h")],
        ),
        (
            "Ventilador Pulmonar", "Puritan Bennett", "PB840", "200456", "UTI Adulto",
            "2021-02-20", "2026-01-10", "2026-07-10", "Ativo",
            "Ventilação invasiva e não invasiva, modos VCV e PCV.", [],
        ),
    ]
    for equip, fab, modelo, pat, setor, inst, ultima, prox, status, esp, custom in fichas_seed:
        cur = conn.execute(
            """INSERT INTO fichas (equipamento, fabricante, modelo, patrimonio, setor, instalacao,
               ultima_calib, prox_calib, status, especificacoes)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (equip, fab, modelo, pat, setor, inst, ultima, prox, status, esp),
        )
        ficha_id = cur.lastrowid
        for key, value in custom:
            conn.execute(
                "INSERT INTO ficha_custom_fields (ficha_id, key, value) VALUES (?, ?, ?)",
                (ficha_id, key, value),
            )

    conn.execute(
        """INSERT INTO library_docs (title, equipment, sector_id, category, type, date, author, desc, media_url)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        (
            "Manual PB840", "Ventilador PB840", "floor-5", "procedimentos", "pdf",
            "10/01/2026", "Engenharia Clínica", "Calibração e desmontagem.", None,
        ),
    )

    conn.commit()
    conn.close()


# --- sectors / pendings / improvements -------------------------------------------------

def get_sectors_full():
    conn = get_conn()
    sectors = conn.execute("SELECT * FROM sectors ORDER BY rowid ASC").fetchall()
    result = []
    for sector in sectors:
        sub_sectors = conn.execute(
            "SELECT * FROM sub_sectors WHERE sector_id = ? ORDER BY rowid ASC", (sector["id"],)
        ).fetchall()

        pendings_rows = conn.execute(
            "SELECT * FROM pendings WHERE sector_id = ? ORDER BY id ASC", (sector["id"],)
        ).fetchall()
        pendings = []
        for p in pendings_rows:
            updates = conn.execute(
                "SELECT * FROM pending_updates WHERE pending_id = ? ORDER BY id ASC", (p["id"],)
            ).fetchall()
            pendings.append(_serialize_pending(p, updates))

        improvements_rows = conn.execute(
            "SELECT * FROM improvements WHERE sector_id = ? ORDER BY id DESC", (sector["id"],)
        ).fetchall()
        improvements = []
        for imp in improvements_rows:
            comments = conn.execute(
                "SELECT * FROM improvement_comments WHERE improvement_id = ? ORDER BY id ASC",
                (imp["id"],),
            ).fetchall()
            improvements.append(_serialize_improvement(imp, comments))

        result.append(
            {
                "id": sector["id"],
                "name": sector["name"],
                "areas": sector["areas"],
                "description": sector["description"],
                "hasSubSectors": bool(sector["has_sub_sectors"]),
                "subSectors": [
                    {"id": s["id"], "name": s["name"], "description": s["description"]}
                    for s in sub_sectors
                ],
                "pendings": pendings,
                "improvements": improvements,
            }
        )
    conn.close()
    return result


def _serialize_pending(row, updates):
    return {
        "id": row["id"],
        "type": row["type"],
        "description": row["description"],
        "reason": row["reason"],
        "status": row["status"],
        "author": row["author"],
        "date": row["date"],
        "subSectorId": row["sub_sector_id"],
        "lastEditor": row["last_editor"],
        "lastEditDate": row["last_edit_date"],
        "updates": [
            {"id": u["id"], "text": u["text"], "author": u["author"], "date": u["date"]}
            for u in updates
        ],
    }


def _serialize_improvement(row, comments):
    return {
        "id": row["id"],
        "title": row["title"],
        "description": row["description"],
        "author": row["author"],
        "authorRole": row["author_role"],
        "date": row["date"],
        "comments": [
            {
                "id": c["id"],
                "text": c["text"],
                "author": c["author"],
                "authorRole": c["author_role"],
                "date": c["date"],
            }
            for c in comments
        ],
    }


def create_pending(sector_id, data):
    conn = get_conn()
    if not conn.execute("SELECT 1 FROM sectors WHERE id = ?", (sector_id,)).fetchone():
        conn.close()
        return None
    date = data.get("date") or _today()
    cur = conn.execute(
        """INSERT INTO pendings (sector_id, sub_sector_id, type, description, reason, status, author, date)
           VALUES (?, ?, ?, ?, ?, 'Aberto', ?, ?)""",
        (
            sector_id,
            data.get("subSectorId"),
            data.get("type", "Corretiva"),
            data.get("description"),
            data.get("reason"),
            data.get("author"),
            date,
        ),
    )
    conn.commit()
    row = conn.execute("SELECT * FROM pendings WHERE id = ?", (cur.lastrowid,)).fetchone()
    conn.close()
    return _serialize_pending(row, [])


def update_pending_status(pending_id, status, author):
    conn = get_conn()
    row = conn.execute("SELECT * FROM pendings WHERE id = ?", (pending_id,)).fetchone()
    if not row:
        conn.close()
        return None
    edit_date = _today()
    conn.execute(
        "UPDATE pendings SET status = ?, last_editor = ?, last_edit_date = ? WHERE id = ?",
        (status, author, edit_date, pending_id),
    )
    conn.execute(
        "INSERT INTO pending_updates (pending_id, text, author, date) VALUES (?, ?, ?, ?)",
        (pending_id, f"Status alterado para: {status}", author, edit_date),
    )
    conn.commit()
    updated_row = conn.execute("SELECT * FROM pendings WHERE id = ?", (pending_id,)).fetchone()
    updates = conn.execute(
        "SELECT * FROM pending_updates WHERE pending_id = ? ORDER BY id ASC", (pending_id,)
    ).fetchall()
    conn.close()
    return _serialize_pending(updated_row, updates)


def add_pending_update(pending_id, text, author):
    conn = get_conn()
    row = conn.execute("SELECT * FROM pendings WHERE id = ?", (pending_id,)).fetchone()
    if not row:
        conn.close()
        return None
    date = _today()
    conn.execute(
        "INSERT INTO pending_updates (pending_id, text, author, date) VALUES (?, ?, ?, ?)",
        (pending_id, text, author, date),
    )
    conn.commit()
    updated_row = conn.execute("SELECT * FROM pendings WHERE id = ?", (pending_id,)).fetchone()
    updates = conn.execute(
        "SELECT * FROM pending_updates WHERE pending_id = ? ORDER BY id ASC", (pending_id,)
    ).fetchall()
    conn.close()
    return _serialize_pending(updated_row, updates)


def create_improvement(sector_id, data):
    conn = get_conn()
    if not conn.execute("SELECT 1 FROM sectors WHERE id = ?", (sector_id,)).fetchone():
        conn.close()
        return None
    date = data.get("date") or _today()
    cur = conn.execute(
        "INSERT INTO improvements (sector_id, title, description, author, author_role, date) VALUES (?, ?, ?, ?, ?, ?)",
        (sector_id, data.get("title"), data.get("description"), data.get("author"), data.get("authorRole"), date),
    )
    conn.commit()
    row = conn.execute("SELECT * FROM improvements WHERE id = ?", (cur.lastrowid,)).fetchone()
    conn.close()
    return _serialize_improvement(row, [])


def add_improvement_comment(improvement_id, text, author, author_role):
    conn = get_conn()
    row = conn.execute("SELECT * FROM improvements WHERE id = ?", (improvement_id,)).fetchone()
    if not row:
        conn.close()
        return None
    date = _today()
    conn.execute(
        "INSERT INTO improvement_comments (improvement_id, text, author, author_role, date) VALUES (?, ?, ?, ?, ?)",
        (improvement_id, text, author, author_role, date),
    )
    conn.commit()
    updated_row = conn.execute("SELECT * FROM improvements WHERE id = ?", (improvement_id,)).fetchone()
    comments = conn.execute(
        "SELECT * FROM improvement_comments WHERE improvement_id = ? ORDER BY id ASC", (improvement_id,)
    ).fetchall()
    conn.close()
    return _serialize_improvement(updated_row, comments)


# --- fichas ------------------------------------------------------------------------------

def _serialize_ficha(row, custom_fields):
    return {
        "id": row["id"],
        "equipamento": row["equipamento"],
        "fabricante": row["fabricante"],
        "modelo": row["modelo"],
        "patrimonio": row["patrimonio"],
        "setor": row["setor"],
        "instalacao": row["instalacao"],
        "ultimaCalib": row["ultima_calib"],
        "proxCalib": row["prox_calib"],
        "status": row["status"],
        "especificacoes": row["especificacoes"],
        "customFields": [{"key": c["key"], "value": c["value"]} for c in custom_fields],
    }


def list_fichas():
    conn = get_conn()
    rows = conn.execute("SELECT * FROM fichas ORDER BY id DESC").fetchall()
    result = []
    for row in rows:
        cf = conn.execute(
            "SELECT key, value FROM ficha_custom_fields WHERE ficha_id = ?", (row["id"],)
        ).fetchall()
        result.append(_serialize_ficha(row, cf))
    conn.close()
    return result


def create_ficha(data):
    conn = get_conn()
    cur = conn.execute(
        """INSERT INTO fichas (equipamento, fabricante, modelo, patrimonio, setor, instalacao,
           ultima_calib, prox_calib, status, especificacoes)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        (
            data.get("equipamento"),
            data.get("fabricante"),
            data.get("modelo"),
            data.get("patrimonio"),
            data.get("setor"),
            data.get("instalacao"),
            data.get("ultimaCalib"),
            data.get("proxCalib"),
            data.get("status", "Ativo"),
            data.get("especificacoes"),
        ),
    )
    ficha_id = cur.lastrowid
    for field in data.get("customFields") or []:
        if not field.get("key") and not field.get("value"):
            continue
        conn.execute(
            "INSERT INTO ficha_custom_fields (ficha_id, key, value) VALUES (?, ?, ?)",
            (ficha_id, field.get("key"), field.get("value")),
        )
    conn.commit()
    row = conn.execute("SELECT * FROM fichas WHERE id = ?", (ficha_id,)).fetchone()
    cf = conn.execute("SELECT key, value FROM ficha_custom_fields WHERE ficha_id = ?", (ficha_id,)).fetchall()
    conn.close()
    return _serialize_ficha(row, cf)


# --- entries (processos) ------------------------------------------------------------------

def _serialize_entry(row):
    return {
        "id": row["id"],
        "title": row["title"],
        "equipment": row["equipment"],
        "category": row["category"],
        "description": row["description"],
        "solution": row["solution"],
        "mediaUrl": row["media_url"],
        "mediaType": row["media_type"],
        "date": row["date"],
        "author": row["author"],
        "createdAt": row["created_at"],
        "lastEditor": row["last_editor"],
        "lastEditDate": row["last_edit_date"],
    }


def list_entries():
    conn = get_conn()
    rows = conn.execute("SELECT * FROM entries ORDER BY id DESC").fetchall()
    conn.close()
    return [_serialize_entry(r) for r in rows]


def create_entry(data):
    conn = get_conn()
    cur = conn.execute(
        """INSERT INTO entries (title, equipment, category, description, solution, media_url, media_type, date, author, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        (
            data.get("title"),
            data.get("equipment"),
            data.get("category"),
            data.get("description"),
            data.get("solution"),
            data.get("mediaUrl"),
            data.get("mediaType"),
            data.get("date") or _today(),
            data.get("author"),
            data.get("createdAt") or datetime.now(timezone.utc).isoformat(),
        ),
    )
    conn.commit()
    row = conn.execute("SELECT * FROM entries WHERE id = ?", (cur.lastrowid,)).fetchone()
    conn.close()
    return _serialize_entry(row)


def update_entry(entry_id, data):
    conn = get_conn()
    row = conn.execute("SELECT * FROM entries WHERE id = ?", (entry_id,)).fetchone()
    if not row:
        conn.close()
        return None
    conn.execute(
        """UPDATE entries SET title = ?, equipment = ?, category = ?, description = ?, solution = ?,
           media_url = ?, media_type = ?, last_editor = ?, last_edit_date = ? WHERE id = ?""",
        (
            data.get("title", row["title"]),
            data.get("equipment", row["equipment"]),
            data.get("category", row["category"]),
            data.get("description", row["description"]),
            data.get("solution", row["solution"]),
            data.get("mediaUrl", row["media_url"]),
            data.get("mediaType", row["media_type"]),
            data.get("lastEditor"),
            data.get("lastEditDate"),
            entry_id,
        ),
    )
    conn.commit()
    updated = conn.execute("SELECT * FROM entries WHERE id = ?", (entry_id,)).fetchone()
    conn.close()
    return _serialize_entry(updated)


def delete_entry(entry_id):
    conn = get_conn()
    cur = conn.execute("DELETE FROM entries WHERE id = ?", (entry_id,))
    conn.commit()
    deleted = cur.rowcount > 0
    conn.close()
    return deleted


# --- events (agenda) -----------------------------------------------------------------------

def _serialize_event(row):
    return {
        "id": row["id"],
        "title": row["title"],
        "date": row["date"],
        "assignedTo": row["assigned_to"],
        "priority": row["priority"],
        "description": row["description"],
    }


def list_events():
    conn = get_conn()
    rows = conn.execute("SELECT * FROM events ORDER BY id ASC").fetchall()
    conn.close()
    return [_serialize_event(r) for r in rows]


def create_event(data):
    conn = get_conn()
    cur = conn.execute(
        "INSERT INTO events (title, date, assigned_to, priority, description) VALUES (?, ?, ?, ?, ?)",
        (
            data.get("title"),
            data.get("date"),
            data.get("assignedTo"),
            data.get("priority", "normal"),
            data.get("description"),
        ),
    )
    conn.commit()
    row = conn.execute("SELECT * FROM events WHERE id = ?", (cur.lastrowid,)).fetchone()
    conn.close()
    return _serialize_event(row)


# --- library docs --------------------------------------------------------------------------

def _serialize_doc(row):
    return {
        "id": row["id"],
        "title": row["title"],
        "equipment": row["equipment"],
        "sectorId": row["sector_id"],
        "category": row["category"],
        "type": row["type"],
        "date": row["date"],
        "author": row["author"],
        "desc": row["desc"],
        "mediaUrl": row["media_url"],
    }


def list_library_docs():
    conn = get_conn()
    rows = conn.execute("SELECT * FROM library_docs ORDER BY id DESC").fetchall()
    conn.close()
    return [_serialize_doc(r) for r in rows]


def create_library_doc(data):
    conn = get_conn()
    cur = conn.execute(
        """INSERT INTO library_docs (title, equipment, sector_id, category, type, date, author, desc, media_url)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        (
            data.get("title"),
            data.get("equipment"),
            data.get("sectorId"),
            data.get("category"),
            data.get("type"),
            data.get("date") or _today(),
            data.get("author"),
            data.get("desc"),
            data.get("mediaUrl"),
        ),
    )
    conn.commit()
    row = conn.execute("SELECT * FROM library_docs WHERE id = ?", (cur.lastrowid,)).fetchone()
    conn.close()
    return _serialize_doc(row)


# --- knowledge base + email triage cache (used by the AI routes) ---------------------------

def save_knowledge(entry):
    conn = get_conn()
    cur = conn.execute(
        """INSERT INTO knowledge (title, equipment, description, solution, category, author, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)""",
        (
            entry.get("title"),
            entry.get("equipment"),
            entry.get("description"),
            entry.get("solution"),
            entry.get("category"),
            entry.get("author"),
            entry.get("date") or datetime.now(timezone.utc).isoformat(),
        ),
    )
    conn.commit()
    row_id = cur.lastrowid
    conn.close()
    return row_id


def search_knowledge(query, limit=5):
    conn = get_conn()
    like = f"%{query}%"
    rows = conn.execute(
        """SELECT * FROM knowledge
           WHERE equipment LIKE ? OR title LIKE ? OR description LIKE ? OR solution LIKE ?
           ORDER BY id DESC LIMIT ?""",
        (like, like, like, like, limit),
    ).fetchall()
    conn.close()
    return [dict(r) for r in rows]


def get_cached_triage(subject):
    conn = get_conn()
    row = conn.execute(
        "SELECT * FROM email_triage WHERE original_assunto = ?", (subject,)
    ).fetchone()
    conn.close()
    return dict(row) if row else None


def save_triage(item):
    conn = get_conn()
    conn.execute(
        """INSERT OR REPLACE INTO email_triage
           (original_assunto, original_remetente, urgencia, categoria, equipamento, resumo, acao_sugerida, triaged_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
        (
            item["original_assunto"],
            item["original_remetente"],
            item["urgencia"],
            item["categoria"],
            item.get("equipamento"),
            item["resumo"],
            item["acao_sugerida"],
            datetime.now(timezone.utc).isoformat(),
        ),
    )
    conn.commit()
    conn.close()


# --- users -------------------------------------------------------------------------------

def create_user(name, username, password_hash, role_id):
    conn = get_conn()
    if conn.execute("SELECT 1 FROM users WHERE username = ?", (username,)).fetchone():
        conn.close()
        return None
    cur = conn.execute(
        "INSERT INTO users (name, username, password_hash, role_id, created_at) VALUES (?, ?, ?, ?, ?)",
        (name, username, password_hash, role_id, datetime.now(timezone.utc).isoformat()),
    )
    conn.commit()
    row = conn.execute("SELECT * FROM users WHERE id = ?", (cur.lastrowid,)).fetchone()
    conn.close()
    return dict(row)


def get_user_by_username(username):
    conn = get_conn()
    row = conn.execute("SELECT * FROM users WHERE username = ?", (username,)).fetchone()
    conn.close()
    return dict(row) if row else None


def get_user_by_id(user_id):
    conn = get_conn()
    row = conn.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
    conn.close()
    return dict(row) if row else None
