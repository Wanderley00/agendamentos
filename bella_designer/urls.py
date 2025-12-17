# bella_designer/urls.py

from django.contrib import admin
from django.urls import path, include
# Importamos as views para usar nas rotas globais
from agendamentos import views as agendamentos_views
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    # Rota para a administração padrão do Django
    path('admin/', admin.site.urls),

    # --- ROTAS GLOBAIS DO DASHBOARD DO EMPREENDEDOR (LOGIN NECESSÁRIO) ---
    path('dashboard/', agendamentos_views.admin_dashboard, name='admin_dashboard'),
    path('dashboard/calendario/', agendamentos_views.admin_calendario,
         name='admin_calendario'),
    path('dashboard/financeiro/', agendamentos_views.admin_financeiro,
         name='admin_financeiro'),
    path('dashboard/relatorios/', agendamentos_views.admin_relatorios,
         name='admin_relatorios'),

    path('webhook/mercado-pago/',
         agendamentos_views.mercadopago_webhook,
         name='mercadopago_webhook'),

    # --- GESTÃO ---
    path('dashboard/gestao/', agendamentos_views.admin_gestao, name='admin_gestao'),
    path('dashboard/api/gestao/servicos/',
         agendamentos_views.api_gestao_servicos, name='api_gestao_servicos'),
    path('dashboard/api/gestao/servicos/<int:servico_id>/',
         agendamentos_views.api_gestao_servico_detalhe, name='api_gestao_servico_detalhe'),
    path('dashboard/api/gestao/equipe/',
         agendamentos_views.api_gestao_equipe, name='api_gestao_equipe'),

    path('dashboard/api/gestao/equipe/<int:membro_id>/',
         agendamentos_views.api_gestao_equipe_detalhe, name='api_gestao_equipe_detalhe'),

    # =================================================================
    # ROTAS DE CATEGORIA
    # =================================================================
    path('dashboard/api/gestao/categorias/',
         agendamentos_views.api_gestao_categorias, name='api_gestao_categorias'),
    path('dashboard/api/gestao/categorias/<int:categoria_id>/',
         agendamentos_views.api_gestao_categoria_detalhe, name='api_gestao_categoria_detalhe'),

    # =================================================================
    # ROTAS DE PREÇOS DE MANUTENÇÃO
    # =================================================================
    path('dashboard/api/gestao/servicos/<int:servico_id>/manutencao/',
         agendamentos_views.api_gestao_precos_manutencao, name='api_gestao_precos_manutencao'),
    path('dashboard/api/gestao/manutencao/<int:preco_id>/',
         agendamentos_views.api_gestao_preco_manutencao_detalhe, name='api_gestao_preco_manutencao_detalhe'),

    # --- GESTÃO DE HORÁRIOS, CONFIG E AVISOS ---
    path('dashboard/api/gestao/horarios/',
         agendamentos_views.api_gestao_horarios, name='api_gestao_horarios'),
    path('dashboard/api/gestao/horarios/<int:horario_id>/',
         agendamentos_views.api_gestao_horario_detalhe, name='api_gestao_horario_detalhe'),

    path('dashboard/api/gestao/configuracoes/',
         agendamentos_views.api_gestao_configuracoes, name='api_gestao_configuracoes'),

    path('dashboard/api/gestao/avisos/',
         agendamentos_views.api_gestao_avisos, name='api_gestao_avisos'),
    path('dashboard/api/gestao/avisos/<int:aviso_id>/',
         agendamentos_views.api_gestao_aviso_detalhe, name='api_gestao_aviso_detalhe'),

    path('dashboard/api/gestao/dias-bloqueados/',
         agendamentos_views.api_gestao_dias_bloqueados, name='api_gestao_dias_bloqueados'),
    path('dashboard/api/gestao/dias-bloqueados/<int:bloqueio_id>/',
         agendamentos_views.api_gestao_dia_bloqueado_detalhe, name='api_gestao_dia_bloqueado_detalhe'),

    # --- ROTAS GLOBAIS DA API DO DASHBOARD (LOGIN NECESSÁRIO) ---
    path('api/admin/agendamentos-calendario/',
         agendamentos_views.api_agendamentos_calendario, name='api_agendamentos_calendario'),
    path('api/admin/resumo-financeiro/',
         agendamentos_views.api_resumo_financeiro, name='api_resumo_financeiro'),
    path('api/admin/faturamento/',
         agendamentos_views.api_faturamento, name='api_faturamento'),
    path('api/admin/despesas/', agendamentos_views.api_despesas, name='api_despesas'),

    # --- CORREÇÃO APLICADA AQUI: ADICIONANDO AS ROTAS DE RECORRÊNCIA ---
    path('api/admin/recorrencias/',
         agendamentos_views.api_listar_recorrencias, name='api_listar_recorrencias'),
    path('api/admin/recorrencias/<int:recorrencia_id>/',
         agendamentos_views.api_gerenciar_recorrencia_detalhe, name='api_gerenciar_recorrencia_detalhe'),
    # -------------------------------------------------------------------

    path('api/admin/get-form-data/',
         agendamentos_views.api_admin_get_form_data, name='api_admin_get_form_data'),
    path('api/admin/criar-agendamento/',
         agendamentos_views.api_admin_criar_agendamento, name='api_admin_criar_agendamento'),
    path('api/admin/atualizar-agendamento/<int:agendamento_id>/',
         agendamentos_views.api_admin_atualizar_agendamento, name='api_admin_atualizar_agendamento'),
    path('api/admin/atualizar-horario-agendamento/<int:agendamento_id>/',
         agendamentos_views.api_admin_atualizar_horario_agendamento, name='api_admin_atualizar_horario_agendamento'),
    path('api/admin/deletar-agendamento/<int:agendamento_id>/',
         agendamentos_views.api_admin_deletar_agendamento, name='api_admin_deletar_agendamento'),
    path('api/admin/registrar-despesa/',
         agendamentos_views.api_registrar_despesa, name='api_registrar_despesa'),
    path('api/admin/despesa/<int:despesa_id>/',
         agendamentos_views.api_despesa, name='api_despesa'),
    path('api/admin/atualizar-despesa/<int:despesa_id>/',
         agendamentos_views.api_atualizar_despesa, name='api_atualizar_despesa'),
    path('api/admin/deletar-despesa/<int:despesa_id>/',
         agendamentos_views.api_deletar_despesa, name='api_deletar_despesa'),
    path('api/admin/agendamentos-pagamento/',
         agendamentos_views.api_agendamentos_pagamento, name='api_agendamentos_pagamento'),

    path('api/admin/exportar/excel/', agendamentos_views.exportar_relatorio_excel,
         name='exportar_relatorio_excel'),
    path('api/admin/exportar/pdf/', agendamentos_views.exportar_relatorio_pdf,
         name='exportar_relatorio_pdf'),

    path('api/n8n/lembretes-24h/', agendamentos_views.api_lembretes_24h,
         name='api_lembretes_24h_global'),

    path('api/n8n/aniversariantes/', agendamentos_views.api_aniversariantes_dia,
         name='api_aniversariantes_global'),


    # --- ROTA PRINCIPAL PARA OS CLIENTES ---
    path('<slug:empreendedor_slug>/',
         include('agendamentos.urls', namespace='agendamentos')),
]

# Isso serve os arquivos de mídia (logos) no modo de desenvolvimento
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL,
                          document_root=settings.MEDIA_ROOT)
