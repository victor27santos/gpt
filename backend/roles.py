"""Role metadata shared by the auth routes. Mirrors LOGIN_PROFILES on the
front-end (src/App.jsx) — keep both in sync if a role is added/renamed."""

ROLES = {
    "coord": {"name": "Equipe de Coordenação", "label": "Gestão de Engenharia"},
    "tec5x2": {"name": "Técnicos 5x2", "label": "Manutenção Rotineira"},
    "plantonista": {"name": "Técnicos Plantonistas 12x36", "label": "Manutenção de Emergência"},
}
