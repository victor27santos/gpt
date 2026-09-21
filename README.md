# Pegasus

Sistema de gestão de engenharia clínica hospitalar — inventário de equipamentos,
pendências de manutenção por setor, agenda técnica, mural de melhorias, biblioteca
de documentos e dois recursos de IA: um consultor técnico e um agente de triagem
de e-mails.

Projeto de TCC. Front-end em React, back-end em Flask com persistência em SQLite,
IA via API da Anthropic (Claude).

## Estrutura

```
src/            front-end (Vite + React + Tailwind)
backend/        API Flask — persistência (SQLite) + rotas de IA
```

## Rodando o front-end

```bash
npm install
npm run dev
```

Abre em `http://localhost:5173`.

Por padrão o front chama a API em `http://127.0.0.1:5000`. Para apontar para
outro endereço (ex: rodando o backend em outra máquina da rede local), copie
`.env.example` para `.env` e ajuste `VITE_API_BASE_URL`.

## Rodando o back-end

```bash
cd backend
python3 -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env             # depois edite .env com sua ANTHROPIC_API_KEY
python app.py
```

Sobe em `http://127.0.0.1:5000`. Na primeira execução cria e popula
`backend/data/pegasus.db` (SQLite) com os setores, fichas e documento de
exemplo. Sem uma `ANTHROPIC_API_KEY` válida em `.env`, as rotas de IA (Agente
de Triagem e Consultor IA) respondem com um erro claro explicando o que
falta — o resto do sistema (setores, fichas, processos, agenda, melhorias,
biblioteca) funciona normalmente sem a IA.

Por padrão o servidor roda sem o depurador interativo do Flask (não expõe
stack traces nem console de depuração pela rede). Para depuração local,
`FLASK_DEBUG=1 python app.py`.

## Login

Não há senha: você escolhe um perfil (Coordenação, Técnicos 5x2 ou
Plantonistas) e informa seu nome, que fica salvo no navegador e é usado como
autor de tudo que você criar (pendências, fichas, comentários etc.). Pensado
para uso em rede local por uma equipe pequena e confiável — não é
autenticação real, então não deve ser exposto na internet pública.

## O que já é persistido

Tudo que antes vivia só em memória no navegador agora é salvo no backend
(SQLite) e sobrevive a reload de página e a reinícios do servidor:
setores/pendências (com histórico de atualizações), fichas técnicas, processos
(histórico de manutenções), agenda, mural de melhorias (com comentários) e
biblioteca técnica. Fotos, vídeos e áudios anexados são enviados de verdade
para o servidor (`backend/uploads/`) em vez de blobs temporários do navegador.

### Rotas da API

| Recurso | Rotas |
|---|---|
| Setores/pendências | `GET /api/sectors`, `POST /api/sectors/<id>/pendings`, `PATCH /api/pendings/<id>/status`, `POST /api/pendings/<id>/updates` |
| Melhorias | `POST /api/sectors/<id>/improvements`, `POST /api/improvements/<id>/comments` |
| Fichas | `GET/POST /api/fichas` |
| Processos | `GET/POST /api/entries`, `PUT/DELETE /api/entries/<id>` |
| Agenda | `GET/POST /api/events` |
| Biblioteca | `GET/POST /api/library` |
| Upload de mídia | `POST /api/uploads` (multipart, até 25MB, extensões de imagem/vídeo/áudio/pdf), servido em `GET /uploads/<arquivo>` |
| IA | `POST /api/melhorar_relato`, `POST /api/salvar_conhecimento`, `POST /api/perguntar_assistente`, `GET /api/emails` |
| Diagnóstico | `GET /api/health` |

### Caixa de entrada de e-mails

`/api/emails` hoje lê de `backend/data/sample_inbox.json` (dados simulados) em
vez de uma caixa real, para a triagem por IA poder ser demonstrada sem
credenciais de e-mail. Trocar por uma conta real depois é só substituir
`load_inbox()` em `backend/emails.py` por um cliente IMAP — o resto da lógica
(chamada à IA, cache em SQLite) não muda.

## Limitações conhecidas

- **Sem autenticação real.** Login é perfil + nome, sem senha — adequado para
  uma equipe pequena confiável em rede local, não para expor na internet.
- **Pensado para rede local**, não para múltiplos servidores/deploy distribuído
  (SQLite com um arquivo local, uploads em disco local).
- **Sem testes automatizados** além dos scripts manuais usados durante o
  desenvolvimento.
