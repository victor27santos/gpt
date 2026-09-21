from flask import Blueprint, g, jsonify, request

import db
import emails as emails_module
import llm
from auth import require_auth

bp = Blueprint("ai", __name__)

MELHORAR_SYSTEM_PROMPT = """Você é um assistente técnico de engenharia clínica hospitalar. \
Um técnico vai te dar um relato informal sobre uma manutenção realizada. Transforme esse \
relato em um registro técnico profissional. Responda SOMENTE com um objeto JSON no formato \
exato:
{
  "titulo_sugerido": título curto e claro para o processo,
  "descricao_tecnica": descrição técnica objetiva do problema relatado,
  "solucao_passo_a_passo": passos da solução adotada, um por linha
}"""

ASSISTENTE_SYSTEM_PROMPT = """Você é o Consultor Pegasus, um assistente técnico de engenharia \
clínica hospitalar. Responda de forma objetiva e técnica, em português, usando o histórico de \
conhecimento fornecido como referência quando houver. Se a base de conhecimento não tiver \
informação suficiente, diga isso claramente e sugira os próximos passos de investigação."""


@bp.get("/api/health")
def health():
    return jsonify({"status": "ok"})


@bp.post("/api/melhorar_relato")
@require_auth
def melhorar_relato():
    body = request.get_json(force=True, silent=True) or {}
    texto = (body.get("texto") or "").strip()
    equipamento = (body.get("equipamento") or "").strip()
    if not texto or not equipamento:
        return jsonify({"error": "Campos 'texto' e 'equipamento' são obrigatórios."}), 400
    try:
        sugestao = llm.ask_json(
            MELHORAR_SYSTEM_PROMPT,
            f"Equipamento: {equipamento}\nRelato informal do técnico: {texto}",
        )
    except Exception as exc:
        return jsonify({"error": str(exc)}), 502
    return jsonify({"sugestao": sugestao})


@bp.post("/api/salvar_conhecimento")
@require_auth
def salvar_conhecimento():
    body = request.get_json(force=True, silent=True) or {}
    body["author"] = g.current_user["name"]
    row_id = db.save_knowledge(body)
    return jsonify({"status": "ok", "id": row_id})


@bp.post("/api/perguntar_assistente")
@require_auth
def perguntar_assistente():
    body = request.get_json(force=True, silent=True) or {}
    pergunta = (body.get("pergunta") or "").strip()
    if not pergunta:
        return jsonify({"error": "Campo 'pergunta' é obrigatório."}), 400

    contexto = db.search_knowledge(pergunta)
    contexto_txt = "\n\n".join(
        f"- {c['title']} ({c['equipment']}): {c['description']} | Solução: {c['solution']}"
        for c in contexto
    ) or "Nenhum registro relacionado encontrado na base de conhecimento."

    try:
        resposta = llm.ask_text(
            ASSISTENTE_SYSTEM_PROMPT,
            f"Base de conhecimento relacionada:\n{contexto_txt}\n\nPergunta do técnico: {pergunta}",
        )
    except Exception as exc:
        return jsonify({"error": str(exc)}), 502
    return jsonify({"resposta": resposta})


@bp.get("/api/emails")
@require_auth
def listar_emails():
    try:
        resultados = emails_module.get_triaged_emails()
    except Exception as exc:
        return jsonify({"error": str(exc)}), 502
    return jsonify(resultados)
