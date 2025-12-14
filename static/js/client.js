// static/js/client.js
// Funções relacionadas à área do cliente

// --- FUNÇÃO DE LÓGICA DE ABAS (NOVA) ---
/**
 * Alterna entre as abas de "Próximos" e "Histórico"
 * @param {Event} event - O evento do clique
 * @param {string} tabName - 'proximos' ou 'historico'
 */
window.showClientTab = function(event, tabName) {
    // 1. Botões
    const toggleContainer = event.target.closest('.form-toggle');
    toggleContainer.querySelectorAll('.toggle-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    
    // Animação da barra do toggle
    if (tabName === 'historico') {
        toggleContainer.classList.add('toggle-right');
    } else {
        toggleContainer.classList.remove('toggle-right');
    }

    // 2. Conteúdo
    document.querySelectorAll('.client-tab-content').forEach(tab => tab.classList.add('hidden'));
    document.getElementById(`client-tab-${tabName}`).classList.remove('hidden');
}


// --- FUNÇÃO PRINCIPAL (MODIFICADA) ---
/**
 * Carrega os agendamentos do cliente logado e os FILTRA
 */
async function loadClientAppointments() {
    const proximosContainer = document.getElementById('client-appointments-proximos');
    const historicoContainer = document.getElementById('client-appointments-historico');
    if (!proximosContainer || !historicoContainer) return;

    // Mostra o loading em ambas as abas
    const loadingHTML = `<div class="loading-indicator"><div class="loading-spinner"></div><p>Carregando...</p></div>`;
    proximosContainer.innerHTML = loadingHTML;
    historicoContainer.innerHTML = loadingHTML;
    
    try {
        const response = await fetch(`/${empreendedorSlug}/api/meus_agendamentos/`);
        if (!response.ok) {
            if (response.status === 403) {
                showScreen('forced-login-screen'); 
                return;
            }
            throw new Error('Falha ao carregar os dados.');
        }

        const appointments = await response.json();
        
        // --- LÓGICA DE FILTRO (NOVA) ---
        // 'Pendente' e 'Confirmado' são "Próximos"
        const proximos = appointments.filter(apt => 
            apt.status === 'Confirmado' || apt.status === 'Pendente'
        );
        
        // 'Concluído' e 'Cancelado' são "Histórico"
        const historico = appointments.filter(apt => 
            apt.status === 'Concluído' || apt.status === 'Cancelado'
        );
        
        // Renderiza as duas listas
        renderAppointmentList(
            proximosContainer, 
            proximos, 
            "Você não tem agendamentos futuros."
        );
        
        renderAppointmentList(
            historicoContainer, 
            historico, 
            "Você não possui histórico de agendamentos."
        );

    } catch (error) {
        const errorHTML = `<div class="error-state"><p>Ocorreu um erro ao carregar seus agendamentos.</p></div>`;
        proximosContainer.innerHTML = errorHTML;
        historicoContainer.innerHTML = errorHTML;
        console.error('Error fetching client appointments:', error);
    }
}

// --- FUNÇÃO HELPER DE RENDERIZAÇÃO (NOVA) ---
/**
 * Renderiza uma lista de agendamentos em um container
 * @param {HTMLElement} container - O elemento para preencher
 * @param {Array} list - A lista de agendamentos
 * @param {string} emptyMessage - Mensagem para lista vazia
 */
function renderAppointmentList(container, list, emptyMessage) {
    if (list.length === 0) {
        container.innerHTML = `
                    <div class="empty-state" style="padding-top: 16px;">
                        <div class="empty-icon">🗓️</div>
                        <h3>${emptyMessage}</h3>
                        ${(container.id === 'client-appointments-proximos') ?
'<button class="btn btn--primary mt-4" onclick="startBookingFlow()">Fazer um Novo Agendamento</button>' : ''}
                    </div>`;
        return;
    }

    container.innerHTML = ''; // Limpa o loading
    list.forEach(apt => {
        const card = createAppointmentCard(apt); // Usa a função existente
        container.appendChild(card);
    });
}


// --- FUNÇÃO DO CARD (MODIFICADA) ---
/**
 * Cria um card de agendamento para a área do cliente
 * @param {Object} appointment - Dados do agendamento
 * @returns {HTMLElement} - O elemento do card
 */
function createAppointmentCard(appointment) {
    const card = document.createElement('div');
    card.className = 'appointment-card';

    const [year, month, day] = appointment.date.split('-');
    const formattedDate = `${day}/${month}/${year}`;

    // Lógica dos botões de ação
    let actionsHTML = '';
    if (appointment.can_reschedule && (appointment.status === 'Confirmado' || appointment.status === 'Pendente')) {
        actionsHTML = `
            <button class="btn btn--secondary btn--sm" onclick="startReschedule(${appointment.id}, ${appointment.serviceId})">Remarcar</button>
            <button class="btn btn--danger btn--sm" onclick="confirmCancelAppointment(${appointment.id})">Cancelar</button>
        `;
    } else if (appointment.status === 'Confirmado' || appointment.status === 'Pendente') {
         actionsHTML = `<p class="cant-reschedule-text">Não é possível remarcar ou cancelar com menos de 24h de antecedência.</p>`;
    } else {
        // Se for "Concluído" ou "Cancelado", não mostra ações
        actionsHTML = ''; 
    }

    // --- LÓGICA DE STATUS (NOVA) ---
    let statusClass = '';
    switch(appointment.status) {
        case 'Confirmado': statusClass = 'success'; break;
        case 'Pendente': statusClass = 'pending'; break;
        case 'Concluído': statusClass = 'info'; break;
        case 'Cancelado': statusClass = 'danger'; break;
        default: statusClass = 'secondary';
    }
    // --- FIM DA LÓGICA DE STATUS ---

    // Cria a tag da imagem se houver URL, caso contrário, será vazia
    const serviceImageHTML = appointment.serviceImageUrl ? 
        `<div class="appointment-image-wrapper">
            <img src="${appointment.serviceImageUrl}" alt="Imagem do Serviço" class="appointment-service-image">
        </div>` : '';

    card.innerHTML = `
        ${serviceImageHTML} <div class="appointment-info">
            <h4>${appointment.service}</h4>
            <p>${formattedDate} às ${appointment.time}</p>
            <p class="appointment-professional">Com ${appointment.profissional}</p> <span class="status status--${statusClass}">${appointment.status}</span>
        </div>
        <div class="appointment-actions">
            ${actionsHTML}
        </div>
    `;
    return card;
}


// --- FUNÇÕES DE CANCELAMENTO (SEM MUDANÇA) ---
/**
 * Exibe um modal de confirmação para cancelar o agendamento
 * @param {number} appointmentId - O ID do agendamento a ser cancelado
 */
window.confirmCancelAppointment = function(appointmentId) {
    showModal({
        title: 'Confirmar Cancelamento',
        message: 'Tem certeza que deseja cancelar este agendamento? Esta ação não pode ser desfeita.',
        confirmText: 'Sim, cancelar',
        onConfirm: () => cancelAppointment(appointmentId)
    });
};

/**
 * Envia a requisição para cancelar um agendamento
 * @param {number} appointmentId - O ID do agendamento
 */
async function cancelAppointment(appointmentId) {
    showLoading();
    try {
        const response = await fetch(`/${empreendedorSlug}/api/agendamentos/${appointmentId}/cancelar/`, {
            method: 'POST',
            headers: { 'X-CSRFToken': getCsrfToken() }
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.message);

        showToast({ message: 'Agendamento cancelado com sucesso!', type: 'success' });
        loadClientAppointments(); // Recarrega a lista
    } catch (error) {
        showToast({ message: `Erro: ${error.message}`, type: 'error' });
    } finally {
        hideLoading();
    }
}



/**
 * Carrega os dados do perfil do usuário e preenche o formulário de edição.
 */
window.loadProfileForEditing = async function() {
    const form = document.getElementById('profile-form');
    if (!form) return;

    showLoading();
    try {
        const response = await fetch(`/${empreendedorSlug}/api/me/profile/`);
        if (!response.ok) {
            // Se falhar (ex: sessão expirou), manda para o login
            if (response.status === 403 || response.status === 404) {
                showScreen('forced-login-screen');
                return;
            }
            throw new Error('Falha ao carregar dados do perfil.');
        }
        
        const profile = await response.json();
        
        // Preenche o formulário
        document.getElementById('profile-name').value = profile.first_name || '';
        document.getElementById('profile-lastname').value = profile.last_name || '';
        document.getElementById('profile-email').value = profile.email || '';
        document.getElementById('profile-phone').value = window.formatPhoneString(profile.phone || '');
        
        // --- MUDANÇA AQUI ---
        const nascimentoInput = document.getElementById('profile-nascimento');
        if (nascimentoInput.type === 'text') {
            // Se for mobile (campo de texto), converte para dd/mm/aaaa
            nascimentoInput.value = convertISOToDate(profile.nascimento);
        } else {
            // Se for PC (campo de data), usa o formato ISO
            nascimentoInput.value = profile.nascimento || '';
        }

    } catch (error) {
        showToast({ message: error.message, type: 'error' });
        // Se der erro, volta para a área do cliente
        showScreen('client-area-screen');
    } finally {
        hideLoading();
    }
}

/**
 * Salva os dados do perfil atualizados.
 */
async function saveProfile(event) {
    event.preventDefault();
    showLoading();

    const nascimentoInput = document.getElementById('profile-nascimento').value;
    const nascimentoISO = convertDateToISO(nascimentoInput); // Converte para YYYY-MM-DD
    
    if (!nascimentoISO) {
        showToast({ message: 'A data de nascimento é obrigatória e deve estar no formato dd/mm/aaaa.', type: 'error' });
        hideLoading();
        return;
    }

    // Coleta os dados do formulário
    const payload = {
        first_name: document.getElementById('profile-name').value,
        last_name: document.getElementById('profile-lastname').value,
        email: document.getElementById('profile-email').value,
        phone: document.getElementById('profile-phone').value.replace(/\D/g, ''), // Limpa o telefone
        nascimento: nascimentoISO // <-- Envia o formato ISO
    };

    // Validação simples do telefone
    if (!validatePhoneNumber(payload.phone)) {
        showToast({ message: 'Por favor, insira um telefone válido com DDD (10 ou 11 dígitos).', type: 'error' });
        hideLoading();
        return;
    }

    try {
        const response = await fetch(`/${empreendedorSlug}/api/me/profile/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCsrfToken()
            },
            body: JSON.stringify(payload)
        });

        const result = await response.json();
        if (!response.ok) {
            throw new Error(result.message || 'Falha ao salvar o perfil.');
        }

        showToast({ message: result.message, type: 'success' });
        
        // Se o email foi alterado, o 'username' mudou.
        // É mais seguro forçar o logout para o usuário logar novamente
        // com o novo email, mas por enquanto vamos apenas recarregar o authState.
        await initAuthState(); // Recarrega os dados do usuário na UI

        showScreen('client-area-screen'); // Volta para a tela anterior

    } catch (error) {
        showToast({ message: `Erro: ${error.message}`, type: 'error' });
    } finally {
        hideLoading();
    }
}

// Adiciona o listener ao formulário de perfil
document.addEventListener('DOMContentLoaded', () => {
    const profileForm = document.getElementById('profile-form');
    if (profileForm) {
        profileForm.addEventListener('submit', saveProfile);
    }
});