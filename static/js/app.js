// static/js/app.js
// Arquivo principal da aplicação - inicialização e configuração global

// --- ESTADO GLOBAL DA APLICAÇÃO ---
let currentScreen = 'home-screen';
let empreendedorSlug = null;
let portfolioLink = null;

// --- NOVA ADIÇÃO ---
// Guarda a tela de destino após o login forçado
window.nextScreenAfterLogin = null; 
// --- FIM DA ADIÇÃO ---

window.wasWarningsScreenSkipped = false;

function getEmpreendedorSlug() {
    // Ex: /salao-da-maria/ -> ['','salao-da-maria','']
    const pathParts = window.location.pathname.split('/');
    if (pathParts.length > 1 && pathParts[1]) {
        return pathParts[1];
    }
    return null;
}

/**
 * Exibe uma tela específica com transição suave
 * @param {string} screenId - ID da tela a ser exibida
 * @param {boolean} addToHistory - Se deve adicionar ao histórico do navegador
 */
window.showScreen = function(screenId, addToHistory = true) {
    const currentScreenElement = document.getElementById(currentScreen);
    const targetScreen = document.getElementById(screenId);

    if (!targetScreen || screenId === currentScreen) return;

    // Adiciona ao histórico do navegador
    if (addToHistory) {
        window.history.pushState({ screen: screenId }, '', '#' + screenId);
    }

    const runTransition = () => {
        if (currentScreenElement) {
            currentScreenElement.classList.remove('active');
        }
        targetScreen.classList.add('active');
        currentScreen = screenId;
        initializeScreenContent(screenId);
        window.scrollTo(0, 0);
    };

    // Simples troca sem transição para evitar complexidade inicial
    runTransition();
};

/**
 * Inicializa o conteúdo específico de cada tela
 * @param {string} screenId - ID da tela a ser inicializada
 */
function initializeScreenContent(screenId) {
    switch(screenId) {
        case 'services-screen':
            loadServices();
            break;
        
        // --- ADICIONE ESTE 'case' ---
        case 'warnings-screen':
            loadAvisosCliente();
            break;
        // --- FIM DA ADIÇÃO ---
        
        case 'professional-screen':
            if (typeof loadProfessionals === 'function') {
                loadProfessionals();
            }
            break;
        case 'calendar-screen':
            loadCalendar();
            break;
        case 'login-screen':
            if (typeof updateBookingSummary === 'function') {
                updateBookingSummary();
            }
            break;
        case 'client-area-screen':
            if (typeof loadClientAppointments === 'function') {
                loadClientAppointments();
            }
            break;

        case 'profile-screen':
            if (typeof loadProfileForEditing === 'function') {
                loadProfileForEditing();
            }
            break;
        case 'admin-screen':
            if (typeof loadAdminContent === 'function') {
                loadAdminContent();
            }
            break;
    }
}

/**
 * Carrega e exibe o mural de avisos dinâmico na tela do cliente.
 */
async function loadAvisosCliente() {
    const container = document.getElementById('warnings-content-lista');
    if (!container) return;
    
    container.innerHTML = '<p>Carregando avisos...</p>';
    
    try {
        const response = await fetch(`/${empreendedorSlug}/api/avisos/`);
        if (!response.ok) throw new Error('Falha ao carregar avisos.');
        const avisos = await response.json();
        
        if (avisos.length === 0) {
            container.innerHTML = '<p class="text-secondary text-center">Nenhum aviso importante no momento.</p>';
            return;
        }
        
        container.innerHTML = ''; // Limpa
        avisos.forEach(aviso => {
            const card = document.createElement('div');
            card.className = 'warning-card';
            card.innerHTML = `
                <div class="warning-icon">⚠️</div>
                <h3>${aviso.titulo}</h3>
                <div class="aviso-conteudo-cliente">
                    ${aviso.conteudo} </div>
            `;
            container.appendChild(card);
        });

    } catch (error) {
        console.error(error);
        container.innerHTML = `<p class="text-error">${error.message}</p>`;
    }
}

// =================================================================
// NOVA ADIÇÃO: FUNÇÃO PARA INICIAR O FLUXO DE AGENDAMENTO
// =================================================================
/**
 * Inicia o fluxo de agendamento, verificando o login primeiro.
 * Chamado pelo botão "Agendar Horário" na home.
 */
