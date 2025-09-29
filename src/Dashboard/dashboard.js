import { requireAuthAsync, logoutUser } from '../../lib/auth.js';
import {
    getDashboardStats,
    getTechnicianPerformance,
    getGeneralStatus,
    getFrequentServices,
    getSectors,
    getMonthlyTrend
} from '../../lib/firestore.js';

let charts = {};

document.addEventListener('DOMContentLoaded', async function() {
    if (!(await requireAuthAsync())) {
        return;
    }

    await loadDashboardData();
    await loadSectorFilter();
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
    document.getElementById('refreshBtn').addEventListener('click', loadDashboardData);
    document.getElementById('periodFilter').addEventListener('change', loadDashboardData);
    document.getElementById('sectorFilter').addEventListener('change', loadDashboardData);
}

async function loadSectorFilter() {
    const sectorFilter = document.getElementById('sectorFilter');

    try {
        const result = await getSectors();

        if (result.success) {
            result.data.forEach(sector => {
                const option = document.createElement('option');
                option.value = sector.name || sector.id;
                option.textContent = sector.name || sector.id;
                sectorFilter.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Erro ao carregar setores:', error);
    }
}

async function loadDashboardData() {
    showLoadingState();

    try {
        // Construir filtros baseados nos valores selecionados
        const filters = buildFilters();

        const [statsResult, technicianResult, statusResult, servicesResult, trendResult] = await Promise.all([
            getDashboardStats(filters),
            getTechnicianPerformance(filters),
            getGeneralStatus(filters),
            getFrequentServices(filters),
            getMonthlyTrend(filters)
        ]);

        updateStatCards(statsResult.data);
        createTechnicianChart(technicianResult.data);
        createStatusChart(statusResult.data);
        createFrequentServicesChart(servicesResult.data);
        createTrendChart(trendResult.data);

    } catch (error) {
        console.error('Erro ao carregar dados do dashboard:', error);
        showErrorState();
    }
}

function buildFilters() {
    const filters = {};

    // Filtro de período
    const periodFilter = document.getElementById('periodFilter').value;
    if (periodFilter && periodFilter !== 'all') {
        const daysAgo = parseInt(periodFilter);
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - daysAgo);
        filters.startDate = startDate;
    }

    // Filtro de setor
    const sectorFilter = document.getElementById('sectorFilter').value;
    if (sectorFilter) {
        filters.sector = sectorFilter;
    }

    return filters;
}

function showLoadingState() {
    document.getElementById('totalOS').textContent = '...';
    document.getElementById('taxaConclusao').textContent = '...';
    document.getElementById('tempoMedio').textContent = '...';
}

function showErrorState() {
    document.getElementById('totalOS').textContent = 'Erro';
    document.getElementById('taxaConclusao').textContent = 'Erro';
    document.getElementById('tempoMedio').textContent = 'Erro';
}

function updateStatCards(stats) {
    if (!stats) return;

    const total = stats.total || 0;
    const fechadas = stats.fechadas || 0;
    const taxaConclusao = total > 0 ? Math.round((fechadas / total) * 100) : 0;
    const tempoMedio = stats.averageTimeHours || 0;

    document.getElementById('totalOS').textContent = total;
    document.getElementById('taxaConclusao').textContent = `${taxaConclusao}%`;
    document.getElementById('tempoMedio').textContent = tempoMedio > 0 ? `${tempoMedio}h` : 'N/A';
}

function createTechnicianChart(data) {
    const ctx = document.getElementById('technicianChart').getContext('2d');

    if (charts.technician) {
        charts.technician.destroy();
    }

    const technicians = Object.keys(data || {});
    const completed = technicians.map(t => data[t].completed || 0);
    const pending = technicians.map(t => data[t].pending || 0);
    const open = technicians.map(t => data[t].open || 0);

    charts.technician = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: technicians.length > 0 ? technicians : ['Sem dados'],
            datasets: [
                {
                    label: 'Concluídas',
                    data: completed.length > 0 ? completed : [0],
                    backgroundColor: '#28a745'
                },
                {
                    label: 'Pendentes',
                    data: pending.length > 0 ? pending : [0],
                    backgroundColor: '#ffc107'
                },
                {
                    label: 'Abertas',
                    data: open.length > 0 ? open : [0],
                    backgroundColor: '#17a2b8'
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        precision: 0
                    }
                }
            },
            plugins: {
                legend: {
                    position: 'top'
                },
                title: {
                    display: false
                }
            }
        }
    });
}

function createStatusChart(data) {
    const ctx = document.getElementById('statusChart').getContext('2d');

    if (charts.status) {
        charts.status.destroy();
    }

    const labels = data?.labels || ['Sem dados'];
    const values = data?.values || [1];

    charts.status = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: labels,
            datasets: [{
                data: values,
                backgroundColor: [
                    '#17a2b8',
                    '#ffc107',
                    '#28a745'
                ]
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom'
                },
                title: {
                    display: false
                }
            }
        }
    });
}

function createFrequentServicesChart(data) {
    const ctx = document.getElementById('frequentServicesChart').getContext('2d');

    if (charts.frequentServices) {
        charts.frequentServices.destroy();
    }

    const labels = data?.labels || ['Sem dados'];
    const values = data?.values || [0];

    charts.frequentServices = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Quantidade',
                data: values,
                backgroundColor: '#007BFF'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        precision: 0
                    }
                }
            },
            plugins: {
                legend: {
                    display: false
                },
                title: {
                    display: false
                }
            }
        }
    });
}

function createTrendChart(data) {
    const ctx = document.getElementById('trendChart').getContext('2d');

    if (charts.trend) {
        charts.trend.destroy();
    }

    const labels = data?.labels || ['Sem dados'];
    const values = data?.values || [0];

    charts.trend = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Ordens de Serviço',
                data: values,
                borderColor: '#007BFF',
                backgroundColor: 'rgba(0, 123, 255, 0.1)',
                tension: 0.4,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        precision: 0
                    }
                }
            },
            plugins: {
                legend: {
                    display: false
                },
                title: {
                    display: false
                }
            }
        }
    });
}

