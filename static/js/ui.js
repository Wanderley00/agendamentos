// static/js/ui.js
// Sistema de UI para gerenciar telas, modais e componentes de interface



// --- SISTEMA DE MODAIS ---
/**
 * Exibe um modal personalizado
 * @param {Object} options - Opções do modal
 * @param {string} options.title - Título do modal
 * @param {string} options.message - Mensagem do modal
 * @param {string} options.confirmText - Texto do botão de confirmação (opcional)
 * @param {string} options.cancelText - Texto do botão de cancelamento (opcional)
 * @param {Function} options.onConfirm - Função de callback para confirmação
 * @param {Function} options.onCancel - Função de callback para cancelamento (opcional)
 * @param {boolean} options.showCancel - Se deve mostrar o botão de cancelar (padrão: true)
 * @param {boolean} options.showConfirm - Se deve mostrar o botão de confirmar (padrão: true)
 */
window.showModal = function(options) {
    const modalContainer = document.getElementById('modal-container');
    const modalTitle = document.getElementById('modal-title');
    const modalBody = document.getElementById('modal-body');
    const modalConfirm = document.getElementById('modal-confirm');
    const modalCancel = document.getElementById('modal-cancel');
    const modalClose = document.getElementById('modal-close');

    const modalFooter = document.getElementById('modal-footer');
    // Define o conteúdo
    modalTitle.textContent = options.title || 'Aviso';
    modalBody.innerHTML = options.message || '';
    // Configura os botões
    modalConfirm.textContent = options.confirmText || 'Confirmar';
    modalCancel.textContent = options.cancelText || 'Cancelar';
    // Configura visibilidade do botão cancelar
    if (options.showCancel === false) {
        modalCancel.classList.add('hidden');
    } else {
        modalCancel.classList.remove('hidden');
    }

    // --- BLOCO MODIFICADO (Adiciona lógica para o "Confirmar" e centralização) ---
    if (options.showConfirm === false) {
        modalConfirm.classList.add('hidden');
        // <-- MUDANÇA (Esconde o botão)
        // Centraliza o footer quando SÓ o "cancelar" estiver visível
        if (modalFooter) modalFooter.style.justifyContent = 'center';
        // <-- MUDANÇA (Centraliza)
    } else {
        modalConfirm.classList.remove('hidden');
        // Restaura o padrão (flex-end)
        if (modalFooter) modalFooter.style.justifyContent = 'flex-end';
        // <-- MUDANÇA (Restaura)
    }
    // --- FIM DO BLOCO MODIFICADO ---
    
    // Configura os eventos
    const handleConfirm = () => {
        hideModal();
        if (typeof options.onConfirm === 'function') {
            options.onConfirm();
        }
    };
    
    const handleCancel = () => {
        hideModal();
        if (typeof options.onCancel === 'function') {
            options.onCancel();
        }
    };
    
    // Remove event listeners antigos
    modalConfirm.replaceWith(modalConfirm.cloneNode(true));
    modalCancel.replaceWith(modalCancel.cloneNode(true));
    modalClose.replaceWith(modalClose.cloneNode(true));
    // Adiciona novos event listeners
    document.getElementById('modal-confirm').addEventListener('click', handleConfirm);
    document.getElementById('modal-cancel').addEventListener('click', handleCancel);
    document.getElementById('modal-close').addEventListener('click', handleCancel);
    // Exibe o modal
    modalContainer.classList.remove('hidden');
    
    // Adiciona handler de tecla ESC
    const escHandler = (e) => {
        if (e.key === 'Escape') {
            handleCancel();
            document.removeEventListener('keydown', escHandler);
        }
    };
    document.addEventListener('keydown', escHandler);
};
/**
 * Oculta o modal
 */
window.hideModal = function() {
    const modalContainer = document.getElementById('modal-container');
    modalContainer.classList.add('hidden');
};
// --- TOAST NOTIFICATIONS ---
/**
 * Exibe uma notificação toast
 * @param {Object} options - Opções da notificação
 * @param {string} options.message - Mensagem da notificação
 * @param {string} options.type - Tipo da notificação (success, error, warning, info)
 * @param {number} options.duration - Duração em ms (padrão: 3000)
 */
