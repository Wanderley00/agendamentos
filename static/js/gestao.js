// static/js/gestao.js

document.addEventListener('DOMContentLoaded', function() {
    
    // --- Variáveis Globais ---
    let equipeForm = document.getElementById('equipe-form');
    let equipeModal = document.getElementById('equipe-modal');
    let servicoForm = document.getElementById('servico-form');
    let servicoModal = document.getElementById('servico-modal');
    let servicoModalTitle = document.getElementById('servico-modal-title');
    let configForm = document.getElementById('config-form');
    let currentEditingServiceId = null;
    let localEquipe = []; // Cache local da equipe para popular o <select>

    let cropper = null; // A instância do Cropper
    let croppedLogoBlob = null; // O arquivo final (cortado) para enviar
    let logoModal = document.getElementById('cropper-modal');
    let logoImage = document.getElementById('cropper-image');
    let logoInput = document.getElementById('config-logo-input');

    let revertLogoBtn = null; // Será o botão "Desfazer"
    let originalLogoUrl = null; // Guarda a URL da logo original

    let serviceCropper = null;
    let croppedServiceBlob = null;
    let serviceCropperModal = document.getElementById('service-cropper-modal');
    let serviceCropperImage = document.getElementById('service-cropper-image');
    let serviceImageInput = document.getElementById('servico-imagem-input');
    let revertServiceImageBtn = null;
    let originalServiceImageUrl = null;

    let localCategorias = []; // Cache local de categorias
    let categoriaForm = document.getElementById('form-add-categoria');
    let categoriaModal = document.getElementById('categoria-modal');
    let categoriaEditForm = document.getElementById('categoria-edit-form');

    let isPagamentoOnlineHabilitado = false; // Cache global do interruptor
    let configToggleInput = document.getElementById('config-pagamento-online');

    // --- MUDANÇA ---
    // Variáveis para o novo modal de manutenção
    let manutencaoModal = document.getElementById('manutencao-modal');
    // O ID "form-add-manutencao" agora pertence ao novo modal
    let manutencaoForm = document.getElementById('form-add-manutencao'); 
    // O ID "manutencao-lista-tbody" agora também pertence ao novo modal
    let manutencaoTbody = document.getElementById('manutencao-lista-tbody');
    // Variável para saber qual serviço estamos editando
    let currentEditingManutencaoServiceId = null;

    let equipeEditModal = document.getElementById('equipe-edit-modal');
    let equipeEditForm = document.getElementById('equipe-edit-form');
    let currentEditingMembroId = null;

    // --- Token CSRF (Necessário para POST/DELETE) ---
    const csrfToken = document.querySelector('[name=csrfmiddlewaretoken]')?.value || 
                      (document.cookie.match(/csrftoken=([^;]+)/) || [])[1];

    // --- Funções de Carregamento de Dados ---

    async function loadConfiguracoes() {
        try {
            console.log("Iniciando loadConfiguracoes...");
            const response = await fetch('/dashboard/api/gestao/configuracoes/');
            if (!response.ok) throw new Error('Falha ao carregar configurações.');
            
            const config = await response.json();
            console.log("Configurações recebidas:", config);

            // Vamos checar cada elemento ANTES de tentar usá-lo
            const nomeInput = document.getElementById('config-nome-negocio');
            if (!nomeInput) throw new Error("Elemento 'config-nome-negocio' não foi encontrado.");
            nomeInput.value = config.nome_negocio;

            const taglineInput = document.getElementById('config-tagline');
            if (!taglineInput) throw new Error("Elemento 'config-tagline' não foi encontrado.");
            taglineInput.value = config.tagline;

            // --- INÍCIO DA ADIÇÃO ---
            const portfolioInput = document.getElementById('config-portfolio-url');
            if (!portfolioInput) throw new Error("Elemento 'config-portfolio-url' não foi encontrado.");
            // Define o valor, tratando o caso de ser nulo (null) para não exibir "null" no campo
            portfolioInput.value = config.portfolio_url || ''; 
            // --- FIM DA ADIÇÃO ---

            const corPrimariaInput = document.getElementById('config-cor-primaria');
            if (!corPrimariaInput) throw new Error("Elemento 'config-cor-primaria' não foi encontrado.");
            corPrimariaInput.value = config.cor_primaria;

            const corSecundariaInput = document.getElementById('config-cor-secundaria');
            if (!corSecundariaInput) throw new Error("Elemento 'config-cor-secundaria' não foi encontrado.");
            corSecundariaInput.value = config.cor_secundaria;

            // Checagem da Logo
            const logoPreview = document.getElementById('logo-preview');
            const logoPreviewContainer = document.getElementById('logo-preview-container');
            if (!logoPreview || !logoPreviewContainer) throw new Error("Elementos de preview da logo não foram encontrados.");

            if (config.logo_url) {
                logoPreview.src = config.logo_url;
                logoPreviewContainer.style.display = 'block';
            } else {
                // Mantém o placeholder visível
                logoPreviewContainer.style.display = 'block'; 
            }
            originalLogoUrl = logoPreview.src; // Salva a URL inicial (seja a logo ou o placeholder)

            document.getElementById('config-dias-antecedencia').value = config.dias_antecedencia_maxima;

            // 1. Carrega o estado do interruptor
            document.getElementById('config-dias-antecedencia').value = config.dias_antecedencia_maxima;
            isPagamentoOnlineHabilitado = config.pagamento_online_habilitado; // Salva no cache
            configToggleInput.checked = isPagamentoOnlineHabilitado; // Define o estado visual
            
            // 2. Aciona a função para mostrar/esconder os campos de %
            togglePercentualFields(isPagamentoOnlineHabilitado);
            

            // const hiddenProcInput = document.getElementById('config-aviso-procedimento');
            // if (!hiddenProcInput) throw new Error("Elemento 'config-aviso-procedimento' não foi encontrado.");
            // hiddenProcInput.value = config.aviso_procedimento; // Salva o HTML no campo oculto
            // renderListPreview('aviso-proc-preview', parseHtmlList(config.aviso_procedimento)); // Renderiza a lista
            
            // const hiddenCancInput = document.getElementById('config-aviso-cancelamento');
            // if (!hiddenCancInput) throw new Error("Elemento 'config-aviso-cancelamento' não foi encontrado.");
            // hiddenCancInput.value = config.aviso_cancelamento; // Salva o HTML no campo oculto
            // renderListPreview('aviso-canc-preview', parseHtmlList(config.aviso_cancelamento)); // Renderiza a lista
            // // --- FIM DA CORREÇÃO ---

            const enderecoInput = document.getElementById('config-endereco');
            if (enderecoInput) enderecoInput.value = config.endereco || '';

            const telefoneContatoInput = document.getElementById('config-telefone-contato');
            if (telefoneContatoInput) telefoneContatoInput.value = config.telefone_contato || '';

            console.log("loadConfiguracoes concluído com sucesso.");

        } catch (error) {
            // Isso vai nos dar a mensagem de erro específica
            console.error(error);
            alert(`Erro ao carregar configurações: ${error.message}`);
        }
    }

    // --- NOVA FUNÇÃO AUXILIAR ---
    /**
     * Mostra ou esconde os campos de percentual em toda a página de gestão
     * @param {boolean} isHabilitado - Se o interruptor global está ligado
     */
    function togglePercentualFields(isHabilitado) {
        const displayValue = isHabilitado ? 'block' : 'none';
        const displayCell = isHabilitado ? 'table-cell' : 'none'; // Correção para tabelas
        
        // Esconde no modal de Serviço (Inputs do formulário)
        document.querySelectorAll('.form-group-percentual').forEach(el => {
            el.style.display = displayValue;
        });

        // Esconde na tabela de Manutenção (Colunas)
        document.querySelectorAll('.col-percentual').forEach(el => {
            el.style.display = displayCell;
        });

        // Ajusta o grid do formulário de manutenção
        const gridForm = document.querySelector('.form-add-manutencao .manutencao-form-grid');
        if (gridForm) {
            // Verifica se estamos no desktop (matchMedia) para não quebrar o layout mobile
            if (window.matchMedia("(min-width: 993px)").matches) {
                if (isHabilitado) {
                    // COM PIX (7 colunas): Nome(1.5fr) e os outros distribuidos
                    gridForm.style.gridTemplateColumns = "1.5fr 0.8fr 0.8fr 0.8fr 0.8fr 0.8fr auto";
                } else {
                    // SEM PIX (6 colunas): Padrão
                    gridForm.style.gridTemplateColumns = "2fr 1fr 1fr 1fr 1fr auto";
                }
            } else {
                // Remove o estilo inline se for mobile, para deixar o CSS controlar
                gridForm.style.gridTemplateColumns = ""; 
            }
        }
    }

    /**
     * Carrega a lista de serviços do negócio e preenche a tabela
     */
    async function loadServicos() {
        const tbody = document.getElementById('servicos-lista-tbody');
        tbody.innerHTML = '<tr><td colspan="5">Carregando...</td></tr>';
        
        try {
            const response = await fetch('/dashboard/api/gestao/servicos/');
            if (!response.ok) throw new Error('Falha ao carregar serviços.');
            
            const servicos = await response.json();
            if (servicos.length === 0) {
                // CORREÇÃO: O colspan estava 5, mas são 6 colunas.
                tbody.innerHTML = '<tr><td colspan="6">Nenhum serviço cadastrado.</td></tr>';
                return;
            }
            
            tbody.innerHTML = ''; // Limpa a tabela
            servicos.forEach(s => {
                // Mapeia IDs de profissionais para nomes
                const nomesProfissionais = s.profissionais_ids
                    .map(id => {
                        const membro = localEquipe.find(m => m.id === id);
                        return membro ? membro.nome : 'N/A';
                    })
                    .join(', ');

                const categoriaNome = s.categoria_nome || '(Nenhuma)';

                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${s.nome}</td>
                    <td>${categoriaNome}</td>
                    <td>R$ ${s.preco.toFixed(2)}</td>
                    <td>${s.duracao_minutos} min</td>
                    <td>${nomesProfissionais || 'Nenhum'}</td>
                    <td class="actions-cell" style="display: flex; gap: 8px;">
                        <button class="btn btn--outline btn--sm btn-edit" data-id="${s.id}">Editar</button>
                        <button class="btn btn--secondary btn--sm btn-manutencao" data-id="${s.id}" data-nome="${s.nome}">Manutenção</button>
                    </td>
                `;
                tbody.appendChild(tr);
            });

        } catch (error) {
            console.error('Erro ao carregar serviços:', error);
            tbody.innerHTML = `<tr><td colspan="5" class="text-error">${error.message}</td></tr>`;
        }
    }

    async function loadCategorias(selectElementId = null) {
        const tbody = document.getElementById('categorias-lista-tbody');
        
        try {
            const response = await fetch('/dashboard/api/gestao/categorias/');
            if (!response.ok) throw new Error('Falha ao carregar categorias.');
            
            localCategorias = await response.json(); // Salva no cache
            
            // 1. Popula a tabela na aba "Categorias"
            if (tbody) {
                if (localCategorias.length === 0) {
                    tbody.innerHTML = '<tr><td colspan="2">Nenhuma categoria cadastrada.</td></tr>';
                } else {
                    tbody.innerHTML = '';
                    localCategorias.forEach(c => {
                        const tr = document.createElement('tr');
                        tr.innerHTML = `
                            <td>${c.nome}</td>
                            <td>
                                <button class="btn btn--outline btn--sm btn-edit-categoria" data-id="${c.id}" data-nome="${c.nome}">Editar</button>
                            </td>
                        `;
                        tbody.appendChild(tr);
                    });
                }
            }
            
            // 2. Popula o <select> no modal de serviço (opcional)
            const selectServicoCat = document.getElementById(selectElementId);
            if (selectServicoCat) {
                selectServicoCat.innerHTML = '<option value="">(Nenhuma)</option>'; // Reset
                localCategorias.forEach(c => {
                    selectServicoCat.innerHTML += `<option value="${c.id}">${c.nome}</option>`;
                });
            }

        } catch (error) {
            console.error('Erro ao carregar categorias:', error);
            if (tbody) tbody.innerHTML = `<tr><td colspan="2" class="text-error">${error.message}</td></tr>`;
        }
    }

    async function saveConfiguracoes(event) {
        event.preventDefault();
        
        // 1. Não podemos mais usar JSON. Temos que usar FormData.
        const formData = new FormData();
        formData.append('nome_negocio', document.getElementById('config-nome-negocio').value);
        formData.append('tagline', document.getElementById('config-tagline').value);
        // --- INÍCIO DA ADIÇÃO ---
        formData.append('portfolio_url', document.getElementById('config-portfolio-url').value);
        // --- FIM DA ADIÇÃO ---
        formData.append('cor_primaria', document.getElementById('config-cor-primaria').value);
        formData.append('cor_secundaria', document.getElementById('config-cor-secundaria').value);
        
        // --- CORREÇÃO AQUI ---
        // O nome do campo é o mesmo, mas agora ele é um input oculto.
        // O código continua o mesmo, pois o ID não mudou.
        // formData.append('aviso_procedimento', document.getElementById('config-aviso-procedimento').value);
        // formData.append('aviso_cancelamento', document.getElementById('config-aviso-cancelamento').value);

        formData.append('dias_antecedencia_maxima', document.getElementById('config-dias-antecedencia').value);
        
        // 2. Pega o arquivo de imagem
        formData.append('dias_antecedencia_maxima', document.getElementById('config-dias-antecedencia').value);

        formData.append('pagamento_online_habilitado', configToggleInput.checked);
        
        // --- MUDANÇA AQUI ---
        // 2. Pega o arquivo de imagem CORTADO (se existir)
        if (croppedLogoBlob) {
            // Envia o Blob cortado com um nome de arquivo
            formData.append('logo', croppedLogoBlob, 'logo_cortada.png');
        }
        // (Não precisamos mais checar o logoInput.files)

        formData.append('endereco', document.getElementById('config-endereco').value);
        formData.append('telefone_contato', document.getElementById('config-telefone-contato').value);

        try {
            const response = await fetch('/dashboard/api/gestao/configuracoes/', {
                method: 'POST',
                headers: {
                    // 3. NÃO definimos 'Content-Type'. O browser faz isso
                    // automaticamente para 'multipart/form-data'
                    'X-CSRFToken': csrfToken
                },
                body: formData // 4. Enviamos o FormData
            });

            const result = await response.json();
            if (!response.ok) throw new Error(result.message);
            
            showToast({ message: result.message, type: 'success' });

            
            // Atualiza o preview da logo se uma nova foi enviada
            if (result.new_logo_url) {
                 document.getElementById('logo-preview').src = result.new_logo_url;
                 document.getElementById('logo-preview-container').style.display = 'block';
                 // --- ADICIONE ESTA LINHA ---
                 originalLogoUrl = result.new_logo_url; // O "original" agora é o que foi salvo
            }

            croppedLogoBlob = null; // Limpa o blob após o envio

            if (revertLogoBtn) revertLogoBtn.style.display = 'none'; // Esconde o botão "Desfazer"
            
        } catch (error) {
            showToast({ message: `Erro ao salvar: ${error.message}`, type: 'error' });
        }
    }

    /**
     * Carrega a lista de equipe para o cache local (usado no modal)
     */
    async function loadEquipe() {
        const tbody = document.getElementById('equipe-lista-tbody');
        tbody.innerHTML = '<tr><td colspan="3">Carregando...</td></tr>';
        
        try {
            const response = await fetch('/dashboard/api/gestao/equipe/');
            if (!response.ok) throw new Error('Falha ao carregar equipe.');
            
            localEquipe = await response.json(); // Salva no cache
            
            // --- NOVA LÓGICA PARA PREENCHER A TABELA ---
            if (localEquipe.length === 0) {
                tbody.innerHTML = '<tr><td colspan="3">Nenhum membro na equipe.</td></tr>';
                return;
            }
            
            tbody.innerHTML = ''; // Limpa a tabela
            localEquipe.forEach(m => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${m.nome}</td>
                    <td>${m.email}</td>
                    <td style="text-align: right;">
                        <button class="btn btn--outline btn--sm btn-edit-equipe" data-id="${m.id}">Editar</button>
                    </td>
                `;
                tbody.appendChild(tr);
            });
            // --- FIM DA NOVA LÓGICA ---

        } catch (error) {
            console.error('Erro ao carregar equipe:', error);
            localEquipe = []; // Limpa o cache em caso de erro
            tbody.innerHTML = `<tr><td colspan="3" class="text-error">${error.message}</td></tr>`;
        }
    }

    async function loadHorarios() {
        const container = document.getElementById('horarios-semana-container');
        container.innerHTML = '<p>Carregando horários...</p>';
        
        try {
            const response = await fetch('/dashboard/api/gestao/horarios/');
            if (!response.ok) throw new Error('Falha ao carregar horários.');
            
            const horarios = await response.json();
            
            // Agrupa horários por dia da semana
            const diasSemana = [
                { id: 0, nome: 'Segunda-feira', horarios: [] },
                { id: 1, nome: 'Terça-feira', horarios: [] },
                { id: 2, nome: 'Quarta-feira', horarios: [] },
                { id: 3, nome: 'Quinta-feira', horarios: [] },
                { id: 4, nome: 'Sexta-feira', horarios: [] },
                { id: 5, nome: 'Sábado', horarios: [] },
                { id: 6, nome: 'Domingo', horarios: [] },
            ];
            
            horarios.forEach(h => {
                const dia = diasSemana.find(d => d.id === h.dia_da_semana);
                if (dia) {
                    dia.horarios.push(h);
                }
            });
            
            container.innerHTML = ''; // Limpa o "Carregando"
            
            // Renderiza os 7 dias
            diasSemana.forEach(dia => {
                const diaEl = document.createElement('div');
                diaEl.className = 'dia-semana-bloco';
                
                let horariosHTML = '<ul class="horario-slot-lista">';
                if (dia.horarios.length === 0) {
                    horariosHTML += '<li class="text-secondary">Nenhum horário definido.</li>';
                }
                dia.horarios.forEach(h => {
                    horariosHTML += `
                        <li class="horario-slot-item">
                            <span>${h.hora_inicio} - ${h.hora_fim}</span>
                            <button class="btn-delete-horario" data-id="${h.id}">&times;</button>
                        </li>
                    `;
                });
                horariosHTML += '</ul>';
                
                // Formulário para adicionar novo
                diaEl.innerHTML = `
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <h4>${dia.nome}</h4>
                        <small class="text-secondary">${dia.horarios.length} turnos definidos</small>
                    </div>
                    ${horariosHTML}
                    
                    <form class="form-add-horario form-horario-grid" data-dia="${dia.id}">
                        <div class="horario-group">
                            <label>Jornada de Trabalho</label>
                            <div class="horario-inputs">
                                <input type="time" class="form-control" name="inicio_trabalho" required>
                                <span>às</span>
                                <input type="time" class="form-control" name="fim_trabalho" required>
                            </div>
                        </div>
                        
                        <div class="horario-group">
                            <label>Intervalo/Almoço (Opcional)</label>
                            <div class="horario-inputs">
                                <input type="time" class="form-control" name="inicio_almoco">
                                <span>às</span>
                                <input type="time" class="form-control" name="fim_almoco">
                            </div>
                        </div>

                        <button type="submit" class="btn btn--primary btn--sm btn-add-horario">Salvar Horário</button>
                    </form>
                `;
                container.appendChild(diaEl);
            });
            
        } catch (error) {
            console.error(error);
            container.innerHTML = `<p class="text-error">${error.message}</p>`;
        }
    }
    
    // --- ADICIONE ESTAS NOVAS FUNÇÕES ---
    
    /**
     * Salva um novo horário de trabalho
     */
    async function saveHorario(event) {
        event.preventDefault();
        const form = event.target;
        const diaId = form.dataset.dia;
        
        // Captura os 4 campos
        const inicioTrabalho = form.elements['inicio_trabalho'].value;
        const fimTrabalho = form.elements['fim_trabalho'].value;
        const inicioAlmoco = form.elements['inicio_almoco'].value;
        const fimAlmoco = form.elements['fim_almoco'].value;
        
        // Validação básica Frontend
        if (inicioTrabalho >= fimTrabalho) {
            showToast({ message: 'O fim da jornada deve ser depois do início.', type: 'warning' });
            return;
        }

        // Prepara o payload
        const payload = {
            dia_da_semana: diaId,
            hora_inicio: inicioTrabalho,
            hora_fim: fimTrabalho,
            // Envia almoço apenas se ambos os campos estiverem preenchidos
            almoco_inicio: (inicioAlmoco && fimAlmoco) ? inicioAlmoco : null,
            almoco_fim: (inicioAlmoco && fimAlmoco) ? fimAlmoco : null
        };
       
        try {
            const response = await fetch('/dashboard/api/gestao/horarios/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': csrfToken
                },
                body: JSON.stringify(payload)
            });
            
            const result = await response.json();
            
            if (!response.ok) {
                throw new Error(result.message || 'Falha ao salvar.');
            }
            
            await loadHorarios(); // Recarrega a lista
            showToast({ message: result.message, type: 'success' });
            
        } catch (error) {
            showToast({ message: `Erro: ${error.message}`, type: 'error' });
        }
    }
    
    /**
     * Exclui um horário de trabalho
     */
    async function deleteHorario(horarioId) {
        
        try {
            const response = await fetch(`/dashboard/api/gestao/horarios/${horarioId}/`, {
                method: 'DELETE',
                headers: { 'X-CSRFToken': csrfToken }
            });
            
            if (!response.ok) {
                const result = await response.json();
                throw new Error(result.message || 'Falha ao excluir.');
            }
            
            await loadHorarios(); // Recarrega
            
            // --- CORREÇÃO ---
            showToast({ message: 'Horário removido.', type: 'success' });
            
        } catch (error) {
            // --- CORREÇÃO ---
            showToast({ message: `Erro: ${error.message}`, type: 'error' });
        }
    }

    async function loadDiasBloqueados() {
        const container = document.getElementById('lista-dias-bloqueados');
        container.innerHTML = '<p>Carregando...</p>';
        try {
            const response = await fetch('/dashboard/api/gestao/dias-bloqueados/');
            const bloqueios = await response.json();
            
            container.innerHTML = '';
            if (bloqueios.length === 0) {
                container.innerHTML = '<p class="text-secondary text-center" style="margin: 0; padding: 8px; font-size: 14px;">Nenhum dia bloqueado.</p>';
                return;
            }
            
            bloqueios.forEach(b => {
                const dataFormatada = new Date(b.data + 'T00:00:00-03:00').toLocaleDateString('pt-BR');
                const itemEl = document.createElement('div');
                itemEl.className = 'lista-preview-item';
                itemEl.innerHTML = `
                    <span>
                        <strong>${dataFormatada}</strong> - ${b.descricao || 'Dia bloqueado'}
                    </span>
                    <button type="button" class="btn-delete-bloqueio" data-id="${b.id}">&times;</button>
                `;
                container.appendChild(itemEl);
            });
        } catch (error) {
            container.innerHTML = `<p class="text-error">${error.message}</p>`;
        }
    }

    /**
     * Salva um novo dia bloqueado
     */
    async function saveDiaBloqueado(event) {
        event.preventDefault();
        const dataInput = document.getElementById('bloqueio-data');
        const descInput = document.getElementById('bloqueio-descricao');
        
        try {
            const response = await fetch('/dashboard/api/gestao/dias-bloqueados/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-CSRFToken': csrfToken },
                body: JSON.stringify({
                    data: dataInput.value,
                    descricao: descInput.value
                })
            });
            const result = await response.json();

            // --- CORREÇÃO ---
            if (!response.ok) {
                // Lança o erro com a MENSAGEM DA API
                throw new Error(result.message || 'Falha ao salvar.');
            }
            // --- FIM DA CORREÇÃO ---
            
            dataInput.value = '';
            descInput.value = '';
            await loadDiasBloqueados();
            
            // --- CORREÇÃO ---
            showToast({ message: result.message, type: 'success' });
            
        } catch (error) {
            // --- CORREÇÃO ---
            // Agora isso vai mostrar "Não é possível bloquear..."
            showToast({ message: `Erro: ${error.message}`, type: 'error' });
        }
    }

    /**
     * Exclui um dia bloqueado
     */
    async function deleteDiaBloqueado(bloqueioId) {
        try {
            const response = await fetch(`/dashboard/api/gestao/dias-bloqueados/${bloqueioId}/`, {
                method: 'DELETE',
                headers: { 'X-CSRFToken': csrfToken }
            });
            if (!response.ok) {
                const result = await response.json();
                throw new Error(result.message);
            }
            await loadDiasBloqueados();
            
            // --- CORREÇÃO ---
            showToast({ message: 'Bloqueio removido.', type: 'success' });

        } catch (error) {
            // --- CORREÇÃO ---
            showToast({ message: `Erro: ${error.message}`, type: 'error' });
        }
    }

    // ---
    // --- FUNÇÕES DO MURAL DE AVISOS ---
    // ---
    
    let currentEditingAvisoId = null;
    let avisoForm = document.getElementById('aviso-form');
    let avisoModal = document.getElementById('aviso-modal');

    /**
     * Carrega e renderiza a lista de avisos
     */
    async function loadAvisos() {
        const container = document.getElementById('avisos-lista-container');
        container.innerHTML = '<p>Carregando avisos...</p>';
        
        try {
            const response = await fetch('/dashboard/api/gestao/avisos/');
            if (!response.ok) throw new Error('Falha ao carregar avisos.');
            const avisos = await response.json();
            
            if (avisos.length === 0) {
                container.innerHTML = '<p class="text-secondary">Nenhum aviso cadastrado.</p>';
                return;
            }
            
            container.innerHTML = ''; // Limpa
            avisos.forEach(aviso => {
                const card = document.createElement('div');
                card.className = 'aviso-card';
                card.innerHTML = `
                    <div class="aviso-card-header">
                        <h4>${aviso.titulo}</h4>
                        <button class="btn btn--outline btn--sm btn-edit-aviso" data-id="${aviso.id}">Editar</button>
                    </div>
                    <div class="aviso-card-body">
                        ${aviso.conteudo} </div>
                `;
                container.appendChild(card);
            });

        } catch (error) {
            console.error(error);
            container.innerHTML = `<p class="text-error">${error.message}</p>`;
        }
    }

    /**
     * Abre o modal de aviso (para criar ou editar)
     */
    async function openAvisoModal(avisoId = null) {
        avisoForm.reset();
        currentEditingAvisoId = avisoId;
        const deleteButton = document.getElementById('aviso-modal-delete');

        if (avisoId) {
            // --- MODO EDIÇÃO ---
            document.getElementById('aviso-modal-title').textContent = 'Editar Aviso';
            deleteButton.classList.remove('hidden');
            
            // Busca dados do aviso
            try {
                const response = await fetch(`/dashboard/api/gestao/avisos/${avisoId}/`);
                if (!response.ok) throw new Error('Falha ao carregar aviso.');
                const aviso = await response.json();
                
                document.getElementById('aviso-id').value = aviso.id;
                document.getElementById('aviso-titulo').value = aviso.titulo;
                document.getElementById('aviso-conteudo').value = convertHtmlListToText(aviso.conteudo);
                document.getElementById('aviso-ordem').value = aviso.ordem;

            } catch (error) {
                alert('Erro ao carregar dados do aviso.');
                return;
            }
        } else {
            // --- MODO CRIAÇÃO ---
            document.getElementById('aviso-modal-title').textContent = 'Novo Aviso';
            deleteButton.classList.add('hidden');
        }
        avisoModal.classList.remove('hidden');
    }

    /**
     * Fecha o modal de aviso
     */
    function closeAvisoModal() {
        avisoModal.classList.add('hidden');
        currentEditingAvisoId = null;
    }

    /**
     * Converte um texto simples com quebras de linha em uma lista HTML.
     * Cada linha vira um <li>. Linhas em branco viram <p>.
     * @param {string} plainText
     * @returns {string} - HTML formatado
     */
    function convertTextToHtmlList(plainText) {
        if (!plainText || plainText.trim() === '') return '';

        const lines = plainText.split('\n');
        let html = '';
        let inList = false;

        for (const line of lines) {
            const trimmedLine = line.trim();

            if (trimmedLine !== '') {
                // Linha com texto
                if (!inList) {
                    html += '<ul>'; // Começa uma nova lista
                    inList = true;
                }
                html += `<li>${trimmedLine}</li>`; // Adiciona o item
            } else {
                // Linha vazia
                if (inList) {
                    html += '</ul>'; // Fecha a lista anterior
                    inList = false;
                }
                html += '<p>&nbsp;</p>'; // Adiciona um parágrafo de espaço
            }
        }
        if (inList) {
            html += '</ul>'; // Fecha a lista se ela ainda estiver aberta
        }
        return html;
    }

    /**
     * Converte uma lista HTML (<ul><li>...</li></ul>) de volta para texto puro.
     * @param {string} htmlContent
     * @returns {string} - Texto puro com quebras de linha
     */
    function convertHtmlListToText(htmlContent) {
        if (!htmlContent) return '';
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = htmlContent;
        let plainText = '';

        tempDiv.childNodes.forEach((node, index) => {
            if (index > 0) {
                plainText += '\n'; // Adiciona quebra de linha entre os blocos
            }
            if (node.nodeName === 'UL') {
                const items = Array.from(node.querySelectorAll('li')).map(li => li.textContent);
                plainText += items.join('\n');
            } else if (node.nodeName === 'P' && node.innerHTML !== '&nbsp;') {
                plainText += node.textContent;
            }
        });
        return plainText;
    }

    /**
     * Salva (Cria ou Edita) um aviso
     */
    async function saveAviso(event) {
        event.preventDefault();
        
        // --- MUDANÇA AQUI ---
        // 1. Pega o texto puro
        const rawText = document.getElementById('aviso-conteudo').value;
        // 2. Converte o texto para HTML
        const htmlContent = convertTextToHtmlList(rawText);
        // --- FIM DA MUDANÇA ---

        const data = {
        titulo: document.getElementById('aviso-titulo').value,
        conteudo: htmlContent, // <-- Envia o HTML processado
        ordem: parseInt(document.getElementById('aviso-ordem').value)
    };
        
        let url = '/dashboard/api/gestao/avisos/';
        let method = 'POST';
        
        if (currentEditingAvisoId) {
            url = `/dashboard/api/gestao/avisos/${currentEditingAvisoId}/`;
        }

        try {
            const response = await fetch(url, {
                method: method,
                headers: { 'Content-Type': 'application/json', 'X-CSRFToken': csrfToken },
                body: JSON.stringify(data)
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.message);
            
            showToast({ message: result.message, type: 'success' });
            closeAvisoModal();
            await loadAvisos(); // Recarrega a lista
            
        } catch (error) {
            showToast({ message: `Erro ao salvar: ${error.message}`, type: 'error' });
        }
    }

    /**
     * Exclui um aviso
     */
    async function deleteAviso() {
        if (!currentEditingAvisoId) return;

        try {
            const response = await fetch(`/dashboard/api/gestao/avisos/${currentEditingAvisoId}/`, {
                method: 'DELETE',
                headers: { 'X-CSRFToken': csrfToken }
            });
            
            if (!response.ok) {
                const result = await response.json();
                throw new Error(result.message);
            }
            
            showToast({ message: 'Aviso excluído.', type: 'success' });
            closeAvisoModal();
            await loadAvisos();
            
        } catch (error) {
            showToast({ message: `Erro: ${error.message}`, type: 'error' });
        }
    }

    /**
     * Pega uma string HTML <ul><li>...</li></ul> e a transforma em uma array de strings.
     */
    // function parseHtmlList(htmlString) {
    //     if (!htmlString || !htmlString.includes('<li>')) return [];
    //     const doc = new DOMParser().parseFromString(htmlString, 'text/html');
    //     return Array.from(doc.querySelectorAll('li')).map(li => li.textContent);
    // }

    // /**
    //  * Pega uma array de strings e a transforma em uma string HTML <ul>...</ul>.
    //  */
    // function buildHtmlList(items) {
    //     if (items.length === 0) return '';
    //     const listItems = items.map(item => `<li>${item}</li>`).join('');
    //     return `<ul>${listItems}</ul>`;
    // }

    // /**
    //  * Renderiza a pré-visualização da lista com botões de "remover".
    //  */
    // function renderListPreview(previewId, items) {
    //     const previewContainer = document.getElementById(previewId);
    //     previewContainer.innerHTML = ''; // Limpa a lista
        
    //     if (items.length === 0) {
    //         previewContainer.innerHTML = '<p class="text-secondary text-center" style="margin: 0; padding: 8px; font-size: 14px;">Nenhum item adicionado.</p>';
    //         return;
    //     }

    //     items.forEach(itemText => {
    //         const itemEl = document.createElement('div');
    //         itemEl.className = 'lista-preview-item';
    //         itemEl.innerHTML = `
    //             <span>${itemText}</span>
    //             <button type="button" class="btn-remove-lista-item">&times;</button>
    //         `;
    //         // Adiciona o listener para o botão de remover
    //         itemEl.querySelector('button').addEventListener('click', () => {
                
    //             // --- INÍCIO DA CORREÇÃO ---
    //             // Define o ID do input oculto correto baseado no previewId
    //             const hiddenInputId = (previewId === 'aviso-proc-preview') 
    //                 ? 'config-aviso-procedimento' 
    //                 : 'config-aviso-cancelamento';
    //             // --- FIM DA CORREÇÃO ---

    //             // 1. Remove o item da array
    //             const currentItems = parseHtmlList(document.getElementById(hiddenInputId).value);
    //             const newItems = currentItems.filter(item => item !== itemText);
                
    //             // 2. Atualiza o input oculto
    //             document.getElementById(hiddenInputId).value = buildHtmlList(newItems);
                
    //             // 3. Renderiza a preview novamente
    //             renderListPreview(previewId, newItems);
    //         });
    //         previewContainer.appendChild(itemEl);
    //     });
    // }

    // /**
    //  * Adiciona um novo item à lista.
    //  */
    // function addListItem(inputId, previewId, hiddenInputId) {
    //     const input = document.getElementById(inputId);
    //     const text = input.value.trim();
    //     if (text === '') return;

    //     // 1. Pega os itens atuais do input oculto
    //     const currentItems = parseHtmlList(document.getElementById(hiddenInputId).value);
        
    //     // 2. Adiciona o novo item
    //     currentItems.push(text);
        
    //     // 3. Salva a nova lista HTML no input oculto
    //     document.getElementById(hiddenInputId).value = buildHtmlList(currentItems);
        
    //     // 4. Renderiza a nova preview
    //     renderListPreview(previewId, currentItems);
        
    //     // 5. Limpa o campo de texto
    //     input.value = '';
    // }

    // =================================================================
    // NOVAS FUNÇÕES: Gerenciamento de Categoria
    // =================================================================

    /**
     * Salva uma nova categoria (do formulário da aba)
     */
    async function saveCategoria(event) {
        event.preventDefault();
        const input = document.getElementById('categoria-nome-input');
        const nome = input.value.trim();
        if (nome === '') return;

        try {
            const response = await fetch('/dashboard/api/gestao/categorias/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-CSRFToken': csrfToken },
                body: JSON.stringify({ nome: nome })
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.message);
            
            showToast({ message: 'Categoria criada!', type: 'success' });
            input.value = '';
            await loadCategorias('servico-categoria'); // Recarrega tabela E o select
            
        } catch (error) {
            showToast({ message: `Erro: ${error.message}`, type: 'error' });
        }
    }

    /**
     * Abre o modal de edição de categoria
     */
    function openCategoriaModal(id, nome) {
        document.getElementById('categoria-edit-id').value = id;
        document.getElementById('categoria-edit-nome').value = nome;
        categoriaModal.classList.remove('hidden');
    }

    function closeCategoriaModal() {
        categoriaModal.classList.add('hidden');
    }

    /**
     * Salva a edição da categoria (do modal)
     */
    async function saveCategoriaEdit(event) {
        event.preventDefault();
        const id = document.getElementById('categoria-edit-id').value;
        const nome = document.getElementById('categoria-edit-nome').value.trim();
        
        try {
            const response = await fetch(`/dashboard/api/gestao/categorias/${id}/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-CSRFToken': csrfToken },
                body: JSON.stringify({ nome: nome })
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.message);

            showToast({ message: 'Categoria atualizada!', type: 'success' });
            closeCategoriaModal();
            await loadCategorias('servico-categoria'); // Recarrega
            
        } catch (error) {
            showToast({ message: `Erro: ${error.message}`, type: 'error' });
        }
    }

    /**
     * Exclui uma categoria (do modal)
     */
    async function deleteCategoria() {
        const id = document.getElementById('categoria-edit-id').value;

        try {
            const response = await fetch(`/dashboard/api/gestao/categorias/${id}/`, {
                method: 'DELETE',
                headers: { 'X-CSRFToken': csrfToken }
            });
            if (!response.ok) {
                const result = await response.json();
                throw new Error(result.message);
            }

            showToast({ message: 'Categoria excluída.', type: 'success' });
            closeCategoriaModal();
            await loadCategorias('servico-categoria'); // Recarrega
            
        } catch (error) {
            showToast({ message: `Erro: ${error.message}`, type: 'error' });
        }
    }
    
    // =================================================================
    // NOVAS FUNÇÕES: Gerenciamento de Preços de Manutenção
    // =================================================================
    
    /**
     * Carrega os tiers de manutenção para o modal de serviço
     */
    async function loadManutencaoTiers(servicoId) {
        const tbody = document.getElementById('manutencao-lista-tbody');
        tbody.innerHTML = '<tr><td colspan="6">Carregando...</td></tr>';
        
        try {
            const response = await fetch(`/dashboard/api/gestao/servicos/${servicoId}/manutencao/`);
            if (!response.ok) throw new Error('Falha ao carregar tiers.');
            
            const tiers = await response.json();

            // Atualiza a visibilidade da coluna (antes de preencher)
            togglePercentualFields(isPagamentoOnlineHabilitado);
            
            if (tiers.length === 0) {
                tbody.innerHTML = `<tr><td colspan="${isPagamentoOnlineHabilitado ? 7 : 6}">Nenhum preço de manutenção cadastrado.</td></tr>`;
                return;
            }
            tbody.innerHTML = '';
            tiers.forEach(tier => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${tier.nome_tier}</td>
                    <td>${tier.dias_min}</td>
                    <td>${tier.dias_max}</td>
                    <td>R$ ${tier.preco.toFixed(2)}</td>
                    <td>${tier.duracao_minutos} min</td>
                    <td class="col-percentual" style="display: ${isPagamentoOnlineHabilitado ? 'table-cell' : 'none'};">
                        ${tier.percentual_adiantamento || 0}%
                    </td>
                    <td>
                        <button type="button" class="btn btn--outline btn--sm btn-delete-manutencao" data-id="${tier.id}">Excluir</button>
                    </td>
                `;
                tbody.appendChild(tr);
            });
        } catch (error) {
            tbody.innerHTML = `<tr><td colspan="6" class="text-error">${error.message}</td></tr>`;
        }
    }
    
    /**
     * Salva um novo tier de manutenção (do modal de serviço)
     */
    async function saveManutencaoTier(event) {
        event.preventDefault();
        // --- MUDANÇA ---
        if (!currentEditingManutencaoServiceId) return;

        // =================================================================
        // INÍCIO: Bloco de Validação Client-Side
        // =================================================================
        
        // 1. Pega os dados do formulário para validar
        const newNomeInput = document.getElementById('manutencao-nome');
        const newMinInput = document.getElementById('manutencao-dias-min');
        const newMaxInput = document.getElementById('manutencao-dias-max');

        const newNome = newNomeInput.value.trim();
        const newMin = parseInt(newMinInput.value);
        const newMax = parseInt(newMaxInput.value);

        // Validação básica de dias
        if (newMin >= newMax) {
            showToast({ message: 'O "Dias Mín" deve ser menor que o "Dias Max".', type: 'error' });
            return;
        }

        // 2. Pega os dados existentes na tabela para comparar
        const existingRows = manutencaoTbody.querySelectorAll('tr');
        
        for (const row of existingRows) {
            // Pula a linha de "carregando" ou "vazio" 
            if (row.cells.length < 6) continue; 

            const existingNome = row.cells[0].textContent.trim();
            const existingMin = parseInt(row.cells[1].textContent);
            const existingMax = parseInt(row.cells[2].textContent);

            // TRAVA 1: Verifica o nome duplicado
            if (existingNome.toLowerCase() === newNome.toLowerCase()) {
                showToast({ message: `Erro: O nome "${newNome}" já está em uso.`, type: 'error' });
                newNomeInput.focus(); // Ajuda o usuário
                return; // Para a execução
            }

            // TRAVA 2: Verifica sobreposição de dias
            // A lógica é: (NovoMin <= ExistenteMax) E (NovoMax >= ExistenteMin)
            if (newMin <= existingMax && newMax >= existingMin) {
                showToast({ 
                    message: `Erro: O período (${newMin}-${newMax} dias) conflita com um período existente (${existingMin}-${existingMax} dias).`, 
                    type: 'error' 
                });
                newMinInput.focus(); // Ajuda o usuário
                return; // Para a execução
            }
        }
        // =================================================================
        // FIM: Bloco de Validação Client-Side
        // =================================================================

        // Se passou pelas travas, continua com o salvamento
        const data = {
            nome_tier: newNome,
            dias_min: newMin,
            dias_max: newMax,
            preco: parseFloat(document.getElementById('manutencao-preco').value),
            duracao_minutos: parseInt(document.getElementById('manutencao-duracao').value),
            percentual_adiantamento: parseInt(document.getElementById('manutencao-percentual').value)
        };

        try {
            const response = await fetch(`/dashboard/api/gestao/servicos/${currentEditingManutencaoServiceId}/manutencao/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-CSRFToken': csrfToken },
                body: JSON.stringify(data)
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.message);
            
            showToast({ message: 'Tier de manutenção salvo!', type: 'success' });
            manutencaoForm.reset();
            await loadManutencaoTiers(currentEditingManutencaoServiceId); // Recarrega a lista
            
        } catch (error) {
            showToast({ message: `Erro: ${error.message}`, type: 'error' });
        }
    }
    
    /**
     * Deleta um tier de manutenção
     */
    async function deleteManutencaoTier(tierId) {
        
        try {
            const response = await fetch(`/dashboard/api/gestao/manutencao/${tierId}/`, {
                method: 'DELETE',
                headers: { 'X-CSRFToken': csrfToken }
            });
            if (!response.ok) {
                const result = await response.json();
                throw new Error(result.message);
            }
            
            showToast({ message: 'Tier de manutenção removido.', type: 'success' });
            await loadManutencaoTiers(currentEditingManutencaoServiceId); // Recarrega
            
        } catch (error) {
            showToast({ message: `Erro: ${error.message}`, type: 'error' });
        }
    }

    // --- Funções do Modal ---

    /**
     * Abre o modal de serviço, seja para criar um novo ou editar um existente
     * @param {number|null} serviceId - O ID do serviço para editar, ou null para criar
     */
    async function openServicoModal(serviceId = null) {
        servicoForm.reset();
        // manutencaoForm.reset(); // <-- REMOVIDO
        // document.getElementById('manutencao-lista-tbody').innerHTML = ''; // <-- REMOVIDO
        currentEditingServiceId = serviceId; // (Mantido)

        // 1. Popula os 'flags' de profissionais
        const flagsContainer = document.getElementById('servico-profissionais-flags');
        flagsContainer.innerHTML = ''; // Limpa o container
        if (localEquipe.length === 0) {
            flagsContainer.innerHTML = '<p class="text-secondary" style="padding: 8px 0;">Nenhum membro na equipe.</p>';
        } else {
            localEquipe.forEach(membro => {
                const flag = document.createElement('div');
                flag.className = 'flag-item-toggle';
                flag.textContent = membro.nome;
                flag.dataset.id = membro.id; // Armazena o ID no data attribute
                
                // Adiciona o evento de clique para toggle
                flag.addEventListener('click', () => {
                    flag.classList.toggle('selected');
                });
                
                flagsContainer.appendChild(flag);
            });
        }

        // --- NOVA ADIÇÃO ---
        // 2. Popula o <select> de categorias (usando o cache)
        const selectCategorias = document.getElementById('servico-categoria');
        selectCategorias.innerHTML = '<option value="">(Nenhuma)</option>';
        localCategorias.forEach(c => {
            selectCategorias.innerHTML += `<option value="${c.id}">${c.nome}</option>`;
        });
        // --- FIM DA ADIÇÃO ---

        // Mostra/Esconde o campo de percentual ANTES de popular
        togglePercentualFields(isPagamentoOnlineHabilitado);

        const deleteButton = document.getElementById('servico-modal-delete');
        if (serviceId) {
            // --- MODO EDIÇÃO ---
            servicoModalTitle.textContent = 'Editar Serviço';
            deleteButton.classList.remove('hidden');
            
            // await loadManutencaoTiers(serviceId); // <-- REMOVIDO
            
            try {
                const response = await fetch(`/dashboard/api/gestao/servicos/${serviceId}/`);
                if (!response.ok) throw new Error('Falha ao carregar dados do serviço.');
                const servico = await response.json();
                
                // Preenche o formulário
                document.getElementById('servico-id').value = servico.id;
                document.getElementById('servico-nome').value = servico.nome;
                document.getElementById('servico-preco').value = servico.preco;
                document.getElementById('servico-duracao').value = servico.duracao_minutos;
                document.getElementById('servico-descricao').value = servico.descricao;

                // --- NOVA ADIÇÃO ---
                // Seleciona a categoria
                document.getElementById('servico-categoria').value = servico.categoria_id || "";
                document.getElementById('servico-percentual').value = servico.percentual_adiantamento
                // --- FIM DA ADIÇÃO ---

                // Mostra o preview da imagem atual
                const imgPreview = document.getElementById('servico-preview');
                const imgContainer = document.getElementById('servico-preview-container');
                if (servico.imagem_url) {
                    imgPreview.src = servico.imagem_url;
                    imgContainer.style.display = 'block';
                } else {
                    // Mostra o placeholder
                    imgPreview.src = ""; 
                    imgContainer.style.display = 'block';
                }
                
                // --- ADICIONE ESTAS 3 LINHAS ---
                originalServiceImageUrl = imgPreview.src; // Salva a URL original
                croppedServiceBlob = null; // Limpa o blob de uma edição anterior
                if (revertServiceImageBtn) revertServiceImageBtn.style.display = 'none'; // Esconde o "Desfazer"
                
                // Seleciona os profissionais nas 'flags'
                flagsContainer.querySelectorAll('.flag-item-toggle').forEach(flag => {
                    const flagId = parseInt(flag.dataset.id);
                    if (servico.profissionais_ids.includes(flagId)) {
                        flag.classList.add('selected');
                    }
                });

            } catch (error) {
                console.error(error);
                alert('Erro ao carregar o serviço.');
                return;
            }
            
        } else {
            // --- MODO CRIAÇÃO ---
            servicoModalTitle.textContent = 'Novo Serviço';
            deleteButton.classList.add('hidden');
            
            // --- CORREÇÃO: Reseta a imagem original ---
            originalServiceImageUrl = ""; 
            // ------------------------------------------

            document.getElementById('servico-preview-container').style.display = 'none';
            document.getElementById('servico-percentual').value = 0;
        }
        
        servicoModal.classList.remove('hidden');
    }

    /**
     * Fecha o modal de serviço
     */
    function closeServicoModal() {
        servicoModal.classList.add('hidden');
        currentEditingServiceId = null;
    }

    /**
     * Salva o serviço (Criação ou Edição)
     */
    async function saveServico(event) {
        event.preventDefault();
        
        // --- MUDANÇA: USANDO FORMDATA ---
        const formData = new FormData();
        
        // 1. Coleta os dados de texto
        formData.append('nome', document.getElementById('servico-nome').value);
        formData.append('preco', parseFloat(document.getElementById('servico-preco').value));
        formData.append('duracao_minutos', parseInt(document.getElementById('servico-duracao').value));
        formData.append('descricao', document.getElementById('servico-descricao').value);
        formData.append('percentual_adiantamento', parseInt(document.getElementById('servico-percentual').value) || 0);

        // --- NOVA ADIÇÃO ---
        // 1.5. Coleta a Categoria
        const categoriaId = document.getElementById('servico-categoria').value;
        if (categoriaId) {
            formData.append('categoria_id', categoriaId);
        }
        
        // 2. Coleta os IDs dos profissionais das flags
        const flagsContainer = document.getElementById('servico-profissionais-flags');
        const selectedFlags = flagsContainer.querySelectorAll('.flag-item-toggle.selected');
        const profissionais_ids = Array.from(selectedFlags).map(flag => parseInt(flag.dataset.id));
        formData.append('profissionais_ids', profissionais_ids.join(','));

        // 3. Coleta o arquivo de imagem (se houver)
        if (croppedServiceBlob) {
            formData.append('imagem', croppedServiceBlob, 'servico_cortado.png');
        }
        // --- FIM DA MUDANÇA ---
        
        // 2. Define a URL e o Método (Criar vs Editar)
        let url = '/dashboard/api/gestao/servicos/';
        let method = 'POST';
        
        if (currentEditingServiceId) {
            url = `/dashboard/api/gestao/servicos/${currentEditingServiceId}/`;
        }

        // 3. Envia a requisição
        try {
            const response = await fetch(url, {
                method: method,
                headers: {
                    // NÃO USAR 'Content-Type': 'application/json'
                    'X-CSRFToken': csrfToken
                },
                body: formData // Envia o FormData
            });

            const result = await response.json();
            
            if (!response.ok) {
                throw new Error(result.message || 'Falha ao salvar o serviço.');
            }
            
            // SUBSTITUÍDO: alert() por showToast()
            showToast({ message: result.message, type: 'success' });
            closeServicoModal();
            await loadServicos(); 
            await loadCategorias('servico-categoria'); // Recarrega
            
        } catch (error) {
            console.error('Erro ao salvar:', error);
            // SUBSTITUÍDO: alert() por showToast()
            showToast({ message: `Erro: ${error.message}`, type: 'error' });
        }
    }
    
    /**
     * Exclui um serviço
     */
    async function deleteServico() {
        if (!currentEditingServiceId) return;

        try {
            const response = await fetch(`/dashboard/api/gestao/servicos/${currentEditingServiceId}/`, {
                method: 'DELETE',
                headers: {
                    'X-CSRFToken': csrfToken
                }
            });

            if (!response.ok) {
                const result = await response.json();
                throw new Error(result.message || 'Falha ao excluir.');
            }
            
            alert('Serviço excluído com sucesso.');
            closeServicoModal();
            await loadServicos(); // Recarrega a lista

        } catch (error) {
            console.error('Erro ao excluir:', error);
            alert(`Erro: ${error.message}`);
        }
    }

    // =================================================================
    // NOVAS FUNÇÕES: Lógica do Editor de Logo (Cropper.js)
    // =================================================================

    /**
     * Inicializa toda a lógica do editor de logo.
     * Esta função deve ser chamada no DOMContentLoaded.
     */
    function setupLogoCropper() {
        const changeLogoBtn = document.getElementById('btn-change-logo');

        // 1. Botão "Alterar Imagem" clica no input escondido
        changeLogoBtn.addEventListener('click', () => {
            logoInput.click();
        });

        // 2. Quando um arquivo é selecionado no input
        logoInput.addEventListener('change', (e) => {
            const files = e.target.files;
            if (files && files.length > 0) {
                const file = files[0];
                const reader = new FileReader();

                reader.onload = (event) => {
                    // 3. Mostra o modal e a imagem
                    logoImage.src = event.target.result;
                    logoModal.classList.remove('hidden');

                    // 4. Destrói o cropper antigo (se existir)
                    if (cropper) {
                        cropper.destroy();
                    }

                    // 5. Inicializa o Cropper.js
                    cropper = new Cropper(logoImage, {
                        aspectRatio: 1 / 1, // Força um corte quadrado (1:1)
                        viewMode: 1,        // Restringe a área de corte à imagem
                        dragMode: 'move',   // Permite mover a imagem
                        background: false,  // Sem fundo xadrez
                        autoCropArea: 0.8,  // O corte começa com 80% da área
                        responsive: true,
                        modal: true,        // Escurece o fundo
                    });
                };
                reader.readAsDataURL(file);
            }
        });

        // 6. Botão "Salvar Corte" (dentro do modal)
        document.getElementById('cropper-save').addEventListener('click', () => {
            if (!cropper) return;

            // Pega o canvas cortado (com 300x300px)
            const canvas = cropper.getCroppedCanvas({
                width: 300,
                height: 300,
                imageSmoothingQuality: 'high',
            });

            // 7. Converte o canvas para Blob (o "arquivo" que será enviado)
            canvas.toBlob((blob) => {
                croppedLogoBlob = blob;
                const previewImg = document.getElementById('logo-preview');
                previewImg.src = URL.createObjectURL(blob); 
                closeLogoCropperModal();
            // --- ADICIONE ESTA LINHA ---
            if (revertLogoBtn) revertLogoBtn.style.display = 'inline-flex'; // Mostra o botão "Desfazer"
        }, 'image/png'); 
    });

        // 11. Botão "Cancelar" (dentro do modal)
        document.getElementById('cropper-cancel').addEventListener('click', () => {
            closeLogoCropperModal();
        });
    }

    /**
     * Fecha o modal do editor e limpa tudo.
     */
    function closeLogoCropperModal() {
        logoModal.classList.add('hidden'); // Esconde o modal
        if (cropper) {
            cropper.destroy(); // Destrói a instância
            cropper = null;
        }
        logoImage.src = ''; // Limpa a imagem
        logoInput.value = null; // Limpa o input de arquivo
    }

    // =================================================================
    // NOVAS FUNÇÕES: Lógica do Editor de Imagem do SERVIÇO
    // =================================================================

    function setupServiceCropper() {
        const changeImageBtn = document.getElementById('btn-change-servico-img');
        
        // 1. Botão "Alterar Imagem"
        changeImageBtn.addEventListener('click', () => {
            serviceImageInput.click(); // Aciona o input escondido
        });

        // 2. Quando um arquivo é selecionado
        serviceImageInput.addEventListener('change', (e) => {
            const files = e.target.files;
            if (files && files.length > 0) {
                const reader = new FileReader();
                reader.onload = (event) => {
                    serviceCropperImage.src = event.target.result;
                    serviceCropperModal.classList.remove('hidden'); // Mostra o modal de corte

                    if (serviceCropper) serviceCropper.destroy();

                    // 3. Inicializa o Cropper com aspect ratio RETANGULAR
                    serviceCropper = new Cropper(serviceCropperImage, {
                        aspectRatio: 1 / 1, // Proporção retangular
                        viewMode: 1,
                        dragMode: 'move',
                        background: false,
                        autoCropArea: 0.9,
                    });
                };
                reader.readAsDataURL(files[0]);
            }
        });

        // 4. Botão "Salvar Corte"
        document.getElementById('service-cropper-save').addEventListener('click', () => {
            if (!serviceCropper) return;

            const canvas = serviceCropper.getCroppedCanvas({
                width: 800, // Salva com uma largura boa
                imageSmoothingQuality: 'high',
            });

            canvas.toBlob((blob) => {
                croppedServiceBlob = blob;
                document.getElementById('servico-preview').src = URL.createObjectURL(blob);
                
                // --- CORREÇÃO: Força o container a aparecer ---
                document.getElementById('servico-preview-container').style.display = 'block';
                // ----------------------------------------------

                closeServiceCropperModal();
                if (revertServiceImageBtn) revertServiceImageBtn.style.display = 'inline-flex'; 
            }, 'image/png');
        });

        // 5. Botão "Cancelar"
        document.getElementById('service-cropper-cancel').addEventListener('click', () => {
            closeServiceCropperModal();
        });

        // 6. Botão "Desfazer" (fora do modal)
        revertServiceImageBtn = document.getElementById('btn-revert-servico-img');
        if (revertServiceImageBtn) {
            revertServiceImageBtn.addEventListener('click', () => {
                croppedServiceBlob = null; // Descarta o corte
                
                // --- INÍCIO DA CORREÇÃO ---
                if (originalServiceImageUrl) {
                    // Se existia uma imagem antes (Edição), restaura ela
                    document.getElementById('servico-preview').src = originalServiceImageUrl;
                    document.getElementById('servico-preview-container').style.display = 'block';
                } else {
                    // Se não existia imagem (Novo Serviço), esconde o container
                    document.getElementById('servico-preview').src = "";
                    document.getElementById('servico-preview-container').style.display = 'none';
                }
                // --- FIM DA CORREÇÃO ---

                revertServiceImageBtn.style.display = 'none'; // Esconde o "Desfazer"
                serviceImageInput.value = null;
                showToast({ message: 'Alteração desfeita.', type: 'info' });
            });
        }
    }

    /**
     * Fecha o modal do editor de serviço e limpa.
     */
    function closeServiceCropperModal() {
        serviceCropperModal.classList.add('hidden');
        if (serviceCropper) {
            serviceCropper.destroy();
            serviceCropper = null;
        }
        serviceCropperImage.src = '';
        serviceImageInput.value = null;
    }

    /**
     * Abre o modal de manutenção
     */
    async function openManutencaoModal(serviceId, serviceName) {
        // Define a variável global para este modal
        currentEditingManutencaoServiceId = serviceId; 
        
        // Atualiza o título e o nome do serviço no modal
        document.getElementById('manutencao-servico-nome').textContent = serviceName;
        manutencaoForm.reset();
        
        // Carrega os tiers de manutenção existentes
        await loadManutencaoTiers(serviceId);
        
        // Exibe o modal
        manutencaoModal.classList.remove('hidden');
    }

    /**
     * Fecha o modal de manutenção
     */
    function closeManutencaoModal() {
        manutencaoModal.classList.add('hidden');
        currentEditingManutencaoServiceId = null; // Limpa a variável
    }

    // --- ADICIONE ESTAS NOVAS FUNÇÕES (Modal da Equipe) ---
    
    /**
     * Abre o modal de convidar membro
     */
    function openEquipeModal() {
        equipeForm.reset();
        equipeModal.classList.remove('hidden');
    }

    /**
     * Fecha o modal de convidar membro
     */
    function closeEquipeModal() {
        equipeModal.classList.add('hidden');
    }
    
    /**
     * Salva o novo membro da equipe (Envia o convite)
     */
    async function saveEquipeMembro(event) {
        event.preventDefault();
        
        // --- MUDANÇA: USANDO FORMDATA ---
        const formData = new FormData();
        formData.append('nome', document.getElementById('equipe-nome').value);
        formData.append('sobrenome', document.getElementById('equipe-sobrenome').value);
        formData.append('email', document.getElementById('equipe-email').value);
        formData.append('telefone', document.getElementById('equipe-telefone').value);
        formData.append('password', document.getElementById('equipe-password').value);
        
        // Adiciona a foto se ela existir
        const fotoInput = document.getElementById('equipe-foto');
        if (fotoInput.files.length > 0) {
            formData.append('foto', fotoInput.files[0]);
        }
        // --- FIM DA MUDANÇA ---

        // 2. Envia a requisição
        try {
            const response = await fetch('/dashboard/api/gestao/equipe/', {
                method: 'POST',
                headers: {
                    // NÃO USAR 'Content-Type': 'application/json'
                    'X-CSRFToken': csrfToken
                },
                body: formData // Envia o FormData
            });

            const result = await response.json();
            
            if (!response.ok) {
                throw new Error(result.message || 'Falha ao salvar o membro.');
            }
            
            showToast({ message: result.message, type: 'success' });
            closeEquipeModal();
            await loadEquipe(); // Recarrega a lista de equipe
            
        } catch (error) {
            console.error('Erro ao salvar membro:', error);
            showToast({ message: `Erro: ${error.message}`, type: 'error' });
        }
    }

    /**
     * Abre o modal de EDIÇÃO de membro
     */
    async function openEquipeEditModal(membroId) {
        equipeEditForm.reset();
        currentEditingMembroId = membroId;

        // Busca os dados atuais do membro
        try {
            const response = await fetch(`/dashboard/api/gestao/equipe/${membroId}/`);
            if (!response.ok) throw new Error('Falha ao carregar dados do membro.');
            const membro = await response.json();
            // Popula o formulário de edição
            document.getElementById('equipe-edit-id').value = membro.id;
            document.getElementById('equipe-edit-nome').value = membro.first_name;
            document.getElementById('equipe-edit-sobrenome').value = membro.last_name;
            document.getElementById('equipe-edit-email').value = membro.email;
            document.getElementById('equipe-edit-telefone').value = membro.telefone || '';
            
            // --- NOVO: Status do Token MP ---
            const tokenStatusEl = document.getElementById('mp-token-status');
            const tokenInput = document.getElementById('equipe-edit-mp-token');
            tokenInput.value = ''; // Limpa o campo (segurança)
            
            if (membro.has_mp_token) {
                tokenStatusEl.textContent = '(Configurado ✅)';
                tokenStatusEl.style.color = 'green';
                tokenInput.placeholder = '******** (Deixe vazio para manter)';
            } else {
                tokenStatusEl.textContent = '(Não configurado ❌)';
                tokenStatusEl.style.color = 'red';
                tokenInput.placeholder = 'Cole o token aqui...';
            }

            // Define o preview da foto
            const preview = document.getElementById('equipe-edit-preview');
            if (membro.foto_url) {
                preview.src = membro.foto_url;
            } else {
                preview.src = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAJYAAACWCAMAAAAL3woPAAAAFVBMVEXe3t7e3t7e3t7e3t7e3t7e3t7e3t7e3t49nE3IAAAAB3RSTlMAgICAgICA+b2dYwAAAUdJREFUeNrt29lqwzAQRcGqIAj//5c+ClqgImga6c2cE3sIqRSPbYIgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADgG/uPzG3fbd/tzbZ8gJ2rln1Gq5yR6/hL6rLvyRPL0TveDqA6c6T61T5E6vY/sL7I6mBj2f7ujn8kOxpY9v+7ox/JjoYWPb/u6MfyY6GFjW/7ujH8mOhhY1v+7ox/JjoYWNb/u6MfyY6GFjW/7ujH8mOhhY1v+7ox/JjoYWNb/u6MfyY6GFjW/7ujH8mOhhY1v+7ox/JjoYWPb/u6APyY6GFjWf/ugP8kOxhY9v+7ow/IjoYWPb/u6APyY6GFjWf/ugP8kOxhY9v+7ow/IjoYWPb/u6APyY6GFjWf/ugP8kOxhY9v+7ow/IjseWE495nNnN59mfePZzcT0/oA0AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAODf/QBt4ANrBw1qfAAAAABJRU5ErkJggg==";
            }

            equipeEditModal.classList.remove('hidden');
        } catch (error) {
            showToast({ message: `Erro: ${error.message}`, type: 'error' });
        }
    }

    /**
     * Fecha o modal de EDIÇÃO de membro
     */
    function closeEquipeEditModal() {
        equipeEditModal.classList.add('hidden');
        document.getElementById('equipe-edit-foto-input').value = null; 
        document.getElementById('equipe-edit-mp-token').value = ''; // Limpa token
        currentEditingMembroId = null;
    }

    /**
     * Salva as ALTERAÇÕES do membro da equipe
     */
    async function saveEquipeEdit(event) {
        event.preventDefault();
        if (!currentEditingMembroId) return;

        const formData = new FormData();
        formData.append('nome', document.getElementById('equipe-edit-nome').value);
        formData.append('sobrenome', document.getElementById('equipe-edit-sobrenome').value);
        formData.append('telefone', document.getElementById('equipe-edit-telefone').value);
        
        // Adiciona a nova senha (se houver)
        const newPassword = document.getElementById('equipe-edit-password').value;
        if (newPassword && newPassword.trim()) {
            formData.append('password', newPassword);
        }

        // --- NOVO: Adiciona o Token MP (se houver) ---
        const mpToken = document.getElementById('equipe-edit-mp-token').value;
        if (mpToken && mpToken.trim()) {
            formData.append('mp_token', mpToken);
        }

        // Adiciona a foto (se uma nova foi selecionada)
        const fotoInput = document.getElementById('equipe-edit-foto-input');
        if (fotoInput.files.length > 0) {
            formData.append('foto', fotoInput.files[0]);
        }

        try {
            const response = await fetch(`/dashboard/api/gestao/equipe/${currentEditingMembroId}/`, {
                method: 'POST',
                headers: { 'X-CSRFToken': csrfToken },
                body: formData
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.message);

            showToast({ message: result.message, type: 'success' });
            closeEquipeEditModal();
            await loadEquipe(); 

        } catch (error) {
            showToast({ message: `Erro: ${error.message}`, type: 'error' });
        }
    }

    /**
     * EXCLUI um membro da equipe
     */
    async function deleteEquipeMembro() {
        if (!currentEditingMembroId) return;

        try {
            const response = await fetch(`/dashboard/api/gestao/equipe/${currentEditingMembroId}/`, {
                method: 'DELETE',
                headers: { 'X-CSRFToken': csrfToken }
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.message);

            showToast({ message: result.message, type: 'success' });
            closeEquipeEditModal();
            await loadEquipe(); // Recarrega a lista

        } catch (error) {
            // A API vai retornar a mensagem de erro (ex: "possui agendamentos futuros")
            showToast({ message: `Erro: ${error.message}`, type: 'error' });
        }
    }

    // --- Inicialização e Event Listeners ---
    
    // Botão "Novo Serviço"
    document.getElementById('btn-novo-servico').addEventListener('click', () => {
        openServicoModal(null);
    });

    if (configToggleInput) {
        configToggleInput.addEventListener('change', (e) => {
            isPagamentoOnlineHabilitado = e.target.checked;
            togglePercentualFields(isPagamentoOnlineHabilitado);
        });
    }
    
    // Botões de fechar o modal
    document.getElementById('servico-modal-close').addEventListener('click', closeServicoModal);
    document.getElementById('servico-modal-cancel').addEventListener('click', closeServicoModal);
    
    // Botão de salvar (submit)
    servicoForm.addEventListener('submit', saveServico);
    
    // Botão de excluir
    document.getElementById('servico-modal-delete').addEventListener('click', deleteServico);

    // --- ADICIONE ESTAS 3 LINHAS ---
    // Botão "Convidar Membro"
    document.getElementById('btn-convidar-membro').addEventListener('click', openEquipeModal);
    // --- FIM DA ADIÇÃO ---

    // Botões de fechar o modal de Equipe
    document.getElementById('equipe-modal-close').addEventListener('click', closeEquipeModal);
    document.getElementById('equipe-modal-cancel').addEventListener('click', closeEquipeModal);
    
    // Botão de salvar (submit) Equipe
    equipeForm.addEventListener('submit', saveEquipeMembro);

    // Listeners do modal de EDITAR equipe
    if (equipeEditModal) {
        equipeEditForm.addEventListener('submit', saveEquipeEdit);
        document.getElementById('equipe-edit-modal-close').addEventListener('click', closeEquipeEditModal);
        document.getElementById('equipe-edit-modal-cancel').addEventListener('click', closeEquipeEditModal);
        document.getElementById('equipe-edit-modal-delete').addEventListener('click', deleteEquipeMembro);
        
        // Listener para o botão de alterar foto
        document.getElementById('btn-change-equipe-img').addEventListener('click', () => {
            document.getElementById('equipe-edit-foto-input').click();
        });
        
        // Listener para o preview da foto
        document.getElementById('equipe-edit-foto-input').addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (event) => {
                    document.getElementById('equipe-edit-preview').src = event.target.result;
                }
                reader.readAsDataURL(file);
            }
        });
    }

    // Listener para o botão "Editar" na tabela de equipe
    document.getElementById('equipe-lista-tbody').addEventListener('click', function(event) {
        if (event.target.classList.contains('btn-edit-equipe')) {
            const membroId = event.target.dataset.id;
            openEquipeEditModal(membroId);
        }
    });

    // Event listener para os botões "Editar" (usando delegação de evento)
    document.getElementById('servicos-lista-tbody').addEventListener('click', function(event) {
        const target = event.target; // O elemento clicado
        if (target.classList.contains('btn-edit')) {
            const serviceId = target.dataset.id;
            openServicoModal(serviceId);
        }
        
        // --- NOVA ADIÇÃO ---
        // Botão Manutenção
        if (target.classList.contains('btn-manutencao')) {
            const serviceId = target.dataset.id;
            const serviceName = target.dataset.nome;
            openManutencaoModal(serviceId, serviceName);
        }
        // --- FIM DA ADIÇÃO ---
    });

    // Listeners da Aba Categoria
    if (categoriaForm) {
        categoriaForm.addEventListener('submit', saveCategoria);
    }
    document.getElementById('categorias-lista-tbody').addEventListener('click', function(event) {
        if (event.target.classList.contains('btn-edit-categoria')) {
            const id = event.target.dataset.id;
            const nome = event.target.dataset.nome;
            openCategoriaModal(id, nome);
        }
    });
    if (categoriaModal) {
        categoriaEditForm.addEventListener('submit', saveCategoriaEdit);
        document.getElementById('categoria-modal-close').addEventListener('click', closeCategoriaModal);
        document.getElementById('categoria-modal-cancel').addEventListener('click', closeCategoriaModal);
        document.getElementById('categoria-modal-delete').addEventListener('click', deleteCategoria);
    }
    
    // Listeners do Modal de Serviço (para Tiers de Manutenção)
    if (manutencaoForm) {
        manutencaoForm.addEventListener('submit', saveManutencaoTier);
    }
    document.getElementById('manutencao-lista-tbody').addEventListener('click', function(event) {
        if (event.target.classList.contains('btn-delete-manutencao')) {
            deleteManutencaoTier(event.target.dataset.id);
        }
    });
    // --- FIM DOS NOVOS LISTENERS ---

    // --- NOVA ADIÇÃO ---
    // Listeners para fechar o novo modal de manutenção
    if (manutencaoModal) {
        document.getElementById('manutencao-modal-close').addEventListener('click', closeManutencaoModal);
        document.getElementById('manutencao-modal-cancel').addEventListener('click', closeManutencaoModal);
    }
    // --- FIM DA ADIÇÃO ---

    // Listeners para os formulários de Horário (delegação)
    document.getElementById('horarios-semana-container').addEventListener('submit', function(event) {
        if (event.target.classList.contains('form-add-horario')) {
            saveHorario(event);
        }
    });

    // Listeners para os botões de delete de Horário (delegação)
    document.getElementById('horarios-semana-container').addEventListener('click', function(event) {
        if (event.target.classList.contains('btn-delete-horario')) {
            const horarioId = event.target.dataset.id;
            deleteHorario(horarioId);
        }
    });

    if (configForm) {
        configForm.addEventListener('submit', saveConfiguracoes);
    }

    // document.getElementById('btn-add-aviso-proc').addEventListener('click', () => {
    //     addListItem('aviso-proc-input', 'aviso-proc-preview', 'config-aviso-procedimento');
    // });

    // document.getElementById('btn-add-aviso-canc').addEventListener('click', () => {
    //     addListItem('aviso-canc-input', 'aviso-canc-preview', 'config-aviso-cancelamento');
    // });

    // --- ADICIONE ESTES NOVOS LISTENERS PARA O MURAL ---
    document.getElementById('btn-novo-aviso').addEventListener('click', () => openAvisoModal(null));
    document.getElementById('aviso-modal-close').addEventListener('click', closeAvisoModal);
    document.getElementById('aviso-modal-cancel').addEventListener('click', closeAvisoModal);
    document.getElementById('aviso-modal-delete').addEventListener('click', deleteAviso);
    avisoForm.addEventListener('submit', saveAviso);

    // Listener para botões "Editar" na lista de avisos
    document.getElementById('avisos-lista-container').addEventListener('click', function(event) {
        if (event.target.classList.contains('btn-edit-aviso')) {
            const avisoId = event.target.dataset.id;
            openAvisoModal(avisoId);
        }
    });

    document.getElementById('form-add-bloqueio').addEventListener('submit', saveDiaBloqueado);
    
    document.getElementById('lista-dias-bloqueados').addEventListener('click', function(event) {
        if (event.target.classList.contains('btn-delete-bloqueio')) {
            deleteDiaBloqueado(event.target.dataset.id);
        }
    });

    // Ação do botão "Desfazer"
    revertLogoBtn = document.getElementById('btn-revert-logo');
    if (revertLogoBtn) {
        revertLogoBtn.addEventListener('click', () => {
            croppedLogoBlob = null; // 1. Descarta o novo corte
            document.getElementById('logo-preview').src = originalLogoUrl; // 2. Restaura o preview original
            revertLogoBtn.style.display = 'none'; // 3. Esconde o botão "Desfazer"
            logoInput.value = null; // 4. Limpa o input file
            showToast({ message: 'Alteração desfeita.', type: 'info' });
        });
    }
    
    // Lógica das Abas (copiado do financeiro.html)
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const tab = this.dataset.tab;
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.add('hidden'));
            this.classList.add('active');
            document.getElementById(`tab-${tab}`).classList.remove('hidden');
            
            // --- ADICIONE ESTA LINHA ---
            // Carrega os horários quando a aba é clicada
            if (tab === 'horarios') {
                loadHorarios();
                loadDiasBloqueados();
            }
            if (tab === 'configuracoes') { loadConfiguracoes(); }
            if (tab === 'avisos') { loadAvisos(); }
            // --- NOVA ADIÇÃO ---
            if (tab === 'categorias') {
                loadCategorias(); // Carrega a tabela de categorias
            }
            // --- FIM DA ADIÇÃO ---
        });
    });

    // --- Carregamento Inicial ---
    async function init() {
        await loadConfiguracoes();
        await loadEquipe();
        await loadCategorias('servico-categoria'); // Carrega categorias PRIMEIRO
        await loadServicos();
        setupLogoCropper(); // Inicializa a lógica do editor de logo
        setupServiceCropper(); // Inicializa a lógica do editor de SERVIÇO
        if (window.Coloris) {
        Coloris({
            el: '[data-coloris]', // O seletor que ativa o picker
            themeMode: 'light', // Tema claro
            alpha: false, // Não precisa de transparência
            format: 'hex', // Salva como #RRGGBB
            swatches: [ // Paleta de cores sugeridas
                '#0D99FF', // Azul (dashboard)
                '#FF5A5F', // Vermelho (erro)
                '#FF9500', // Laranja (aviso)
                '#38A169', // Verde (sucesso)
                '#5CCFAC', // Verde Menta (padrão)
                '#FFD1DC', // Rosa (padrão)
                '#8E44AD', // Roxo
                '#34495E', // Grafite
            ],
            // Tradução para Português
            clear: 'Limpar',
            select: 'Definir',
            hue: 'Matiz',
            saturation: 'Saturação',
            lightness: 'Luminosidade'
        });
    }
    }
    
    init();
});