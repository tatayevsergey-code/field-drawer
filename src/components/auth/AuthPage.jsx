import { useState, useEffect } from 'react';

import { useAuth } from '../../auth/AuthContext';
import {
    forgotPassword,
    resetPassword,
    confirmEmail,
} from '../../api/auth';

import './Auth.css';

const initialForm = {
    email: '',
    password: '',
    confirmPassword: '',
    fullName: '',
    organization: '',
};

const API_ERROR_RU = {
    'Email already registered': 'Пользователь с таким email уже зарегистрирован',
    'Email already exists': 'Пользователь с таким email уже зарегистрирован',
    'Email and password are required': 'Заполните email и пароль',
    'Invalid credentials': 'Неверный email или пароль',
    'Account is deactivated': 'Учётная запись отключена',
    'Invalid refresh token': 'Сессия истекла. Войдите снова',
    'Invalid or expired reset token': 'Ссылка для сброса пароля недействительна или просрочена',
    'Invalid or expired confirmation token': 'Ссылка подтверждения email недействительна или просрочена',
};

function getErrorMessage(error) {
    const message = error?.message || 'Ошибка запроса';

    if (API_ERROR_RU[message]) {
        return API_ERROR_RU[message];
    }

    if (message.startsWith('Database error')) {
        return 'Ошибка сервера. Попробуйте позже.';
    }

    return message;
}

