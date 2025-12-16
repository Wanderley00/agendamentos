import requests
import threading
import logging
from django.conf import settings

# Configura o log para sabermos se der erro, mas sem travar o site
logger = logging.getLogger(__name__)


def _enviar_para_n8n_background(payload):
    """
    Função interna que roda em uma thread separada para não travar o usuário.
    """
    url = settings.N8N_WEBHOOK_URL

    if not url:
        logger.warning(
            "N8N_WEBHOOK_URL não configurada. Notificação ignorada.")
        return

    try:
        # Envia os dados para o n8n com um timeout de 5 segundos
        response = requests.post(url, json=payload, timeout=5)

        if response.status_code != 200:
            logger.error(
                f"Erro n8n (Status {response.status_code}): {response.text}")

    except Exception as e:
        logger.error(f"Falha ao conectar com n8n: {e}")


def disparar_notificacao(evento, dados):
    """
    Chame esta função nas suas views.

    :param evento: Nome do evento (ex: 'pagamento_confirmado', 'novo_agendamento')
    :param dados: Dicionário com os dados (ex: {'cliente': 'Joao', 'telefone': '...'})
    """
    payload = {
        "evento": evento,
        "dados": dados
    }

    # Cria uma "linha paralela" (Thread) para fazer o envio sem o usuário esperar
    thread = threading.Thread(
        target=_enviar_para_n8n_background, args=(payload,))
    thread.start()
