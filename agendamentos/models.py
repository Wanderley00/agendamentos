# agendamentos/models.py

from django.db import models
from django.contrib.auth.models import User
from django.utils.text import slugify
from django.core.exceptions import ValidationError  # << ADICIONE ESTA IMPORTAÇÃO
from django.core import signing
import datetime

# -----------------------------------------------------------------
# MODELO 1: O "DONO" DO LINK (O TENANT)
# -----------------------------------------------------------------


class Negocio(models.Model):
    """
    Representa o "Studio" ou "Salão" - a entidade que possui o link (slug).
    Ex: "Salão da Maria", "Barbearia do João".
    """
    nome_negocio = models.CharField(max_length=100, unique=True)
    slug = models.SlugField(max_length=100, unique=True, blank=True,
                            help_text="Identificador único para a URL. Ex: nome-do-salao")
    cor_primaria = models.CharField(max_length=7, default='#5CCFAC',
                                    help_text="Cor principal do tema (formato hexadecimal, ex: #FF5733)")

    cor_secundaria = models.CharField(max_length=7, default="#FFFFFF",
                                      help_text="Cor secundária (ex: rosa claro #FFD1DC)")

    tagline = models.CharField(max_length=150, blank=True,
                               default="Espaço dedicado à beleza e bem-estar")

    logo = models.ImageField(
        upload_to='negocios_logos/', null=True, blank=True)

    dias_antecedencia_maxima = models.IntegerField(
        default=60,  # Padrão de 60 dias (2 meses)
        help_text="Número máximo de dias no futuro que um cliente pode agendar."
    )

    # --- INÍCIO DA ADIÇÃO ---
    portfolio_url = models.URLField(
        max_length=1024,
        blank=True,
        null=True,
        help_text="Link do seu portfólio externo (Canva, site próprio, etc.)"
    )

    pagamento_online_habilitado = models.BooleanField(
        default=False,
        help_text="Marque esta opção para habilitar pagamentos via Pix (adiantamento)."
    )

    endereco = models.CharField(
        max_length=255,
        blank=True,
        null=True,
        help_text="Endereço físico do estabelecimento. Será usado para gerar o link do mapa."
    )
    telefone_contato = models.CharField(
        max_length=20,
        blank=True,
        null=True,
        help_text="Telefone público para contato (WhatsApp). Diferente do telefone de login."
    )

    def save(self, *args, **kwargs):
        # Garante que o slug seja sempre atualizado com base no nome
        self.slug = slugify(self.nome_negocio)
        super().save(*args, **kwargs)

    def __str__(self):
        return self.nome_negocio

# -----------------------------------------------------------------
# MODELO 2: OS FUNCIONÁRIOS (ADMINS) DAQUELE NEGÓCIO
# -----------------------------------------------------------------


class EmpreendedorProfile(models.Model):
    """
    Representa o perfil de um usuário que é funcionário ou dono
    de um Negocio.
    É quem vai acessar o /dashboard/.
    """
    user = models.OneToOneField(
        User, on_delete=models.CASCADE, related_name='empreendedor_profile')
    negocio = models.ForeignKey(
        Negocio, on_delete=models.CASCADE, related_name='membros')
    telefone = models.CharField(max_length=20, blank=True)

    foto = models.ImageField(
        upload_to='profissionais_fotos/', null=True, blank=True)

    # --- NOVA ADIÇÃO: Token Criptografado ---
    encrypted_access_token = models.CharField(
        max_length=500,
        blank=True,
        null=True,
        help_text="Token de acesso do Mercado Pago (Criptografado)"
    )

    def set_access_token(self, raw_token):
        """Criptografa e salva o token."""
        if raw_token:
            self.encrypted_access_token = signing.dumps(raw_token)
        else:
            self.encrypted_access_token = None

    def get_access_token(self):
        """Descriptografa e retorna o token real."""
        if not self.encrypted_access_token:
            return None
        try:
            return signing.loads(self.encrypted_access_token)
        except signing.BadSignature:
            return None

    def __str__(self):
        return f"{self.user.get_full_name()} @ {self.negocio.nome_negocio}"

# -----------------------------------------------------------------
# MODELO 3: OS CLIENTES DAQUELE NEGÓCIO
# -----------------------------------------------------------------


class Cliente(models.Model):
    """
    Representa o cliente final. O Cliente pertence a um Negocio.
    """
    negocio = models.ForeignKey(
        Negocio, on_delete=models.CASCADE)  # <-- MUDANÇA
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    telefone = models.CharField(max_length=20)

    data_nascimento = models.DateField(null=True, blank=True)

    class Meta:
        # Garante que um telefone não possa ser usado duas vezes no MESMO negócio
        unique_together = ('negocio', 'telefone')

    def __str__(self):
        return f"{self.user.get_full_name()} (Cliente de {self.negocio.nome_negocio})"