window.startBookingFlow = async function() {
    // Mostra o loading, pois agora faremos uma verificação na rede
    showLoading();
    
    let proximaTela = 'warnings-screen'; // O destino padrão

    window.wasWarningsScreenSkipped = false;

    try {
        // 1. Verifica se existem avisos antes de decidir para onde ir
        const response = await fetch(`/${empreendedorSlug}/api/avisos/`);
        if (!response.ok) {
            // Se a API falhar, mantenha o comportamento padrão (ir para a tela de avisos)
            console.warn('Falha ao verificar avisos. Exibindo tela de avisos por padrão.');
        } else {
            const avisos = await response.json();
            
            // 2. A MUDANÇA PRINCIPAL: Se não houver avisos, pule para os serviços
            if (avisos.length === 0) {
                proximaTela = 'services-screen';
                window.wasWarningsScreenSkipped = true;
            }
        }
    } catch (error) {
        console.error('Erro ao verificar avisos:', error);
        // Em caso de erro, mantenha o comportamento padrão
    }

    // 3. Continua com a lógica de autenticação que já existia
    const auth = window.getAuthState();
    if (auth.isAuthenticated) {
        // Se já está logado, vai para a próxima tela decidida (avisos OU serviços)
        showScreen(proximaTela);
    } else {
        // Se não está logado, define o destino e vai para o login forçado
        window.nextScreenAfterLogin = proximaTela;
        showScreen('forced-login-screen');
    }
    
    // Esconde o loading
    hideLoading();
}
// --- FIM DA NOVA ADIÇÃO ---

window.navigateBackFromServices = function() {
    if (window.wasWarningsScreenSkipped) {
        // Se pulamos os avisos, volte direto para a home
        showScreen('home-screen');
    } else {
        // Caso contrário, volte para os avisos
        showScreen('warnings-screen');
    }
}

// --- INICIALIZAÇÃO ---
document.addEventListener('DOMContentLoaded', async function() {
    console.log('Bella Designer - Aplicação inicializada');
    empreendedorSlug = getEmpreendedorSlug();

    if (!empreendedorSlug) {
        // Lógica para o que fazer se não houver slug (ex: mostrar uma página inicial)
        console.log("Página principal, nenhum empreendedor selecionado.");
        return;
    }

    // --- INÍCIO DA NOVA LÓGICA DE CARREGAMENTO ---
    try {
        const response = await fetch(`/${empreendedorSlug}/api/negocio-info/`);
        if (!response.ok) throw new Error('Negócio não encontrado.');
        
        const negocioInfo = await response.json();
        
        // --- LÓGICA DA COR PRIMÁRIA (JÁ EXISTE) ---
        const hslParts = negocioInfo.cor_primaria_hsl.split(',');
        if (hslParts.length === 3) {
            const h = hslParts[0].trim();
            const s = hslParts[1].trim();
            const l = hslParts[2].trim();
            
            document.documentElement.style.setProperty('--color-primary-hsl', negocioInfo.cor_primaria_hsl);
            document.documentElement.style.setProperty('--color-primary-h', h);
            document.documentElement.style.setProperty('--color-primary-s', s);
            document.documentElement.style.setProperty('--color-primary-l', l);
        } else {
            console.error("Formato HSL primário inválido:", negocioInfo.cor_primaria_hsl);
        }
        
        // --- ADICIONE ESTA NOVA LÓGICA PARA A COR SECUNDÁRIA ---
        const hslPartsSec = negocioInfo.cor_secundaria_hsl.split(',');
        if (hslPartsSec.length === 3) {
            const h_sec = hslPartsSec[0].trim();
            const s_sec = hslPartsSec[1].trim();
            const l_sec = hslPartsSec[2].trim();

            document.documentElement.style.setProperty('--color-secondary-hsl', negocioInfo.cor_secundaria_hsl);
            document.documentElement.style.setProperty('--color-secondary-h', h_sec);
            document.documentElement.style.setProperty('--color-secondary-s', s_sec);
            document.documentElement.style.setProperty('--color-secondary-l', l_sec);
        } else {
            console.error("Formato HSL secundário inválido:", negocioInfo.cor_secundaria_hsl);
        }
        
        // 3. Atualiza o nome e tagline na Home
        const logoElement = document.querySelector('#home-screen .logo');
        const taglineElement = document.querySelector('#home-screen .tagline');
        if (logoElement) logoElement.textContent = negocioInfo.nome_negocio;
        if (taglineElement) taglineElement.textContent = negocioInfo.tagline;
        
        // --- ADICIONE ESTE BLOCO ---
        // 4. Atualiza a Logo na Home
        const logoImg = document.getElementById('negocio-logo');
        if (logoImg) {
            if (negocioInfo.logo_url) {
                logoImg.src = negocioInfo.logo_url;
                logoImg.style.display = 'block'; // Mostra a imagem
            } else {
                logoImg.style.display = 'none'; // Esconde se não houver logo
            }
        }
        // // 5. Atualiza os Avisos na Tela de Warnings
        // const avisoProcEl = document.getElementById('aviso-procedimento-lista');
        // const avisoCancEl = document.getElementById('aviso-cancelamento-lista');

        // if (avisoProcEl) {
        //     avisoProcEl.innerHTML = negocioInfo.aviso_procedimento || "<li>Nenhum aviso definido.</li>";
        // }
        // if (avisoCancEl) {
        //     avisoCancEl.innerHTML = negocioInfo.aviso_cancelamento || "<li>Nenhuma política definida.</li>";
        // }
        // --- FIM DA ADIÇÃO ---

        // --- INÍCIO DA ADIÇÃO ---
        if (negocioInfo.portfolio_url) {
            portfolioLink = negocioInfo.portfolio_url;
            const portfolioBtn = document.getElementById('btn-portfolio');
            if (portfolioBtn) {
                portfolioBtn.classList.remove('hidden');
            }
        }
        // --- FIM DA ADIÇÃO ---

        // --- NOVA LÓGICA DE CONTATO/MAPA ---
        const contactContainer = document.getElementById('location-contact-container');
        const btnMaps = document.getElementById('btn-maps');
        const btnWhatsapp = document.getElementById('btn-whatsapp');
        let hasContactInfo = false;

        // 1. Configura Endereço (Mapa)
        if (negocioInfo.endereco) {
            // Gera link de busca do Google Maps
            const mapsQuery = encodeURIComponent(negocioInfo.endereco);
            btnMaps.href = `https://www.google.com/maps/search/?api=1&query=${mapsQuery}`;
            btnMaps.classList.remove('hidden');
            hasContactInfo = true;
        } else {
            btnMaps.classList.add('hidden');
        }

        // 2. Configura WhatsApp
        if (negocioInfo.telefone_contato) {
            // Limpa o número para o link
            const rawPhone = negocioInfo.telefone_contato.replace(/\D/g, '');
            btnWhatsapp.href = `https://wa.me/55${rawPhone}`; // Assume Brasil (55) se não tiver
            btnWhatsapp.classList.remove('hidden');
            hasContactInfo = true;
        } else {
            btnWhatsapp.classList.add('hidden');
        }

        // 3. Mostra o container se houver algum botão
        if (hasContactInfo && contactContainer) {
            contactContainer.classList.remove('hidden');
        }
        
    } catch (error) {
        console.error("Erro ao carregar informações do negócio:", error);
    }

    // Garante que apenas a tela inicial esteja ativa
    document.querySelectorAll('.screen').forEach(screen => {
        if(screen.id !== 'home-screen'){
            screen.classList.remove('active');
        } else {
            screen.classList.add('active');
        }
    });

    // Inicializa o estado de autenticação
    if (typeof initAuthState === 'function') {
        initAuthState();
    }

    // Detecta navegação por histórico do navegador
    window.addEventListener('popstate', function(event) {
        if (event.state && event.state.screen) {
            showScreen(event.state.screen, false); // false = não adicionar ao histórico
        } else {
            showScreen('home-screen', false);
        }
    });

    // --- INÍCIO DA ADIÇÃO ---
    // Adicione o listener para fechar o modal
    const portfolioModalClose = document.getElementById('portfolio-modal-close');
    if (portfolioModalClose) {
        portfolioModalClose.addEventListener('click', closePortfolioModal);
    }
});

