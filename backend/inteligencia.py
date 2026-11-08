"""Módulo de inteligência do Pegasus — lógica pura, sem acesso ao banco.

Três funções de apoio à decisão para a equipe de engenharia clínica:

1. Priorização por risco: cada pendência aberta recebe uma pontuação de 0 a
   100, com a composição explicada item a item (transparência para a banca e
   para o técnico, que mantém a decisão final).
2. Alertas: reincidência de falha (>= 2 corretivas no mesmo equipamento em 30
   dias) e calibrações vencidas ou vencendo em até 7 dias.
3. Indicadores por equipamento em 90 dias: falhas, MTTR, MTBF e
   disponibilidade, calculados a partir das datas de abertura e fechamento.

A pontuação é deliberadamente simples e aditiva para poder ser explicada e
calibrada com a equipe. Os pesos ficam todos aqui.
"""
from datetime import datetime, timedelta, timezone
import re
import unicodedata

# --- pesos da pontuação -------------------------------------------------------

CLASSE_PESOS = {
    "Suporte à vida": 40,
    "Monitorização": 30,
    "Terapêutico": 25,
    "Diagnóstico": 12,
    "Apoio": 8,
}
CLASSE_PADRAO = 15  # ficha sem classe cadastrada ou pendência sem equipamento vinculado

# Setor é identificado por palavra-chave no nome/área do setor e do subsetor.
SETOR_PESOS = [
    (("uti", "terapia intensiva", "cti"), 25, "Terapia intensiva"),
    (("centro cirurgico", "cc", "bloco"), 20, "Centro cirúrgico"),
    (("pronto", "ps", "emergencia", "urgencia"), 20, "Pronto atendimento / emergência"),
    (("quimio", "oncolog", "infusao"), 20, "Quimioterapia / oncologia"),
    (("farmacia",), 15, "Farmácia"),
    (("cme", "esteriliza"), 15, "CME"),
    (("cdi", "imagem", "diagnostico"), 12, "Diagnóstico por imagem"),
]
SETOR_PADRAO = 10

PESO_SEM_RESERVA = 15
PESO_PARADO = 10
PESO_ESPERA_MAX = 10        # +1 ponto a cada 12 h de espera, até 10
HORAS_POR_PONTO_ESPERA = 12

JANELA_REINCIDENCIA_DIAS = 30
LIMIAR_REINCIDENCIA = 2
JANELA_PRAZO_DIAS = 7
PERIODO_INDICADORES_DIAS = 90

CLOSED_STATUSES = ("Concluído", "Encerrado")


def faixa(score):
    if score >= 70:
        return "Crítica"
    if score >= 50:
        return "Alta"
    if score >= 30:
        return "Média"
    return "Baixa"


# --- utilidades ---------------------------------------------------------------

def _norm(text):
    text = unicodedata.normalize("NFKD", text or "").encode("ascii", "ignore").decode()
    return f" {text.lower()} "


def _parse_dt(value):
    """Aceita ISO (opened_at/closed_at) e dd/mm/aaaa (coluna date legada)."""
    if not value:
        return None
    try:
        dt = datetime.fromisoformat(value)
        return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)
    except ValueError:
        pass
    for fmt in ("%d/%m/%Y", "%Y-%m-%d"):
        try:
            return datetime.strptime(value, fmt).replace(tzinfo=timezone.utc)
        except ValueError:
            continue
    return None


def _opened(p):
    return _parse_dt(p.get("opened_at")) or _parse_dt(p.get("date"))


def _closed(p):
    if p.get("status") not in CLOSED_STATUSES:
        return None
    return _parse_dt(p.get("closed_at")) or _parse_dt(p.get("last_edit_date"))


def _setor_peso(texto):
    t = re.sub(r"[^a-z0-9]+", " ", _norm(texto))
    for chaves, peso, rotulo in SETOR_PESOS:
        for c in chaves:
            c = c.strip()
            # siglas curtas (uti, ps, cme...) só casam como palavra inteira
            if (len(c) <= 3 and f" {c} " in t) or (len(c) > 3 and c in t):
                return peso, rotulo
    return SETOR_PADRAO, None


def _fmt_horas(h):
    if h < 1:
        return f"{max(1, round(h * 60))} min"
    if h < 48:
        return f"{round(h)} h"
    return f"{round(h / 24)} dias"


# --- 1. priorização -----------------------------------------------------------

