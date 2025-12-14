# 1. Imagem Base
FROM python:3.10-slim

# 2. Variáveis de Ambiente do Python
ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1

# 3. Diretório de Trabalho
WORKDIR /app

# 4. Instalar Dependências do Sistema (CRÍTICO PARA PDF E EXCEL)
# Adicionamos pkg-config e libcairo2-dev para corrigir o erro do pycairo/xhtml2pdf
RUN apt-get update && apt-get install -y \
    build-essential \
    libjpeg-dev \
    zlib1g-dev \
    libffi-dev \
    libssl-dev \
    python3-dev \
    gcc \
    pkg-config \
    libcairo2-dev \
    && rm -rf /var/lib/apt/lists/*

# 5. Instalar Dependências Python
COPY requirements.txt .
RUN pip install --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# 6. Copiar o Projeto
COPY . .

# 7. Declaração de ARGs
ARG SECRET_KEY
ARG MERCADO_PAGO_ACCESS_TOKEN
ARG BASE_URL

# Disponibiliza como variável de ambiente apenas durante o build
ENV SECRET_KEY=${SECRET_KEY}
ENV MERCADO_PAGO_ACCESS_TOKEN=${MERCADO_PAGO_ACCESS_TOKEN}

# 8. Coletar arquivos estáticos
RUN python manage.py collectstatic --noinput || true

# 9. Expor a Porta
EXPOSE 8007

# 10. Comando para rodar o servidor
CMD ["gunicorn", "bella_designer.wsgi:application", "--bind", "0.0.0.0:8007"]