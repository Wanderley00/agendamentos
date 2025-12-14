// static/js/auth.js
// Sistema de autenticação e gerenciamento de usuário

// --- ESTADO GLOBAL DA APLICAÇÃO ---

// Estado de autenticação
let authState = {
    isAuthenticated: false,
    user: null
};

// Estado do Agendamento (Compartilhado entre services, professional, calendar)
let selectedService = null;
let selectedProfessional = null;
let selectedTierInfo = {
    tierId: null,
    preco: 0,
    duracao: 0,
    valor_adiantamento: 0
};
let selectedDate = null;
let selectedTime = null;
let reschedulingAppointmentId = null;
let servicesData = []; // Cache global de serviços

// --- FIM DO ESTADO GLOBAL ---


/**
 * Converte data de dd/mm/aaaa para YYYY-MM-DD
 * @param {string} dateString - Data no formato dd/mm/aaaa
 * @returns {string|null} - Data no formato YYYY-MM-DD ou null se inválido
 */
function convertDateToISO(dateString) {
    if (!dateString) return null;
    // Se a data já estiver no formato ISO (do PC), retorna ela mesma
    if (dateString.includes('-') && dateString.length === 10) {
        return dateString;
    }

    // Se estiver no formato dd/mm/aaaa
    if (dateString.length !== 10) return null; // Garante que tem 10 caracteres
    
    const parts = dateString.split('/');
    if (parts.length !== 3) return null; // Formato inválido
    
    const day = parts[0];
    const month = parts[1];
    const year = parts[2];
    
    if (year.length !== 4) return null; // Ano inválido
    
    return `${year}-${month}-${day}`;
}

// =================================================================
// NOVA ADIÇÃO: GETTER GLOBAL DO ESTADO
// =================================================================
/**
 * Retorna o estado de autenticação atual
 * @returns {Object}
 */
window.getAuthState = function() {
    return authState;
}
// --- FIM DA ADIÇÃO ---

/**
 * Inicializa o estado de autenticação a partir do servidor
 * @returns {Promise} - Promise que resolve para o estado de autenticação
 */
async function initAuthState() {
    try {
        const response = await fetch(`/${empreendedorSlug}/api/check_auth/`);
        const data = await response.json();
        
        // Atualiza o estado global
        authState = {
            isAuthenticated: data.isAuthenticated,
            user: data.isAuthenticated ? {
                name: data.user.name,
                lastname: data.user.lastname,
                email: data.user.email
            } : null
        };
        // Atualiza a UI com base no estado de autenticação
        updateAuthUI();
        
        return authState;
    } catch (error) {
        console.error('Erro ao verificar autenticação:', error);
        return { isAuthenticated: false, user: null };
    }
}

/**
 * Atualiza a UI com base no estado de autenticação
 */
function updateAuthUI() {
    const userBar = document.querySelector('.user-bar');
    const loginFormsSection = document.querySelector('.login-form-section'); // O cartão da esquerda
    const bookingSummary = document.querySelector('.booking-summary'); // O cartão da direita
    const summaryActionsContainer = document.getElementById('summary-actions-container'); // O container dos botões
    const logoutButtonHome = document.getElementById('home-logout-button');

    // 1. Navbar e Botão Sair da Home
    if (authState.isAuthenticated) {
        if (userBar) userBar.classList.remove('hidden');
        if (logoutButtonHome) logoutButtonHome.classList.remove('hidden');
    } else {
        if (userBar) userBar.classList.add('hidden');
        if (logoutButtonHome) logoutButtonHome.classList.add('hidden');
    }

    // 2. Lógica Específica da Tela de Resumo (Login Screen)
    // Se estivermos na tela de login/resumo, ajustamos o layout
    if (loginFormsSection && bookingSummary) {
        if (authState.isAuthenticated) {
            // --- USUÁRIO LOGADO ---
            
            // Remove o cartão da esquerda do layout
            loginFormsSection.classList.add('hidden'); 
            
            // Centraliza o cartão da direita
            // (Adicionaremos um estilo inline ou classe para garantir a centralização)
            bookingSummary.parentElement.style.display = 'flex';
            bookingSummary.parentElement.style.justifyContent = 'center';
            bookingSummary.style.width = '100%';
            bookingSummary.style.maxWidth = '500px'; 

            // Injeta os botões no cartão da direita
            if (summaryActionsContainer) {
                summaryActionsContainer.innerHTML = `
                    <div style="display: flex; gap: 12px; margin-top: 24px;">
                        <button class="btn btn--outline" style="flex: 1;" onclick="performLogout(event)">Sair da Conta</button>
                        <button class="btn btn--primary" style="flex: 1;" onclick="processBooking()">Continuar Agendamento</button>
                    </div>
                `;
                summaryActionsContainer.classList.remove('hidden');
            }

            // Atualiza os dados do resumo (chama a função corrigida do calendar.js)
            if (typeof updateBookingSummary === 'function') {
                updateBookingSummary();
            }

        } else {
            // --- USUÁRIO NÃO LOGADO ---
            
            // Restaura o layout original (duas colunas)
            loginFormsSection.classList.remove('hidden');
            bookingSummary.parentElement.style.display = ''; // Remove styles inline
            bookingSummary.parentElement.style.justifyContent = '';
            bookingSummary.style.maxWidth = '';

            // Remove os botões do cartão da direita
            if (summaryActionsContainer) {
                summaryActionsContainer.innerHTML = '';
                summaryActionsContainer.classList.add('hidden');
            }
        }
    }
}

