"""Real inbox (IMAP) + AI triage for the 'Agente de Triagem IA' view.

Reads unread messages from a real mailbox via IMAP (Gmail by default —
imap.gmail.com needs an "app password", not the regular account password)
and classifies each one with the AI. Configure EMAIL_IMAP_USER and
EMAIL_IMAP_PASSWORD in backend/.env (see .env.example).
"""
import email
import imaplib
import os
import re
from email.header import decode_header
from email.utils import parseaddr

import db
import llm

IMAP_HOST = os.environ.get("EMAIL_IMAP_HOST", "imap.gmail.com")
IMAP_USER = os.environ.get("EMAIL_IMAP_USER")
IMAP_PASSWORD = os.environ.get("EMAIL_IMAP_PASSWORD")
MAX_MESSAGES = int(os.environ.get("EMAIL_MAX_MESSAGES", "20"))

TRIAGE_SYSTEM_PROMPT = """Você é um assistente de engenharia clínica hospitalar que faz a \
triagem de e-mails recebidos pela equipe de manutenção. Para o e-mail informado, responda \
SOMENTE com um objeto JSON no formato exato:
{
  "urgencia": "ALTA" ou "MEDIA" ou "BAIXA",
  "categoria": categoria curta, ex. "Corretiva", "Preventiva", "Calibração", "Administrativo",
  "equipamento": nome do equipamento citado, ou null se nenhum for citado,
  "resumo": uma frase curta resumindo o problema ou pedido,
  "acao_sugerida": uma frase curta com a próxima ação recomendada para a equipe técnica
}"""


def _decode(value):
    if not value:
        return ""
    parts = decode_header(value)
    decoded = ""
    for text, enc in parts:
        decoded += text.decode(enc or "utf-8", errors="replace") if isinstance(text, bytes) else text
    return decoded


def _strip_html(html):
    text = re.sub(r"<(script|style)[^>]*>.*?</\1>", " ", html, flags=re.DOTALL | re.IGNORECASE)
    text = re.sub(r"<[^>]+>", " ", text)
    return re.sub(r"\s+", " ", text).strip()


def _decode_part(part):
    charset = part.get_content_charset() or "utf-8"
    payload = part.get_payload(decode=True)
    if not payload:
        return ""
    try:
        return payload.decode(charset, errors="replace")
    except (LookupError, UnicodeDecodeError):
        return payload.decode("utf-8", errors="replace")


def _extract_body(msg):
    plain, html = None, None
    if msg.is_multipart():
        for part in msg.walk():
            if "attachment" in str(part.get("Content-Disposition") or ""):
                continue
            content_type = part.get_content_type()
            if content_type == "text/plain" and plain is None:
                plain = _decode_part(part)
            elif content_type == "text/html" and html is None:
                html = _decode_part(part)
    elif msg.get_content_type() == "text/html":
        html = _decode_part(msg)
    else:
        plain = _decode_part(msg)
    return (plain or _strip_html(html or "")).strip()


def _require_config():
    if not IMAP_USER or not IMAP_PASSWORD:
        raise RuntimeError(
            "EMAIL_IMAP_USER / EMAIL_IMAP_PASSWORD não configuradas em backend/.env — "
            "necessárias para ler a caixa de entrada real. Veja o README para como gerar "
            "uma senha de app do Gmail (não é a senha normal da conta)."
        )


def load_inbox():
    """Returns the most recent unread messages as dicts with assunto/remetente/corpo.
    Messages are left unread on the server — reprocessing is harmless since
    get_triaged_emails() below caches by subject."""
    _require_config()
    conn = imaplib.IMAP4_SSL(IMAP_HOST, timeout=20)
    try:
        conn.login(IMAP_USER, IMAP_PASSWORD)
        conn.select("INBOX", readonly=True)
        status, data = conn.search(None, "UNSEEN")
        if status != "OK":
            raise RuntimeError(f"Falha ao buscar e-mails na caixa de entrada (status {status}).")
        ids = data[0].split()[-MAX_MESSAGES:]

        messages = []
        for msg_id in reversed(ids):
            status, msg_data = conn.fetch(msg_id, "(RFC822)")
            if status != "OK" or not msg_data or not msg_data[0]:
                continue
            msg = email.message_from_bytes(msg_data[0][1])
            _, addr = parseaddr(msg.get("From"))
            messages.append(
                {
                    "assunto": _decode(msg.get("Subject")) or "(sem assunto)",
                    "remetente": addr or _decode(msg.get("From")),
                    "corpo": _extract_body(msg)[:4000],
                }
            )
        return messages
    except imaplib.IMAP4.error as exc:
        raise RuntimeError(f"Falha ao conectar/autenticar no e-mail ({IMAP_HOST}): {exc}") from exc
    finally:
        try:
            conn.logout()
        except Exception:
            pass


def triage_email(email_item):
    user_prompt = f"Assunto: {email_item['assunto']}\nRemetente: {email_item['remetente']}\nCorpo:\n{email_item['corpo']}"
    result = llm.ask_json(TRIAGE_SYSTEM_PROMPT, user_prompt)
    result["original_assunto"] = email_item["assunto"]
    result["original_remetente"] = email_item["remetente"]
    return result


def get_triaged_emails():
    results = []
    for email_item in load_inbox():
        cached = db.get_cached_triage(email_item["assunto"])
        if cached:
            results.append(cached)
            continue
        triaged = triage_email(email_item)
        db.save_triage(triaged)
        results.append(triaged)
    return results