# =================================================================
# NOVA ADIÇÃO: MODELO DE CATEGORIA
# =================================================================


class Categoria(models.Model):
    """
    Categorias de serviços para agrupar manutenções.
    Ex: Cílios, Unhas, Cabelo.
    """
    negocio = models.ForeignKey(
        Negocio, on_delete=models.CASCADE, related_name='categorias')
    nome = models.CharField(max_length=100)

    class Meta:
        # Garante que o negócio não tenha categorias duplicadas
        unique_together = ('negocio', 'nome')

    def __str__(self):
        return self.nome

# -----------------------------------------------------------------
# MODELO 4: OS SERVIÇOS DAQUELE NEGÓCIO
# -----------------------------------------------------------------


class Servico(models.Model):
    """
    Serviços que um Negocio oferece. (MODIFICADO)
    """
    negocio = models.ForeignKey(Negocio, on_delete=models.CASCADE)

    # --- CAMPO EXISTENTE ---
    profissionais_que_executam = models.ManyToManyField(
        'EmpreendedorProfile',
        related_name='servicos_oferecidos',
        blank=True
    )

    # --- CAMPO EXISTENTE ---
    categoria = models.ForeignKey(
        Categoria,
        on_delete=models.SET_NULL,  # Se a categoria for deletada, não deleta o serviço
        null=True,
        blank=True,  # Permite serviços sem categoria
        related_name='servicos'
    )

    # --- INÍCIO DA NOVA ADIÇÃO ---
    percentual_adiantamento = models.PositiveIntegerField(
        default=0,
        help_text="Porcentagem (0 a 100) a ser cobrada como adiantamento no agendamento."
    )
    # --- FIM DA NOVA ADIÇÃO ---

    nome = models.CharField(max_length=100)
    descricao = models.TextField()
    duracao_minutos = models.PositiveIntegerField(
        help_text="Duração do serviço em minutos (para 1ª vez ou troca)")
    preco = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        help_text="Preço do serviço 'cheio' (para 1ª vez ou troca)")
    imagem = models.ImageField(upload_to='servicos/', null=True, blank=True)

    @property
    def duracao_formatada(self):
        horas = self.duracao_minutos // 60
        minutos = self.duracao_minutos % 60
        if horas > 0:
            return f"{horas}h {minutos}min" if minutos > 0 else f"{horas}h"
        return f"{minutos} min"

    def __str__(self):
        return self.nome

# =================================================================
# NOVA ADIÇÃO: MODELO DE PREÇOS DE MANUTENÇÃO
# =================================================================


class PrecoManutencao(models.Model):
    """
    Define os 'tiers' de manutenção para um serviço principal. (MODIFICADO)
    """
    servico_pai = models.ForeignKey(
        Servico,
        on_delete=models.CASCADE,
        related_name='precos_manutencao'
    )
    nome_tier = models.CharField(
        max_length=100,
        help_text="Ex: Manutenção de 5 a 10 dias"
    )

    # Range de dias desde o último serviço
    dias_min = models.PositiveIntegerField(
        help_text="Ex: 5 (para 'de 5 a 10 dias')")
    dias_max = models.PositiveIntegerField(
        help_text="Ex: 10 (para 'de 5 a 10 dias')")

    # Preço e Duração específicos desta manutenção
    preco = models.DecimalField(max_digits=10, decimal_places=2)
    duracao_minutos = models.PositiveIntegerField()

    # --- INÍCIO DA NOVA ADIÇÃO ---
    percentual_adiantamento = models.PositiveIntegerField(
        default=0,
        help_text="Porcentagem (0 a 100) a ser cobrada como adiantamento no agendamento."
    )
    # --- FIM DA NOVA ADIÇÃO ---

    class Meta:
        ordering = ['dias_min']

    def clean(self):
        # Validação para garantir que min < max
        if self.dias_min is not None and self.dias_max is not None and self.dias_min >= self.dias_max:
            raise ValidationError(
                "O 'dias_min' deve ser menor que o 'dias_max'.")

    @property
    def duracao_formatada(self):
        horas = self.duracao_minutos // 60
        minutos = self.duracao_minutos % 60
        if horas > 0:
            return f"{horas}h {minutos}min" if minutos > 0 else f"{horas}h"
        return f"{minutos} min"

    def __str__(self):
        return f"{self.servico_pai.nome} - {self.nome_tier}"

# -----------------------------------------------------------------
# MODELO 5: AGENDAMENTOS (CONECTA TUDO)
# -----------------------------------------------------------------


