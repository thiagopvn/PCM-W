import { db } from './firebase.js';
import {
    collection,
    addDoc,
    getDocs,
    doc,
    updateDoc,
    deleteDoc,
    query,
    where,
    orderBy,
    serverTimestamp,
    getDoc,
    setDoc,
    limit,
    onSnapshot
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

const COLLECTIONS = {
    SERVICE_ORDERS: 'serviceOrders',
    USERS: 'users',
    PREVENTIVE_TASKS: 'preventiveTasks',
    SECTORS: 'sectors',
    MAINTAINERS: 'maintainers',
    EQUIPMENTS: 'equipments'
};

export async function createServiceOrder(data) {
    try {
        const docRef = await addDoc(collection(db, COLLECTIONS.SERVICE_ORDERS), {
            ...data,
            status: data.status || 'Aberta',
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        });
        return { success: true, id: docRef.id };
    } catch (error) {
        console.error('Erro ao criar ordem de serviço:', error);
        return { success: false, error: error.message };
    }
}

export async function getServiceOrders(filters = {}) {
    try {
        let q = collection(db, COLLECTIONS.SERVICE_ORDERS);

        const constraints = [];
        if (filters.status) {
            constraints.push(where('status', '==', filters.status));
        }
        if (filters.technician) {
            constraints.push(where('technician', '==', filters.technician));
        }
        if (filters.sector) {
            constraints.push(where('sector', '==', filters.sector));
        }
        if (filters.startDate) {
            constraints.push(where('createdAt', '>=', filters.startDate));
        }
        if (filters.endDate) {
            constraints.push(where('createdAt', '<=', filters.endDate));
        }

        constraints.push(orderBy('createdAt', 'desc'));

        if (constraints.length > 0) {
            q = query(collection(db, COLLECTIONS.SERVICE_ORDERS), ...constraints);
        }

        const querySnapshot = await getDocs(q);
        const orders = [];
        querySnapshot.forEach((doc) => {
            orders.push({ id: doc.id, ...doc.data() });
        });

        return { success: true, data: orders };
    } catch (error) {
        console.error('Erro ao buscar ordens de serviço:', error);
        return { success: false, error: error.message };
    }
}

export async function updateServiceOrder(orderId, updates) {
    try {
        const orderRef = doc(db, COLLECTIONS.SERVICE_ORDERS, orderId);
        await updateDoc(orderRef, {
            ...updates,
            updatedAt: serverTimestamp()
        });
        return { success: true };
    } catch (error) {
        console.error('Erro ao atualizar ordem de serviço:', error);
        return { success: false, error: error.message };
    }
}

export async function getDashboardStats(filters = {}) {
    try {
        const orders = await getServiceOrders(filters);
        if (!orders.success) return orders;

        const stats = {
            abertas: 0,
            pendentes: 0,
            fechadas: 0,
            total: 0,
            averageTimeHours: 0
        };

        let totalTimeMs = 0;
        let closedCount = 0;

        orders.data.forEach(order => {
            stats.total++;
            switch(order.status?.toLowerCase()) {
                case 'aberta':
                    stats.abertas++;
                    break;
                case 'pendente':
                case 'em andamento':
                    stats.pendentes++;
                    break;
                case 'fechada':
                case 'concluída':
                    stats.fechadas++;
                    // Calcular tempo médio para OSs fechadas
                    if (order.createdAt && order.updatedAt) {
                        try {
                            const createdDate = order.createdAt.toDate ? order.createdAt.toDate() : new Date(order.createdAt);
                            const updatedDate = order.updatedAt.toDate ? order.updatedAt.toDate() : new Date(order.updatedAt);
                            if (!isNaN(createdDate.getTime()) && !isNaN(updatedDate.getTime())) {
                                totalTimeMs += (updatedDate - createdDate);
                                closedCount++;
                            }
                        } catch (e) {
                            console.warn('Erro ao calcular tempo:', e);
                        }
                    }
                    break;
            }
        });

        // Calcular tempo médio em horas
        if (closedCount > 0) {
            stats.averageTimeHours = Math.round(totalTimeMs / closedCount / (1000 * 60 * 60));
        }

        return { success: true, data: stats };
    } catch (error) {
        console.error('Erro ao buscar estatísticas:', error);
        return { success: false, error: error.message };
    }
}

export async function getPreventiveTasks() {
    try {
        const q = query(collection(db, COLLECTIONS.PREVENTIVE_TASKS), orderBy('nextDate', 'asc'));
        const querySnapshot = await getDocs(q);
        const tasks = [];
        querySnapshot.forEach((doc) => {
            tasks.push({ id: doc.id, ...doc.data() });
        });

        return { success: true, data: tasks };
    } catch (error) {
        console.error('Erro ao buscar tarefas preventivas:', error);
        return { success: false, error: error.message };
    }
}

export async function createPreventiveTask(data) {
    try {
        const docRef = await addDoc(collection(db, COLLECTIONS.PREVENTIVE_TASKS), {
            ...data,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        });
        return { success: true, id: docRef.id };
    } catch (error) {
        console.error('Erro ao criar tarefa preventiva:', error);
        return { success: false, error: error.message };
    }
}

export async function updatePreventiveTask(taskId, updates) {
    try {
        const taskRef = doc(db, COLLECTIONS.PREVENTIVE_TASKS, taskId);
        await updateDoc(taskRef, {
            ...updates,
            updatedAt: serverTimestamp()
        });
        return { success: true };
    } catch (error) {
        console.error('Erro ao atualizar tarefa preventiva:', error);
        return { success: false, error: error.message };
    }
}

export async function getTechnicianPerformance(filters = {}) {
    try {
        const orders = await getServiceOrders(filters);
        if (!orders.success) return orders;

        const performance = {};
        orders.data.forEach(order => {
            if (order.technician) {
                if (!performance[order.technician]) {
                    performance[order.technician] = {
                        completed: 0,
                        pending: 0,
                        open: 0
                    };
                }

                switch(order.status?.toLowerCase()) {
                    case 'fechada':
                    case 'concluída':
                        performance[order.technician].completed++;
                        break;
                    case 'pendente':
                    case 'em andamento':
                        performance[order.technician].pending++;
                        break;
                    case 'aberta':
                        performance[order.technician].open++;
                        break;
                }
            }
        });

        return { success: true, data: performance };
    } catch (error) {
        console.error('Erro ao buscar desempenho dos técnicos:', error);
        return { success: false, error: error.message };
    }
}

export async function getGeneralStatus(filters = {}) {
    try {
        const stats = await getDashboardStats(filters);
        if (!stats.success) return stats;

        return {
            success: true,
            data: {
                labels: ['Abertas', 'Pendentes', 'Fechadas'],
                values: [stats.data.abertas, stats.data.pendentes, stats.data.fechadas]
            }
        };
    } catch (error) {
        console.error('Erro ao buscar status geral:', error);
        return { success: false, error: error.message };
    }
}

export async function getFrequentServices(filters = {}) {
    try {
        const orders = await getServiceOrders(filters);
        if (!orders.success) return orders;

        const services = {};
        orders.data.forEach(order => {
            if (order.serviceType) {
                services[order.serviceType] = (services[order.serviceType] || 0) + 1;
            }
        });

        const sortedServices = Object.entries(services)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5);

        return {
            success: true,
            data: {
                labels: sortedServices.map(s => s[0]),
                values: sortedServices.map(s => s[1])
            }
        };
    } catch (error) {
        console.error('Erro ao buscar serviços frequentes:', error);
        return { success: false, error: error.message };
    }
}

