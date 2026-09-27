"""Creates backend/.env from .env.example with a freshly generated
SECRET_KEY, if .env doesn't already exist. Used by start.sh / start.bat."""
import secrets
from pathlib import Path

ROOT = Path(__file__).parent
env_path = ROOT / ".env"
example_path = ROOT / ".env.example"

if env_path.exists():
    raise SystemExit(0)

content = example_path.read_text(encoding="utf-8")
content = content.replace("SECRET_KEY=", f"SECRET_KEY={secrets.token_hex(32)}", 1)
env_path.write_text(content, encoding="utf-8")

print("-> Criado backend/.env (com uma SECRET_KEY gerada automaticamente).")
print("   Falta editar esse arquivo e preencher DATABASE_URL (obrigatória) e,")
print("   se quiser upload de arquivos e a IA funcionando, as chaves do Supabase")
print("   e a ANTHROPIC_API_KEY. Veja o README para onde encontrar cada uma.")
