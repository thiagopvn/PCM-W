import { requireAuthAsync, logoutUser } from '../../lib/auth.js';
import { getDashboardStats, getServiceOrders } from '../../lib/firestore.js';

document.addEventListener('DOMContentLoaded', async function() {
    if (!(await requireAuthAsync())) {
        return;
    }

    loadDashboardStats();
    loadRecentOrders();

    // Profile button
    const profileBtn = document.getElementById('profileBtn');
    profileBtn.addEventListener('click', function() {
        window.location.href = '../profile/profile.html';
    });

    const logoutBtn = document.getElementById('logoutBtn');
    logoutBtn.addEventListener('click', async function() {
        logoutBtn.disabled = true;
        logoutBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saindo...';

        const result = await logoutUser();
        if (result.success) {
            window.location.href = '../login/login.html';
        } else {
            logoutBtn.disabled = false;
            logoutBtn.innerHTML = '<i class="fas fa-sign-out-alt"></i> Sair';
        }
    });
});

async function loadDashboardStats() {
    const osAbertasEl = document.getElementById('osAbertas');
    const osPendentesEl = document.getElementById('osPendentes');
    const osFechadasEl = document.getElementById('osFechadas');

    try {
        const result = await getDashboardStats();

        if (result.success) {
            osAbertasEl.textContent = result.data.abertas;
            osPendentesEl.textContent = result.data.pendentes;
            osFechadasEl.textContent = result.data.fechadas;
        } else {
            console.error('Erro ao carregar estatísticas:', result.error);
        }
    } catch (error) {
        console.error('Erro ao carregar estatísticas:', error);
    }
}

async function loadRecentOrders() {
    const recentOrdersList = document.getElementById('recentOrdersList');

    try {
        const result = await getServiceOrders();

        if (result.success) {
            const orders = result.data.slice(0, 5);

            if (orders.length === 0) {
                recentOrdersList.innerHTML = `
                    <div class="empty-state">
                        <div class="empty-state-icon">
                            <i class="fas fa-clipboard-list"></i>
                        </div>
                        <div class="empty-state-text">Nenhuma ordem de serviço encontrada</div>
                        <a href="../OS/NovaOS.html" class="btn btn-sm">Criar Nova O.S.</a>
                    </div>
                `;
            } else {
                recentOrdersList.innerHTML = '';

                orders.forEach(order => {
                    const orderEl = createOrderElement(order);
                    recentOrdersList.appendChild(orderEl);
                });
            }
        } else {
            console.error('Erro ao carregar ordens:', result.error);
            recentOrdersList.innerHTML = '<p class="text-danger">Erro ao carregar ordens de serviço.</p>';
        }
    } catch (error) {
        console.error('Erro ao carregar ordens:', error);
        recentOrdersList.innerHTML = '<p class="text-danger">Erro ao conectar com o servidor.</p>';
    }
}

function createOrderElement(order) {
    const statusClass = `status-${order.status?.toLowerCase() || 'aberta'}`;
    const orderDiv = document.createElement('div');
    orderDiv.className = `os-item ${statusClass}`;

    const createdDate = order.createdAt ?
        new Date(order.createdAt.seconds * 1000).toLocaleDateString('pt-BR') :
        'Data não disponível';

    let badgeClass = 'badge-info';
    if (order.status === 'Fechada' || order.status === 'Concluída') {
        badgeClass = 'badge-success';
    } else if (order.status === 'Pendente') {
        badgeClass = 'badge-warning';
    }

    orderDiv.innerHTML = `
        <div class="os-header">
            <span class="os-number">O.S. #${order.orderNumber || order.id.slice(0, 8)}</span>
            <span class="badge ${badgeClass}">${order.status || 'Aberta'}</span>
        </div>
        <div class="os-details">
            <div class="os-detail-item">
                <i class="fas fa-briefcase"></i> ${order.serviceType || 'Tipo não especificado'}
            </div>
            <div class="os-detail-item">
                <i class="fas fa-map-marker-alt"></i> ${order.sector || 'Setor não especificado'}
            </div>
            <div class="os-detail-item">
                <i class="fas fa-user"></i> ${order.technician || 'Técnico não atribuído'}
            </div>
            <div class="os-detail-item">
                <i class="fas fa-calendar"></i> ${createdDate}
            </div>
        </div>
    `;

    return orderDiv;
}