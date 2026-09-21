#!/usr/bin/env bash
# One-command start for Pegasus: sets up the backend venv and frontend deps
# on first run (if needed), then launches both together. Ctrl+C stops both.
set -e
cd "$(dirname "$0")"

echo "== Pegasus =="

# --- backend setup (only does work if missing) ---
if [ ! -d "backend/venv" ]; then
    echo "-> Criando ambiente Python (primeira vez)..."
    python3 -m venv backend/venv
fi

echo "-> Verificando dependências do backend..."
backend/venv/bin/pip install --quiet -r backend/requirements.txt

if [ ! -f "backend/.env" ]; then
    backend/venv/bin/python backend/generate_env.py
fi

# --- frontend setup (only does work if missing) ---
if [ ! -d "node_modules" ]; then
    echo "-> Instalando dependências do front-end (primeira vez)..."
    npm install
fi

# --- launch both, stop both on Ctrl+C ---
cleanup() {
    echo ""
    echo "-> Encerrando..."
    kill "$BACKEND_PID" "$FRONTEND_PID" 2>/dev/null
    wait "$BACKEND_PID" "$FRONTEND_PID" 2>/dev/null
    exit 0
}
trap cleanup INT TERM

echo "-> Iniciando backend..."
backend/venv/bin/python backend/app.py &
BACKEND_PID=$!

sleep 2

echo "-> Iniciando front-end..."
npm run dev &
FRONTEND_PID=$!

echo ""
echo "Pegasus rodando. Abra http://localhost:5173 no navegador."
echo "Pressione Ctrl+C para encerrar os dois."
echo ""

wait "$BACKEND_PID" "$FRONTEND_PID"
