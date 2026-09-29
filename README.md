# Pegasus

Sistema de gestão de engenharia clínica hospitalar — inventário de equipamentos,
pendências de manutenção por setor, agenda técnica, mural de melhorias, biblioteca
de documentos e dois recursos de IA: um consultor técnico e um agente de triagem
de e-mails.

Projeto de TCC. Front-end em React, back-end em Flask com persistência em
Postgres (Supabase) e arquivos no Supabase Storage, IA via API da Anthropic
(Claude).

## Estrutura

```
src/            front-end (Vite + React + Tailwind)
backend/        API Flask — persistência (Postgres) + upload (Supabase Storage) + rotas de IA
```

## Rodando localmente

Precisa de um Postgres acessível — pode ser o mesmo projeto Supabase que você
usa em produção (mais simples, um banco só) ou um Postgres local.

```bash
./start.sh          # Mac/Linux
start.bat            # Windows
```

Na primeira vez, cria o ambiente Python, instala as dependências e o
`backend/.env` (com uma `SECRET_KEY` gerada automaticamente). Antes de rodar
de verdade, edite `backend/.env` e preencha pelo menos `DATABASE_URL`
(veja "Variáveis de ambiente" abaixo) — sem ela o backend recusa iniciar,
com uma mensagem explicando o que falta.

Ou manualmente:

```bash
# back-end
cd backend
python3 -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env             # depois preencha DATABASE_URL e as demais chaves
python app.py

# front-end (outro terminal, na raiz do projeto)
npm install
npm run dev
```

Front-end em `http://localhost:5173`, back-end em `http://127.0.0.1:5000`. O
front detecta a API automaticamente pelo mesmo host da página (funciona sem
configurar nada mesmo acessando de outro dispositivo na rede local) — só
defina `VITE_API_BASE_URL` (no `.env` da raiz) se o backend estiver em outro
domínio, como acontece no deploy online (veja abaixo).

Por padrão o servidor roda sem o depurador interativo do Flask. Para
depuração local, `FLASK_DEBUG=1 python app.py`.

## Deploy online (grátis)

Arquitetura: **Vercel** (front-end) + **Render** (back-end) + **Supabase**
(banco de dados Postgres e armazenamento de arquivos). Nenhum dos três exige
cartão de crédito no plano gratuito.

### 1. Supabase (banco de dados + arquivos)

1. Crie um projeto em https://supabase.com/dashboard
2. **Project Settings → Database → Connection string → URI**: essa é a sua
   `DATABASE_URL`
3. **Project Settings → API**: copie o **Project URL** (`SUPABASE_URL`) e a
   **service_role key** (`SUPABASE_SERVICE_KEY` — secreta, nunca no front-end)
4. **Storage → New bucket**: crie um bucket chamado `pegasus-uploads`, marcado
   como **Public**

### 2. Render (back-end)

1. Novo **Web Service** apontando para este repositório no GitHub
2. **Root Directory**: `backend`
3. **Build Command**: `pip install -r requirements.txt`
4. **Start Command**: `gunicorn app:app --bind 0.0.0.0:$PORT`
5. Em **Environment**, adicione as variáveis (mesmos nomes do
   `backend/.env.example`): `SECRET_KEY` (gere com
   `python3 -c "import secrets; print(secrets.token_hex(32))"`),
   `DATABASE_URL`, `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`,
   `SUPABASE_BUCKET=pegasus-uploads`, `ANTHROPIC_API_KEY`,
   `ANTHROPIC_MODEL=claude-sonnet-5`
6. Deploy. Guarde a URL que o Render gerar (algo como
   `https://pegasus-backend.onrender.com`)

No plano gratuito o serviço hiberna após 15 minutos sem uso e demora ~30-50s
para acordar na primeira requisição depois disso — normal, não é um bug.

### 3. Vercel (front-end)

1. Importe este mesmo repositório em https://vercel.com/new (a raiz do
   projeto já tem o `package.json` do front, não precisa configurar Root
   Directory)
