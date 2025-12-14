// static/js/calendar.js
// Sistema de calendário e agendamento

// --- VARIÁVEIS GLOBAIS ---
// As variáveis de estado (selectedService, selectedProfessional, selectedTierInfo, etc.)
// são definidas em auth.js para garantir a ordem de carregamento.

// --- VARIÁVEIS LOCAIS DO CALENDÁRIO ---
let currentMonth = new Date().getMonth();
let currentYear = new Date().getFullYear();
let paymentPollingInterval = null; // Guarda o ID do setInterval
let paymentTimerInterval = null;   // Guarda o ID do setInterval do timer
let currentPendingAgendamentoId = null; // Guarda o ID do agendamento pendente
// --- FIM DAS VARIÁVEIS LOCAIS ---


// --- FUNÇÕES DE INICIALIZAÇÃO ---

/**
 * Carrega o calendário e configurações iniciais
 */
function loadCalendar() {
    // Para qualquer limpeza de agendamento anterior
    stopPaymentPolling();

    updateCalendarHeader();
    
    // Passa a duração selecionada para a geração do calendário
    // selectedTierInfo é global (de auth.js) e foi definido em services.js
    if (!selectedTierInfo || selectedTierInfo.duracao === 0) {
        console.error("Erro: A duração do serviço (selectedTierInfo.duracao) é 0. Voltando.");
        showToast({message: "Erro ao carregar dados do serviço. Tente selecionar novamente.", type: "error"});
        showScreen('services-screen'); // Volta para a tela de serviços
        return;
    }
    
    generateCalendar(selectedTierInfo.duracao, selectedTierInfo.tierId); 
    updateSelectedServiceInfo();
    
    // Limpa seleções anteriores
    document.getElementById('time-selection').classList.add('hidden');
    document.getElementById('continue-to-login').disabled = true;
    selectedDate = null; // selectedDate é global (de auth.js)
    selectedTime = null; // selectedTime é global (de auth.js)
}

/**
 * Atualiza o cabeçalho do calendário com mês e ano atuais
 */
function updateCalendarHeader() {
    const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    document.getElementById('current-month').textContent = `${months[currentMonth]} ${currentYear}`;
}

/**
 * Atualiza as informações do serviço selecionado
 */
function updateSelectedServiceInfo() {
    const serviceInfo = document.getElementById('selected-service-info'); 
    
    // selectedService e selectedTierInfo são globais (de auth.js)
    if (selectedService && serviceInfo && selectedTierInfo) {
        // Usa os dados do tier selecionado (preço e duração)
        const duracao = formatarDuracao(selectedTierInfo.duracao);
        const preco = selectedTierInfo.preco.toFixed(2).replace('.', ',');
        
        // Exibe adiantamento
        let adiantamentoHTML = '';
        if (selectedTierInfo.valor_adiantamento > 0) {
            const adiantamento = selectedTierInfo.valor_adiantamento.toFixed(2).replace('.', ','); 
            adiantamentoHTML = `<span class="service-price-signal">Adiantamento: R$ ${adiantamento}</span>`;
        }

        let imagemHTML = '';
        if (selectedService.image_url) {
            imagemHTML = `<img src="${selectedService.image_url}" alt="${selectedService.name}" class="service-info-img">`;
        } else {
            imagemHTML = `<div class="service-icon">${selectedService.icon || '✨'}</div>`; 
        }

        let nomeExibido = selectedService.name;
        if (selectedTierInfo.tierId) {
             const tier = selectedService.tiers_manutencao.find(t => t.id === selectedTierInfo.tierId); 
            if (tier) {
                nomeExibido = tier.nome_tier;
            }
        }
        
        serviceInfo.innerHTML = `
            <div class="service-info-card">
                 ${imagemHTML}
                <div class="service-details">
                    <h3>${nomeExibido}</h3>
                    <div class="service-meta">
                         <span class="service-duration">${duracao}</span> 
                        <span class="service-price">Total: R$ ${preco}</span>
                        ${adiantamentoHTML}
                    </div>
                 </div> 
            </div>
         `;
    }
}


// Helper para formatar duração (pode ser global)
function formatarDuracao(minutos) {
  const horas = Math.floor(minutos / 60);
  const mins = minutos % 60;

  if (horas > 0) {
    return mins > 0 ? `${horas}h ${mins}min` : `${horas}h`;
  }
  return `${mins} min`;
}


