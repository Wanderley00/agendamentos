// static/js/financial.js
// Handles financial management functions for the admin dashboard

/**
 * Mark an expense as paid
 * @param {number} expenseId - The ID of the expense to mark as paid
 */
window.markExpenseAsPaid = async function(expenseId) {
    
    try {
        const response = await fetch(`/api/admin/atualizar-despesa/${expenseId}/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': document.querySelector('[name=csrfmiddlewaretoken]').value
            },
            body: JSON.stringify({
                pago: true
            })
        });
        
        const data = await response.json();
        
        if (data.status === 'success') {
            // Show success message
            alert('Despesa marcada como paga com sucesso!');
            
            // Reload expenses data
            loadExpensesData();
            // Also reload financial overview to update totals
            loadFinancialOverview();
        } else {
            alert('Erro ao atualizar despesa: ' + data.message);
        }
    } catch (error) {
        console.error('Erro ao marcar despesa como paga:', error);
        alert('Erro ao atualizar despesa. Verifique o console para mais detalhes.');
    }
};

/**
 * Edit an expense
 * @param {number} expenseId - The ID of the expense to edit
 */
window.editExpense = async function(expenseId) {
    try {
        // Fetch expense details
        const response = await fetch(`/api/admin/despesa/${expenseId}/`);
        const expense = await response.json();
        
        if (!expense || expense.status === 'error') {
            throw new Error(expense.message || 'Não foi possível obter os detalhes da despesa.');
        }
        
        // Populate modal with expense data
        document.getElementById('expense-description').value = expense.descricao;
        document.getElementById('expense-amount').value = expense.valor;
        document.getElementById('expense-date').value = expense.data;
        document.getElementById('expense-category-select').value = expense.categoria;
        document.getElementById('expense-paid').checked = expense.pago;
        
        // Store expense ID in the form for reference
        document.getElementById('expense-form').dataset.expenseId = expenseId;
        document.getElementById('expense-modal-title').textContent = 'Editar Despesa';
        
        // Update save button to handle edit vs. new
        const saveButton = document.getElementById('expense-modal-save');
        saveButton.textContent = 'Atualizar Despesa';
        saveButton.onclick = updateExpense;
        
        // Show modal
        document.getElementById('expense-modal').classList.remove('hidden');
    } catch (error) {
        console.error('Erro ao carregar dados da despesa:', error);
        alert('Erro ao carregar dados da despesa. Verifique o console para mais detalhes.');
    }
};

/**
 * Update an existing expense
 */
async function updateExpense() {
    const expenseId = document.getElementById('expense-form').dataset.expenseId;
    if (!expenseId) return;
    
    const description = document.getElementById('expense-description').value;
    const amount = document.getElementById('expense-amount').value;
    const date = document.getElementById('expense-date').value;
    const category = document.getElementById('expense-category-select').value;
    const paid = document.getElementById('expense-paid').checked;
    
    if (!description || !amount || !date || !category) {
        alert('Por favor, preencha todos os campos obrigatórios.');
        return;
    }
    
    try {
        const response = await fetch(`/api/admin/atualizar-despesa/${expenseId}/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': document.querySelector('[name=csrfmiddlewaretoken]').value
            },
            body: JSON.stringify({
                descricao: description,
                valor: parseFloat(amount),
                data: date,
                categoria: category,
                pago: paid
            })
        });
        
        const data = await response.json();
        
        if (data.status === 'success') {
            alert('Despesa atualizada com sucesso!');
            document.getElementById('expense-modal').classList.add('hidden');
            loadExpensesData();
            loadFinancialOverview();
        } else {
            alert('Erro ao atualizar despesa: ' + data.message);
        }
    } catch (error) {
        console.error('Erro ao atualizar despesa:', error);
        alert('Erro ao atualizar despesa. Verifique o console para mais detalhes.');
    }
}

/**
 * Reset the expense form for a new expense
 */
