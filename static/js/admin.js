// static/js/admin.js
// Sistema de gerenciamento administrativo


window.showAdminLoginScreen = function(event) {
    if (event) {
        event.preventDefault();
    }
    showScreen('admin-login-screen');
};

/**
 * Carrega o conteúdo da área administrativa
 */
function loadAdminContent() {
    // Por padrão, carrega a primeira aba (agendamentos)
    loadAdminAppointments();
    
    // Marca o botão da primeira aba como ativo
    const tabs = document.querySelectorAll('.tab-btn');
    if (tabs.length > 0) {
        tabs.forEach(tab => tab.classList.remove('active'));
        tabs[0].classList.add('active');
    }
}

/**
 * Alterna entre as abas administrativas
 * @param {string} tabName - Nome da aba a ser exibida
 * @param {Event} event - Evento de clique
 */
window.showAdminTab = function(tabName, event) {
    // Atualiza estado visual dos botões
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    
    // Oculta todos os conteúdos
    document.querySelectorAll('.admin-content').forEach(content => content.classList.add('hidden'));
    
    // Exibe o conteúdo selecionado
    const targetContent = document.getElementById(`admin-${tabName}`);
    if (targetContent) {
        targetContent.classList.remove('hidden');
        
        // Carrega o conteúdo específico da aba
        if (tabName === 'appointments') {
            loadAdminAppointments();
        } else if (tabName === 'services') {
            loadAdminServices();
        }
    }
};

/**
 * Carrega a lista de agendamentos para a área administrativa
 */
async function loadAdminAppointments() {
    const list = document.getElementById('admin-appointments-list');
    if (!list) return;
    
    // Exibe estado de carregamento
    list.innerHTML = `
        <div class="loading-indicator">
            <div class="loading-spinner"></div>
            <p>Carregando agendamentos...</p>
        </div>
    `;
    
    try {
        const response = await fetch('/api/agendamentos/');
        
        if (!response.ok) {
            throw new Error('Falha ao carregar agendamentos.');
        }
        
        const appointments = await response.json();
        
        // Verifica se há agendamentos
        if (appointments.length === 0) {
            list.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">📅</div>
                    <h3>Nenhum agendamento</h3>
                    <p>Não há agendamentos registrados no sistema.</p>
                </div>
            `;
            return;
        }
        
        // Limpa o container
        list.innerHTML = '';
        
        // Agrupa agendamentos por data
        const appointmentsByDate = {};
        
        appointments.forEach(apt => {
            if (!appointmentsByDate[apt.date]) {
                appointmentsByDate[apt.date] = [];
            }
            appointmentsByDate[apt.date].push(apt);
        });
        
        // Organiza as datas em ordem cronológica
        const sortedDates = Object.keys(appointmentsByDate).sort();
        
        // Cria seções para cada data
        sortedDates.forEach(date => {
            const [year, month, day] = date.split('-');
            const formattedDate = `${day}/${month}/${year}`;
            
            const dateSection = document.createElement('div');
            dateSection.className = 'admin-date-section';
            dateSection.innerHTML = `<h3 class="date-header">${formattedDate}</h3>`;
            
            const appointmentsGroup = document.createElement('div');
            appointmentsGroup.className = 'admin-appointments-group';
            
            // Ordena agendamentos por horário
            const sortedAppointments = appointmentsByDate[date].sort((a, b) => {
                return a.time.localeCompare(b.time);
            });
            
            // Adiciona cada agendamento
            sortedAppointments.forEach(apt => {
                const appointmentCard = createAdminAppointmentCard(apt);
                appointmentsGroup.appendChild(appointmentCard);
            });
            
            dateSection.appendChild(appointmentsGroup);
            list.appendChild(dateSection);
        });
        
    } catch (error) {
        console.error('Erro ao carregar agendamentos:', error);
        
        list.innerHTML = `
            <div class="error-state">
                <div class="error-icon">⚠️</div>
                <h3>Erro ao carregar agendamentos</h3>
                <p>Ocorreu um erro ao buscar os agendamentos.</p>
                <button class="btn btn--outline" onclick="loadAdminAppointments()">
                    Tentar Novamente
                </button>
            </div>
        `;
    }
}

/**
 * Cria um card de agendamento para a área administrativa
 * @param {Object} appointment - Dados do agendamento
 * @returns {HTMLElement} - Elemento HTML do card
 */
function createAdminAppointmentCard(appointment) {
    const card = document.createElement('div');
    card.className = 'admin-appointment-card';
    
    // Define a classe de status
    const statusClass = appointment.status === 'Confirmado' ? 'success' : 
                        appointment.status === 'Cancelado' ? 'danger' : 'warning';
    
    card.innerHTML = `
        <div class="admin-appointment-info">
            <div class="appointment-time">${appointment.time}</div>
            <div class="appointment-details">
                <h4>${appointment.service}</h4>
                <p class="client-name">${appointment.client}</p>
                <span class="status status--${statusClass}">${appointment.status}</span>
            </div>
        </div>
        <div class="admin-actions">
            <button class="btn btn--sm btn--outline" 
                    onclick="viewAppointmentDetails(${appointment.id})">
                Detalhes
            </button>
        </div>
    `;
    
    return card;
}

/**
 * Exibe detalhes de um agendamento específico
 * @param {number} appointmentId - ID do agendamento
 */
window.viewAppointmentDetails = function(appointmentId) {
    // Nesta implementação simplificada, apenas exibe um modal com uma mensagem
    // Em uma implementação completa, buscaria detalhes adicionais do servidor
    
    showModal({
        title: 'Detalhes do Agendamento',
        message: `
            <p>Detalhes completos do agendamento #${appointmentId}.</p>
            <p class="text-secondary">Para gerenciar este agendamento, utilize a interface administrativa do Django.</p>
            <div class="admin-link-container mt-4">
                <a href="/admin/agendamentos/agendamento/${appointmentId}/change/" 
                   target="_blank" class="btn btn--primary">
                    Abrir no Admin Django
                </a>
            </div>
        `,
        confirmText: 'Fechar',
        showCancel: false
    });
};

/**
 * Carrega a lista de serviços para a área administrativa
 */
async function loadAdminServices() {
    const list = document.getElementById('admin-services-list');
    if (!list) return;
    
    // Exibe estado de carregamento
    list.innerHTML = `
        <div class="loading-indicator">
            <div class="loading-spinner"></div>
            <p>Carregando serviços...</p>
        </div>
    `;
    
    try {
        const response = await fetch('/api/servicos/');
        
        if (!response.ok) {
            throw new Error('Falha ao carregar serviços.');
        }
        
        const services = await response.json();
        
        // Verifica se há serviços
        if (services.length === 0) {
            list.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">💇‍♀️</div>
                    <h3>Nenhum serviço</h3>
                    <p>Não há serviços cadastrados no sistema.</p>
                    <a href="/admin/agendamentos/servico/add/" target="_blank" class="btn btn--primary">
                        Adicionar Serviço
                    </a>
                </div>
            `;
            return;
        }
        
        // Limpa o container
        list.innerHTML = '';
        
        // Adiciona cada serviço
        services.forEach(service => {
            const serviceCard = createAdminServiceCard(service);
            list.appendChild(serviceCard);
        });
        
        // Adiciona link para o admin do Django
        list.insertAdjacentHTML('beforeend', `
            <div class="admin-django-link">
                <p>Para adicionar ou editar serviços, use a 
                   <a href="/admin/agendamentos/servico/" target="_blank">Área de Administração do Django</a>.
                </p>
            </div>
        `);
        
    } catch (error) {
        console.error('Erro ao carregar serviços:', error);
        
        list.innerHTML = `
            <div class="error-state">
                <div class="error-icon">⚠️</div>
                <h3>Erro ao carregar serviços</h3>
                <p>Ocorreu um erro ao buscar os serviços.</p>
                <button class="btn btn--outline" onclick="loadAdminServices()">
                    Tentar Novamente
                </button>
            </div>
        `;
    }
}