/**
 * Gera a visualização do calendário para o mês atual
 */
async function generateCalendar(duracao, tierId) {
    const calendarGrid = document.getElementById('calendar-grid');
    calendarGrid.innerHTML = '<div class="loading-indicator"><div class="loading-spinner"></div></div>'; // Mostra loading

    // Busca os dias com horários disponíveis para o mês corrente
    let availableDays = [];
    try {
        // Usa as variáveis globais selectedService e selectedProfessional
        let apiUrl = `/${empreendedorSlug}/api/dias_disponiveis/?mes=${currentMonth + 1}&ano=${currentYear}&servico_id=${selectedService.id}&empreendedor_id=${selectedProfessional.id}&duracao=${duracao}`;
        if (tierId) {
             apiUrl += `&tier_id=${tierId}`; 
        }
        
        const response = await fetch(apiUrl);
        if (response.ok) {
            availableDays = await response.json();
        }
    } catch (error) {
        console.error("Não foi possível buscar os dias disponíveis:", error);
    }

    calendarGrid.innerHTML = ''; // Limpa o loading

    // Cabeçalho dos dias da semana
    const dayHeaders = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']; 
    dayHeaders.forEach(day => {
        const dayHeader = document.createElement('div');
        dayHeader.className = 'day-of-week';
        dayHeader.textContent = day;
        calendarGrid.appendChild(dayHeader);
    });
    
    const firstDay = new Date(currentYear, currentMonth, 1).getDay();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const today = new Date();
    today.setHours(0, 0, 0, 0); 

    for (let i = 0; i < firstDay; i++) {
        calendarGrid.insertAdjacentHTML('beforeend', '<div class="calendar-day other-month"></div>');
    }

    for (let day = 1; day <= daysInMonth; day++) {
        const dayElement = document.createElement('div');
        dayElement.className = 'calendar-day';
        dayElement.textContent = day;

        const currentDate = new Date(currentYear, currentMonth, day);
        const dateString = formatDateForAPI(currentDate);

        // 1. Bloqueia dias no passado
        if (currentDate < today) {
             dayElement.classList.add('unavailable'); 
        } 
        // 2. Verifica se a API (dias_disponiveis) retornou este dia
        else if (availableDays.includes(dateString)) {
            // Se sim, é um dia clicável e com horários
            dayElement.classList.add('available');
            dayElement.classList.add('has-availability'); // Adiciona o ponto
             dayElement.onclick = () => selectDate(dateString, dayElement, duracao, tierId); 
        } 
        // 3. Se não está no passado E não foi retornado pela API, é indisponível
        else {
            dayElement.classList.add('unavailable');
        }

        if (isSameDay(currentDate, today)) {
            dayElement.classList.add('today'); 
        }

        calendarGrid.appendChild(dayElement);
    }
}

// --- FUNÇÕES DE NAVEGAÇÃO E SELEÇÃO ---

/**
 * Muda o mês do calendário
 * @param {number} direction - Direção da mudança (1 para próximo, -1 para anterior)
 */
window.changeMonth = function(direction) {
    currentMonth += direction;
    if (currentMonth > 11) {
        currentMonth = 0;
        currentYear++;
    } else if (currentMonth < 0) {
        currentMonth = 11;
        currentYear--;
    }
     
    // Passa a duração e o tier selecionados (globais)
    generateCalendar(selectedTierInfo.duracao, selectedTierInfo.tierId); 
    
    updateCalendarHeader();
};

/**
 * Seleciona uma data no calendário e busca os horários disponíveis
 * @param {string} dateString - Data no formato YYYY-MM-DD
 * @param {HTMLElement} dayElement - Elemento HTML do dia
 */