window.showToast = function(options) {
    // Cria o elemento toast se não existir
    let toastContainer = document.getElementById('toast-container');
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.id = 'toast-container';
        document.body.appendChild(toastContainer);
    }
    
    // Cria a notificação
    const toast = document.createElement('div');
    toast.className = `toast toast--${options.type || 'info'}`;
    toast.innerHTML = `
        <div class="toast-content">
            ${options.message}
        </div>
        <button class="toast-close">&times;</button>
    `;
    // Adiciona ao container
    toastContainer.appendChild(toast);
    
    // Configura animação de entrada
    setTimeout(() => {
        toast.classList.add('toast--visible');
    }, 10);
    // Configura o botão de fechar
    const closeBtn = toast.querySelector('.toast-close');
    closeBtn.addEventListener('click', () => {
        removeToast(toast);
    });
    // Configura auto-remoção
    const duration = options.duration || 3000;
    setTimeout(() => {
        removeToast(toast);
    }, duration);
};
/**
 * Remove uma notificação toast com animação
 * @param {HTMLElement} toast - Elemento toast a ser removido
 */
function removeToast(toast) {
    toast.classList.remove('toast--visible');
    toast.classList.add('toast--hiding');
    
    setTimeout(() => {
        toast.remove();
        
        // Remove o container se não houver mais toasts
        const toastContainer = document.getElementById('toast-container');
        if (toastContainer && toastContainer.children.length === 0) {
            toastContainer.remove();
        }
    }, 300);
    // Duração da animação de saída
}

// --- FUNÇÕES DE LOADING ---
window.showLoading = function() {
    document.getElementById('loading-overlay').classList.remove('hidden');
};
window.hideLoading = function() {
    document.getElementById('loading-overlay').classList.add('hidden');
};

// --- UTILITÁRIOS DE FORMULÁRIO ---
/**
 * Limpa todos os campos de um formulário
 * @param {string} formId - ID do formulário a ser limpo
 */
window.clearForm = function(formId) {
    const form = document.getElementById(formId);
    if (!form) return;
    
    form.reset();
    
    // Limpa também campos personalizados se necessário
    form.querySelectorAll('input, textarea, select').forEach(field => {
        if (field.classList.contains('custom-field')) {
            // Tratamento para componentes personalizados
            field.value = '';
            // Dispara evento de mudança para atualizar estado
            field.dispatchEvent(new Event('change', { bubbles: true }));
         }
    });
};

///

window.showLoginForm = function(event) {
    event.preventDefault();
    const container = event.target.closest('.login-form-section');
    if (!container) return;

    const loginForm = container.querySelector('form[id*="login-form"]');
    const registerForm = container.querySelector('form[id*="register-form"]');

    if (loginForm) loginForm.classList.remove('hidden');
    if (registerForm) registerForm.classList.add('hidden');
    const toggleContainer = event.target.closest('.form-toggle');
    if (toggleContainer) {
        toggleContainer.querySelectorAll('.toggle-btn').forEach(btn => btn.classList.remove('active'));
        toggleContainer.classList.remove('toggle-right');
    }
    event.target.classList.add('active');
};

window.showRegisterForm = function(event) {
    event.preventDefault();
    const container = event.target.closest('.login-form-section');
    if (!container) return;

    const loginForm = container.querySelector('form[id*="login-form"]');
    const registerForm = container.querySelector('form[id*="register-form"]');

    if (loginForm) loginForm.classList.add('hidden');
    if (registerForm) registerForm.classList.remove('hidden');
    const toggleContainer = event.target.closest('.form-toggle');
    if (toggleContainer) {
        toggleContainer.querySelectorAll('.toggle-btn').forEach(btn => btn.classList.remove('active'));
        toggleContainer.classList.add('toggle-right');
    }
    event.target.classList.add('active');
};
///