export default function AuthPage() {
    const { login, register } = useAuth();

    const [mode, setMode] = useState('login');
    const [form, setForm] = useState(initialForm);
    const [error, setError] = useState('');
    const [info, setInfo] = useState('');
    const [loading, setLoading] = useState(false);
    const [resetToken, setResetToken] = useState('');

    // Поддержка ссылок из почты:
    // /?reset_token=...
    // /?confirm_token=...
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);

        const confirmToken = params.get('confirm_token');
        const urlResetToken = params.get('reset_token');

        if (confirmToken) {
            confirmEmail(confirmToken)
                .then(() => {
                    setInfo('Email подтверждён. Теперь можно войти.');
                    setMode('login');
                })
                .catch((err) => {
                    setError(err.message || 'Не удалось подтвердить email');
                })
                .finally(() => {
                    window.history.replaceState({}, '', window.location.pathname);
                });
        }

        if (urlResetToken) {
            setResetToken(urlResetToken);
            setMode('reset');
        }
    }, []);

    const switchMode = (nextMode) => {
        setMode(nextMode);
        setError('');
        setInfo('');
        setForm((prev) => ({
            ...prev,
            password: '',
            confirmPassword: '',
        }));
    };

    const handleChange = (event) => {
        const { name, value } = event.target;

        setForm((prev) => ({
            ...prev,
            [name]: value,
        }));
    };

    const validate = () => {
        if (!form.email.trim()) {
            setError('Введите email');
            return false;
        }

        if (mode === 'login' || mode === 'register' || mode === 'reset') {
            if (!form.password) {
                setError('Введите пароль');
                return false;
            }

            if (form.password.length < 6) {
                setError('Пароль должен быть не короче 6 символов');
                return false;
            }
        }

        if (mode === 'register' || mode === 'reset') {
            if (form.password !== form.confirmPassword) {
                setError('Пароли не совпадают');
                return false;
            }
        }

        if (mode === 'register' && !form.fullName.trim()) {
            setError('Введите ФИО');
            return false;
        }

        return true;
    };

    const handleSubmit = async (event) => {
        event.preventDefault();

        setError('');
        setInfo('');

        if (!validate()) {
            return;
        }

        setLoading(true);

        try {
            if (mode === 'login') {
                await login({
                    email: form.email.trim(),
                    password: form.password,
                });

                // После успешного входа AuthGate сам покажет приложение.
                return;
            }

            if (mode === 'register') {
                console.log('[Register] Отправляем запрос');

                try {
                    const result = await register({
                        email: form.email.trim(),
                        password: form.password,
                        fullName: form.fullName.trim(),
                        organization: form.organization.trim(),
                    });

                    console.log('[Register] Ответ:', result);

                    setInfo(
                        'Регистрация выполнена. Проверьте почту для подтверждения email, затем войдите в систему.'
                    );

                    setMode('login');

                    setForm((prev) => ({
                        ...prev,
                        password: '',
                        confirmPassword: '',
                    }));

                    return;
                } catch (err) {
                    console.error('[Register] Ошибка:', err);
                    throw err; // Пробрасываем дальше в общий catch
                }
            }

            if (mode === 'forgot') {
                await forgotPassword(form.email.trim());

                setInfo(
                    'Если пользователь с таким email существует, ссылка для сброса пароля отправлена на почту.'
                );

                setMode('login');

                return;
            }

            if (mode === 'reset') {
                if (!resetToken) {
                    setError('Не найден токен сброса пароля');
                    return;
                }

                await resetPassword(resetToken, form.password);

                setInfo('Пароль успешно изменён. Войдите с новым паролем.');

                window.history.replaceState({}, '', window.location.pathname);

                setMode('login');

                setForm((prev) => ({
                    ...prev,
                    password: '',
                    confirmPassword: '',
                }));

                setResetToken('');
            }
        } catch (err) {
            // setError(err.message || 'Ошибка запроса');
            setError(getErrorMessage(err));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-page">
            <form className="auth-card" onSubmit={handleSubmit}>
                <div className="auth-logo">🌾 АгроПО-M</div>

                {mode === 'login' && <div className="auth-title">Вход</div>}
                {mode === 'register' && <div className="auth-title">Регистрация</div>}
                {mode === 'forgot' && <div className="auth-title">Восстановление пароля</div>}
                {mode === 'reset' && <div className="auth-title">Новый пароль</div>}

                {error && <div className="auth-error">{error}</div>}
                {info && <div className="auth-info">{info}</div>}

                {(mode === 'login' || mode === 'register' || mode === 'forgot') && (
                    <div className="auth-field">
                        <label>Email</label>
                        <input
                            type="email"
                            name="email"
                            value={form.email}
                            onChange={handleChange}
                            placeholder="user@example.com"
                            autoComplete="email"
                        />
                    </div>
                )}

                {mode === 'register' && (
                    <>
                        <div className="auth-field">
                            <label>ФИО</label>
                            <input
                                type="text"
                                name="fullName"
                                value={form.fullName}
                                onChange={handleChange}
                                placeholder="Иван Иванов"
                                autoComplete="name"
                            />
                        </div>

                        <div className="auth-field">
                            <label>Организация</label>
                            <input
                                type="text"
                                name="organization"
                                value={form.organization}
                                onChange={handleChange}
                                placeholder="ООО Агро"
                                autoComplete="organization"
                            />
                        </div>
                    </>
                )}

                {(mode === 'login' || mode === 'register' || mode === 'reset') && (
                    <div className="auth-field">
                        <label>Пароль</label>
                        <input
                            type="password"
                            name="password"
                            value={form.password}
                            onChange={handleChange}
                            placeholder="••••••••"
                            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                        />
                    </div>
                )}

                {(mode === 'register' || mode === 'reset') && (
                    <div className="auth-field">
                        <label>Подтверждение пароля</label>
                        <input
                            type="password"
                            name="confirmPassword"
                            value={form.confirmPassword}
                            onChange={handleChange}
                            placeholder="••••••••"
                            autoComplete="new-password"
                        />
                    </div>
                )}

                <div className="auth-actions">
                    <button
                        type="submit"
                        className="auth-primary"
                        disabled={loading}
                    >
                        {loading ? 'Выполняется...' : 'Отправить'}
                    </button>
                </div>

                <div className="auth-switch">
                    {mode === 'login' && (
                        <>
                            <button type="button" onClick={() => switchMode('register')}>
                                Создать аккаунт
                            </button>
                            <span> · </span>
                            <button type="button" onClick={() => switchMode('forgot')}>
                                Забыли пароль?
                            </button>
                        </>
                    )}

                    {mode === 'register' && (
                        <button type="button" onClick={() => switchMode('login')}>
                            Уже есть аккаунт? Войти
                        </button>
                    )}

                    {mode === 'forgot' && (
                        <button type="button" onClick={() => switchMode('login')}>
                            Вернуться ко входу
                        </button>
                    )}

                    {mode === 'reset' && (
                        <button type="button" onClick={() => switchMode('login')}>
                            Вернуться ко входу
                        </button>
                    )}
                </div>
            </form>
        </div>
    );
}