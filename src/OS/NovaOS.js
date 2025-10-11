import { requireAuthAsync, logoutUser } from '../../lib/auth.js';
import { createServiceOrder, getSectors, getMaintainers, getEquipments, getServiceOrders } from '../../lib/firestore.js?v=1';

document.addEventListener('DOMContentLoaded', async function() {
    if (!(await requireAuthAsync())) {
        return;
    }

    loadSectors();
    loadMaintainers();
    await loadEquipments();
    setTodayDate();

    // Verificar se há dados de tarefa preventiva para pré-preencher
    checkPreventiveTaskData();

    const osForm = document.getElementById('osForm');
    osForm.addEventListener('submit', handleFormSubmit);

    // Profile button
    const profileBtn = document.getElementById('profileBtn');
    profileBtn.addEventListener('click', function() {
        window.location.href = '../profile/profile.html';
    });

    const logoutBtn = document.getElementById('logoutBtn');
    logoutBtn.addEventListener('click', async function() {
        const result = await logoutUser();
        if (result.success) {
            window.location.href = '../login/login.html';
        }
    });
});

function setTodayDate() {
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('serviceDate').value = today;
}

async function loadSectors() {
    const sectorSelect = document.getElementById('sector');

    try {
        const result = await getSectors();

        if (result.success) {
            result.data.forEach(sector => {
                const option = document.createElement('option');
                option.value = sector.name || sector.id;
                option.textContent = sector.name || sector.id;
                sectorSelect.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Erro ao carregar setores:', error);
    }
}

async function loadMaintainers() {
    const technicianSelect = document.getElementById('technician');

    try {
        const result = await getMaintainers();

        if (result.success) {
            result.data.forEach(maintainer => {
                const option = document.createElement('option');
                option.value = maintainer.name || maintainer.id;
                option.textContent = maintainer.name || maintainer.id;
                technicianSelect.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Erro ao carregar manutentores:', error);
    }
}

async function loadEquipments() {
    const equipmentSelect = document.getElementById('equipment');
    const locationInput = document.getElementById('location');

    try {
        const result = await getEquipments({ status: 'active' });

        if (result.success) {
            result.data.forEach(equipment => {
                const option = document.createElement('option');
                option.value = equipment.name;
                option.textContent = `${equipment.name} - ${equipment.model || 'S/N'} (${equipment.location})`;
                option.dataset.location = equipment.location;
                option.dataset.sector = equipment.sector;
                option.dataset.equipmentId = equipment.id;
                equipmentSelect.appendChild(option);
            });

            // Auto-preencher localização quando equipamento for selecionado
            equipmentSelect.addEventListener('change', function() {
                const selectedOption = this.options[this.selectedIndex];
                if (selectedOption.dataset.location) {
                    locationInput.value = selectedOption.dataset.location;

                    // Auto-selecionar setor se disponível
                    const sectorSelect = document.getElementById('sector');
                    if (selectedOption.dataset.sector) {
                        sectorSelect.value = selectedOption.dataset.sector;
                    }
                }
            });
        }
    } catch (error) {
        console.error('Erro ao carregar equipamentos:', error);
    }
}

async function handleFormSubmit(e) {
    e.preventDefault();

    const equipmentSelect = document.getElementById('equipment');
    const selectedOption = equipmentSelect.options[equipmentSelect.selectedIndex];
    const equipmentId = selectedOption.dataset.equipmentId || '';

    const orderNumber = document.getElementById('orderNumber').value.trim();

    // Validar unicidade do número da OS
    const validationResult = await getServiceOrders();
    if (validationResult.success) {
        const isDuplicate = validationResult.data.some(order => order.orderNumber === orderNumber);
        if (isDuplicate) {
            showMessage('Número de O.S. já existe! Por favor, use um número diferente.', 'danger');
            return;
        }
    }

    const formData = {
        orderNumber: orderNumber,
        serviceDate: document.getElementById('serviceDate').value,
        serviceType: document.getElementById('serviceType').value,
        priority: document.getElementById('priority').value,
        equipment: document.getElementById('equipment').value.trim(),
        equipmentId: equipmentId,
        location: document.getElementById('location').value.trim(),
        sector: document.getElementById('sector').value,
        technician: document.getElementById('technician').value,
        requester: document.getElementById('requester').value.trim(),
        status: document.getElementById('status').value,
        problemDescription: document.getElementById('problemDescription').value.trim(),
        observations: document.getElementById('observations').value.trim()
    };

    const submitButton = e.target.querySelector('button[type="submit"]');
    const buttonText = submitButton.querySelector('.btn-text') || submitButton;

    submitButton.disabled = true;
    submitButton.classList.add('loading');
    buttonText.textContent = 'Salvando...';

    try {
        const result = await createServiceOrder(formData);

        if (result.success) {
            submitButton.classList.remove('loading');
            buttonText.innerHTML = '<i class="fas fa-check"></i> Salvo!';
            showMessage('Ordem de serviço criada com sucesso!', 'success');

            e.target.reset();
            setTodayDate();

            setTimeout(() => {
                window.location.href = '../OS/GerenciarOS.html';
            }, 2000);
        } else {
            showMessage('Erro ao criar ordem de serviço: ' + result.error, 'error');
        }
    } catch (error) {
        console.error('Erro ao criar ordem:', error);
        showMessage('Erro ao conectar com o servidor. Tente novamente.', 'error');
    } finally {
        submitButton.disabled = false;
        submitButton.classList.remove('loading');
        buttonText.innerHTML = '<i class="fas fa-save"></i> Salvar O.S.';
    }
}

function showMessage(message, type) {
    const messageAlert = document.getElementById('messageAlert');
    messageAlert.textContent = message;
    messageAlert.className = `alert alert-${type}`;
    messageAlert.style.display = 'block';

    setTimeout(() => {
        messageAlert.style.display = 'none';
    }, 5000);
}

function checkPreventiveTaskData() {
    const taskDataStr = sessionStorage.getItem('preventiveTaskData');
    if (taskDataStr) {
        try {
            const taskData = JSON.parse(taskDataStr);

            // Pré-preencher campos
            if (taskData.equipment) {
                document.getElementById('equipment').value = taskData.equipment;
                // Disparar evento change para auto-preencher localização e setor
                document.getElementById('equipment').dispatchEvent(new Event('change'));
            }

            if (taskData.serviceType) {
                document.getElementById('serviceType').value = taskData.serviceType;
            }

            if (taskData.description) {
                document.getElementById('problemDescription').value = `Manutenção Preventiva: ${taskData.description}`;
            }

            // Limpar sessionStorage após uso
            sessionStorage.removeItem('preventiveTaskData');

            showMessage('Campos pré-preenchidos com dados da tarefa preventiva', 'success');
        } catch (error) {
            console.error('Erro ao processar dados da tarefa preventiva:', error);
        }
    }
}