export async function getSectors() {
    try {
        const querySnapshot = await getDocs(collection(db, COLLECTIONS.SECTORS));
        const sectors = [];
        querySnapshot.forEach((doc) => {
            sectors.push({ id: doc.id, ...doc.data() });
        });

        if (sectors.length === 0) {
            const defaultSectors = [
                'Produção',
                'Manutenção',
                'Qualidade',
                'Administrativo',
                'Logística',
                'TI',
                'Segurança'
            ];

            for (const sectorName of defaultSectors) {
                await addDoc(collection(db, COLLECTIONS.SECTORS), {
                    name: sectorName,
                    active: true
                });
            }

            return await getSectors();
        }

        return { success: true, data: sectors };
    } catch (error) {
        console.error('Erro ao buscar setores:', error);
        return { success: false, error: error.message };
    }
}

export async function getMaintainers() {
    try {
        const querySnapshot = await getDocs(collection(db, COLLECTIONS.MAINTAINERS));
        const maintainers = [];
        querySnapshot.forEach((doc) => {
            maintainers.push({ id: doc.id, ...doc.data() });
        });

        if (maintainers.length === 0) {
            const defaultMaintainers = [
                'João Silva',
                'Maria Santos',
                'Pedro Oliveira',
                'Ana Costa',
                'Carlos Ferreira'
            ];

            for (const name of defaultMaintainers) {
                await addDoc(collection(db, COLLECTIONS.MAINTAINERS), {
                    name: name,
                    active: true
                });
            }

            return await getMaintainers();
        }

        return { success: true, data: maintainers };
    } catch (error) {
        console.error('Erro ao buscar manutentores:', error);
        return { success: false, error: error.message };
    }
}