/**
 * Realiza o login do usuário
 * @param {Object} credentials - Credenciais de login
 * @param {string} credentials.email - Email do usuário
 * @param {string} credentials.password - Senha do usuário
 * @returns {Promise} - Promise que resolve para o resultado do login
 */
async function loginUser(credentials) {
    showLoading();
    try {
        const response = await fetch(`/${empreendedorSlug}/api/login/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCsrfToken()
            },
            body: JSON.stringify(credentials)
        });
        
        const result = await response.json();
        if (!response.ok) {
            throw new Error(result.message || 'Falha ao realizar login');
        }
        
        // Atualiza o estado de autenticação
        await initAuthState();
        // Exibe mensagem de sucesso
        showToast({
            message: 'Login realizado com sucesso!',
            type: 'success',
            duration: 3000
        });
        return true;
    } catch (error) {
        console.error('Erro no login:', error);
        showToast({
            message: error.message || 'Falha ao realizar login',
            type: 'error',
            duration: 4000
        });
        return false;
    } finally {
        hideLoading();
    }
}

/**
 * Registra um novo usuário
 * @param {Object} userData - Dados do usuário
 * @param {string} userData.name - Nome do usuário
 * @param {string} userData.lastname - Sobrenome do usuário
 * @param {string} userData.phone - Telefone do usuário
 * @param {string} userData.email - Email do usuário
 * @param {string} userData.password - Senha do usuário
 * @returns {Promise} - Promise que resolve para o resultado do registro
 */
async function registerUser(userData) {
    showLoading();
    try {
        const response = await fetch(`/${empreendedorSlug}/api/register/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCsrfToken()
            },
            body: JSON.stringify(userData)
        });
        
        const result = await response.json();
        if (!response.ok) {
            throw new Error(result.message || 'Falha ao realizar cadastro');
        }
        
        // Atualiza o estado de autenticação após registro
        await initAuthState();
        // Exibe mensagem de sucesso
        showToast({
            message: 'Cadastro realizado com sucesso!',
            type: 'success',
            duration: 3000
        });
        return true;
    } catch (error) {
        console.error('Erro no registro:', error);
        showToast({
            message: error.message || 'Falha ao realizar cadastro',
            type: 'error',
            duration: 4000
        });
        return false;
    } finally {
        hideLoading();
    }
}

/**
 * Realiza o login do cliente usando Telefone e Data de Nascimento
 * @param {string} phone - Telefone (apenas dígitos)
 * @param {string} nascimento - Data de nascimento (YYYY-MM-DD)
 * @returns {Promise<boolean>} - True se o login for bem-sucedido
 */
