import { requireAuthAsync, logoutUser } from '../../lib/auth.js';
import { getServiceOrders, getMaintainers, updateServiceOrder } from '../../lib/firestore.js';
import { showToast, showConfirm } from '../components/toast.js';

let allOrders = [];
let filteredOrders = [];

document.addEventListener('DOMContentLoaded', async function() {
    if (!(await requireAuthAsync())) {
        return;
    }

    await loadOrders();
    await loadTechniciansFilter();
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
    document.getElementById('searchInput').addEventListener('input', applyFilters);
    document.getElementById('statusFilter').addEventListener('change', () => loadOrders());
    document.getElementById('technicianFilter').addEventListener('change', () => loadOrders());
    document.getElementById('priorityFilter').addEventListener('change', applyFilters);
    document.getElementById('startDateFilter').addEventListener('change', applyFilters);
    document.getElementById('endDateFilter').addEventListener('change', applyFilters);
    document.getElementById('clearFilters').addEventListener('click', clearFilters);

    const modal = document.getElementById('orderModal');
    const closeModal = document.getElementById('closeModal');

    closeModal.addEventListener('click', function() {
        modal.style.display = 'none';
    });

    window.addEventListener('click', function(event) {
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    });
}

async function loadTechniciansFilter() {
    const technicianFilter = document.getElementById('technicianFilter');

    try {
        const result = await getMaintainers();

        if (result.success) {
            result.data.forEach(maintainer => {
                const option = document.createElement('option');
                option.value = maintainer.name || maintainer.id;
                option.textContent = maintainer.name || maintainer.id;
                technicianFilter.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Erro ao carregar técnicos:', error);
    }
}

async function loadOrders() {
    const ordersList = document.getElementById('ordersList');

    try {
        // Aplicar filtros principais no banco de dados
        const filters = {};

        const statusFilter = document.getElementById('statusFilter').value;
        if (statusFilter) {
            filters.status = statusFilter;
        }

        const technicianFilter = document.getElementById('technicianFilter').value;
        if (technicianFilter) {
            filters.technician = technicianFilter;
        }

        const result = await getServiceOrders(filters);

        if (result.success) {
            allOrders = result.data;
            applyFilters(); // Aplica filtros adicionais localmente
        } else {
            console.error('Erro ao carregar ordens:', result.error);
            ordersList.innerHTML = '<p class="text-danger">Erro ao carregar ordens de serviço.</p>';
        }
    } catch (error) {
        console.error('Erro ao carregar ordens:', error);
        ordersList.innerHTML = '<p class="text-danger">Erro ao conectar com o servidor.</p>';
    }
}

function applyFilters() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const statusFilter = document.getElementById('statusFilter').value;
    const technicianFilter = document.getElementById('technicianFilter').value;
    const priorityFilter = document.getElementById('priorityFilter').value;
    const startDate = document.getElementById('startDateFilter').value;
    const endDate = document.getElementById('endDateFilter').value;

    filteredOrders = allOrders.filter(order => {
        let matches = true;

        if (searchTerm) {
            const searchableText = `
                ${order.orderNumber || ''}
                ${order.equipment || ''}
                ${order.technician || ''}
                ${order.requester || ''}
                ${order.sector || ''}
            `.toLowerCase();
            matches = matches && searchableText.includes(searchTerm);
        }

        if (statusFilter) {
            matches = matches && order.status === statusFilter;
        }

        if (technicianFilter) {
            matches = matches && order.technician === technicianFilter;
        }

        if (priorityFilter) {
            matches = matches && order.priority === priorityFilter;
        }

        if (startDate && order.serviceDate) {
            matches = matches && order.serviceDate >= startDate;
        }

        if (endDate && order.serviceDate) {
            matches = matches && order.serviceDate <= endDate;
        }

        return matches;
    });

    renderOrders();
}

async function clearFilters() {
    document.getElementById('searchInput').value = '';
    document.getElementById('statusFilter').value = '';
    document.getElementById('technicianFilter').value = '';
    document.getElementById('priorityFilter').value = '';
    document.getElementById('startDateFilter').value = '';
    document.getElementById('endDateFilter').value = '';

    // Recarregar sem filtros
    await loadOrders();
}

function renderOrders() {
    const ordersList = document.getElementById('ordersList');

    if (filteredOrders.length === 0) {
        ordersList.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">
                    <i class="fas fa-clipboard-list"></i>
                </div>
                <div class="empty-state-text">Nenhuma ordem de serviço encontrada</div>
                <a href="../OS/NovaOS.html" class="btn">Criar Nova O.S.</a>
            </div>
        `;
    } else {
        ordersList.innerHTML = '';

        filteredOrders.forEach(order => {
            const orderEl = createOrderElement(order);
            ordersList.appendChild(orderEl);
        });
    }
}

function createOrderElement(order) {
    const statusClass = `status-${order.status?.toLowerCase().replace(' ', '-') || 'aberta'}`;
    const orderDiv = document.createElement('div');
    orderDiv.className = `list-item ${statusClass}`;
    orderDiv.style.cursor = 'pointer';

    const serviceDate = order.serviceDate || 'Data não disponível';

    let badgeClass = 'badge-info';
    if (order.status === 'Fechada' || order.status === 'Concluída') {
        badgeClass = 'badge-success';
    } else if (order.status === 'Pendente') {
        badgeClass = 'badge-warning';
    } else if (order.status === 'Em Andamento') {
        badgeClass = 'badge-info';
    }

    let priorityBadgeClass = 'badge-secondary';
    if (order.priority === 'Urgente') {
        priorityBadgeClass = 'badge-danger';
    } else if (order.priority === 'Alta') {
        priorityBadgeClass = 'badge-warning';
    } else if (order.priority === 'Média') {
        priorityBadgeClass = 'badge-info';
    }

    orderDiv.innerHTML = `
        <div class="list-item-header">
            <span class="list-item-title">O.S. #${order.orderNumber || order.id.slice(0, 8)}</span>
            <div>
                <span class="badge ${priorityBadgeClass}" style="margin-right: 5px;">${order.priority || 'Normal'}</span>
                <span class="badge ${badgeClass}">${order.status || 'Aberta'}</span>
            </div>
        </div>
        <div class="os-details">
            <div class="os-detail-item">
                <i class="fas fa-wrench"></i> <strong>Tipo:</strong> ${order.serviceType || 'Não especificado'}
            </div>
            <div class="os-detail-item">
                <i class="fas fa-cog"></i> <strong>Equipamento:</strong> ${order.equipment || 'Não especificado'}
            </div>
            <div class="os-detail-item">
                <i class="fas fa-map-marker-alt"></i> <strong>Local:</strong> ${order.location || 'Não especificado'}
            </div>
            <div class="os-detail-item">
                <i class="fas fa-user"></i> <strong>Técnico:</strong> ${order.technician || 'Não atribuído'}
            </div>
            <div class="os-detail-item">
                <i class="fas fa-calendar"></i> <strong>Data:</strong> ${serviceDate}
            </div>
        </div>
    `;

    orderDiv.addEventListener('click', () => showOrderDetails(order));

    return orderDiv;
}

function showOrderDetails(order) {
    const modal = document.getElementById('orderModal');
    const orderDetails = document.getElementById('orderDetails');

    const serviceDate = order.serviceDate || 'Data não disponível';
    const createdDate = order.createdAt ?
        new Date(order.createdAt.seconds * 1000).toLocaleString('pt-BR') :
        'Data não disponível';

    orderDetails.innerHTML = `
        <div class="form-group">
            <strong>Número da O.S.:</strong> ${order.orderNumber || order.id.slice(0, 8)}
        </div>
        <div class="form-group">
            <strong>Status:</strong> ${order.status || 'Aberta'}
        </div>
        <div class="form-group">
            <strong>Prioridade:</strong> ${order.priority || 'Normal'}
        </div>
        <div class="form-group">
            <strong>Tipo de Serviço:</strong> ${order.serviceType || 'Não especificado'}
        </div>
        <div class="form-group">
            <strong>Equipamento:</strong> ${order.equipment || 'Não especificado'}
        </div>
        <div class="form-group">
            <strong>Localização:</strong> ${order.location || 'Não especificado'}
        </div>
        <div class="form-group">
            <strong>Setor:</strong> ${order.sector || 'Não especificado'}
        </div>
        <div class="form-group">
            <strong>Técnico Responsável:</strong> ${order.technician || 'Não atribuído'}
        </div>
        <div class="form-group">
            <strong>Solicitante:</strong> ${order.requester || 'Não informado'}
        </div>
        <div class="form-group">
            <strong>Data do Serviço:</strong> ${serviceDate}
        </div>
        <div class="form-group">
            <strong>Data de Criação:</strong> ${createdDate}
        </div>
        <div class="form-group">
            <strong>Descrição do Problema:</strong>
            <p style="margin-top: 5px;">${order.problemDescription || 'Não informado'}</p>
        </div>
        ${order.observations ? `
            <div class="form-group">
                <strong>Observações:</strong>
                <p style="margin-top: 5px;">${order.observations}</p>
            </div>
        ` : ''}
        <div style="display: flex; gap: 10px; justify-content: flex-end; margin-top: 20px;">
            <button class="btn btn-secondary" onclick="document.getElementById('orderModal').style.display='none'">
                Fechar
            </button>
            ${order.status !== 'Fechada' ? `
                <button class="btn btn-success" onclick="updateOrderStatus('${order.id}', 'Fechada')">
                    <i class="fas fa-check"></i> Concluir O.S.
                </button>
            ` : ''}
        </div>
    `;

    modal.style.display = 'block';
}

window.updateOrderStatus = async function(orderId, newStatus) {
    showConfirm('Deseja realmente alterar o status desta ordem de serviço?', async () => {
        try {
            const result = await updateServiceOrder(orderId, { status: newStatus });

            if (result.success) {
                document.getElementById('orderModal').style.display = 'none';
                await loadOrders();
                showToast('Status atualizado com sucesso!', 'success');
            } else {
                showToast('Erro ao atualizar status: ' + result.error, 'error');
            }
        } catch (error) {
            console.error('Erro ao atualizar status:', error);
            showToast('Erro ao atualizar status. Tente novamente.', 'error');
        }
    });
};