class Agendamento(models.Model):
    STATUS_CHOICES = [
        ('Pendente', 'Pendente'),
        ('Confirmado', 'Confirmado'),
        ('Cancelado', 'Cancelado'),
        ('Concluído', 'Concluído'),
    ]

    PAGAMENTO_STATUS = [
        ('Aguardando Pagamento', 'Aguardando Pagamento'),
        ('Pendente', 'Pendente'),
        ('Adiantamento Realizado', 'Adiantamento Realizado'),
        ('Pago', 'Pago'),
        ('Cancelado', 'Cancelado'),
    ]

    # Cliente e Serviço já estão ligados ao Negocio
    cliente = models.ForeignKey(Cliente, on_delete=models.CASCADE)

    # --- CAMPO EXISTENTE ---
    servico = models.ForeignKey(Servico, on_delete=models.CASCADE)

    # --- CAMPO EXISTENTE ---
    tier_manutencao = models.ForeignKey(
        PrecoManutencao,
        on_delete=models.SET_NULL,  # Se o tier for deletado, mantemos o agendamento
        null=True,
        blank=True
    )

    # --- CAMPOS EXISTENTES ---
    preco_final = models.DecimalField(
        max_digits=10, decimal_places=2, null=True, blank=True)
    duracao_final = models.PositiveIntegerField(null=True, blank=True)

    # --- INÍCIO DA NOVA ADIÇÃO (Campos de Pagamento) ---
    valor_adiantamento = models.DecimalField(
        max_digits=10, decimal_places=2, null=True, blank=True,
        help_text="Valor calculado do adiantamento (se houver)"
    )
    payment_id_mp = models.CharField(
        max_length=100, null=True, blank=True,
        help_text="ID do pagamento gerado pelo Mercado Pago"
    )
    payment_qrcode = models.TextField(
        null=True, blank=True,
        help_text="Código PIX Copia e Cola"
    )
    payment_qrcode_image = models.TextField(
        null=True, blank=True,
        help_text="Imagem Base64 do QR Code PIX"
    )
    payment_expires = models.DateTimeField(
        null=True, blank=True,
        help_text="Data e hora que o PIX expira"
    )
    # --- FIM DA NOVA ADIÇÃO ---

    empreendedor_executor = models.ForeignKey(
        'EmpreendedorProfile',
        on_delete=models.PROTECT,
        related_name='agendamentos_executados',
        null=True,
        blank=True
    )

    data = models.DateField()
    horario = models.TimeField()
    status = models.CharField(
        max_length=50, choices=STATUS_CHOICES, default='Pendente')

    # --- MUDANÇA AQUI ---
    status_pagamento = models.CharField(
        max_length=30,
        choices=PAGAMENTO_STATUS,
        default='Pendente'
    )
    observacoes = models.TextField(blank=True, null=True)

    # --- LÓGICA DE save() MODIFICADA ---
    def save(self, *args, **kwargs):
        # Define o preço, duração e adiantamento APENAS se não estiverem definidos
        if self.preco_final is None or self.duracao_final is None or self.valor_adiantamento is None:
            percentual_adiantamento = 0

            if self.tier_manutencao:
                self.preco_final = self.tier_manutencao.preco
                self.duracao_final = self.tier_manutencao.duracao_minutos
                percentual_adiantamento = self.tier_manutencao.percentual_adiantamento
            else:
                self.preco_final = self.servico.preco
                self.duracao_final = self.servico.duracao_minutos
                percentual_adiantamento = self.servico.percentual_adiantamento

            # Calcula o valor do adiantamento
            if percentual_adiantamento > 0:
                self.valor_adiantamento = (
                    self.preco_final * percentual_adiantamento) / 100
            else:
                self.valor_adiantamento = 0

        # --- Bloco de auto-confirmação REMOVIDO ---
        # if self.valor_adiantamento == 0 and self.status == 'Aguardando Pagamento':
        #     self.status = 'Confirmado'
        #     self.status_pagamento = 'Pago'
        # --- FIM DA REMOÇÃO ---

        super().save(*args, **kwargs)
    # --- FIM DA MODIFICAÇÃO ---

    def __str__(self):
        # --- LÓGICA MODIFICADA ---
        nome_servico = ""
        if self.tier_manutencao:
            nome_servico = self.tier_manutencao.nome_tier
        else:
            nome_servico = self.servico.nome

        cliente_nome = "Cliente"
        if self.cliente and self.cliente.user:
            cliente_nome = self.cliente.user.get_full_name()

        return f"{nome_servico} para {cliente_nome} em {self.data} às {self.horario}"
        # --- FIM DA MODIFICAÇÃO ---

# Novos modelos para controle financeiro


