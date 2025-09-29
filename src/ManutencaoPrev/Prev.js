import { requireAuthAsync, logoutUser } from '../../lib/auth.js';
import { getPreventiveTasks, createPreventiveTask, getEquipments, updatePreventiveTask } from '../../lib/firestore.js?v=2';
import { showToast, showConfirm } from '../components/toast.js';

let allTasks = [];
let filteredTasks = [];

document.addEventListener('DOMContentLoaded', async function() {
    if (!(await requireAuthAsync())) {
        return;
    }

    await loadPreventiveTasks();
    await loadEquipmentsToModal();
    setupEventListeners();

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

function setupEventListeners() {
    const addTaskBtn = document.getElementById('addTaskBtn');
    const modal = document.getElementById('taskModal');
    const closeModal = document.getElementById('closeModal');
    const taskForm = document.getElementById('taskForm');

    addTaskBtn.addEventListener('click', function() {
        modal.style.display = 'block';
        setTodayDate();
    });

    closeModal.addEventListener('click', function() {
        modal.style.display = 'none';
    });

    window.addEventListener('click', function(event) {
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    });

    taskForm.addEventListener('submit', handleTaskSubmit);

    document.getElementById('statusFilter').addEventListener('change', applyFilters);
    document.getElementById('equipmentFilter').addEventListener('change', applyFilters);
    document.getElementById('clearFilters').addEventListener('click', clearFilters);
}

function setTodayDate() {
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('nextDate').value = today;
}

async function loadEquipmentsToModal() {
    const equipmentSelect = document.getElementById('equipment');

    try {
        const result = await getEquipments({ status: 'active' });

        if (result.success) {
            result.data.forEach(equipment => {
                const option = document.createElement('option');
                option.value = equipment.name;
                option.textContent = `${equipment.name} - ${equipment.model || 'S/N'} (${equipment.location})`;
                equipmentSelect.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Erro ao carregar equipamentos:', error);
    }
}

async function loadPreventiveTasks() {
    const preventiveList = document.getElementById('preventiveList');

    try {
        const result = await getPreventiveTasks();

        if (result.success) {
            allTasks = result.data;
            filteredTasks = allTasks;

            updateEquipmentFilter();
            renderTasks();
        } else {
            console.error('Erro ao carregar tarefas:', result.error);
            preventiveList.innerHTML = '<p class="text-danger">Erro ao carregar tarefas preventivas.</p>';
        }
    } catch (error) {
        console.error('Erro ao carregar tarefas:', error);
        preventiveList.innerHTML = '<p class="text-danger">Erro ao conectar com o servidor.</p>';
    }
}

async function updateEquipmentFilter() {
    const equipmentFilter = document.getElementById('equipmentFilter');

    try {
        const result = await getEquipments({ status: 'active' });

        equipmentFilter.innerHTML = '<option value="">Todos os Equipamentos</option>';

        if (result.success) {
            result.data.forEach(equipment => {
                const option = document.createElement('option');
                option.value = equipment.name;
                option.textContent = equipment.name;
                equipmentFilter.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Erro ao carregar equipamentos para filtro:', error);
        // Fallback para usar equipamentos das tarefas existentes
        const equipments = new Set();
        allTasks.forEach(task => {
            if (task.equipment) {
                equipments.add(task.equipment);
            }
        });

        equipmentFilter.innerHTML = '<option value="">Todos os Equipamentos</option>';
        Array.from(equipments).sort().forEach(equipment => {
            const option = document.createElement('option');
            option.value = equipment;
            option.textContent = equipment;
            equipmentFilter.appendChild(option);
        });
    }
}

function applyFilters() {
    const statusFilter = document.getElementById('statusFilter').value;
    const equipmentFilter = document.getElementById('equipmentFilter').value;

    filteredTasks = allTasks.filter(task => {
        let matches = true;

        if (statusFilter) {
            const taskStatus = getTaskStatus(task);
            matches = matches && taskStatus === statusFilter;
        }

        if (equipmentFilter) {
            matches = matches && task.equipment === equipmentFilter;
        }

        return matches;
    });

    renderTasks();
}

function clearFilters() {
    document.getElementById('statusFilter').value = '';
    document.getElementById('equipmentFilter').value = '';

    filteredTasks = allTasks;
    renderTasks();
}

function renderTasks() {
    const preventiveList = document.getElementById('preventiveList');

    if (filteredTasks.length === 0) {
        preventiveList.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">
                    <i class="fas fa-tools"></i>
                </div>
                <div class="empty-state-text">Nenhuma tarefa preventiva encontrada</div>
                <button class="btn" onclick="document.getElementById('addTaskBtn').click()">
                    Criar Nova Tarefa
                </button>
            </div>
        `;
    } else {
        preventiveList.innerHTML = '';

        filteredTasks.forEach(task => {
            const taskEl = createTaskElement(task);
            preventiveList.appendChild(taskEl);
        });
    }
}

function createTaskElement(task) {
    const taskDiv = document.createElement('div');
    const status = getTaskStatus(task);
    const statusClass = status === 'vencida' ? 'vencida' :
                        status === 'proxima' ? 'proxima' :
                        status === 'concluida' ? 'concluida' : '';

    taskDiv.className = `task-item ${statusClass}`;

    const nextDate = task.nextDate ?
        new Date(task.nextDate).toLocaleDateString('pt-BR') :
        'Data não definida';

    let badgeClass = 'badge-info';
    let badgeText = 'Pendente';

    if (status === 'vencida') {
        badgeClass = 'badge-danger';
        badgeText = 'Vencida';
    } else if (status === 'proxima') {
        badgeClass = 'badge-warning';
        badgeText = 'Próxima';
    } else if (status === 'concluida') {
        badgeClass = 'badge-success';
        badgeText = 'Concluída';
    }

    const frequencyText = {
        'daily': 'Diária',
        'weekly': 'Semanal',
        'monthly': 'Mensal',
        'quarterly': 'Trimestral',
        'semiannual': 'Semestral',
        'annual': 'Anual'
    }[task.frequency] || task.frequency || 'Não definida';

    taskDiv.innerHTML = `
        <div class="task-header">
            <span class="task-title">${task.name || 'Tarefa sem nome'}</span>
            <span class="badge ${badgeClass}">${badgeText}</span>
        </div>
        <div class="task-details">
            <div class="task-detail-item">
                <i class="fas fa-cog"></i> <strong>Equipamento:</strong> ${task.equipment || 'Não especificado'}
            </div>
            <div class="task-detail-item">
                <i class="fas fa-clock"></i> <strong>Frequência:</strong> ${frequencyText}
            </div>
            <div class="task-detail-item">
                <i class="fas fa-calendar"></i> <strong>Próxima Data:</strong> ${nextDate}
            </div>
            ${task.description ? `
                <div class="task-detail-item">
                    <i class="fas fa-info-circle"></i> <strong>Descrição:</strong> ${task.description}
                </div>
            ` : ''}
        </div>
        <div class="task-actions">
            ${status !== 'concluida' ? `
                <button class="btn btn-sm btn-success" onclick="markAsCompleted('${task.id}')">
                    <i class="fas fa-check"></i> Concluir
                </button>
            ` : ''}
            <button class="btn btn-sm btn-secondary" onclick="createOSFromTask('${task.id}')">
                <i class="fas fa-clipboard"></i> Gerar O.S.
            </button>
        </div>
    `;

    return taskDiv;
}

function getTaskStatus(task) {
    if (!task.nextDate) return 'pendente';

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const nextDate = new Date(task.nextDate);
    nextDate.setHours(0, 0, 0, 0);

    const diffTime = nextDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (task.status === 'concluida') return 'concluida';
    if (diffDays < 0) return 'vencida';
    if (diffDays <= 7) return 'proxima';
    return 'pendente';
}

async function handleTaskSubmit(e) {
    e.preventDefault();

    const taskData = {
        name: document.getElementById('taskName').value.trim(),
        equipment: document.getElementById('equipment').value.trim(),
        frequency: document.getElementById('frequency').value,
        nextDate: document.getElementById('nextDate').value,
        description: document.getElementById('description').value.trim(),
        status: 'pendente'
    };

    const submitButton = e.target.querySelector('button[type="submit"]');
    submitButton.disabled = true;
    submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Salvando...';

    try {
        const result = await createPreventiveTask(taskData);

        if (result.success) {
            document.getElementById('taskModal').style.display = 'none';
            e.target.reset();
            await loadPreventiveTasks();
            showToast('Tarefa preventiva criada com sucesso!', 'success');
        } else {
            showToast('Erro ao criar tarefa: ' + result.error, 'error');
        }
    } catch (error) {
        console.error('Erro ao criar tarefa:', error);
        showToast('Erro ao conectar com o servidor. Tente novamente.', 'error');
    } finally {
        submitButton.disabled = false;
        submitButton.innerHTML = '<i class="fas fa-save"></i> Salvar';
    }
}

window.markAsCompleted = async function(taskId) {
    const task = allTasks.find(t => t.id === taskId);
    if (!task) {
        showToast('Tarefa não encontrada', 'error');
        return;
    }

    showConfirm('Deseja marcar esta tarefa como concluída?', async () => {
        try {
            // Validar frequência
            if (!task.frequency) {
                showToast('Tarefa sem frequência definida', 'warning');
                return;
            }

            // Calcular próxima data baseada na frequência
            const nextDate = calculateNextDate(task.nextDate, task.frequency);

            const result = await updatePreventiveTask(taskId, {
                status: 'concluida',
                completedAt: new Date(),
                lastCompletedDate: task.nextDate,
                nextDate: nextDate
            });

            if (result.success) {
                showToast('Tarefa marcada como concluída! Próxima data agendada.', 'success');
                await loadPreventiveTasks();
            } else {
                showToast('Erro ao atualizar tarefa: ' + result.error, 'error');
            }
        } catch (error) {
            console.error('Erro ao concluir tarefa:', error);
            showToast('Erro ao conectar com o servidor. Tente novamente.', 'error');
        }
    });
};

window.createOSFromTask = function(taskId) {
    const task = allTasks.find(t => t.id === taskId);
    if (!task) {
        alert('Tarefa não encontrada');
        return;
    }

    // Salvar dados da tarefa no sessionStorage para pré-preencher a OS
    sessionStorage.setItem('preventiveTaskData', JSON.stringify({
        equipment: task.equipment,
        serviceType: 'Preventiva',
        description: task.description || task.name,
        taskId: taskId
    }));

    window.location.href = '../OS/NovaOS.html';
};

function calculateNextDate(currentDate, frequency) {
    const date = new Date(currentDate);

    switch (frequency) {
        case 'daily':
            date.setDate(date.getDate() + 1);
            break;
        case 'weekly':
            date.setDate(date.getDate() + 7);
            break;
        case 'monthly':
            date.setMonth(date.getMonth() + 1);
            break;
        case 'quarterly':
            date.setMonth(date.getMonth() + 3);
            break;
        case 'semiannual':
            date.setMonth(date.getMonth() + 6);
            break;
        case 'annual':
            date.setFullYear(date.getFullYear() + 1);
            break;
        default:
            date.setMonth(date.getMonth() + 1);
    }

    return date.toISOString().split('T')[0];
}