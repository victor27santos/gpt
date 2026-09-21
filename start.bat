@echo off
REM One-command start for Pegasus (Windows): sets up the backend venv and
REM frontend deps on first run (if needed), then launches both in separate
REM windows. Close those windows to stop the servers.
cd /d "%~dp0"

echo == Pegasus ==

if not exist "backend\venv" (
    echo -^> Criando ambiente Python ^(primeira vez^)...
    python -m venv backend\venv
)

echo -^> Verificando dependencias do backend...
backend\venv\Scripts\pip install --quiet -r backend\requirements.txt

if not exist "backend\.env" (
    copy backend\.env.example backend\.env
    echo -^> Criado backend\.env — edite esse arquivo e adicione sua ANTHROPIC_API_KEY para a IA funcionar.
)

if not exist "node_modules" (
    echo -^> Instalando dependencias do front-end ^(primeira vez^)...
    call npm install
)

echo -^> Iniciando backend em uma nova janela...
start "Pegasus - Backend" cmd /k backend\venv\Scripts\python backend\app.py

timeout /t 2 /nobreak >nul

echo -^> Iniciando front-end em uma nova janela...
start "Pegasus - Frontend" cmd /k npm run dev

echo.
echo Pegasus iniciando em duas janelas separadas. Abra http://localhost:5173 no navegador.
echo Feche as duas janelas para encerrar.
