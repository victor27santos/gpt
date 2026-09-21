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

O front detecta a API automaticamente: chama o backend no mesmo endereço de
rede pelo qual a página foi aberta, na porta 5000. Não precisa configurar nada
mesmo acessando de outro dispositivo (veja "Acesso pela rede local" abaixo).
Só é preciso copiar `.env.example` para `.env` e definir `VITE_API_BASE_URL`
se o backend rodar num host diferente do front.

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

**Atenção:** isso expõe o sistema (sem autenticação real) para qualquer um na
mesma rede. Adequado para uma equipe pequena testando em uma rede confiável
(ex: Wi-Fi interno do setor), não para redes públicas/compartilhadas. Para
restringir de volta a só esta máquina, defina `HOST=127.0.0.1` no
`backend/.env`. O firewall do sistema operacional também pode pedir para
liberar as portas 5000 e 5173 na primeira execução.

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
