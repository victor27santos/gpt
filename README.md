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

## Modo rápido: um comando só

```bash
./start.sh          # Mac/Linux
start.bat            # Windows (clique duas vezes ou rode no terminal)
```

Na primeira vez, cria o ambiente Python, instala as dependências e o
`backend/.env`. Nas próximas vezes só sobe os dois servidores. `Ctrl+C`
(ou fechar as janelas, no Windows) encerra tudo. Para usar a IA, ainda é
preciso editar `backend/.env` com sua `ANTHROPIC_API_KEY` (veja abaixo).

## Rodando manualmente (passo a passo, sem o script)

### Front-end

```bash
npm install
npm run dev
```

Abre em `http://localhost:5173`.

O front detecta a API automaticamente: chama o backend no mesmo endereço de
rede pelo qual a página foi aberta, na porta 5000. Não precisa configurar nada
mesmo acessando de outro dispositivo (veja "Acesso pela rede local" abaixo).
Só é preciso copiar `.env.example` para `.env` e definir `VITE_API_BASE_URL`
se o backend rodar num host diferente do front.

### Back-end

```bash
cd backend
python3 -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
python3 -c "import secrets; print(secrets.token_hex(32))"   # cole o resultado em SECRET_KEY= no .env
python app.py
```

`SECRET_KEY` é obrigatória (assina as sessões de login) — sem ela o servidor
recusa iniciar, com uma mensagem explicando o que fazer. `./start.sh`/
`start.bat` geram essa chave automaticamente; rodando manualmente, é o passo
acima.

Sobe em `http://127.0.0.1:5000`. Na primeira execução cria e popula
`backend/data/pegasus.db` (SQLite) com os setores, fichas e documento de
exemplo. Sem uma `ANTHROPIC_API_KEY` válida em `.env`, as rotas de IA (Agente
de Triagem e Consultor IA) respondem com um erro claro explicando o que
falta — o resto do sistema (setores, fichas, processos, agenda, melhorias,
biblioteca) funciona normalmente sem a IA.

Por padrão o servidor roda sem o depurador interativo do Flask (não expõe
stack traces nem console de depuração pela rede). Para depuração local,
`FLASK_DEBUG=1 python app.py`.

## Acesso pela rede local

Por padrão, tanto o backend (`0.0.0.0:5000`) quanto o front-end em modo dev
(`0.0.0.0:5173`) aceitam conexões de qualquer dispositivo na mesma rede
Wi-Fi/local — não só da própria máquina. Ao rodar `python app.py`, o terminal
mostra o endereço a compartilhar com a equipe, algo como:

```
 * Backend acessível pela rede local em: http://192.168.1.23:5000
   (outros dispositivos devem abrir o front-end em http://192.168.1.23:5173)
```

Qualquer computador/celular na mesma rede abre `http://192.168.1.23:5173` no
navegador e usa o app normalmente — o front detecta sozinho onde está o
backend, sem configurar nada em cada dispositivo.

Com login real (veja abaixo), estar na mesma rede não é mais suficiente para
usar o sistema — ainda assim, prefira uma rede confiável (Wi-Fi interno do
setor) a uma rede pública. Para restringir de volta a só esta máquina, defina
`HOST=127.0.0.1` no `backend/.env`. O firewall do sistema operacional também
pode pedir para liberar as portas 5000 e 5173 na primeira execução.

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
(SQLite) e sobrevive a reload de página e a reinícios do servidor:
setores/pendências (com histórico de atualizações), fichas técnicas, processos
(histórico de manutenções), agenda, mural de melhorias (com comentários) e
biblioteca técnica. Fotos, vídeos e áudios anexados são enviados de verdade
para o servidor (`backend/uploads/`) em vez de blobs temporários do navegador.

### Rotas da API

| Recurso | Rotas |
|---|---|
| Autenticação | `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me` |
| Setores/pendências | `GET /api/sectors`, `POST /api/sectors/<id>/pendings`, `PATCH /api/pendings/<id>/status`, `POST /api/pendings/<id>/updates` |
| Melhorias | `POST /api/sectors/<id>/improvements`, `POST /api/improvements/<id>/comments` |
| Fichas | `GET/POST /api/fichas` |
| Processos | `GET/POST /api/entries`, `PUT/DELETE /api/entries/<id>` |
| Agenda | `GET/POST /api/events` |
| Biblioteca | `GET/POST /api/library` |
| Upload de mídia | `POST /api/uploads` (multipart, até 25MB, extensões de imagem/vídeo/áudio/pdf), servido em `GET /uploads/<arquivo>` |
| IA | `POST /api/melhorar_relato`, `POST /api/salvar_conhecimento`, `POST /api/perguntar_assistente`, `GET /api/emails` |
| Diagnóstico | `GET /api/health` |

Todas as rotas acima, exceto `/api/auth/*` e `/api/health`, exigem o header
`Authorization: Bearer <token>` obtido no login/registro.

### Caixa de entrada de e-mails

`/api/emails` hoje lê de `backend/data/sample_inbox.json` (dados simulados) em
vez de uma caixa real, para a triagem por IA poder ser demonstrada sem
credenciais de e-mail. Trocar por uma conta real depois é só substituir
`load_inbox()` em `backend/emails.py` por um cliente IMAP — o resto da lógica
(chamada à IA, cache em SQLite) não muda.

## Limitações conhecidas

- **Sem "esqueci minha senha" nem papel de administrador.** Qualquer pessoa
  pode criar sua própria conta; não há como um coordenador desativar/gerenciar
  contas de outras pessoas ainda.
- **Arquivos enviados (`/uploads/<arquivo>`) não exigem login para visualizar**
  — o nome do arquivo é um identificador aleatório não-adivinhável, mas quem
  tiver o link consegue abrir a foto/vídeo/áudio sem estar logado. Aceitável
  para a maioria dos casos, mas vale saber.
- **Pensado para rede local**, não para múltiplos servidores/deploy distribuído
  (SQLite com um arquivo local, uploads em disco local). Para colocar online
  de verdade (fora da rede local), é preciso migrar para um banco de dados e
  armazenamento de arquivos hospedados — ainda não feito.
- **Sem testes automatizados** além dos scripts manuais usados durante o
  desenvolvimento.