window.resetExpenseForm = function() {
    const form = document.getElementById('expense-form');
    form.reset();
    delete form.dataset.expenseId;
    
    document.getElementById('expense-date').valueAsDate = new Date();
    document.getElementById('expense-modal-title').textContent = 'Registrar Nova Despesa';
    
    const saveButton = document.getElementById('expense-modal-save');
    saveButton.textContent = 'Salvar Despesa';
    saveButton.onclick = saveNewExpense;
    
    document.getElementById('expense-modal').classList.remove('hidden');
};

/**
 * Save a new expense
 */
async function saveNewExpense() {
    const description = document.getElementById('expense-description').value;
    const amount = document.getElementById('expense-amount').value;
    const date = document.getElementById('expense-date').value;
    const category = document.getElementById('expense-category-select').value;
    const paid = document.getElementById('expense-paid').checked;
    
    if (!description || !amount || !date || !category) {
        alert('Por favor, preencha todos os campos obrigatórios.');
        return;
    }
    
    try {
        const response = await fetch('/api/admin/registrar-despesa/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': document.querySelector('[name=csrfmiddlewaretoken]').value
            },
            body: JSON.stringify({
                descricao: description,
                valor: parseFloat(amount),
                data: date,
                categoria: category,
                pago: paid
            })
        });
        
        const data = await response.json();
        
        if (data.status === 'success') {
            alert('Despesa registrada com sucesso!');
            document.getElementById('expense-modal').classList.add('hidden');
            loadExpensesData();
            loadFinancialOverview();
        } else {
            alert('Erro ao registrar despesa: ' + data.message);
        }
    } catch (error) {
        console.error('Erro ao registrar despesa:', error);
        alert('Erro ao registrar despesa. Verifique o console para mais detalhes.');
    }
}

/**
 * Generate payment status select with the appropriate status selected
 * @param {string} status - Current payment status
 * @returns {string} - HTML for the select element
 */
function generatePaymentStatusSelect(status, id) {
    return `
        <select class="form-control payment-status-select" data-appointment-id="${id}">
            <option value="Pendente" ${status === 'Pendente' ? 'selected' : ''}>Pendente</option>
            <option value="Pago" ${status === 'Pago' ? 'selected' : ''}>Pago</option>
            <option value="Cancelado" ${status === 'Cancelado' ? 'selected' : ''}>Cancelado</option>
        </select>
    `;
}

// Initialize event listeners for the financial page
document.addEventListener('DOMContentLoaded', function() {
    // Payment status select change handlers (for pending payments table)
    document.addEventListener('change', function(e) {
        if (e.target.classList.contains('payment-status-select')) {
            updateAppointmentPaymentStatus(e.target.dataset.appointmentId, e.target.value);
        }
    });

    // Modify btn-add-expense to use our new function
    const addExpenseBtn = document.getElementById('btn-add-expense');
    if (addExpenseBtn) {
        addExpenseBtn.addEventListener('click', resetExpenseForm);
    }
});

/**
 * Update an appointment's payment status
 * @param {number} appointmentId - The appointment ID
 * @param {string} status - The new payment status
 */
async function updateAppointmentPaymentStatus(appointmentId, status) {
    try {
        const response = await fetch(`/api/admin/atualizar-pagamento/${appointmentId}/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': document.querySelector('[name=csrfmiddlewaretoken]').value
            },
            body: JSON.stringify({
                status_pagamento: status
            })
        });
        
        const data = await response.json();
        
        if (data.status === 'success') {
            alert('Status de pagamento atualizado com sucesso!');
            // Reload financial data
            if (typeof loadIncomeData === 'function') {
                loadIncomeData();
            }
            if (typeof loadFinancialOverview === 'function') {
                loadFinancialOverview();
            }
        } else {
            alert('Erro ao atualizar status de pagamento: ' + data.message);
        }
    } catch (error) {
        console.error('Erro ao atualizar status de pagamento:', error);
        alert('Erro ao atualizar status de pagamento. Verifique o console para mais detalhes.');
    }
}