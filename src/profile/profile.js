import { requireAuthAsync, logoutUser, getCurrentUser } from '../../lib/auth.js';
import { db, auth } from '../../lib/firebase.js';
import {
    collection,
    doc,
    updateDoc,
    getDoc,
    setDoc,
    query,
    where,
    getDocs,
    orderBy,
    limit
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import {
    updatePassword,
    reauthenticateWithCredential,
    EmailAuthProvider
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';

let currentUser = null;
let userProfile = null;

document.addEventListener('DOMContentLoaded', async function() {
    if (!(await requireAuthAsync())) {
        return;
    }

    currentUser = getCurrentUser();
    initializeEventListeners();
    await loadUserProfile();
    await loadUserStats();
    await loadRecentActivity();
});

function initializeEventListeners() {
    document.getElementById('logoutBtn').addEventListener('click', handleLogout);

    // Tab navigation
    document.querySelectorAll('.tab-button').forEach(button => {
        button.addEventListener('click', () => switchTab(button.dataset.tab));
    });

    // Form handlers
    document.getElementById('personalForm').addEventListener('submit', handlePersonalFormSubmit);
    document.getElementById('passwordForm').addEventListener('submit', handlePasswordFormSubmit);

    // Password validation
    document.getElementById('newPassword').addEventListener('input', validatePassword);
    document.getElementById('confirmPassword').addEventListener('input', validatePasswordConfirm);
}

async function handleLogout() {
    const success = await logoutUser();
    if (success) {
        window.location.href = '../../index.html';
    }
}

function switchTab(tabName) {
    // Update tab buttons
    document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

    // Update tab content
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    document.getElementById(`${tabName}-tab`).classList.add('active');
}

async function loadUserProfile() {
    try {
        if (!currentUser) return;

        // Update header with user info
        document.getElementById('profileEmail').textContent = currentUser.email;

        // Try to load user profile from Firestore
        const userDoc = await getDoc(doc(db, 'users', currentUser.uid));

        if (userDoc.exists()) {
            userProfile = userDoc.data();
        } else {
            // Create default profile
            userProfile = {
                firstName: '',
                lastName: '',
                email: currentUser.email,
                phone: '',
                department: '',
                position: '',
                employee_id: '',
                createdAt: new Date()
            };
            await setDoc(doc(db, 'users', currentUser.uid), userProfile);
        }

        // Populate form fields
        document.getElementById('firstName').value = userProfile.firstName || '';
        document.getElementById('lastName').value = userProfile.lastName || '';
        document.getElementById('phone').value = userProfile.phone || '';
        document.getElementById('department').value = userProfile.department || '';
        document.getElementById('position').value = userProfile.position || '';
        document.getElementById('employee_id').value = userProfile.employee_id || '';

        // Update profile name
        const displayName = `${userProfile.firstName || ''} ${userProfile.lastName || ''}`.trim() || 'Usuário';
        document.getElementById('profileName').textContent = displayName;

    } catch (error) {
        console.error('Erro ao carregar perfil:', error);
        showMessage('Erro ao carregar perfil do usuário', 'error');
    }
}

async function handlePersonalFormSubmit(event) {
    event.preventDefault();

    const submitBtn = event.target.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Salvando...';

    try {
        const updatedProfile = {
            ...userProfile,
            firstName: document.getElementById('firstName').value,
            lastName: document.getElementById('lastName').value,
            phone: document.getElementById('phone').value,
            department: document.getElementById('department').value,
            position: document.getElementById('position').value,
            employee_id: document.getElementById('employee_id').value,
            updatedAt: new Date()
        };

        await updateDoc(doc(db, 'users', currentUser.uid), updatedProfile);
        userProfile = updatedProfile;

        // Update profile name in header
        const displayName = `${updatedProfile.firstName || ''} ${updatedProfile.lastName || ''}`.trim() || 'Usuário';
        document.getElementById('profileName').textContent = displayName;

        showMessage('Perfil atualizado com sucesso!', 'success');

    } catch (error) {
        console.error('Erro ao atualizar perfil:', error);
        showMessage('Erro ao atualizar perfil', 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fas fa-save"></i> Salvar Alterações';
    }
}


async function handlePasswordFormSubmit(event) {
    event.preventDefault();

    const currentPassword = document.getElementById('currentPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;

    if (newPassword !== confirmPassword) {
        showMessage('As senhas não coincidem', 'error');
        return;
    }

    if (!isPasswordValid(newPassword)) {
        showMessage('A nova senha não atende aos requisitos', 'error');
        return;
    }

    const submitBtn = event.target.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Alterando...';

    try {
        // Re-authenticate user
        const credential = EmailAuthProvider.credential(currentUser.email, currentPassword);
        await reauthenticateWithCredential(currentUser, credential);

        // Update password
        await updatePassword(currentUser, newPassword);

        // Clear form
        document.getElementById('passwordForm').reset();
        resetPasswordRequirements();

        showMessage('Senha alterada com sucesso!', 'success');

    } catch (error) {
        console.error('Erro ao alterar senha:', error);
        if (error.code === 'auth/wrong-password') {
            showMessage('Senha atual incorreta', 'error');
        } else {
            showMessage('Erro ao alterar senha', 'error');
        }
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fas fa-shield-alt"></i> Alterar Senha';
    }
}

function validatePassword() {
    const password = document.getElementById('newPassword').value;

    // Length check
    const lengthValid = password.length >= 8;
    updateRequirement('req-length', lengthValid);

    // Uppercase check
    const upperValid = /[A-Z]/.test(password);
    updateRequirement('req-upper', upperValid);

    // Lowercase check
    const lowerValid = /[a-z]/.test(password);
    updateRequirement('req-lower', lowerValid);

    // Number check
    const numberValid = /[0-9]/.test(password);
    updateRequirement('req-number', numberValid);

    return lengthValid && upperValid && lowerValid && numberValid;
}

function validatePasswordConfirm() {
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;

    if (confirmPassword && newPassword !== confirmPassword) {
        document.getElementById('confirmPassword').style.borderColor = '#dc3545';
    } else {
        document.getElementById('confirmPassword').style.borderColor = '';
    }
}

function updateRequirement(id, isValid) {
    const element = document.getElementById(id);
    if (isValid) {
        element.classList.remove('invalid');
        element.classList.add('valid');
        element.querySelector('i').className = 'fas fa-check';
    } else {
        element.classList.remove('valid');
        element.classList.add('invalid');
        element.querySelector('i').className = 'fas fa-times';
    }
}

function resetPasswordRequirements() {
    ['req-length', 'req-upper', 'req-lower', 'req-number'].forEach(id => {
        updateRequirement(id, false);
    });
}

function isPasswordValid(password) {
    return password.length >= 8 &&
           /[A-Z]/.test(password) &&
           /[a-z]/.test(password) &&
           /[0-9]/.test(password);
}

async function loadUserStats() {
    try {
        // Load service orders statistics
        const osQuery = query(
            collection(db, 'serviceOrders'),
            where('createdBy', '==', currentUser.uid)
        );

        const osSnapshot = await getDocs(osQuery);
        let totalOS = 0;
        let completedOS = 0;
        let pendingOS = 0;

        osSnapshot.forEach((doc) => {
            const data = doc.data();
            totalOS++;
            const status = data.status?.toLowerCase();
            if (status === 'concluida' || status === 'concluída' || status === 'fechada') {
                completedOS++;
            } else if (status === 'aberta' || status === 'em andamento' || status === 'pendente') {
                pendingOS++;
            }
        });

        document.getElementById('totalOS').textContent = totalOS;
        document.getElementById('completedOS').textContent = completedOS;
        document.getElementById('pendingOS').textContent = pendingOS;

        // Mock login count for current month
        document.getElementById('loginCount').textContent = Math.floor(Math.random() * 30) + 10;

    } catch (error) {
        console.error('Erro ao carregar estatísticas:', error);
    }
}

async function loadRecentActivity() {
    try {
        const activityQuery = query(
            collection(db, 'serviceOrders'),
            where('createdBy', '==', currentUser.uid),
            orderBy('createdAt', 'desc'),
            limit(5)
        );

        const activitySnapshot = await getDocs(activityQuery);
        const activities = [];

        activitySnapshot.forEach((doc) => {
            const data = doc.data();
            activities.push({
                id: doc.id,
                title: `O.S. ${data.orderNumber} - ${data.description}`,
                date: data.createdAt?.toDate() || new Date(),
                icon: 'fas fa-clipboard-list'
            });
        });

        const activityContainer = document.getElementById('recentActivity');

        if (activities.length === 0) {
            activityContainer.innerHTML = '<p style="text-align: center; color: #666;">Nenhuma atividade recente</p>';
            return;
        }

        activityContainer.innerHTML = activities.map(activity => `
            <div class="activity-item">
                <div class="activity-icon">
                    <i class="${activity.icon}"></i>
                </div>
                <div class="activity-content">
                    <div class="activity-title">${activity.title}</div>
                    <div class="activity-date">${activity.date.toLocaleDateString('pt-BR')} às ${activity.date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</div>
                </div>
            </div>
        `).join('');

    } catch (error) {
        console.error('Erro ao carregar atividades:', error);
        document.getElementById('recentActivity').innerHTML = '<p style="color: #dc3545;">Erro ao carregar atividades</p>';
    }
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