2. Em **Environment Variables**, adicione `VITE_API_BASE_URL` com a URL do
   Render do passo anterior (ex: `https://pegasus-backend.onrender.com`)
3. Deploy. A Vercel te dá uma URL pública (`https://seu-projeto.vercel.app`)
   — esse é o link para compartilhar com a equipe

### Variáveis de ambiente (referência)

| Variável | Onde | Obrigatória | O que é |
|---|---|---|---|
| `SECRET_KEY` | backend | sim | Assina as sessões de login |
| `DATABASE_URL` | backend | sim | Conexão com o Postgres (Supabase) |
| `SUPABASE_URL` | backend | para upload | URL do projeto Supabase |
| `SUPABASE_SERVICE_KEY` | backend | para upload | Chave secreta para gravar arquivos |
| `SUPABASE_BUCKET` | backend | para upload | Nome do bucket (padrão `pegasus-uploads`) |
| `ANTHROPIC_API_KEY` | backend | para IA | Chave da API da Anthropic |
| `EMAIL_IMAP_USER` | backend | para o Agente de Triagem IA | E-mail (Gmail) que recebe as solicitações |
| `EMAIL_IMAP_PASSWORD` | backend | para o Agente de Triagem IA | Senha de app do Gmail (não é a senha normal) |
| `VITE_API_BASE_URL` | front-end | só se front e back estiverem em domínios diferentes | URL do backend |

## Login

Autenticação real: cada pessoa cria sua própria conta (nome, usuário, senha e
perfil — Coordenação, Técnicos 5x2 ou Plantonistas) na aba "Criar conta" da
tela de login. A senha fica com hash no banco (nunca em texto puro), a sessão
usa um token (JWT) válido por 30 dias guardado no navegador, e todo registro
que você cria (pendências, fichas, comentários etc.) é atribuído a você
automaticamente pelo servidor — o cliente não consegue "se passar" por outra
pessoa. Todas as rotas da API exigem login, exceto `/api/auth/*` e
`/api/health`.

Não há um fluxo de "esqueci minha senha" nem papel de administrador ainda
(qualquer pessoa pode criar sua própria conta livremente) — adequado para uma
equipe pequena e confiável.

## O que já é persistido

Tudo que antes vivia só em memória no navegador agora é salvo no backend
(Postgres) e sobrevive a reload de página e a reinícios do servidor:
setores/pendências (com histórico de atualizações), fichas técnicas, processos
(histórico de manutenções), agenda, mural de melhorias (com comentários) e
biblioteca técnica. Fotos, vídeos e áudios anexados são enviados de verdade
para o Supabase Storage em vez de blobs temporários do navegador.

### Base de conhecimento do Consultor IA

