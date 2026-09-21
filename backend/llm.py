"""Thin wrapper around the Anthropic API used by the Pegasus AI routes."""
import json
import os

from anthropic import Anthropic

MODEL = os.environ.get("ANTHROPIC_MODEL", "claude-sonnet-5")

_client = None


def get_client():
    global _client
    if _client is None:
        api_key = os.environ.get("ANTHROPIC_API_KEY")
        if not api_key:
            raise RuntimeError(
                "ANTHROPIC_API_KEY não configurada. Copie backend/.env.example para "
                "backend/.env e preencha sua chave da API Anthropic."
            )
        _client = Anthropic(api_key=api_key)
    return _client


def _complete(system_prompt, user_prompt, max_tokens):
    client = get_client()
    response = client.messages.create(
        model=MODEL,
        max_tokens=max_tokens,
        system=system_prompt,
        messages=[{"role": "user", "content": user_prompt}],
    )
    return "".join(block.text for block in response.content if block.type == "text").strip()


def ask_text(system_prompt, user_prompt, max_tokens=1024):
    return _complete(system_prompt, user_prompt, max_tokens)


def ask_json(system_prompt, user_prompt, max_tokens=1024):
    text = _complete(system_prompt, user_prompt, max_tokens)
    return _extract_json(text)


def _extract_json(text):
    text = text.strip()
    if text.startswith("```"):
        text = text.strip("`")
        if text.lower().startswith("json"):
            text = text[4:]
    start = text.find("{")
    end = text.rfind("}")
    if start == -1 or end == -1:
        raise ValueError(f"Resposta da IA não contém um objeto JSON válido: {text[:200]}")
    return json.loads(text[start:end + 1])
