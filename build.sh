#!/usr/bin/env bash
# Sair se der erro
set -o errexit

# Instalar dependências
pip install -r requirements.txt

# Coletar arquivos estáticos
python manage.py collectstatic --no-input

# Aplicar migrações
python manage.py migrate

# --- NOVO: Rodar o Seed para criar Admin e Negócio ---
python seed_db.py