window.selectDate = async function(dateString, dayElement, duracao, tierId) {
    if (dayElement.classList.contains('unavailable')) return;

    // Atualiza UI
    document.querySelectorAll('.calendar-day.selected').forEach(d => d.classList.remove('selected'));
    dayElement.classList.add('selected');
    selectedDate = dateString; // Atualiza o estado global

     // Limpa seleções anteriores e exibe carregamento
    const timeSelection = document.getElementById('time-selection');
    const timeSlots = document.getElementById('time-slots');
    timeSelection.classList.remove('hidden');
    timeSlots.innerHTML = '<div class="loading-indicator"><div class="loading-spinner small"></div><p>Buscando horários disponíveis...</p></div>'; 
    document.getElementById('continue-to-login').disabled = true;
    selectedTime = null; // Atualiza o estado global

    try {
        // Passa a duração para a API de horários
        let apiUrl = `/${empreendedorSlug}/api/horarios_disponiveis/?data=${dateString}&servico_id=${selectedService.id}&empreendedor_id=${selectedProfessional.id}&duracao=${duracao}`;
        
        const response = await fetch(apiUrl);
        if (!response.ok) {
             throw new Error('Falha ao buscar horários.'); 
        }
        
        const horarios = await response.json();
        showTimeSlots(horarios);
    } catch (error) {
        console.error("Erro ao buscar horários:", error);
        timeSlots.innerHTML = `
            <div class="error-message">
                <p>Não foi possível carregar os horários. Tente novamente.</p> 
                <button class="btn btn--outline" onclick="selectDate('${dateString}', document.querySelector('.calendar-day.selected'))">
                    Tentar Novamente
                </button>
            </div>
        `;
    }
};
/**
 * Exibe os horários disponíveis para a data selecionada
 * @param {Array} availableTimes - Lista de horários disponíveis
 */