/**
 * Cria um card de serviço para a área administrativa
 * @param {Object} service - Dados do serviço
 * @returns {HTMLElement} - Elemento HTML do card
 */
function createAdminServiceCard(service) {
    const card = document.createElement('div');
    card.className = 'admin-service-card';
    
    // Formata preço para exibição
    const preco = service.price.toFixed(2).replace('.', ',');
    
    // Prepara a duração para exibição
    const duracao = service.duracao_formatada || `${service.duracao_minutos} min`;
    
    card.innerHTML = `
        <div class="admin-service-info">
            <div class="service-icon-small">${service.icon}</div>
            <div class="service-details">
                <h4>${service.name}</h4>
                <div class="service-meta">
                    <span class="service-duration">${duracao}</span>
                    <span class="service-price">R$ ${preco}</span>
                </div>
            </div>
        </div>
        <div class="admin-actions">
            <a href="/admin/agendamentos/servico/${service.id}/change/" 
               target="_blank" class="btn btn--sm btn--outline">
                Editar
            </a>
        </div>
    `;
    
    return card;
}

// --- ESTILOS ADICIONAIS ---
document.addEventListener('DOMContentLoaded', function() {
    const adminLoginForm = document.getElementById('admin-login-form');
    if (adminLoginForm) {
        adminLoginForm.addEventListener('submit', async function(event) {
            event.preventDefault();
            showLoading();

            const payload = {
                email: document.getElementById('admin-login-email').value,
                password: document.getElementById('admin-login-password').value
            };

            try {
                // A variável 'empreendedorSlug' vem do app.js
                const response = await fetch(`/${empreendedorSlug}/api/admin/login/`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRFToken': getCsrfToken()
                    },
                    body: JSON.stringify(payload)
                });

                const result = await response.json();
                
                if (!response.ok) {
                    throw new Error(result.message);
                }

                // SUCESSO:
                showToast({ message: 'Login administrativo bem-sucedido!', type: 'success' });
                
                // Mantenha o loading visível enquanto redireciona
                window.location.href = '/dashboard/'; 

            } catch (error) {
                // ERRO:
                showToast({ message: error.message, type: 'error' });
                
                // Somente esconde o loading se der erro, para o usuário tentar de novo
                hideLoading(); 
            }
        });
    }
});