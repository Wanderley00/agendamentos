// static/js/services.js
// Sistema de serviços e gerenciamento de catálogo

// 'servicesData' é global, definido em auth.js

/**
 * Carrega os serviços do servidor
 */
async function loadServices() {
    const servicesList = document.getElementById('services-list');
    if (!servicesList) return;
    
    // Exibe estado de carregamento
    servicesList.innerHTML = `
        <div class="loading-services">
            <div class="loading-spinner"></div>
            <p>Carregando serviços...</p>
        </div>
    `;
    try {
        // A API AGORA RETORNA UM OBJETO, NÃO UMA LISTA
        const response = await fetch(`/${empreendedorSlug}/api/servicos/`);
        if (!response.ok) {
            throw new Error('Falha ao carregar serviços.');
        }
        
        const result = await response.json();
        servicesData = result.servicos;

        // Aplicar a cor personalizada
        // (Lógica de cor já está no app.js, não precisa aqui)
        
        // Limpa o container antes de adicionar os cards
        servicesList.innerHTML = '';
        // Verifica se há serviços
        if (servicesData.length === 0) {
            servicesList.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">💇‍♀️</div>
                    <p>Nenhum serviço disponível no momento.</p>
                    <p class="empty-subtitle">Por favor, tente novamente mais tarde.</p>
                </div>
            `;
            return;
        }
        
        // Renderiza cada serviço
        servicesData.forEach(service => {
            // Passa o objeto de serviço inteiro
            const serviceCard = createServiceCard(service); 
            servicesList.appendChild(serviceCard);
        });
    } catch (error) {
        console.error('Erro ao carregar serviços:', error);
        servicesList.innerHTML = `
            <div class="error-state">
                <div class="error-icon">⚠️</div>
                <p>Erro ao carregar os serviços.</p>
                <p class="error-subtitle">Por favor, tente novamente mais tarde.</p>
                <button class="btn btn--outline" onclick="loadServices()">Tentar Novamente</button>
            </div>
        `;
    }
}

/**
 * Cria um card para exibir um serviço
 * @param {Object} service - Dados do serviço
 * @returns {HTMLElement} - Elemento do card
 */
function createServiceCard(service) {
    const serviceCard = document.createElement('div');
    serviceCard.className = 'service-card';

    // --- INÍCIO DA LÓGICA DE PREÇO MODIFICADA ---
    
    const hasTiers = service.tiers_manutencao && service.tiers_manutencao.length > 0;
    // 1. Encontra os tiers que estão ATIVOS (disponíveis para o cliente agora)
    const activeTiers = hasTiers ?
        service.tiers_manutencao.filter(t => t.is_active) : [];

    let preco;
    let precoLabel;
    
    // Pega a duração do serviço principal (cheio)
    const duracao = service.duracao_formatada || `${service.duracao_minutos} min`;

    if (activeTiers.length > 0) {
        // --- CASO 1: HÁ MANUTENÇÕES ATIVAS ---
        // Encontra o tier com o menor preço entre os ativos
        const minPriceTier = activeTiers.reduce((min, tier) => 
            (tier.preco < min.preco ? tier : min), 
            activeTiers[0]
        );
        preco = minPriceTier.preco.toFixed(2).replace('.', ',');
        precoLabel = `A partir de R$ ${preco}`;
        // Ex: "A partir de R$ 76,90"

    } else if (hasTiers) {
        // --- CASO 2: HÁ MANUTENÇÕES, MAS NENHUMA ESTÁ ATIVA (EXPIRARAM) ---
        // Usa o preço cheio (serviço principal)
        preco = service.price.toFixed(2).replace('.', ',');
        precoLabel = `A partir de R$ ${preco}`; // Ex: "A partir de R$ 115,00"
        
    } else {
        // --- CASO 3: SERVIÇO SIMPLES, SEM MANUTENÇÕES ---
        // Mostra o preço normal, sem "A partir de"
        preco = service.price.toFixed(2).replace('.', ',');
        precoLabel = `R$ ${preco}`; // Ex: "R$ 115,00"
    }
    
    // --- FIM DA LÓGICA DE PREÇO MODIFICADA ---


    // Prepara a imagem
    let imagemHTML = '';
    if (service.image_url) {
        imagemHTML = `<img src="${service.image_url}" alt="${service.name}" class="service-image-tag">`;
    } else {
        imagemHTML = `<div class="service-image-default">${service.icon || '✨'}</div>`;
    }

    // Monta o HTML do card (agora usando 'precoLabel')
    serviceCard.innerHTML = `
        <div class="service-image">
            ${imagemHTML}
        </div>
        <div class="service-content">
            <h3 class="service-title">${service.name}</h3>
            <p class="service-description">${service.description}</p>
            <div class="service-details">
                <span class="service-duration">${duracao}</span>
                 <span class="service-price">${precoLabel}</span>
            </div>
            <button class="btn btn--primary service-button" data-service-id="${service.id}">
                ${hasTiers ? 'Ver Opções' : 'Agendar Serviço'}
            </button>
        </div>
    `;
    // Adiciona evento ao botão
    const button = serviceCard.querySelector('.service-button');
    button.addEventListener('click', () => {
        selectService(service.id);
    });
    // --- INÍCIO DA NOVA ADIÇÃO (Animação de entrada) ---
    // Adiciona a classe de animação para o Intersection Observer
    serviceCard.classList.add('service-card--animate');
    // --- FIM DA NOVA ADIÇÃO ---

    return serviceCard;
}

/**
 * Seleciona um serviço para agendamento
 * @param {number} serviceId - ID do serviço
 */
window.selectService = function(serviceId) {
    // Encontra o serviço pelo ID (agora do cache global 'servicesData')
    selectedService = servicesData.find(service => service.id === serviceId);
    if (!selectedService) {
        showToast({ message: 'Erro: Serviço não encontrado.', type: 'error' });
        return;
    }

    // --- NOVA LÓGICA DE DECISÃO ---
    const hasTiers = selectedService.tiers_manutencao && selectedService.tiers_manutencao.length > 0;
    if (hasTiers) {
        // Se tem tiers, NÃO vamos direto ao calendário.
        // Vamos mostrar um modal de seleção de tier.
        showTierSelectionModal(selectedService);
    } else {
        // Comportamento antigo: É um serviço simples.
        // Define o tier selecionado como nulo
        // e usa os dados do serviço principal.
        // --- INÍCIO DA MODIFICAÇÃO (Cálculo do Adiantamento) ---
        const precoFinal = selectedService.price;
        const duracaoFinal = selectedService.duracao_minutos;
        const percentual = selectedService.percentual_adiantamento || 0;
        const valorAdiantamento = (precoFinal * percentual) / 100;
        
        proceedToProfessionals(
            null, 
            precoFinal, 
            duracaoFinal,
            valorAdiantamento // <-- Passa o valor do adiantamento
        );
        // --- FIM DA MODIFICAÇÃO ---
    }
    // --- FIM DA NOVA LÓGICA ---
};
/**
 * NOVA FUNÇÃO: Exibe o modal de seleção de tier
 */
function showTierSelectionModal(service) {
    // Gerar o HTML para as opções
    let optionsHTML = '';
    
    // 1. Verificamos se existe algum tier de manutenção ATIVO.
    const hasActiveTiers = service.tiers_manutencao.some(tier => tier.is_active);
    
    // 2. SÓ mostramos a opção "Primeira vez ou Troca" se
    //    NENHUM tier de manutenção estiver ativo (ou seja, todos expiraram).
    if (!hasActiveTiers) {
        
        // --- INÍCIO DA MODIFICAÇÃO (Cálculo do Adiantamento) ---
        const precoFinal = service.price;
        const duracaoFinal = service.duracao_minutos;
        const percentual = service.percentual_adiantamento || 0;
        const valorAdiantamento = (precoFinal * percentual) / 100;
        // --- FIM DA MODIFICAÇÃO ---

        // Pega o motivo dinâmico vindo do backend
        const motivo = service.motivo_preco_cheio || "Primeira vez ou troca"; // "Primeira vez" é um fallback
        
        optionsHTML += `
            <div class="tier-option-card" 
                 onclick="proceedToProfessionals(null, ${precoFinal}, ${duracaoFinal}, ${valorAdiantamento})">
                <h4>${service.name} (${motivo})</h4> 
                <p>${service.description}</p>
                <div class="tier-details">
                     <span class="service-price">R$ ${precoFinal.toFixed(2).replace('.', ',')}</span>
                    <span class="service-duration">${service.duracao_formatada}</span>
                </div>
                ${valorAdiantamento > 0 ?
                    `<div class="tier-signal">Adiantamento: R$ ${valorAdiantamento.toFixed(2).replace('.', ',')}</div>` : 
                    '<div class="tier-signal-free">Sem adiantamento</div>'
                }
            </div>
        `;
    }
    
    // 3. Adiciona os tiers de manutenção
    service.tiers_manutencao.forEach(tier => {
        const isActive = tier.is_active;
        const disabledClass = !isActive ? 'disabled' : '';

        // --- INÍCIO DA MODIFICAÇÃO (Cálculo do Adiantamento) ---
        const precoFinal = tier.preco;
        const duracaoFinal = tier.duracao_minutos;
        const percentual = tier.percentual_adiantamento || 0;
        const valorAdiantamento = (precoFinal * percentual) / 100;
        // --- FIM DA MODIFICAÇÃO ---
        
        let onClickAction = '';
        if (isActive) {
            // Se estiver ativo, define a ação de prosseguir
            onClickAction = `onclick="proceedToProfessionals(${tier.id}, ${precoFinal}, ${duracaoFinal}, ${valorAdiantamento})"`;
        } else {
            // Se estiver inativo, pega a mensagem de aviso do backend
            const message = tier.inactivity_message || 'Este período não está disponível.';
            
            // "Escapa" a mensagem para que aspas não quebrem o HTML do onclick
            const safeMessage = message.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
            onClickAction = `onclick="showToast({message: '${safeMessage}', type: 'warning'})"`;
        }

        optionsHTML += `
            <div class="tier-option-card ${disabledClass}" ${onClickAction}>
                <h4>${tier.nome_tier}</h4>
                 <p>${tier.dias_min}-${tier.dias_max} dias desde o último serviço.</p>
                <div class="tier-details">
                    <span class="service-price">R$ ${precoFinal.toFixed(2).replace('.', ',')}</span>
                    <span class="service-duration">${tier.duracao_formatada}</span>
                </div>
                ${valorAdiantamento > 0 ?
                    `<div class="tier-signal">Adiantamento: R$ ${valorAdiantamento.toFixed(2).replace('.', ',')}</div>` : 
                    '<div class="tier-signal-free">Sem adiantamento</div>'
                }
            </div>
        `;
    });

    // Exibe o modal genérico
    showModal({
        title: `Escolha uma opção para: ${service.name}`,
        message: `<div class="tier-selection-container">${optionsHTML}</div>`,
        showCancel: true,
        showConfirm: false, // Esconde o botão "Confirmar" padrão
        cancelText: 'Voltar'
    });
}

/**
 * NOVA FUNÇÃO: Prepara dados e avança para a tela de profissionais
 */
window.proceedToProfessionals = function(tierId, precoFinal, duracaoFinal, valorAdiantamento) {
    // 1. Armazena os dados selecionados globalmente
    // (O `selectedService` já está definido)
    
    // Usamos a variável global 'selectedTierInfo' definida em 'auth.js'
    selectedTierInfo = {
        tierId: tierId, // null se for o serviço principal
        preco: precoFinal,
        duracao: duracaoFinal,
        valor_adiantamento: valorAdiantamento // <-- NOVO
    };
    
    // 2. Fecha o modal se estiver aberto
    hideModal();
    
    // 3. Avança para a tela de profissionais
    // (Animar a tela de serviços)
    const servicesList = document.getElementById('services-list');
    if (servicesList) {
        servicesList.classList.add('fade-out');
        setTimeout(() => {
            showScreen('professional-screen');
            servicesList.classList.remove('fade-out');
        }, 300);
    } else {
        showScreen('professional-screen');
    }
}

// --- ESTILOS ADICIONAIS ---
document.addEventListener('DOMContentLoaded', function() {
    // Adiciona estilos para as animações e estados
    const style = document.createElement('style');
    style.textContent = `
        /* Animações para cards de serviço */
        .service-card {
            transition: transform 0.3s, box-shadow 0.3s;
        }
        
        .service-card:hover {
            transform: translateY(-5px);
            box-shadow: 0 8px 16px rgba(0,0,0,0.1);
        }
        
        /* Animação de fade */
        .fade-out {
            opacity: 0;
            transition: opacity 0.3s;
        }
        
        /* Estilos para estados vazios */
        .empty-state, .error-state, .loading-services {
            text-align: center;
            padding: var(--space-32);
            background: var(--color-surface);
            border-radius: var(--radius-lg);
            border: 1px solid var(--color-border);
        }
        
        .empty-icon, .error-icon {
            font-size: 3rem;
            margin-bottom: var(--space-16);
        }
        
        .empty-subtitle, .error-subtitle {
            color: var(--color-text-secondary);
            margin-top: var(--space-8);
            margin-bottom: var(--space-16);
        }
        
        /* Melhorias no card de serviço */
        .service-info-card {
            display: flex;
            align-items: center;
            gap: var(--space-16);
            padding: var(--space-16);
            background: var(--color-white);
            border-radius: var(--radius-base);
            box-shadow: var(--shadow-sm);
        }
        
        .service-icon {
            font-size: 2rem;
            display: flex;
            align-items: center;
            justify-content: center;
            width: 60px;
            height: 60px;
            background: rgba(var(--color-light-pink-rgb), 0.3);
            border-radius: var(--radius-full);
        }
        
        .service-details {
            flex: 1;
        }
        
        .service-meta {
            display: flex;
            flex-wrap: wrap; /* Permite quebrar linha */
            align-items: center;
            gap: var(--space-4) var(--space-12); /* 4px vertical, 12px horizontal */
            margin-top: var(--space-4);
        }
        
        .service-meta .service-duration {
            background: var(--color-primary-light);
            color: var(--color-primary-active);
            padding: var(--space-4) var(--space-8);
            border-radius: var(--radius-full);
            font-size: 12px;
            font-weight: 500;
        }
        
        .service-meta .service-price {
            font-weight: var(--font-weight-semibold);
            color: var(--color-primary);
        }

        .service-meta .service-price-signal {
            font-weight: var(--font-weight-medium);
            color: var(--color-text-secondary);
            font-size: 14px;
            width: 100%; /* Faz quebrar a linha */
            margin-top: 4px;
        }
        
        /* Loading spinner pequeno */
        .loading-spinner.small {
            width: 20px;
            height: 20px;
            border-width: 2px;
            margin-right: var(--space-8);
        }
        
        .loading-indicator {
            display: flex;
            align-items: center;
            justify-content: center;
            padding: var(--space-16);
        }
        .tier-selection-container {
            display: flex;
            flex-direction: column;
            gap: 12px;
        }
        .tier-option-card {
            border: 1px solid var(--color-border);
            border-radius: var(--radius-base);
            padding: 16px;
            cursor: pointer;
            transition: all 0.2s ease;
            position: relative; /* Para o adiantamento */
            overflow: hidden; /* Para o adiantamento */
        }
        .tier-option-card:hover {
            border-color: var(--color-primary);
            box-shadow: var(--shadow-sm);
            transform: translateY(-2px);
        }
        .tier-option-card.disabled {
            background: var(--color-light-gray);
            opacity: 0.7;
            cursor: not-allowed;
            text-decoration: line-through;
        }
        .tier-option-card.disabled:hover {
            border-color: var(--color-border);
            box-shadow: none;
            transform: none;
        }
        .tier-option-card h4 {
            margin: 0 0 8px 0;
            color: var(--color-dark-gray);
        }
        .tier-option-card p {
            font-size: 14px;
            color: var(--color-text-secondary);
            margin: 0 0 12px 0;
        }
        .tier-details {
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .tier-signal, .tier-signal-free {
            margin-top: 12px;
            padding-top: 8px;
            border-top: 1px dashed var(--color-medium-gray);
            font-size: 14px;
            font-weight: 500;
            color: var(--color-primary-active);
        }
        .tier-signal-free {
             color: var(--color-text-secondary);
        }
    `;
    document.head.appendChild(style);
});