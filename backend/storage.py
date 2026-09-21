"""SQLite-backed persistence for the technical knowledge base and email triage cache."""
import sqlite3
from datetime import datetime, timezone
from pathlib import Path

DB_PATH = Path(__file__).parent / "data" / "pegasus.db"


def get_conn():
    DB_PATH.parent.mkdir(exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    conn = get_conn()
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS knowledge (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT,
            equipment TEXT,
            description TEXT,
            solution TEXT,
            category TEXT,
            author TEXT,
            created_at TEXT
        )
        """
    )
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS email_triage (
            original_assunto TEXT PRIMARY KEY,
            original_remetente TEXT,
            urgencia TEXT,
            categoria TEXT,
            equipamento TEXT,
            resumo TEXT,
            acao_sugerida TEXT,
            triaged_at TEXT
        )
        """
    )
    conn.commit()
    conn.close()


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
