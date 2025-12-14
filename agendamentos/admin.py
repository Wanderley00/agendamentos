# agendamentos/admin.py
from django.contrib import admin
from django import forms
from .models import (Negocio, EmpreendedorProfile, Cliente, Servico, Agendamento, Despesa, HorarioTrabalho, Aviso, DiaBloqueado,
                     Categoria, PrecoManutencao
                     )

# -----------------------------------------------------------
# Configuração personalizada para o modelo "Negocio"
# Isso nos permite ver o 'slug' e o nome na lista
# -----------------------------------------------------------


@admin.register(Negocio)
class NegocioAdmin(admin.ModelAdmin):
    list_display = ('nome_negocio', 'slug', 'cor_primaria')
    search_fields = ('nome_negocio', 'slug')
    prepopulated_fields = {'slug': ('nome_negocio',)}

# -----------------------------------------------------------
# Configuração para o "Perfil do Empreendedor" (Funcionário)
# -----------------------------------------------------------


@admin.register(EmpreendedorProfile)
class EmpreendedorProfileAdmin(admin.ModelAdmin):
    list_display = ('user', 'get_user_email', 'negocio', 'telefone')
    search_fields = ('user__username', 'user__email', 'negocio__nome_negocio')
    list_filter = ('negocio',)

    @admin.display(description='Email')
    def get_user_email(self, obj):
        return obj.user.email

# -----------------------------------------------------------
# Configuração para o "Cliente"
# -----------------------------------------------------------


@admin.register(Cliente)
class ClienteAdmin(admin.ModelAdmin):
    list_display = ('user', 'get_user_email', 'negocio', 'telefone')
    search_fields = ('user__username', 'user__email', 'negocio__nome_negocio')
    list_filter = ('negocio',)

    @admin.display(description='Email')
    def get_user_email(self, obj):
        return obj.user.email

# =================================================================
# NOVA ADIÇÃO: ADMIN DE CATEGORIA
# =================================================================


@admin.register(Categoria)
class CategoriaAdmin(admin.ModelAdmin):
    list_display = ('nome', 'negocio')
    list_filter = ('negocio',)
    search_fields = ('nome',)

# =================================================================
# NOVA ADIÇÃO: ADMIN DE PREÇOS DE MANUTENÇÃO (para usar 'inline')
# =================================================================

class PrecoManutencaoInline(admin.TabularInline):
    """
    Isso permite editar os preços de manutenção DENTRO da página de 
    edição do Serviço, o que é muito mais prático.
    """
    model = PrecoManutencao
    formset = forms.models.BaseInlineFormSet  # Usado para validação
    extra = 1  # Começa com 1 campo de manutenção em branco
    
    # --- NOVA ADIÇÃO ---
    # Define os campos que aparecem no inline
    fields = ('nome_tier', 'dias_min', 'dias_max', 'preco', 'duracao_minutos', 'percentual_adiantamento')
    # --- FIM DA ADIÇÃO ---


    def get_formset(self, request, obj=None, **kwargs):
        # Validação para garantir que os ranges não se sobreponham
        FormSet = super().get_formset(request, obj, **kwargs)

        class ValidatedFormSet(FormSet):
            def clean(self):
                super().clean()
                if not hasattr(self, 'forms'):
                    return  # Sai se não houver forms

                tiers = []
                for form in self.forms:
                    if not form.is_valid() or form.cleaned_data.get('DELETE'):
                        continue

                    data = form.cleaned_data
                    if not data:
                        continue

                    dias_min = data.get('dias_min')
                    dias_max = data.get('dias_max')

                    if dias_min is None or dias_max is None:
                        # Deixa a validação do modelo (required=True) tratar
                        continue

                    tiers.append((dias_min, dias_max))

                # Ordena pelos dias de início
                tiers.sort()

                # Verifica sobreposição
                for i in range(len(tiers) - 1):
                    if tiers[i][1] >= tiers[i+1][0]:
                        raise forms.ValidationError(
                            f"Sobreposição de ranges: ({tiers[i][0]}-{tiers[i][1]} dias) "
                            f"conflita com ({tiers[i+1][0]}-{tiers[i+1][1]} dias)."
                        )

        return ValidatedFormSet

class ServicoAdminForm(forms.ModelForm):
    class Meta:
        model = Servico
        fields = '__all__'  # Usar todos os campos do modelo

    def __init__(self, *args, **kwargs):
        """
        Isso personaliza o formulário DEPOIS que ele é criado.
        """
        super().__init__(*args, **kwargs)

        # 'self.instance' é o objeto 'Servico' que está sendo editado.
        # Se for um serviço que já existe (tem PK) e já tem um negócio...
        if self.instance.pk and self.instance.negocio:
            # ...nós filtramos a lista 'profissionais_que_executam'
            # para mostrar APENAS os profissionais daquele negócio.
            # Isso melhora a UI da página de EDIÇÃO.
            self.fields['profissionais_que_executam'].queryset = EmpreendedorProfile.objects.filter(
                negocio=self.instance.negocio
            )
        else:
            # Se for um *novo* serviço (página de Adicionar),
            # o usuário ainda não selecionou um 'Negocio'.
            # A validação (clean) abaixo vai garantir a integridade.
            # Mostramos uma lista vazia para forçar o usuário a salvar primeiro.
            self.fields['profissionais_que_executam'].queryset = EmpreendedorProfile.objects.none()
            self.fields['profissionais_que_executam'].help_text = "Salve o serviço com um 'Negócio' primeiro para poder adicionar profissionais."

    # --- NOVA ADIÇÃO (Dentro da ServicoAdminForm) ---
    def clean_categoria(self):
        """
        Validação para garantir que a Categoria pertença ao mesmo Negocio do Serviço.
        """
        negocio = self.cleaned_data.get('negocio')
        categoria = self.cleaned_data.get('categoria')

        if not negocio or not categoria:
            return categoria  # Deixa o Django tratar a falta de 'negocio'

        if categoria.negocio != negocio:
            raise forms.ValidationError(
                f"A categoria '{categoria.nome}' não pertence ao negócio '{negocio}'."
            )

        return categoria
    # --- FIM DA ADIÇÃO ---

    def clean_profissionais_que_executam(self):
        """
        Este é o "BLOQUEIO" (validação) que você pediu.
        Ele roda quando você clica em "Salvar".
        """
        # Pega os dados que o usuário preencheu no formulário
        negocio = self.cleaned_data.get('negocio')
        profissionais = self.cleaned_data.get('profissionais_que_executam')

        # Se o usuário não selecionou um Negócio, não podemos validar.
        if not negocio:
            return profissionais  # O Django já vai reclamar que 'negocio' é obrigatório

        if not profissionais:
            return profissionais  # Não selecionar nenhum profissional é válido

        # Verifica CADA profissional que o usuário selecionou
        for prof in profissionais:
            if prof.negocio != negocio:
                # Se o profissional não for do mesmo negócio do serviço,
                # gera um erro de validação que aparece no topo da página.
                raise forms.ValidationError(
                    f"O profissional '{prof.user.get_full_name()}' não pertence ao negócio '{negocio}'. "
                    "Por favor, selecione apenas profissionais que fazem parte do mesmo negócio."
                )

        # Se passou por tudo, os dados são válidos.
        return profissionais