// --- INICIALIZAÇÃO ---
document.addEventListener('DOMContentLoaded', function() {
    // Configurações de UI global podem ser inicializadas aqui
    
    // Adiciona estilos para o sistema de toast via JavaScript (poderia estar no CSS)
    const style = document.createElement('style');
    style.textContent = `
        #toast-container {
            position: fixed;
            bottom: 20px;
            right: 20px;
            z-index: 9999;
            display: flex;
            flex-direction: column;
            gap: 10px;
        }
        
        .toast {
            min-width: 250px;
             padding: 12px 16px;
            border-radius: var(--radius-base);
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            display: flex;
            justify-content: space-between;
            align-items: center;
            transform: translateX(100%);
             opacity: 0;
            transition: transform 0.3s, opacity 0.3s;
        }
        
        .toast--visible {
            transform: translateX(0);
            opacity: 1;
        }
        
        .toast--hiding {
            transform: translateX(100%);
            opacity: 0;
        }
        
        .toast--success {
            background-color: #e6f6f2;
            color: #54a88a;
            border-left: 4px solid #54a88a;
        }
        
        .toast--error {
            background-color: #ffebee;
            color: #e53935;
            border-left: 4px solid #e53935;
        }
        
        .toast--warning {
            background-color: #fff8e1;
            color: #f57c00;
            border-left: 4px solid #f57c00;
        }
        
        .toast--info {
            background-color: #e3f2fd;
            color: #1976d2;
            border-left: 4px solid #1976d2;
        }
        
        .toast-close {
            background: none;
            border: none;
            font-size: 16px;
            cursor: pointer;
            margin-left: 10px;
            opacity: 0.6;
        }
        
        .toast-close:hover {
            opacity: 1;
        }
        
        /* Estilos adicionais para o modal */
        .modal-container {
            position: fixed;
            inset: 0;
            background: rgba(0,0,0,0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 1000;
        }
        
        .modal-content {
            background: var(--color-white);
            border-radius: var(--radius-lg);
            width: 90%;
            max-width: 500px;
            box-shadow: var(--shadow-md);
            overflow: hidden;
        }
        
        .modal-header {
            padding: var(--space-16);
            border-bottom: 1px solid var(--color-border);
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        
        .modal-close {
            background: none;
            border: none;
            font-size: 24px;
            cursor: pointer;
            opacity: 0.6;
        }
        
        .modal-close:hover {
            opacity: 1;
        }
        
        .modal-body {
            padding: var(--space-24);
            max-height: 60vh;
            overflow-y: auto;
        }
        
        .modal-footer {
            padding: var(--space-16);
            border-top: 1px solid var(--color-border);
            display: flex;
            justify-content: flex-end;
            gap: var(--space-12);
        }
        
        /* Barra de usuário */
        .user-bar {
            background: var(--color-primary);
            color: var(--color-white);
            padding: var(--space-8) 0;
        }
        
        .user-info {
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        
        .user-actions {
            display: flex;
            gap: var(--space-16);
        }
        
        .user-action {
            color: var(--color-white);
            text-decoration: none;
            opacity: 0.9;
            font-size: 14px;
        }
        
        .user-action:hover {
            opacity: 1;
            text-decoration: underline;
        }
    `;
    
    document.head.appendChild(style);

    // =================================================================
    // INÍCIO: Máscara de Telefone
    // =================================================================
    
    /**
     * Função Global para formatar string de telefone
     * Transforma "11999999999" em "(11) 999999999"
     */
    window.formatPhoneString = function(value) {
        if (!value) return "";
        
        // Remove tudo que não for dígito
        value = value.replace(/\D/g, '');
        // Limita a 11 dígitos (DD + 9 do celular)
        value = value.substring(0, 11);

        // Aplica a máscara (XX) XXXXXXXXX
        if (value.length > 2) {
            value = `(${value.substring(0, 2)}) ${value.substring(2)}`;
        } else if (value.length > 0) {
            value = `(${value.substring(0, 2)}`;
        }
        
        return value;
    };

    /**
     * Handler para o evento de input
     */
    function formatPhoneInput(e) {
        // Usa a função global para formatar o valor atual do input
        e.target.value = window.formatPhoneString(e.target.value);
    }

    // Lista de todos os IDs de campos de telefone que precisam da máscara
    const phoneInputIds = [
        'login-phone',          
        'register-phone',       
        'forced-login-phone',
        'forced-register-phone',
        'profile-phone',        
        'equipe-telefone',      
        'equipe-edit-telefone',  // (Do modal que criamos)
        'new-client-telefone'
    ];

    phoneInputIds.forEach(id => {
        const input = document.getElementById(id);
        if (input) {
            // Adiciona o listener de "input" para formatar em tempo real
            input.addEventListener('input', formatPhoneInput);
        }
    });
    // =================================================================
    // FIM: Máscara de Telefone
    // =================================================================

    
    // =================================================================
    // INÍCIO: Ajuste do Campo de Data de Nascimento para Mobile
    // =================================================================

    /**
     * Formata o input de data como dd/mm/aaaa enquanto o usuário digita
     */
    function formatBirthdayInput(e) {
        let value = e.target.value.replace(/\D/g, '');
        // Remove tudo que não for dígito
        value = value.substring(0, 8);
        // Limita a 8 dígitos (ddmmyyyy)

        if (value.length > 4) {
            // Se tiver mais de 4 dígitos (ex: 2604200) -> 26/04/200
            value = `${value.substring(0, 2)}/${value.substring(2, 4)}/${value.substring(4)}`;
        } else if (value.length > 2) {
            // Se tiver mais de 2 dígitos (ex: 2604) -> 26/04
            value = `${value.substring(0, 2)}/${value.substring(2)}`;
        }
        
        e.target.value = value;
    }
    
    /**
     * Verifica se é um dispositivo com tela de toque (proxy para mobile)
     */
    function isMobileDevice() {
        return ('ontouchstart' in window) ||
        (navigator.maxTouchPoints > 0);
    }

    // Se for um dispositivo móvel...
    if (isMobileDevice()) {
        // Lista de todos os IDs de campos de DATA DE NASCIMENTO
        const birthdayInputIds = [
            'login-nascimento',
            'register-nascimento',
            'forced-login-nascimento',
            'forced-register-nascimento',
            'profile-nascimento'
        ];
        
        birthdayInputIds.forEach(id => {
            const input = document.getElementById(id);
            if (input) {
                input.type = 'text'; // Muda de "date" para "text"
                input.placeholder = 'dd/mm/aaaa'; // Adiciona o placeholder
                input.setAttribute('inputmode', 'numeric'); // Pede o teclado numérico
                 
                // --- 2. ADICIONE ESTA LINHA ---
                input.addEventListener('input', formatBirthdayInput); // Aplica a máscara
            }
        });
    }
    // =================================================================
    // FIM: Ajuste do Campo de Data de Nascimento
    // =================================================================
    // =================================================================
    // INÍCIO: Conversores de Data (dd/mm/aaaa <-> YYYY-MM-DD)
    // =================================================================

    /**
     * Converte data de dd/mm/aaaa para YYYY-MM-DD
     * @param {string} dateString - Data no formato dd/mm/aaaa
     * @returns {string|null} - Data no formato YYYY-MM-DD ou null se inválido
     */
    window.convertDateToISO = function(dateString) {
 
         if (!dateString) return null;
         // Se a data já estiver no formato ISO (do PC), retorna ela mesma
        if (dateString.includes('-') && dateString.length === 10) {
            return dateString;
        }

        // Se estiver no formato dd/mm/aaaa
        if (dateString.length !== 10) return null;
        // Garante que tem 10 caracteres
        
        const parts = dateString.split('/');
        if (parts.length !== 3) return null; // Formato inválido
        
        const day = parts[0];
        const month = parts[1];
        const year = parts[2];
        
        if (year.length !== 4) return null;
        // Ano inválido
        
        return `${year}-${month}-${day}`;
    }

    /**
     * Converte data de YYYY-MM-DD para dd/mm/aaaa
     * @param {string} isoString - Data no formato YYYY-MM-DD
     * @returns {string|null} - Data no formato dd/mm/aaaa ou null se inválido
     */
    window.convertISOToDate = function(isoString) {
        if (!isoString || !isoString.includes('-') || isoString.length !== 10) {
            return "";
            // Retorna vazio se a data for nula ou inválida
        }

        const parts = isoString.split('-');
        if (parts.length !== 3) return "";
        
        const year = parts[0];
        const month = parts[1];
        const day = parts[2];

        return `${day}/${month}/${year}`;
    }
    // =================================================================
    // FIM: Conversores de Data
    // =================================================================
});