// Função para buscar equipamentos
export async function getEquipments(filters = {}) {
    try {
        let q;

        if (filters.status || filters.sector) {
            const constraints = [];

            if (filters.status) {
                constraints.push(where('status', '==', filters.status));
            }
            if (filters.sector) {
                constraints.push(where('sector', '==', filters.sector));
            }

            q = query(collection(db, COLLECTIONS.EQUIPMENTS), ...constraints);
        } else {
            q = collection(db, COLLECTIONS.EQUIPMENTS);
        }

        const querySnapshot = await getDocs(q);
        const equipments = [];
        querySnapshot.forEach((doc) => {
            equipments.push({ id: doc.id, ...doc.data() });
        });

        // Ordenar no cliente se necessário
        equipments.sort((a, b) => (a.name || '').localeCompare(b.name || ''));

        return { success: true, data: equipments };
    } catch (error) {
        console.error('Erro ao buscar equipamentos:', error);
        return { success: false, error: error.message };
    }
}

export function subscribeToServiceOrders(callback) {
    const q = query(collection(db, COLLECTIONS.SERVICE_ORDERS), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (querySnapshot) => {
        const orders = [];
        querySnapshot.forEach((doc) => {
            orders.push({ id: doc.id, ...doc.data() });
        });
        callback(orders);
    });
}

export async function getMonthlyTrend(filters = {}) {
    try {
        const orders = await getServiceOrders(filters);
        if (!orders.success) return orders;

        // Agrupa ordens por mês
        const monthlyData = {};

        orders.data.forEach(order => {
            if (order.createdAt) {
                let date;
                try {
                    date = order.createdAt.toDate ? order.createdAt.toDate() : new Date(order.createdAt);
                    // Validar se data é válida
                    if (isNaN(date.getTime())) {
                        console.warn('Data inválida encontrada:', order.createdAt);
                        return;
                    }
                } catch (e) {
                    console.warn('Erro ao converter data:', order.createdAt, e);
                    return;
                }
                const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                monthlyData[monthKey] = (monthlyData[monthKey] || 0) + 1;
            }
        });

        // Pega os últimos 6 meses
        const now = new Date();
        const last6Months = [];
        const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

        for (let i = 5; i >= 0; i--) {
            const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            last6Months.push({
                label: monthNames[date.getMonth()],
                count: monthlyData[monthKey] || 0
            });
        }

        return {
            success: true,
            data: {
                labels: last6Months.map(m => m.label),
                values: last6Months.map(m => m.count)
            }
        };
    } catch (error) {
        console.error('Erro ao buscar tendência mensal:', error);
        return { success: false, error: error.message };
    }
}