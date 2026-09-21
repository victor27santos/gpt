"""Simulated inbox + AI triage for the 'Agente de Triagem IA' view.

Reads from data/sample_inbox.json to stand in for a real mailbox. Swap
load_inbox() for an IMAP client later without touching the triage or
caching logic below.
"""
import json
from pathlib import Path

import db
import llm

INBOX_PATH = Path(__file__).parent / "data" / "sample_inbox.json"

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


def load_inbox():
    with open(INBOX_PATH, encoding="utf-8") as f:
        return json.load(f)


def triage_email(email):
    user_prompt = f"Assunto: {email['assunto']}\nRemetente: {email['remetente']}\nCorpo:\n{email['corpo']}"
    result = llm.ask_json(TRIAGE_SYSTEM_PROMPT, user_prompt)
    result["original_assunto"] = email["assunto"]
    result["original_remetente"] = email["remetente"]
    return result


def get_triaged_emails():
    results = []
    for email in load_inbox():
        cached = db.get_cached_triage(email["assunto"])
        if cached:
            results.append(cached)
            continue
        triaged = triage_email(email)
        db.save_triage(triaged)
        results.append(triaged)
    return results