def pontuar(pending, ficha, setor_texto, now):
    partes = []
    classe = (ficha or {}).get("classe_risco")
    if classe in CLASSE_PESOS:
        partes.append((f"Classe: {classe}", CLASSE_PESOS[classe]))
    else:
        partes.append(("Classe não informada na ficha", CLASSE_PADRAO))

    peso, rotulo = _setor_peso(setor_texto)
    partes.append((f"Setor: {rotulo or 'outros'}", peso))

    if ficha is None:
        partes.append(("Reserva: sem equipamento vinculado", 0))
    elif ficha.get("tem_reserva"):
        partes.append(("Há equipamento reserva", 0))
    else:
        partes.append(("Sem equipamento reserva", PESO_SEM_RESERVA))

    partes.append(
        ("Equipamento parado", PESO_PARADO) if pending.get("parado") else ("Operando com restrição", 0)
    )

    aberta = _opened(pending)
    horas = max(0.0, (now - aberta).total_seconds() / 3600) if aberta else 0.0
    pontos_espera = min(PESO_ESPERA_MAX, int(horas // HORAS_POR_PONTO_ESPERA))
    partes.append((f"Espera: {_fmt_horas(horas)}", pontos_espera))

    total = sum(p for _, p in partes)
    return {
        "score": total,
        "faixa": faixa(total),
        "horasAberta": round(horas, 1),
        "composicao": [{"item": i, "pontos": p} for i, p in partes],
    }


# --- montagem completa -------------------------------------------------------

def analisar(fichas, pendings, sectors, sub_sectors, now=None):
    now = now or datetime.now(timezone.utc)
    fichas_by_id = {f["id"]: f for f in fichas}
    sector_by_id = {s["id"]: s for s in sectors}
    sub_by_id = {s["id"]: s for s in sub_sectors}

    def setor_info(p):
        s = sector_by_id.get(p.get("sector_id")) or {}
        sub = sub_by_id.get(p.get("sub_sector_id")) or {}
        nome = s.get("name") or ""
        if sub.get("name"):
            nome = f"{nome} · {sub['name']}"
        texto = " ".join(filter(None, [s.get("name"), s.get("areas"), sub.get("name")]))
        return nome, texto

    def ficha_resumo(f):
        if not f:
            return None
        return {
            "id": f["id"],
            "equipamento": f.get("equipamento"),
            "patrimonio": f.get("patrimonio"),
            "setor": f.get("setor"),
            "classeRisco": f.get("classe_risco"),
            "temReserva": bool(f.get("tem_reserva")),
        }

    # 1. fila priorizada
    fila = []
    for p in pendings:
        if p.get("status") in CLOSED_STATUSES:
            continue
        ficha = fichas_by_id.get(p.get("ficha_id"))
        nome_setor, texto_setor = setor_info(p)
        fila.append({
            "id": p["id"],
            "description": p.get("description"),
            "reason": p.get("reason"),
            "type": p.get("type"),
            "status": p.get("status"),
            "parado": bool(p.get("parado")),
            "setor": nome_setor,
            "ficha": ficha_resumo(ficha),
            **pontuar(p, ficha, texto_setor, now),
        })
    fila.sort(key=lambda x: (-x["score"], -x["horasAberta"]))

    # 2a. reincidência (só corretivas vinculadas a uma ficha)
    corte = now - timedelta(days=JANELA_REINCIDENCIA_DIAS)
    reincidencias = []
    for f in fichas:
        ocorrencias = [
            p for p in pendings
            if p.get("ficha_id") == f["id"]
            and (p.get("type") or "Corretiva") == "Corretiva"
            and (_opened(p) or now) >= corte
        ]
        if len(ocorrencias) >= LIMIAR_REINCIDENCIA:
            ocorrencias.sort(key=lambda p: _opened(p) or now)
            reincidencias.append({
                "ficha": ficha_resumo(f),
                "total": len(ocorrencias),
                "ocorrencias": [
                    {
                        "id": p["id"],
                        "data": (_opened(p) or now).date().isoformat(),
                        "aberta": p.get("status") not in CLOSED_STATUSES,
                        "description": p.get("description"),
                    }
                    for p in ocorrencias
                ],
            })

    # 2b. prazos de calibração
    prazos = []
    hoje = now.date()
    for f in fichas:
        prox = _parse_dt(f.get("prox_calib"))
        if not prox:
            continue
        dias = (prox.date() - hoje).days
        if dias <= JANELA_PRAZO_DIAS:
            prazos.append({"ficha": ficha_resumo(f), "tipo": "Calibração", "data": prox.date().isoformat(), "dias": dias})
    prazos.sort(key=lambda x: x["dias"])

    # 3. indicadores
    inicio = now - timedelta(days=PERIODO_INDICADORES_DIAS)
    periodo_h = PERIODO_INDICADORES_DIAS * 24
    indicadores = []
    for f in fichas:
        falhas = [
            p for p in pendings
            if p.get("ficha_id") == f["id"] and (p.get("type") or "Corretiva") == "Corretiva"
            and (_opened(p) or now) >= inicio
        ]
        reparos, parado_h = [], 0.0
        for p in falhas:
            ini = max(_opened(p) or now, inicio)
            fim = _closed(p) or now
            dur = max(0.0, (fim - ini).total_seconds() / 3600)
            # Sem registro de parada parcial, o intervalo aberto conta como indisponível.
            parado_h += dur
            if _closed(p):
                reparos.append(dur)
        n = len(falhas)
        operante = max(0.0, periodo_h - parado_h)
        indicadores.append({
            "ficha": ficha_resumo(f),
            "falhas": n,
            "mttrHoras": round(sum(reparos) / len(reparos), 1) if reparos else None,
            "mtbfHoras": round(operante / n) if n else None,
            "disponibilidade": round(operante / periodo_h, 4),
        })
    indicadores.sort(key=lambda x: (x["disponibilidade"], -x["falhas"]))

    sem_vinculo = sum(1 for p in pendings if p.get("status") not in CLOSED_STATUSES and not p.get("ficha_id"))

    return {
        "geradoEm": now.isoformat(timespec="seconds"),
        "fila": fila,
        "reincidencias": reincidencias,
        "prazos": prazos,
        "indicadores": indicadores,
        "pendenciasSemEquipamento": sem_vinculo,
        "parametros": {
            "classes": CLASSE_PESOS,
            "periodoIndicadoresDias": PERIODO_INDICADORES_DIAS,
            "janelaReincidenciaDias": JANELA_REINCIDENCIA_DIAS,
            "janelaPrazoDias": JANELA_PRAZO_DIAS,
        },
    }
