// static/js/dashboard.js

document.addEventListener('DOMContentLoaded', function() {
    // Inicializa tooltips
    const tooltips = document.querySelectorAll('[data-tooltip]');
    tooltips.forEach(tooltip => {
        new Tooltip(tooltip, {
            placement: tooltip.dataset.placement || 'top',
            title: tooltip.dataset.tooltip
        });
    });
    
    // Inicializa datepickers
    const datepickers = document.querySelectorAll('.datepicker');
    datepickers.forEach(datepicker => {
        new Datepicker(datepicker, {
            format: 'dd/mm/yyyy',
            language: 'pt-BR',
            autohide: true
        });
    });
    
    // Formatar números como moeda
    const currencyElements = document.querySelectorAll('.format-currency');
    currencyElements.forEach(el => {
        const value = parseFloat(el.textContent);
        el.textContent = formatCurrency(value);
    });
    
    // Formatação responsiva de tabelas
    const tables = document.querySelectorAll('.data-table');
    tables.forEach(table => {
        if (window.innerWidth < 768) {
            table.parentElement.classList.add('data-table-container');
        }
    });
    
    // Funções utilitárias
    function formatCurrency(value) {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(value);
    }
    
    // Handler de redimensionamento
    window.addEventListener('resize', function() {
        tables.forEach(table => {
            if (window.innerWidth < 768) {
                table.parentElement.classList.add('data-table-container');
            } else {
                table.parentElement.classList.remove('data-table-container');
            }
        });
    });
});