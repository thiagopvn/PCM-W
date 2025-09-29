import { loginUser } from '../../lib/auth.js';

document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('loginForm');
    const errorMessage = document.getElementById('errorMessage');

    loginForm.addEventListener('submit', async function(e) {
        e.preventDefault();

        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;

        errorMessage.style.display = 'none';
        errorMessage.textContent = '';

        if (!email || !password) {
            showError('Por favor, preencha todos os campos.');
            return;
        }

        const submitButton = loginForm.querySelector('button[type="submit"]');
        const buttonText = submitButton.querySelector('.btn-text') || submitButton;

        submitButton.disabled = true;
        submitButton.classList.add('loading');
        buttonText.textContent = 'Entrando...';

        try {
            const result = await loginUser(email, password);

            if (result.success) {
                buttonText.textContent = 'Sucesso!';
                setTimeout(() => {
                    window.location.href = '../Telainicial/Telainicial.html';
                }, 500);
            } else {
                let errorMsg = 'Erro ao fazer login. ';

                if (result.error.includes('user-not-found')) {
                    errorMsg = 'Usuário não encontrado.';
                } else if (result.error.includes('wrong-password')) {
                    errorMsg = 'Senha incorreta.';
                } else if (result.error.includes('invalid-email')) {
                    errorMsg = 'E-mail inválido.';
                } else if (result.error.includes('too-many-requests')) {
                    errorMsg = 'Muitas tentativas. Tente novamente mais tarde.';
                } else {
                    errorMsg += result.error;
                }

                showError(errorMsg);
            }
        } catch (error) {
            console.error('Erro no login:', error);
            showError('Erro ao conectar com o servidor. Tente novamente.');
        } finally {
            submitButton.disabled = false;
            submitButton.classList.remove('loading');
            buttonText.textContent = 'Entrar';
        }
    });

    function showError(message) {
        errorMessage.textContent = message;
        errorMessage.style.display = 'block';
    }
});