class Despesa(models.Model):
    CATEGORIA_CHOICES = [
        ('Aluguel', 'Aluguel'),
        ('Materiais', 'Materiais'),
        ('Serviços', 'Serviços'),
        ('Impostos', 'Impostos'),
        ('Salários', 'Salários'),
        ('Outros', 'Outros'),
    ]
    negocio = models.ForeignKey(
        Negocio, on_delete=models.CASCADE)  # <-- MUDANÇA
    descricao = models.CharField(max_length=200)
    valor = models.DecimalField(max_digits=10, decimal_places=2)
    data = models.DateField()
    categoria = models.CharField(max_length=20, choices=CATEGORIA_CHOICES)
    pago = models.BooleanField(default=False)
    comprovante = models.FileField(
        upload_to='comprovantes/', null=True, blank=True)

    def __str__(self):
        return f"{self.descricao} - R${self.valor} ({self.data})"
    
class DespesaRecorrente(models.Model):
    negocio = models.ForeignKey(Negocio, on_delete=models.CASCADE)
    descricao = models.CharField(max_length=200)
    valor = models.DecimalField(max_digits=10, decimal_places=2)
    categoria = models.CharField(max_length=20, choices=Despesa.CATEGORIA_CHOICES)
    
    data_inicio = models.DateField() # A data da primeira cobrança
    dia_vencimento = models.IntegerField() # O dia do mês que deve repetir (1-31)
    
    data_fim = models.DateField(null=True, blank=True) # Se null, é infinito
    ultima_geracao = models.DateField() # Controla até quando já geramos as despesas

    def __str__(self):
        return f"Recorrente: {self.descricao} (Dia {self.dia_vencimento})"

# -----------------------------------------------------------------
# MODELO 7: HORÁRIOS DE TRABALHO DO PROFISSIONAL
# -----------------------------------------------------------------


class HorarioTrabalho(models.Model):
    """
    Define um bloco de tempo em que um profissional está disponível.
    Um profissional pode ter vários blocos por dia (ex: manhã e tarde).
    """
    DIA_DA_SEMANA_CHOICES = [
        (0, 'Segunda-feira'),
        (1, 'Terça-feira'),
        (2, 'Quarta-feira'),
        (3, 'Quinta-feira'),
        (4, 'Sexta-feira'),
        (5, 'Sábado'),
        (6, 'Domingo'),
    ]

    empreendedor = models.ForeignKey(
        EmpreendedorProfile,
        on_delete=models.CASCADE,
        related_name='horarios_trabalho'
    )
    dia_da_semana = models.IntegerField(choices=DIA_DA_SEMANA_CHOICES)
    hora_inicio = models.TimeField()
    hora_fim = models.TimeField()

    class Meta:
        # Garante que um profissional não tenha horários sobrepostos
        unique_together = ('empreendedor', 'dia_da_semana', 'hora_inicio')
        ordering = ['dia_da_semana', 'hora_inicio']

    def __str__(self):
        return f"{self.empreendedor.user.username} - {self.get_dia_da_semana_display()}: {self.hora_inicio} - {self.hora_fim}"

# -----------------------------------------------------------------
# MODELO 8: MURAL DE AVISOS DINÂMICO
# -----------------------------------------------------------------


class Aviso(models.Model):
    """
    Um item individual no mural de avisos de um Negócio.
    Ex: "Política de Cancelamento", "Aviso de Feriado", etc.
    """
    negocio = models.ForeignKey(
        Negocio, on_delete=models.CASCADE, related_name='avisos')
    titulo = models.CharField(max_length=100)
    conteudo = models.TextField(
        help_text="Conteúdo do aviso. Use <li> para listas.")
    ordem = models.PositiveIntegerField(
        default=0, help_text="Para ordenar os avisos (0 primeiro)")

    class Meta:
        ordering = ['ordem', 'id']

    def __str__(self):
        return f"{self.negocio.nome_negocio} - {self.titulo}"

# -----------------------------------------------------------------
# MODELO 9: DIAS DE FOLGA / BLOQUEIOS DE AGENDA
# -----------------------------------------------------------------


class DiaBloqueado(models.Model):
    """
    Representa um dia específico em que um profissional não trabalhará,
    substituindo o HorarioTrabalho recorrente.
    """
    empreendedor = models.ForeignKey(
        EmpreendedorProfile,
        on_delete=models.CASCADE,
        related_name='dias_bloqueados'
    )
    data = models.DateField()
    descricao = models.CharField(
        max_length=100, blank=True, help_text="Ex: Feriado, Férias, Consulta Médica")

    class Meta:
        # Garante que um profissional só possa bloquear um dia uma vez
        unique_together = ('empreendedor', 'data')
        ordering = ['data']

    def __str__(self):
        return f"{self.empreendedor.user.username} - BLOQUEADO em {self.data}"