function showTimeSlots(availableTimes) {
    const timeSlots = document.getElementById('time-slots');
    timeSlots.innerHTML = ''; // Limpa o "carregando"

    if (availableTimes.length === 0) {
        timeSlots.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">📅</div>
                 <p>Nenhum horário disponível para este serviço neste dia.</p> 
                <p class="empty-subtitle">Por favor, selecione outra data.</p>
            </div>
        `;
        return;
    }

    // Separa os horários em períodos
    const manha = availableTimes.filter(time => {
         const hour = parseInt(time.split(':')[0]); 
        return hour >= 8 && hour < 12;
    });
    const tarde = availableTimes.filter(time => {
        const hour = parseInt(time.split(':')[0]);
        return hour >= 12 && hour < 18; // Ajustado para pegar 12:00
    });
    const noite = availableTimes.filter(time => {
          const hour = parseInt(time.split(':')[0]); 
         return hour >= 18;
    });

    // Cria containers para os períodos
    const timeSlotsContainer = document.createElement('div');
    timeSlotsContainer.className = 'time-periods-container';

    // Função helper para criar um período
    const createPeriodSection = (title, times) => {
        if (times.length === 0) return;
        
        const container = document.createElement('div');
        container.className = 'time-period';
        container.innerHTML = `<h4 class="period-title">${title}</h4>`;
        
        const slotsGrid = document.createElement('div');
        slotsGrid.className = 'time-slots-grid';
        times.forEach(time => { 
            const timeSlot = document.createElement('div');
            timeSlot.className = 'time-slot';
            timeSlot.textContent = time;
            timeSlot.onclick = () => selectTime(time, timeSlot);
            slotsGrid.appendChild(timeSlot);
        });
        
        container.appendChild(slotsGrid);
        timeSlotsContainer.appendChild(container); 
    };

    // Adiciona os períodos
    createPeriodSection('Manhã', manha);
    createPeriodSection('Tarde', tarde);
    createPeriodSection('Noite', noite);

    // Adiciona a estrutura ao container principal
    timeSlots.appendChild(timeSlotsContainer);
}

/**
 * Seleciona um horário
 * @param {string} time - Horário selecionado
 * @param {HTMLElement} timeSlotElement - Elemento HTML do horário
 */
window.selectTime = function(time, timeSlotElement) {
    document.querySelectorAll('.time-slot.selected').forEach(s => s.classList.remove('selected'));
    timeSlotElement.classList.add('selected');
    selectedTime = time; // Atualiza o estado global
    document.getElementById('continue-to-login').disabled = false;
};

// --- FUNÇÕES DE AGENDAMENTO ---

/**
 * Inicia o processo de remarcação de um agendamento
 * @param {number} appointmentId - ID do agendamento a ser remarcado
 * @param {number} serviceId - ID do serviço do agendamento
 */
window.startReschedule = function(appointmentId, serviceId) {
    // Exibe modal de confirmação personalizado
    showModal({
        title: 'Confirmar Remarcação',
        message: `
            <p>Você será redirecionado para a agenda para escolher um novo horário.</p> 
            <p><strong>Atenção:</strong> O seu horário atual será cancelado ao confirmar a nova data.</p>
            <p>Deseja continuar?</p>
        `,
        confirmText: 'Sim, remarcar',
        cancelText: 'Não, manter agendamento',
        onConfirm: () => {
             // Define o estado de remarcação (global)
            reschedulingAppointmentId = appointmentId; 

            // Pré-seleciona o serviço e vai para a tela do calendário
            selectedService = servicesData.find(service => service.id === serviceId);
            
            if (selectedService) {
                // Assumindo que remarcação usa o preço/duração originais (sem tiers)
                 selectedTierInfo = { 
                    tierId: null,
                    preco: selectedService.price,
                     duracao: selectedService.duracao_minutos, 
                    valor_adiantamento: 0 // Remarcação não cobra adiantamento
                };
                
                showScreen('professional-screen'); // Remarcação deve escolher profissional
            } else {
                 // Se os serviços não estiverem carregados, carrega e depois vai
                loadServices().then(() => { 
                    selectedService = servicesData.find(service => service.id === serviceId);
                    
                     selectedTierInfo = { 
                        tierId: null,
                        preco: selectedService.price,
                         duracao: selectedService.duracao_minutos, 
                        valor_adiantamento: 0
                    };
                    showScreen('professional-screen');
                  }); 
            }
        }
    });
};
/**
 * Processa o agendamento com os dados selecionados
 * (CHAMADO PELA TELA DE LOGIN/RESUMO)
 */
window.processBooking = async function() {
    // Verifica os dados selecionados (todos globais)
    if (!selectedService || !selectedDate || !selectedTime || !selectedTierInfo || !selectedProfessional) {
        showToast({
            message: 'Por favor, selecione todos os dados do agendamento.', 
            type: 'warning'
        });
        return;
    }
    
    // Verifica autenticação (global)
    if (!authState.isAuthenticated) {
        showScreen('login-screen');
        return;
    }
    
    showLoading();
    try {
        // --- LÓGICA DE REMARCAÇÃO ---
         if (reschedulingAppointmentId) { 
            // Exibe confirmação final para cancelar o agendamento antigo
            const cancelResponse = await fetch(`/${empreendedorSlug}/api/agendamentos/${reschedulingAppointmentId}/cancelar/`, {
                method: 'POST',
                headers: { 'X-CSRFToken': getCsrfToken() }
             }); 
            
            if (!cancelResponse.ok) {
                const errorData = await cancelResponse.json();
                throw new Error(errorData.message || 'Não foi possível cancelar o agendamento antigo. A operação foi interrompida.');
            }
            
            showToast({
                 message: 'Agendamento antigo cancelado com sucesso.', 
                type: 'info'
            });
        }

        // --- DADOS PARA O NOVO AGENDAMENTO ---
        const payload = {
            serviceId: selectedService.id,
             date: selectedDate, 
            time: selectedTime,
            empreendedorId: selectedProfessional.id,
            tierManutencaoId: selectedTierInfo.tierId 
        };

        // --- CHAMADA FETCH PARA CRIAR AGENDAMENTO ---
        const response = await fetch(`/${empreendedorSlug}/api/agendar/`, {
             method: 'POST', 
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCsrfToken()
            },
            body: JSON.stringify(payload)
        });
        
        const result = await response.json(); 

        if (!response.ok) {
            throw new Error(result.message || 'Falha ao criar agendamento.');
        }

        // --- LÓGICA DE DECISÃO PÓS-CRIAÇÃO ---
        
        if (result.status === 'success' && !result.payment_required) {
            // CASO 1: SUCESSO DIRETO (Adiantamento R$ 0)
             showToast({ message: 'Agendamento realizado com sucesso!', type: 'success' }); 
            await showConfirmation(result.agendamento_id); // Passa o ID

        } else if (result.status === 'pending_payment' && result.payment_required) {
            // CASO 2: PAGAMENTO PENDENTE (PIX Gerado)
            currentPendingAgendamentoId = result.agendamento_id;
            
            // Preenche a tela de pagamento
             document.getElementById('payment-qr-code-img').src = `data:image/png;base64,${result.qr_code_base64}`; 
            document.getElementById('payment-qr-code-text').value = result.qr_code;
            
            // Mostra a tela de pagamento
            showScreen('payment-screen');
            
            // Inicia o timer e o polling
            startPaymentTimer(result.expires_at);
            startPaymentPolling(result.agendamento_id, result.expires_at);

        } else {
            // Caso inesperado
            throw new Error(result.message || 'Resposta inesperada do servidor.'); 
        }

    } catch (error) {
        console.error('Falha no agendamento:', error);
        showToast({
            message: `Erro: ${error.message}`,
            type: 'error',
            duration: 5000
        });
    } finally {
        reschedulingAppointmentId = null;
        // Limpa o estado de remarcação 
        hideLoading();
    }
}

/**
 * Exibe a tela de confirmação com os detalhes do agendamento
 */
async function showConfirmation(agendamento_id) {
    // Verifica autenticação novamente por segurança
    const authStatus = await fetch(`/${empreendedorSlug}/api/check_auth/`).then(res => res.json());
    if(!authStatus.isAuthenticated) {
        showScreen('forced-login-screen');
        return;
    }

    // Formata a data para exibição
    const [year, month, day] = selectedDate.split('-');
    const formattedDate = `${day}/${month}/${year}`;

    // Determina o nome a ser exibido
    let nomeExibido = selectedService.name; 
    if (selectedTierInfo.tierId) {
        const tier = selectedService.tiers_manutencao.find(t => t.id === selectedTierInfo.tierId);
        if (tier) nomeExibido = tier.nome_tier;
    }
    
    // Preenche os detalhes do agendamento
    document.getElementById('booking-details').innerHTML = `
        <div class="summary-item">
            <span class="label">Cliente:</span>
             <span class="value">${authStatus.user.name} ${authStatus.user.lastname}</span> 
        </div>
        <div class="summary-item">
            <span class="label">Profissional:</span>
            <span class="value">${selectedProfessional.nome}</span>
        </div>
        <div class="summary-item">
            <span class="label">Serviço:</span>
             <span class="value">${nomeExibido}</span> 
        </div>
        <div class="summary-item">
            <span class="label">Data:</span>
            <span class="value">${formattedDate}</span>
        </div>
        <div class="summary-item">
            <span class="label">Horário:</span>
             <span class="value">${selectedTime}</span> 
        </div>
        <div class="summary-total">
            <span class="label">Total:</span>
            <span class="value">R$ ${selectedTierInfo.preco.toFixed(2).replace('.', ',')}</span>
        </div>
        ${selectedTierInfo.valor_adiantamento > 0 ? `
        <div class="summary-total" style="font-size: 1rem; margin-top: 8px;"> 
            <span class="label">Adiantamento Pago:</span>
            <span class="value" style="color: var(--color-success);">R$ ${selectedTierInfo.valor_adiantamento.toFixed(2).replace('.', ',')}</span>
        </div>
        ` : `
        <div class="summary-total" style="font-size: 1rem; margin-top: 8px;">
            <span class="label">Adiantamento:</span>
             <span class="value">R$ 0,00</span> 
        </div>
        `}
    `;
    
    showScreen('confirmation-screen');
}

/**
 * Atualiza o resumo do agendamento na tela de login
 */
function updateBookingSummary() {
    // Verifica se temos os dados básicos para preencher
    if (selectedService && selectedDate && selectedTime && selectedTierInfo) {
        
        // 1. Formata a Data
        const [year, month, day] = selectedDate.split('-');
        const formattedDate = `${day}/${month}/${year}`;

        // 2. Define o Nome do Serviço
        let nomeExibido = selectedService.name;
        if (selectedTierInfo.tierId) {
            const tier = selectedService.tiers_manutencao.find(t => t.id === selectedTierInfo.tierId);
            if (tier) nomeExibido = tier.nome_tier;
        }

        // 3. Define o Profissional (CORREÇÃO)
        const nomeProfissional = (selectedProfessional && selectedProfessional.nome) 
                                ? selectedProfessional.nome 
                                : 'Não selecionado';

        // 4. Define o Cliente (CORREÇÃO)
        // Acessa o estado global de autenticação (window.getAuthState vem do auth.js)
        let nomeCliente = 'Visitante';
        const authState = window.getAuthState(); 
        if (authState && authState.isAuthenticated && authState.user) {
            nomeCliente = `${authState.user.name} ${authState.user.lastname}`;
        }

        // --- ATUALIZAÇÃO DO HTML ---

        // 0. Imagem do Serviço (NOVO)
        const imgContainer = document.getElementById('summary-service-image-container');
        const imgEl = document.getElementById('summary-service-img');

        if (selectedService.image_url) {
            imgEl.src = selectedService.image_url;
            imgContainer.style.display = 'block';
        } else {
            imgContainer.style.display = 'none';
        }
        
        // Preenche Cliente e Profissional
        const clientEl = document.getElementById('summary-client');
        if (clientEl) clientEl.textContent = nomeCliente;

        const profEl = document.getElementById('summary-professional');
        if (profEl) profEl.textContent = nomeProfissional;

        // Preenche Serviço, Data, Hora
        document.getElementById('summary-service').textContent = nomeExibido;
        document.getElementById('summary-date').textContent = formattedDate;
        document.getElementById('summary-time').textContent = selectedTime;
        document.getElementById('summary-duration').textContent = formatarDuracao(selectedTierInfo.duracao);
        
        // Preenche Preço
        const priceElement = document.getElementById('summary-price');
        priceElement.textContent = `R$ ${selectedTierInfo.preco.toFixed(2).replace('.', ',')}`;

        // 5. Lógica do Adiantamento (Visual)
        // Remove qualquer adiantamento anterior para não duplicar
        const oldAdiantamento = document.querySelector('.summary-total-adiantamento');
        if (oldAdiantamento) oldAdiantamento.remove();

        if (selectedTierInfo.valor_adiantamento > 0) {
            const adiantamento = selectedTierInfo.valor_adiantamento.toFixed(2).replace('.', ',');
            const adiantamentoHTML = `
                <div class="summary-total summary-total-adiantamento" style="font-size: 1rem; margin-top: 8px; border-top: 1px solid var(--color-border); padding-top: 8px; color: var(--color-success);">
                    <span class="label">Adiantamento (PIX):</span>
                    <span class="value">R$ ${adiantamento}</span>
                </div>`;
            
            // Insere logo após o elemento de preço total
            priceElement.closest('.summary-total').insertAdjacentHTML('afterend', adiantamentoHTML);
        }
    }
}

// --- FUNÇÕES UTILITÁRIAS ---

/**
 * Formata uma data para o formato esperado pela API (YYYY-MM-DD)
 * @param {Date} date - Objeto de data
 * @returns {string} - Data formatada
 */
function formatDateForAPI(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

/**
 * Verifica se duas datas são o mesmo dia
 * @param {Date} date1 - Primeira data
 * @param {Date} date2 - Segunda data 
 * @returns {boolean} - Se são o mesmo dia
 */
function isSameDay(date1, date2) {
    return date1.getFullYear() === date2.getFullYear() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getDate() === date2.getDate();
}

/**
 * Obtém o token CSRF do cookie
 * @returns {string} - Token CSRF
 */
function getCsrfToken() {
    const name = 'csrftoken';
    let cookieValue = null;
    
    if (document.cookie && document.cookie !== '') { 
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i].trim();
            if (cookie.substring(0, name.length + 1) === (name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
     } 
    
    return cookieValue;
}

// --- INÍCIO DE NOVAS FUNÇÕES (Pagamento) ---

/**
 * Inicia o timer de contagem regressiva na tela de pagamento.
 * @param {string} expiresAtISO - Data/hora ISO de quando o PIX expira.
 */
function startPaymentTimer(expiresAtISO) {
    const timerDisplay = document.getElementById('payment-timer-display').querySelector('span'); 
    if (!timerDisplay) return;

    const expirationTime = new Date(expiresAtISO).getTime();

    // Limpa timer anterior, se houver
    if (paymentTimerInterval) {
        clearInterval(paymentTimerInterval);
    }

    paymentTimerInterval = setInterval(() => { 
        const now = new Date().getTime();
        const distance = expirationTime - now;

        if (distance <= 0) {
            clearInterval(paymentTimerInterval);
            timerDisplay.textContent = "Expirado";
            // O polling vai tratar o cancelamento 
        } else {
            const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((distance % (1000 * 60)) / 1000);
            timerDisplay.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
        }
     }, 1000); 
}

/**
 * Inicia o polling para verificar o status do agendamento.
 * @param {number} agendamentoId - ID do agendamento a ser verificado.
 * @param {string} expiresAtISO - Data/hora ISO de quando o PIX expira.
 */
function startPaymentPolling(agendamentoId, expiresAtISO) {
    
    // --- CORREÇÃO (Timer Travado) ---
    // Limpa APENAS o polling anterior, não o timer visual.
    if (paymentPollingInterval) {
        clearInterval(paymentPollingInterval);
        paymentPollingInterval = null;
    }
    // A chamada original 'stopPaymentPolling()' limpava o timer que acabamos de criar.
    // --- FIM DA CORREÇÃO ---

    const expirationTime = new Date(expiresAtISO).getTime();

    paymentPollingInterval = setInterval(async () => {
        const now = new Date().getTime();

        // 1. Verifica se o tempo expirou
        if (now >= expirationTime) { 
            console.log("Timer expirou. Parando polling.");
            stopPaymentPolling(); // Agora sim, para tudo
            showScreen('payment-failed-screen');
            // O backend (cron job) vai limpar o agendamento
             return; 
        }

        // 2. Se ainda há tempo, verifica o status no backend
        try {
            const response = await fetch(`/${empreendedorSlug}/api/check-booking-status/${agendamentoId}/`); 
            if (!response.ok) {
                 // Se o agendamento não for encontrado (404), para o polling
                if(response.status === 404) stopPaymentPolling(); 
                return; // Tenta de novo na próxima
            }

            const result = await response.json();

            // --- CORREÇÃO (UI Não Atualiza) ---
            // Verifica o 'status_pagamento', não o 'status' do agendamento.
            const paymentStatus = result.status_pagamento;
            
            if (paymentStatus === 'Adiantamento Realizado' || paymentStatus === 'Pago') {
            // --- FIM DA CORREÇÃO ---
                // SUCESSO!
                console.log("Pagamento confirmado via polling!");
                stopPaymentPolling(); // Para tudo (timer e polling)
                showToast({ message: 'Pagamento recebido!', type: 'success' });
                // (selectedService, etc. ainda estão no estado global)
                await showConfirmation(agendamentoId);
                
            } else if (result.status === 'Cancelado' || paymentStatus === 'Cancelado' || paymentStatus === 'rejected' || paymentStatus === 'expired') {
                // FALHA (Ex: webhook recebeu 'rejected' antes do polling)
                console.log("Agendamento cancelado via polling.");
                stopPaymentPolling(); // Para tudo
                showScreen('payment-failed-screen');
            
            } else {
                // Ainda 'Aguardando Pagamento', continua o polling
                console.log(`Aguardando pagamento... (Status Pag: ${paymentStatus})`);
            }

        } catch (error) {
            console.error("Erro no polling:", error);
            // Continua tentando
        }
    }, 5000);
    // Verifica a cada 5 segundos
}

/**
 * Para todos os timers e intervals de pagamento.
 */
function stopPaymentPolling() {
    if (paymentPollingInterval) {
        clearInterval(paymentPollingInterval);
        paymentPollingInterval = null; 
    }
    if (paymentTimerInterval) {
        clearInterval(paymentTimerInterval);
        paymentTimerInterval = null;
    }
    currentPendingAgendamentoId = null;
}

// --- FIM DE NOVAS FUNÇÕES (Pagamento) ---


// --- INICIALIZAÇÃO ---
window.proceedWithBooking = function() {
    processBooking();
};

// Listener para o botão de continuar
document.addEventListener('DOMContentLoaded', function() {
    const continueButton = document.getElementById('continue-to-login');
    if (continueButton) {
        continueButton.addEventListener('click', function() {
             // Em AMBOS os casos (logado ou não), vamos para a tela de login/resumo.
            // A tela irá se adaptar sozinha, mostrando o formulário ou a mensagem de "usuário logado".
            showScreen('login-screen'); 
        });
    }

    // --- NOVA ADIÇÃO (Botão Copiar PIX) ---
     const copyButton = document.getElementById('btn-copy-pix'); 
    if (copyButton) {
        copyButton.addEventListener('click', () => {
            const input = document.getElementById('payment-qr-code-text');
            input.select(); // Seleciona o texto
            input.setSelectionRange(0, 99999); // Para mobile
            
             try { 
                navigator.clipboard.writeText(input.value);
                showToast({ message: 'Código PIX copiado!', type: 'success' });
                copyButton.textContent = 'Copiado!';
                setTimeout(() => { copyButton.textContent = 'Copiar'; }, 2000);
            } catch (err) {
                showToast({ message: 'Falha ao copiar. Copie manualmente.', type: 'error' }); 
            }
        });
    }
    // --- FIM DA NOVA ADIÇÃO ---
});