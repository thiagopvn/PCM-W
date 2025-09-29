// Sistema de notificações Toast
export function showToast(message, type = 'info', duration = 3000) {
    // Criar container se não existir
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        container.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 10000;
            display: flex;
            flex-direction: column;
            gap: 10px;
            max-width: 400px;
        `;
        document.body.appendChild(container);
    }

    // Criar toast
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    const icons = {
        success: 'fa-check-circle',
        error: 'fa-exclamation-circle',
        warning: 'fa-exclamation-triangle',
        info: 'fa-info-circle'
    };

    const colors = {
        success: '#28a745',
        error: '#dc3545',
        warning: '#ffc107',
        info: '#17a2b8'
    };

    toast.style.cssText = `
        background: white;
        border-left: 4px solid ${colors[type]};
        border-radius: 8px;
        padding: 16px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        display: flex;
        align-items: center;
        gap: 12px;
        animation: slideIn 0.3s ease;
        min-width: 300px;
        max-width: 100%;
    `;

    toast.innerHTML = `
        <i class="fas ${icons[type]}" style="color: ${colors[type]}; font-size: 20px;"></i>
        <span style="flex: 1; color: #333; font-size: 14px;">${message}</span>
        <button onclick="this.parentElement.remove()" style="background: none; border: none; cursor: pointer; color: #999; font-size: 18px; padding: 0; line-height: 1;">×</button>
    `;

    container.appendChild(toast);

    // Auto-remover
    if (duration > 0) {
        setTimeout(() => {
            toast.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => toast.remove(), 300);
        }, duration);
    }

    return toast;
}

export function showConfirm(message, onConfirm, onCancel = null) {
    // Criar overlay
    const overlay = document.createElement('div');
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0,0,0,0.5);
        z-index: 9999;
        display: flex;
        align-items: center;
        justify-content: center;
        animation: fadeIn 0.2s ease;
    `;

    const modal = document.createElement('div');
    modal.style.cssText = `
        background: white;
        border-radius: 12px;
        padding: 24px;
        max-width: 400px;
        width: 90%;
        box-shadow: 0 8px 32px rgba(0,0,0,0.2);
        animation: scaleIn 0.2s ease;
    `;

    modal.innerHTML = `
        <div style="margin-bottom: 20px;">
            <i class="fas fa-question-circle" style="color: #ffc107; font-size: 32px; margin-bottom: 16px;"></i>
            <p style="margin: 0; color: #333; font-size: 16px; line-height: 1.5;">${message}</p>
        </div>
        <div style="display: flex; gap: 10px; justify-content: flex-end;">
            <button id="confirmCancel" class="btn btn-secondary" style="min-width: 100px;">Cancelar</button>
            <button id="confirmOk" class="btn" style="min-width: 100px;">Confirmar</button>
        </div>
    `;

    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    const close = () => {
        overlay.style.animation = 'fadeOut 0.2s ease';
        setTimeout(() => overlay.remove(), 200);
    };

    modal.querySelector('#confirmOk').onclick = () => {
        close();
        if (onConfirm) onConfirm();
    };

    modal.querySelector('#confirmCancel').onclick = () => {
        close();
        if (onCancel) onCancel();
    };

    overlay.onclick = (e) => {
        if (e.target === overlay) {
            close();
            if (onCancel) onCancel();
        }
    };
}

// Adicionar estilos de animação
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(400px);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }

    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(400px);
            opacity: 0;
        }
    }

    @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
    }

    @keyframes fadeOut {
        from { opacity: 1; }
        to { opacity: 0; }
    }

    @keyframes scaleIn {
        from {
            transform: scale(0.9);
            opacity: 0;
        }
        to {
            transform: scale(1);
            opacity: 1;
        }
    }
`;
document.head.appendChild(style);