# -----------------------------------------------------------
# Configuração para "Servico"
# -----------------------------------------------------------


@admin.register(Servico)
class ServicoAdmin(admin.ModelAdmin):
    form = ServicoAdminForm
    # --- MODIFICADO ---
    list_display = ('nome', 'negocio', 'categoria', 'preco',
                    'duracao_minutos', 'percentual_adiantamento', 'get_profissionais') # <-- ADICIONADO
    # Adicionado 'categoria__nome'
    search_fields = ('nome', 'negocio__nome_negocio', 'categoria__nome')
    list_filter = ('negocio', 'categoria')  # Adicionado 'categoria'
    # --- FIM DA MODIFICAÇÃO ---
    list_editable = ('preco', 'duracao_minutos', 'percentual_adiantamento') # <-- ADICIONADO
    filter_horizontal = ('profissionais_que_executam',)

    # --- NOVA ADIÇÃO ---
    # Adiciona os 'PrecoManutencao' inline na página do Serviço
    inlines = [PrecoManutencaoInline]
    # --- FIM DA ADIÇÃO ---

    @admin.display(description='Profissionais')
    def get_profissionais(self, obj):
        nomes = [p.user.get_full_name(
        ) or p.user.username for p in obj.profissionais_que_executam.all()]
        return ", ".join(nomes)
    
# -----------------------------------------------------------
# Configuração para "Agendamento"
# -----------------------------------------------------------

@admin.register(Agendamento)
class AgendamentoAdmin(admin.ModelAdmin):
    # --- MODIFICADO ---
    list_display = (
        '__str__',  # Usa o __str__ customizado do modelo
        'get_cliente_nome',
        'get_negocio',
        'data',
        'horario',
        'status',
        'status_pagamento', # <-- ADICIONADO
        'preco_final', 
        'valor_adiantamento', # <-- ADICIONADO
        'duracao_final'
    )
    list_filter = ('data', 'status', 'status_pagamento', 'servico__negocio', # <-- ADICIONADO
                   'servico__categoria')  
    search_fields = (
        'servico__nome',
        'cliente__user__username',
        'empreendedor_executor__user__username',
        'tier_manutencao__nome_tier',
        'payment_id_mp' # <-- ADICIONADO
    )

    # --- NOVA ADIÇÃO ---
    # Campos que não devem ser editados no admin após a criação
    readonly_fields = ('preco_final', 'duracao_final', 'valor_adiantamento', 
                       'payment_id_mp', 'payment_qrcode', 'payment_qrcode_image', 'payment_expires') # <-- ADICIONADO
    # --- FIM DA ADIÇÃO ---

    @admin.display(description='Cliente')
    def get_cliente_nome(self, obj):
        return obj.cliente.user.get_full_name()

    @admin.display(description='Negócio')
    def get_negocio(self, obj):
        return obj.servico.negocio
    
# -----------------------------------------------------------
# Configuração para "Despesa"
# -----------------------------------------------------------


@admin.register(Despesa)
class DespesaAdmin(admin.ModelAdmin):
    list_display = ('descricao', 'negocio', 'valor',
                    'data', 'categoria', 'pago')
    search_fields = ('descricao', 'negocio__nome_negocio')
    list_filter = ('data', 'categoria', 'pago', 'negocio')
    list_editable = ('valor', 'pago')


@admin.register(HorarioTrabalho)
class HorarioTrabalhoAdmin(admin.ModelAdmin):
    list_display = ('empreendedor', 'get_negocio',
                    'dia_da_semana', 'hora_inicio', 'hora_fim')
    list_filter = ('empreendedor__negocio', 'dia_da_semana')

    @admin.display(description='Negócio')
    def get_negocio(self, obj):
        return obj.empreendedor.negocio


@admin.register(Aviso)
class AvisoAdmin(admin.ModelAdmin):
    list_display = ('titulo', 'negocio', 'ordem')
    list_filter = ('negocio',)
    search_fields = ('titulo', 'conteudo')


@admin.register(DiaBloqueado)
class DiaBloqueadoAdmin(admin.ModelAdmin):
    list_display = ('empreendedor', 'data', 'descricao')
    list_filter = ('empreendedor__negocio', 'data')
    search_fields = ('descricao',)
