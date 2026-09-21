# Pegasus

Sistema de gestão de engenharia clínica hospitalar — inventário de equipamentos,
pendências de manutenção por setor, agenda técnica, biblioteca de documentos e
dois recursos de IA: um consultor técnico e um agente de triagem de e-mails.

Projeto de TCC. Front-end em React, back-end em Flask, IA via API da Anthropic (Claude).

## Estrutura

```
src/            front-end (Vite + React + Tailwind)
backend/        API Flask (rotas de IA + base de conhecimento em SQLite)
```

## Rodando o front-end

```bash
npm install
npm run dev
```

Abre em `http://localhost:5173`. Login é apenas seleção de perfil (sem senha) —
ainda não há autenticação real.

Por padrão o front chama a API em `http://127.0.0.1:5000`. Para apontar para
outro endereço, copie `.env.example` para `.env` e ajuste `VITE_API_BASE_URL`.

## Rodando o back-end

```bash
cd backend
python3 -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env             # depois edite .env com sua ANTHROPIC_API_KEY
python app.py
```

Sobe em `http://127.0.0.1:5000`. Sem uma `ANTHROPIC_API_KEY` válida em `.env`,
as rotas de IA respondem com erro 502 e uma mensagem explicando o que falta —
as demais rotas (saúde, salvar conhecimento) funcionam normalmente.

### Rotas da API

| Rota | Método | Descrição |
|---|---|---|
| `/api/health` | GET | Verificação simples de que o servidor está de pé |
| `/api/melhorar_relato` | POST | Transforma um relato informal em registro técnico (usado no formulário "Novo Processo" e no "Consultor IA") |
| `/api/salvar_conhecimento` | POST | Grava um registro na base de conhecimento (SQLite) |
| `/api/perguntar_assistente` | POST | Responde perguntas técnicas usando a base de conhecimento como contexto |
| `/api/emails` | GET | Retorna e-mails triados por urgência/categoria a partir de uma caixa de entrada simulada (`backend/data/sample_inbox.json`) |

A base de conhecimento e o cache de triagem de e-mails ficam em
`backend/data/pegasus.db` (SQLite, criado automaticamente, ignorado pelo git).

### Caixa de entrada de e-mails

`/api/emails` hoje lê de `backend/data/sample_inbox.json` (dados simulados) em
vez de uma caixa real, para a triagem por IA poder ser demonstrada sem
credenciais de e-mail. Trocar por uma conta real depois é só substituir
`load_inbox()` em `backend/emails.py` por um cliente IMAP — o resto da lógica
(chamada à IA, cache em SQLite) não muda.

## Limitações conhecidas (para o TCC)

- **Sem persistência no front.** Setores, fichas, processos e agenda vivem em
  `useState` — são perdidos ao recarregar a página. A base de conhecimento e
  o cache de e-mails do back-end já persistem em SQLite.
- **Login sem autenticação real.** É apenas seleção de perfil, sem senha ou
  sessão de servidor.
- **Mídia (foto/vídeo/áudio) não é enviada a lugar nenhum** — usa blobs locais
  do navegador (`URL.createObjectURL`), que somem ao recarregar.
