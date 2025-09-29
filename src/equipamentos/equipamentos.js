import { requireAuthAsync, logoutUser } from '../../lib/auth.js';
import { db } from '../../lib/firebase.js';
import {
    collection,
    addDoc,
    getDocs,
    doc,
    updateDoc,
    deleteDoc,
    serverTimestamp,
    query,
    where,
    orderBy,
    getDoc
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

let equipments = [];
let currentEquipmentId = null;

document.addEventListener('DOMContentLoaded', async function() {
    if (!(await requireAuthAsync())) {
        return;
    }

    initializeEventListeners();
    await loadEquipments();
});

function initializeEventListeners() {
    document.getElementById('logoutBtn').addEventListener('click', handleLogout);
    document.getElementById('profileBtn').addEventListener('click', () => {
        window.location.href = '../profile/profile.html';
    });

    document.getElementById('addEquipmentBtn').addEventListener('click', openAddModal);
    document.getElementById('equipmentForm').addEventListener('submit', handleSubmit);
    document.getElementById('searchInput').addEventListener('input', handleSearch);

    // Modal controls
    document.querySelector('.close').addEventListener('click', closeModal);

    window.onclick = function(event) {
        if (event.target == document.getElementById('equipmentModal')) {
            closeModal();
        }
        if (event.target == document.getElementById('detailsModal')) {
            closeDetailsModal();
        }
    }
}

async function handleLogout() {
    const result = await logoutUser();
    if (result.success) {
        window.location.href = '../../index.html';
    }
}

async function loadEquipments() {
    try {
        const querySnapshot = await getDocs(collection(db, 'equipments'));
        equipments = [];

        querySnapshot.forEach((doc) => {
            equipments.push({
                id: doc.id,
                ...doc.data()
            });
        });

        displayEquipments(equipments);
    } catch (error) {
        console.error('Erro ao carregar equipamentos:', error);
        showMessage('Erro ao carregar equipamentos', 'error');
    }
}

function displayEquipments(equipmentsList) {
    const grid = document.getElementById('equipmentGrid');

    if (equipmentsList.length === 0) {
        grid.innerHTML = '<p style="text-align: center; color: #666;">Nenhum equipamento cadastrado</p>';
        return;
    }

    grid.innerHTML = equipmentsList.map(equipment => `
        <div class="equipment-card" onclick="showEquipmentDetails('${equipment.id}')">
            <div class="equipment-header">
                <h3 style="margin: 0; font-size: 16px;">${equipment.name}</h3>
                <span class="equipment-status status-${equipment.status}">
                    ${getStatusLabel(equipment.status)}
                </span>
            </div>
            <div class="equipment-info">
                ${equipment.model ? `<p><strong>Modelo:</strong> ${equipment.model}</p>` : ''}
                ${equipment.serial ? `<p><strong>Série:</strong> ${equipment.serial}</p>` : ''}
                <p><strong>Local:</strong> ${equipment.location}</p>
                <p><strong>Setor:</strong> ${equipment.sector}</p>
                ${equipment.nextMaintenance ? `<p><strong>Próx. Manutenção:</strong> ${formatDate(equipment.nextMaintenance)}</p>` : ''}
            </div>
            <div class="equipment-actions">
                <button class="btn btn-sm btn-primary" onclick="editEquipment(event, '${equipment.id}')">
                    <i class="fas fa-edit"></i> Editar
                </button>
                <button class="btn btn-sm btn-danger" onclick="deleteEquipment(event, '${equipment.id}')">
                    <i class="fas fa-trash"></i> Excluir
                </button>
            </div>
        </div>
    `).join('');
}

function getStatusLabel(status) {
    const labels = {
        'active': 'Ativo',
        'maintenance': 'Em Manutenção',
        'inactive': 'Inativo'
    };
    return labels[status] || status;
}

function formatDate(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('pt-BR');
}

function handleSearch(event) {
    const searchTerm = event.target.value.toLowerCase();
    const filtered = equipments.filter(equipment =>
        (equipment.name && equipment.name.toLowerCase().includes(searchTerm)) ||
        (equipment.model && equipment.model.toLowerCase().includes(searchTerm)) ||
        (equipment.location && equipment.location.toLowerCase().includes(searchTerm)) ||
        (equipment.sector && equipment.sector.toLowerCase().includes(searchTerm))
    );
    displayEquipments(filtered);
}

function openAddModal() {
    currentEquipmentId = null;
    document.getElementById('modalTitle').textContent = 'Novo Equipamento';
    document.getElementById('equipmentForm').reset();
    document.getElementById('equipmentModal').style.display = 'block';
}

window.editEquipment = async function(event, id) {
    event.stopPropagation();
    currentEquipmentId = id;

    const equipment = equipments.find(e => e.id === id);
    if (!equipment) return;

    document.getElementById('modalTitle').textContent = 'Editar Equipamento';
    document.getElementById('equipmentName').value = equipment.name;
    document.getElementById('equipmentModel').value = equipment.model || '';
    document.getElementById('equipmentSerial').value = equipment.serial || '';
    document.getElementById('equipmentStatus').value = equipment.status;
    document.getElementById('equipmentLocation').value = equipment.location;
    document.getElementById('equipmentSector').value = equipment.sector;
    document.getElementById('lastMaintenance').value = equipment.lastMaintenance || '';
    document.getElementById('nextMaintenance').value = equipment.nextMaintenance || '';
    document.getElementById('equipmentNotes').value = equipment.notes || '';

    document.getElementById('equipmentModal').style.display = 'block';
}

window.deleteEquipment = async function(event, id) {
    event.stopPropagation();

    if (!confirm('Tem certeza que deseja excluir este equipamento?')) {
        return;
    }

    try {
        await deleteDoc(doc(db, 'equipments', id));
        showMessage('Equipamento excluído com sucesso!', 'success');
        await loadEquipments();
    } catch (error) {
        console.error('Erro ao excluir equipamento:', error);
        showMessage('Erro ao excluir equipamento', 'error');
    }
}

async function handleSubmit(event) {
    event.preventDefault();

    const submitBtn = event.target.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Salvando...';

    const equipmentData = {
        name: document.getElementById('equipmentName').value,
        model: document.getElementById('equipmentModel').value,
        serial: document.getElementById('equipmentSerial').value,
        status: document.getElementById('equipmentStatus').value,
        location: document.getElementById('equipmentLocation').value,
        sector: document.getElementById('equipmentSector').value,
        lastMaintenance: document.getElementById('lastMaintenance').value,
        nextMaintenance: document.getElementById('nextMaintenance').value,
        notes: document.getElementById('equipmentNotes').value,
        updatedAt: serverTimestamp()
    };

    try {
        if (currentEquipmentId) {
            await updateDoc(doc(db, 'equipments', currentEquipmentId), equipmentData);
            showMessage('Equipamento atualizado com sucesso!', 'success');
        } else {
            equipmentData.createdAt = serverTimestamp();
            await addDoc(collection(db, 'equipments'), equipmentData);
            showMessage('Equipamento cadastrado com sucesso!', 'success');
        }

        closeModal();
        await loadEquipments();
    } catch (error) {
        console.error('Erro ao salvar equipamento:', error);
        showMessage('Erro ao salvar equipamento', 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fas fa-save"></i> Salvar';
    }
}

window.showEquipmentDetails = async function(id) {
    const equipment = equipments.find(e => e.id === id);
    if (!equipment) return;

    try {
        // Buscar histórico de manutenções
        const maintenanceQuery = query(
            collection(db, 'serviceOrders'),
            where('equipmentId', '==', id),
            orderBy('createdAt', 'desc')
        );

        const maintenanceSnapshot = await getDocs(maintenanceQuery);
        const maintenanceHistory = [];

        maintenanceSnapshot.forEach((doc) => {
            maintenanceHistory.push({
                id: doc.id,
                ...doc.data()
            });
        });

        const detailsHTML = `
            <div style="display: grid; gap: 15px;">
                <div>
                    <h3 style="margin-bottom: 15px;">${equipment.name}</h3>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                        ${equipment.model ? `<p><strong>Modelo:</strong> ${equipment.model}</p>` : ''}
                        ${equipment.serial ? `<p><strong>Número de Série:</strong> ${equipment.serial}</p>` : ''}
                        <p><strong>Status:</strong> <span class="equipment-status status-${equipment.status}">${getStatusLabel(equipment.status)}</span></p>
                        <p><strong>Localização:</strong> ${equipment.location}</p>
                        <p><strong>Setor:</strong> ${equipment.sector}</p>
                        ${equipment.lastMaintenance ? `<p><strong>Última Manutenção:</strong> ${formatDate(equipment.lastMaintenance)}</p>` : ''}
                        ${equipment.nextMaintenance ? `<p><strong>Próxima Manutenção:</strong> ${formatDate(equipment.nextMaintenance)}</p>` : ''}
                    </div>
                    ${equipment.notes ? `<p style="margin-top: 10px;"><strong>Observações:</strong><br>${equipment.notes}</p>` : ''}
                </div>

                <div>
                    <h4>Histórico de Manutenções</h4>
                    <div class="history-timeline">
                        ${maintenanceHistory.length > 0 ? maintenanceHistory.map(maintenance => `
                            <div class="history-item">
                                <div class="history-date">
                                    ${maintenance.createdAt ? new Date(maintenance.createdAt.toDate()).toLocaleDateString('pt-BR') : 'Data não disponível'}
                                </div>
                                <strong>O.S. #${maintenance.orderNumber || maintenance.id}</strong>
                                <p>${maintenance.description || 'Sem descrição'}</p>
                                <p>Status: ${maintenance.status || 'Não informado'}</p>
                            </div>
                        `).join('') : '<p style="color: #666;">Nenhuma manutenção registrada</p>'}
                    </div>
                </div>
            </div>

            <div style="display: flex; gap: 10px; justify-content: flex-end; margin-top: 20px;">
                <button class="btn btn-secondary" onclick="closeDetailsModal()">Fechar</button>
                <button class="btn btn-primary" onclick="editEquipment(event, '${equipment.id}'); closeDetailsModal();">
                    <i class="fas fa-edit"></i> Editar
                </button>
            </div>
        `;

        document.getElementById('equipmentDetails').innerHTML = detailsHTML;
        document.getElementById('detailsModal').style.display = 'block';

    } catch (error) {
        console.error('Erro ao carregar detalhes:', error);
        showMessage('Erro ao carregar detalhes do equipamento', 'error');
    }
}

window.closeModal = function() {
    document.getElementById('equipmentModal').style.display = 'none';
    document.getElementById('equipmentForm').reset();
    currentEquipmentId = null;
}

window.closeDetailsModal = function() {
    document.getElementById('detailsModal').style.display = 'none';
}

function showMessage(message, type = 'success') {
    const container = document.getElementById('messageContainer');
    const alertClass = type === 'success' ? 'alert-success' : 'alert-danger';

    container.innerHTML = `
        <div class="alert ${alertClass}" style="position: fixed; top: 20px; right: 20px; z-index: 9999;">
            ${message}
        </div>
    `;

    setTimeout(() => {
        container.innerHTML = '';
    }, 3000);
}