// --- INÍCIO DA ADIÇÃO ---
// Adicione estas DUAS NOVAS FUNÇÕES no final do arquivo app.js

/**
 * Abre o modal do portfólio e carrega o iframe
 */
window.openPortfolioModal = function() {
    if (!portfolioLink) return;

    const modal = document.getElementById('portfolio-modal-container');
    const iframe = document.getElementById('portfolio-iframe');
    const loading = document.getElementById('portfolio-loading');

    if (!modal || !iframe || !loading) return;

    // 1. Mostra o loading e o modal
    loading.classList.remove('hidden');
    modal.classList.remove('hidden');

    // 2. Define o src do iframe (isso começa o carregamento)
    iframe.src = portfolioLink;

    // 3. Oculta o loading QUANDO o iframe terminar de carregar
    iframe.onload = () => {
        loading.classList.add('hidden');
    };
    
    // 4. Fallback (se demorar mais de 10s, esconde o loading)
    setTimeout(() => loading.classList.add('hidden'), 10000);
}

/**
 * Fecha o modal do portfólio
 */
window.closePortfolioModal = function() {
    const modal = document.getElementById('portfolio-modal-container');
    const iframe = document.getElementById('portfolio-iframe');
    
    if (modal) modal.classList.add('hidden');
    
    // Para o carregamento e limpa o iframe (economiza memória)
    if (iframe) iframe.src = 'about:blank'; 
}
// --- FIM DA ADIÇÃO ---