# agendamentos/management/commands/cleanup_pending_bookings.py

from django.core.management.base import BaseCommand
from django.utils import timezone
from agendamentos.models import Agendamento
from agendamentos.mercadopago_service import MercadoPagoService
import logging

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Cancela agendamentos pendentes cujo PIX expirou e não foi pago.'

    def handle(self, *args, **options):
        self.stdout.write(self.style.NOTICE(
            'Iniciando limpeza de agendamentos pendentes...'))

        # Pega a hora atual
        now = timezone.now()

        # --- MUDANÇA NA QUERY ---
        # Busca agendamentos PENDENTES, com pagamento AGUARDANDO, e EXPIRADOS
        expired_bookings = Agendamento.objects.filter(
            status='Pendente',
            # <-- MUDANÇA [cite: 383-384]
            status_pagamento='Aguardando Pagamento',
            payment_expires__lte=now
        )

        if not expired_bookings.exists():
            self.stdout.write(self.style.SUCCESS(
                'Nenhum agendamento expirado encontrado.'))
            return

        self.stdout.write(
            f'Encontrados {expired_bookings.count()} agendamentos expirados.')

        mp = MercadoPagoService()

        for ag in expired_bookings:
            self.stdout.write(
                f'Verificando Agendamento ID: {ag.id} (Payment ID: {ag.payment_id_mp})...')

            # Dupla checagem: Verifica o status na API do MP
            status_real = mp.verificar_status_pagamento(ag.payment_id_mp)

            if status_real == "approved":
                # Caso raro: Webhook atrasou, mas o pagamento foi feito.
                ag.status = 'Pendente'  # Status do agendamento fica Pendente

                # --- INÍCIO DA NOVA LÓGICA CONDICIONAL ---
                if ag.valor_adiantamento < ag.preco_final:
                    ag.status_pagamento = 'Adiantamento Realizado'
                    ag.observacoes = f"Adiantamento {ag.payment_id_mp} aprovado via cleanup job. Aguardando confirmação manual."
                else:
                    ag.status_pagamento = 'Pago'
                    ag.observacoes = f"Pagamento integral {ag.payment_id_mp} aprovado via cleanup job. Aguardando confirmação manual."
                # --- FIM DA NOVA LÓGICA CONDICIONAL ---

                ag.save()
                self.stdout.write(self.style.SUCCESS(
                    f'Agendamento {ag.id} PAGO ({ag.status_pagamento}).'))

            elif status_real in ["rejected", "cancelled", "expired", "pending"]:
                # Pagamento falhou, expirou ou ainda está pendente (mas nosso tempo acabou)
                ag.status = 'Cancelado'
                ag.status_pagamento = 'Cancelado'
                ag.observacoes = f"Pagamento {ag.payment_id_mp} expirado e cancelado pelo cleanup job (Status MP: {status_real})."
                ag.save()
                self.stdout.write(self.style.WARNING(
                    f'Agendamento {ag.id} CANCELADO (expirado).'))

            else:
                # Status desconhecido ou erro na API
                self.stdout.write(self.style.ERROR(
                    f'Status desconhecido ({status_real}) para Agendamento {ag.id}. Nenhuma ação tomada.'))

        self.stdout.write(self.style.SUCCESS('Limpeza concluída.'))
