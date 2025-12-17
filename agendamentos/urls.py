# agendamentos/urls.py

from django.urls import path
from . import views

# O 'app_name' ajuda o Django a diferenciar as URLs se você tiver mais apps
app_name = 'agendamentos'

urlpatterns = [
    # A rota raiz AGORA aponta para a página principal do empreendedor
    # Ela será acessada via /slug-do-empreendedor/
    path('', views.index, name='empreendedor_home'),

    path('api/negocio-info/', views.api_negocio_info, name='api_negocio_info'),

    path('api/avisos/', views.api_get_avisos, name='api_get_avisos'),

    # --- ROTA DE LOGIN DE ADMIN RESTRITA (NOVA) ---
    # Captura o slug do negócio da URL principal
    path('api/admin/login/', views.scoped_admin_login,
         name='api_scoped_admin_login'),

    # Rotas da API para o JavaScript (agora relativas ao slug)
    path('api/servico/<int:servico_id>/profissionais/',
         views.get_profissionais_por_servico, name='api_get_profissionais_por_servico'),
    path('api/servicos/', views.lista_servicos, name='api_lista_servicos'),
    path('api/agendamentos/', views.lista_agendamentos,
         name='api_lista_agendamentos'),
    path('api/register/', views.register_user, name='api_register'),
    path('api/login/', views.login_user, name='api_login'),
    path('api/login-phone/', views.login_user_with_phone, name='api_login_phone'),
    path('api/logout/', views.logout_user, name='api_logout'),
    path('api/check_auth/', views.check_auth_status, name='api_check_auth'),
    path('api/meus_agendamentos/', views.lista_meus_agendamentos,
         name='api_lista_meus_agendamentos'),
    path('api/me/profile/', views.api_manage_profile, name='api_manage_profile'),
    path('api/agendar/', views.criar_agendamento, name='api_criar_agendamento'),
    path('api/horarios_disponiveis/', views.get_horarios_disponiveis,
         name='api_horarios_disponiveis'),
    path('api/dias_disponiveis/', views.dias_disponiveis,
         name='api_dias_disponiveis'),
    path('api/agendamentos/<int:agendamento_id>/cancelar/',
         views.cancelar_agendamento, name='api_cancelar_agendamento'),

    # --- INÍCIO DA NOVA ADIÇÃO ---
    path('api/check-booking-status/<int:agendamento_id>/',
         views.check_booking_status, name='api_check_booking_status'),
    # --- FIM DA NOVA ADIÇÃO ---
    # Rotas de Login Admin (não precisam de slug, pois são globais)
    # Elas serão movidas para o urls.py principal
]
