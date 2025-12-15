from agendamentos.models import Negocio
from django.contrib.auth.models import User
import os
import django

# 1. Configura o ambiente Django
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "bella_designer.settings")
django.setup()


def seed():
    print("🌱 Iniciando o Seed do Banco de Dados...")

    # --- 1. CRIAR SUPERUSUÁRIO ---
    USERNAME = 'admin'
    EMAIL = 'admin@admin.com'
    PASSWORD = 'admin'  # <--- TROQUE ISSO DEPOIS NO SITE

    if not User.objects.filter(username=USERNAME).exists():
        print(f"Criando superusuário: {USERNAME}")
        User.objects.create_superuser(USERNAME, EMAIL, PASSWORD)
    else:
        print(f"Superusuário {USERNAME} já existe.")

    # --- 2. CRIAR O NEGÓCIO ---
    NOME_NEGOCIO = 'Kaleme Studio'
    SLUG = 'kaleme-studio'

    if not Negocio.objects.filter(slug=SLUG).exists():
        print(f"Criando negócio: {NOME_NEGOCIO}")
        Negocio.objects.create(
            nome_negocio=NOME_NEGOCIO,
            slug=SLUG,
            cor_primaria='#5CCFAC',  # Cor padrão
            tagline='Espaço dedicado à beleza e bem-estar'
        )
    else:
        print(f"Negócio {NOME_NEGOCIO} já existe.")

    print("✅ Seed concluído com sucesso!")


if __name__ == '__main__':
    seed()
