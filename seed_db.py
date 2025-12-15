import os
import django

# 1. Configuração (Fica no topo)
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "bella_designer.settings")
django.setup()

# 2. Imports com trava para o formatador não mover (os comentários são importantes!)
from django.contrib.auth.models import User  # isort:skip
from agendamentos.models import Negocio      # isort:skip

def seed():
    print("🌱 Iniciando o Seed do Banco de Dados...")

    USERNAME = 'admin'
    EMAIL = 'admin@admin.com'
    PASSWORD = 'admin'  # <--- Lembre de trocar depois

    if not User.objects.filter(username=USERNAME).exists():
        print(f"Criando superusuário: {USERNAME}")
        User.objects.create_superuser(USERNAME, EMAIL, PASSWORD)
    else:
        print(f"Superusuário {USERNAME} já existe.")

    NOME_NEGOCIO = 'Kaleme Studio'
    SLUG = 'kaleme-studio'

    if not Negocio.objects.filter(slug=SLUG).exists():
        print(f"Criando negócio: {NOME_NEGOCIO}")
        Negocio.objects.create(
            nome_negocio=NOME_NEGOCIO,
            slug=SLUG,
            cor_primaria='#5CCFAC',
            tagline='Espaço dedicado à beleza e bem-estar'
        )
    else:
        print(f"Negócio {NOME_NEGOCIO} já existe.")

    print("✅ Seed concluído com sucesso!")

if __name__ == '__main__':
    seed()