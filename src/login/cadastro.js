import { registerUser } from '../../lib/auth.js';

document.addEventListener('DOMContentLoaded', function() {
    const registerForm = document.getElementById('registerForm');
    const errorMessage = document.getElementById('errorMessage');
    const successMessage = document.getElementById('successMessage');

    registerForm.addEventListener('submit', async function(e) {
        e.preventDefault();

        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;
        const confirmPassword = document.getElementById('confirmPassword').value;

        errorMessage.style.display = 'none';
        successMessage.style.display = 'none';
        errorMessage.textContent = '';
        successMessage.textContent = '';

        if (!email || !password || !confirmPassword) {
            showError('Por favor, preencha todos os campos.');
            return;
        }

        if (password !== confirmPassword) {
            showError('As senhas não coincidem.');
            return;
        }

        // Validação de senha forte
        if (password.length < 8) {
            showError('A senha deve ter pelo menos 8 caracteres.');
            return;
        }
        if (!/[A-Z]/.test(password)) {
            showError('A senha deve conter pelo menos uma letra maiúscula.');
            return;
        }
        if (!/[a-z]/.test(password)) {
            showError('A senha deve conter pelo menos uma letra minúscula.');
            return;
        }
        if (!/[0-9]/.test(password)) {
            showError('A senha deve conter pelo menos um número.');
            return;
        }

        const submitButton = registerForm.querySelector('button[type="submit"]');
        submitButton.disabled = true;
        submitButton.textContent = 'Cadastrando...';

        try {
            const result = await registerUser(email, password);

            if (result.success) {
                showSuccess('Conta criada com sucesso! Redirecionando...');
                setTimeout(() => {
                    window.location.href = '../Telainicial/Telainicial.html';
                }, 2000);
            } else {
                let errorMsg = 'Erro ao criar conta. ';

                if (result.error.includes('email-already-in-use')) {
                    errorMsg = 'Este e-mail já está cadastrado.';
                } else if (result.error.includes('invalid-email')) {
                    errorMsg = 'E-mail inválido.';
                } else if (result.error.includes('weak-password')) {
                    errorMsg = 'A senha é muito fraca.';
                } else {
                    errorMsg += result.error;
                }

                showError(errorMsg);
            }
        } catch (error) {
            console.error('Erro no cadastro:', error);
            showError('Erro ao conectar com o servidor. Tente novamente.');
        } finally {
            submitButton.disabled = false;
            submitButton.textContent = 'Cadastrar';
        }
    });

    function showError(message) {
        errorMessage.textContent = message;
        errorMessage.style.display = 'block';
        successMessage.style.display = 'none';
    }

    function showSuccess(message) {
        successMessage.textContent = message;
        successMessage.style.display = 'block';
        errorMessage.style.display = 'none';
    }
});