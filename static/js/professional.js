// static/js/professional.js

/**
 * Helper para formatar duração (copiado do calendar.js)
 */
function formatarDuracao(minutos) {
  const horas = Math.floor(minutos / 60);
  const mins = minutos % 60;

  if (horas > 0) {
    return mins > 0 ? `${horas}h ${mins}min` : `${horas}h`;
  }
  return `${mins} min`;
}

/**
 * Carrega os profissionais que executam o serviço selecionado
 */
async function loadProfessionals() {
    const professionalList = document.getElementById('professional-list');
    const serviceInfo = document.getElementById('selected-service-info-pro');
    
    // 1. Verifica se um serviço E as informações do tier foram selecionados
    if (!selectedService || !selectedTierInfo) {
        professionalList.innerHTML = '<p class="error-state">Erro: Nenhuma opção de serviço selecionada. Volte e tente novamente.</p>';
        return;
    }
    
    // 2. Atualiza o card de informação do serviço (CORRIGIDO)
    
    // Usa os dados do tier selecionado (preço e duração)
    const duracao = formatarDuracao(selectedTierInfo.duracao);
    const preco = selectedTierInfo.preco.toFixed(2).replace('.', ',');

    // Exibe o adiantamento (se houver)
    let adiantamentoHTML = '';
    if (selectedTierInfo.valor_adiantamento > 0) {
        const adiantamento = selectedTierInfo.valor_adiantamento.toFixed(2).replace('.', ',');
        adiantamentoHTML = `<span class="service-price-signal">Adiantamento: R$ ${adiantamento}</span>`;
    }

    // Prepara a imagem
    let imagemHTML = '';
    if (selectedService.image_url) {
        imagemHTML = `<img src="${selectedService.image_url}" alt="${selectedService.name}" class="service-info-img">`;
    } else {
        imagemHTML = `<div class="service-icon">${selectedService.icon || '✨'}</div>`;
    }
    
    // Define o nome correto (Serviço ou Manutenção)
    let nomeExibido = selectedService.name;
    if (selectedTierInfo.tierId) {
        const tier = selectedService.tiers_manutencao.find(t => t.id === selectedTierInfo.tierId);
        if (tier) {
            nomeExibido = tier.nome_tier;
        }
    }

    // Monta o HTML do card (agora com os dados corretos)
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

    // 3. Mostra o loading e busca os profissionais
    professionalList.innerHTML = '<div class="loading-indicator"><div class="loading-spinner"></div></div>';
    try {
        const response = await fetch(`/${empreendedorSlug}/api/servico/${selectedService.id}/profissionais/`);
        if (!response.ok) {
            throw new Error('Falha ao buscar profissionais.');
        }
        
        const profissionais = await response.json();
        
        if (profissionais.length === 0) {
            professionalList.innerHTML = '<p class="empty-state">Nenhum profissional disponível para este serviço no momento.</p>';
            return;
        }

        // --- LÓGICA DE AUTO-SELEÇÃO ---
        // Se SÓ houver UM profissional, seleciona ele automaticamente e pula a tela
        if (profissionais.length === 1) {
            const prof = profissionais[0];
            selectProfessional(prof.id, prof.nome);
            return; // Pula a renderização da lista
        }
        // --- FIM DA LÓGICA ---

        
        // 4. Renderiza a lista de profissionais (se houver mais de um)
        professionalList.innerHTML = '';
        profissionais.forEach(prof => {
            const card = document.createElement('div');
            card.className = 'professional-card';
            
            // --- INÍCIO DA CORREÇÃO (Avatar) ---
            let avatarHTML = '';
            if (prof.foto_url) {
                 avatarHTML = `<img src="${prof.foto_url}" alt="${prof.nome}" class="professional-avatar-img">`;
            } else {
                // Se não tiver foto, usa a letra
                const avatarLetter = prof.nome.charAt(0).toUpperCase();
                avatarHTML = `<div class="professional-avatar-default">${avatarLetter}</div>`;
            }
             // --- FIM DA CORREÇÃO ---
            
            card.innerHTML = `
                <div class="professional-avatar">
                    ${avatarHTML}
                </div>
                 <h4 class="professional-name">${prof.nome}</h4>
            `;
            
            card.onclick = () => selectProfessional(prof.id, prof.nome);
            professionalList.appendChild(card);
        });
        
    } catch (error) {
        console.error('Erro ao carregar profissionais:', error);
        professionalList.innerHTML = '<p class="error-state">Erro ao carregar profissionais. Tente novamente.</p>';
    }
}

/**
 * Seleciona um profissional e avança para a tela de calendário
 * @param {number} id - ID do profissional
 * @param {string} nome - Nome do profissional
 */
window.selectProfessional = function(id, nome) {
    // 1. Salva o profissional no estado global
    selectedProfessional = { id: id, nome: nome };
    // 2. Avança para a tela do calendário
    showScreen('calendar-screen');
}