Toda vez que um técnico salva um Processo ou usa o Consultor IA (modo "Novo
Protocolo"), isso alimenta automaticamente a tabela `knowledge`, que o
Consultor Bot usa como contexto pra responder perguntas. Uma pendência
concluída também pode virar uma entrada dessa base: no detalhe da pendência,
com status "Concluído" ou "Encerrado", aparece o botão **"Transformar em
Padrão"** — ele pré-preenche um rascunho (equipamento, problema e a solução
real, juntando as atualizações manuais registradas no atendimento, não só as
trocas de status) que a pessoa revisa e confirma antes de salvar. Cada
pendência só pode virar padrão uma vez (fica marcada com um selo "Já é um
Padrão" depois). Hoje isso ainda não tem uma etapa de aprovação separada pela
coordenação — qualquer entrada criada (por Processo, Consultor ou pendência
promovida) já entra direto na base que a IA usa.

### Rotas da API

| Recurso | Rotas |
|---|---|
| Autenticação | `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me` |
| Setores/pendências | `GET /api/sectors`, `POST /api/sectors/<id>/pendings`, `PATCH /api/pendings/<id>/status`, `POST /api/pendings/<id>/updates`, `POST /api/pendings/<id>/promote` (transforma uma pendência concluída em entrada da base de conhecimento) |
| Melhorias | `POST /api/sectors/<id>/improvements`, `POST /api/improvements/<id>/comments` |
| Fichas | `GET/POST /api/fichas`, `PUT/DELETE /api/fichas/<id>` |
| Processos | `GET/POST /api/entries`, `PUT/DELETE /api/entries/<id>` |
| Agenda | `GET/POST /api/events`, `PUT/DELETE /api/events/<id>` |
| Biblioteca | `GET/POST /api/library`, `PUT/DELETE /api/library/<id>` |
| Upload de mídia | `POST /api/uploads` (multipart, até 25MB, extensões de imagem/vídeo/áudio/pdf) — retorna a URL pública do Supabase Storage |
| IA | `POST /api/melhorar_relato`, `POST /api/salvar_conhecimento`, `POST /api/perguntar_assistente`, `GET /api/emails` |
| Diagnóstico | `GET /api/health` |

Todas as rotas acima, exceto `/api/auth/*` e `/api/health`, exigem o header
`Authorization: Bearer <token>` obtido no login/registro.

### Caixa de entrada de e-mails (Agente de Triagem IA)

`/api/emails` lê os e-mails **não lidos** de uma caixa real via IMAP
(`backend/emails.py`) e classifica cada um com a IA (urgência, categoria,
equipamento citado, ação sugerida). Cada e-mail processado fica em cache no
Postgres pelo assunto, então reabrir a tela não gera custo de IA de novo para
o mesmo e-mail. Os e-mails **não são marcados como lidos** no servidor — ler
de novo é seguro.

Como configurar (Gmail):
1. Recomendado: crie uma conta dedicada só para isso (ex.
   `manutencao.hospital@gmail.com`) e peça para a equipe encaminhar
   solicitações técnicas para ela — evita misturar com e-mails pessoais e
   evita a IA processar mensagens sem relação.
2. Ative a **verificação em duas etapas** na conta
   (myaccount.google.com/security)
3. Gere uma **senha de app** em myaccount.google.com/apppasswords (não é a
   senha normal da conta — é uma senha de 16 caracteres específica para
   aplicativos)
4. Defina `EMAIL_IMAP_USER` (o e-mail) e `EMAIL_IMAP_PASSWORD` (a senha de
   app) no backend (`.env` local ou variáveis de ambiente no Render)

Sem essas duas variáveis configuradas, `/api/emails` responde com um erro
claro explicando o que falta, em vez de travar. Outros provedores (Outlook /
Microsoft 365 corporativo, por exemplo) normalmente não aceitam mais login
IMAP simples — exigiriam um fluxo diferente (OAuth), fora do escopo atual.

## Limitações conhecidas

- **Sem "esqueci minha senha" nem papel de administrador.** Qualquer pessoa
  pode criar sua própria conta; não há como um coordenador desativar/gerenciar
  contas de outras pessoas ainda.
- **Arquivos enviados não exigem login para visualizar** — o nome do arquivo
  é um identificador aleatório não-adivinhável, mas quem tiver o link
  consegue abrir a foto/vídeo/áudio sem estar logado. Aceitável para a
  maioria dos casos, mas vale saber.
- **Backend gratuito hiberna após inatividade** (Render free tier) — a
  primeira requisição depois de um tempo sem uso demora ~30-50s.
- **Sem testes automatizados** além dos scripts manuais usados durante o
  desenvolvimento.
- **Descarte de e-mails no Agente IA é só local (navegador).** A caixa de
  entrada em `/api/emails` já é simulada (`sample_inbox.json`); quando um
  e-mail é descartado com justificativa, isso não é salvo no backend — ao
  recarregar a página, ele volta e a justificativa some. Decisão consciente
  por enquanto (dado de demonstração); persistir isso de verdade exigiria
  uma tabela nova + rotas.