async function loginUserWithPhone(phone, nascimento) {
    showLoading();
    try {
        const response = await fetch(`/${empreendedorSlug}/api/login-phone/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCsrfToken()
            },
            body: JSON.stringify({ phone: phone, nascimento: nascimento })
        });
        
        const result = await response.json();
        if (!response.ok) {
            throw new Error(result.message || 'Falha ao realizar login');
        }
        
        await initAuthState();
        // Atualiza o estado global
        showToast({ message: 'Login realizado com sucesso!', type: 'success' });
        return true;
    } catch (error) {
        console.error('Erro no login por telefone:', error);
        showToast({ message: error.message || 'Telefone ou data de nascimento inválidos.', type: 'error' });
        return false;
    } finally {
        hideLoading();
    }
}

/**
 * Valida um número de telefone (com DDD).
 * Exige 10 ou 11 dígitos (ex: 11987654321 ou 1187654321).
 * @param {string} phone - O número de telefone.
 * @returns {boolean} - True se for válido.
 */
function validatePhoneNumber(phone) {
    if (!phone) return false;
    // Remove qualquer caractere não numérico (como '(', ')', '-', ' ')
    const numericPhone = phone.replace(/\D/g, '');
    // Verifica se tem 10 (fixo+ddd) ou 11 (celular+ddd) dígitos
    const phoneRegex = /^\d{10,11}$/; 
    return phoneRegex.test(numericPhone);
}

/**
 * Realiza o logout do usuário
 * @returns {Promise} - Promise que resolve para o resultado do logout
 */
async function logoutUser() {
    showLoading();
    try {
        const response = await fetch(`/${empreendedorSlug}/api/logout/`, {
            method: 'POST',
            headers: {
                'X-CSRFToken': getCsrfToken()
            }
        });
        // Atualiza o estado de autenticação
        authState = {
            isAuthenticated: false,
            user: null
        };
        // Atualiza a UI
        updateAuthUI();
        // Exibe mensagem de sucesso
        showToast({
            message: 'Logout realizado com sucesso!',
            type: 'info',
            duration: 2000
        });
        return true;
    } catch (error) {
        console.warn('Erro no logout:', error);
        // Mesmo com erro, atualiza o estado local
        authState = {
            isAuthenticated: false,
            user: null
        };
        // Atualiza a UI
        updateAuthUI();
        
        return false;
    } finally {
        hideLoading();
    }
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

/**
 * Verifica se o usuário está autenticado e exibe o modal de login se não estiver
 * @returns {boolean} - Se o usuário está autenticado
 */
function requireAuth() {
    if (!authState.isAuthenticated) {
        showScreen('forced-login-screen');
        return false;
    }
    
    return true;
}



/**
 * Função global para logout
 */
window.performLogout = async function(event) {
    if (event) {
        event.preventDefault();
        // Previne a ação padrão do link/botão
    }

    // Exibe modal de confirmação
    showModal({
        title: 'Confirmar Logout',
        message: 'Tem certeza que deseja sair da sua conta?',
        confirmText: 'Sim, sair',
        cancelText: 'Cancelar',
        onConfirm: async () => {
            const success = await logoutUser();
            if (success) {
                // CORREÇÃO APLICADA AQUI: Recarrega a página para limpar o estado
                window.location.reload();
            }
        }
    });
};

// --- CONFIGURAÇÃO DE FORMULÁRIOS ---
document.addEventListener('DOMContentLoaded', function() {
    // Inicializa o estado de autenticação
    initAuthState();
    
    // Formulário de login
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
           // --- BLOCO TOTALMENTE MODIFICADO ---
    
            const phoneInput = document.getElementById('login-phone').value;
            const numericPhone = phoneInput.replace(/\D/g, ''); // Limpa
            
            // --- MUDANÇA AQUI ---
            const nascimentoInput = document.getElementById('login-nascimento').value;
            const nascimentoISO = convertDateToISO(nascimentoInput); // Converte para YYYY-MM-DD
            
            if (!validatePhoneNumber(numericPhone) || !nascimentoISO) { // Valida o formato ISO
                showToast({ message: 'Por favor, preencha o telefone (com DDD) e uma data de nascimento válida (dd/mm/aaaa).', type: 'error' });
                return;
            }
            
            const success = await loginUserWithPhone(numericPhone, nascimentoISO);
            // Envia o formato ISO
            
            if (success && currentScreen === 'login-screen') {
                proceedWithBooking();
            }
            // --- FIM DA MODIFICAÇÃO ---
        });
    }
    
    // Formulário de registro
    const registerForm = document.getElementById('register-form');
    if (registerForm) {
        registerForm.addEventListener('submit', async function(e) {
            e.preventDefault();

            const phoneInput = document.getElementById('register-phone').value;
            const numericPhone = phoneInput.replace(/\D/g, ''); // Remove não-dígitos
            if (!validatePhoneNumber(numericPhone)) { // Valida os dígitos
                showToast({ message: 'Por favor, insira um telefone válido com DDD (10 ou 11 dígitos).', type: 'error' });
                return;
            }

            const nascimentoInput = document.getElementById('register-nascimento').value;
            const nascimentoISO = convertDateToISO(nascimentoInput); // Converte para YYYY-MM-DD
            if (!nascimentoISO) {
                showToast({ message: 'A data de nascimento é obrigatória e deve estar no formato dd/mm/aaaa.', type: 'error' });
                return;
            }
            
            const userData = {
                name: document.getElementById('register-name').value,
                lastname: document.getElementById('register-lastname').value,
                nascimento: nascimentoISO, // <-- Envia YYYY-MM-DD
                phone: numericPhone, // <-- Envia o telefone limpo
                email: document.getElementById('register-email').value,
            };
            const success = await registerUser(userData);
            
            if (success && currentScreen === 'login-screen') {
                // Se estiver na tela de login, processa o agendamento
                proceedWithBooking();
            } else if (success && currentScreen === 'forced-login-screen') {
                // Se estiver na tela de login forçado, vai para a área do cliente
                showScreen('client-area-screen');
            }
        });
    }
    
    // Formulário de login forçado
    const forcedLoginForm = document.getElementById('forced-login-form');
    if (forcedLoginForm) {
        forcedLoginForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            // --- BLOCO TOTALMENTE MODIFICADO ---
            const phoneInput = document.getElementById('forced-login-phone').value;
            const numericPhone = phoneInput.replace(/\D/g, ''); // Limpa
            
 
            // --- MUDANÇA AQUI ---
            const nascimentoInput = document.getElementById('forced-login-nascimento').value;
            const nascimentoISO = convertDateToISO(nascimentoInput); // Converte para YYYY-MM-DD

            if (!validatePhoneNumber(numericPhone) || !nascimentoISO) { // Valida o formato ISO
                showToast({ message: 'Por favor, preencha o telefone (com DDD) e uma data de nascimento válida (dd/mm/aaaa).', type: 'error' });
                return;
            }
            
            const success = await loginUserWithPhone(numericPhone, nascimentoISO); // Envia o formato ISO
            
            if (success) {
                const nextScreen = window.nextScreenAfterLogin || 'client-area-screen';
                window.nextScreenAfterLogin = null; 
                showScreen(nextScreen);
            }
            // --- FIM DA MODIFICAÇÃO ---
        });
    }
    
    // Formulário de registro forçado
    const forcedRegisterForm = document.getElementById('forced-register-form');
    if (forcedRegisterForm) {
    forcedRegisterForm.addEventListener('submit', async function(e) {
        e.preventDefault();

        // --- MUDANÇA AQUI ---
        const phoneInput = document.getElementById('forced-register-phone').value;
        const numericPhone = phoneInput.replace(/\D/g, ''); // Remove não-dígitos
        if (!validatePhoneNumber(numericPhone)) { // Valida os dígitos
            showToast({ message: 'Por favor, insira um telefone válido com DDD (10 ou 11 dígitos).', type: 'error' });
            return;
        }

        const nascimentoInput = document.getElementById('forced-register-nascimento').value;
        const nascimentoISO = convertDateToISO(nascimentoInput); // Converte para YYYY-MM-DD
        if (!nascimentoISO) {
            showToast({ message: 'A data de nascimento é obrigatória e deve estar no formato dd/mm/aaaa.', type: 'error' });
            return;
        }
        
        // CORREÇÃO APLICADA AQUI
        const userData = {
            name: document.getElementById('forced-register-name').value,
            lastname: document.getElementById('forced-register-lastname').value,
            nascimento: nascimentoISO, // <-- CORRIGIDO: Enviando "YYYY-MM-DD"
            phone: numericPhone, 
            email: document.getElementById('forced-register-email').value,
        };
        
        const success = await registerUser(userData);
        if (success) {
            // --- LÓGICA MODIFICADA ---
            // Verifica se há uma tela de destino, senão vai para 'client-area-screen'
            const nextScreen = window.nextScreenAfterLogin || 'client-area-screen';
            window.nextScreenAfterLogin = null; // Limpa a variável
            showScreen(nextScreen);
            // --- FIM DA MODIFICAÇÃO ---
        }
    });
}
});