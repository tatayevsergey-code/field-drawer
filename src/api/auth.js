import {
    request,
    setSession,
    clearSession,
    getRefreshToken,
    getStoredUser,
} from './client';

/**
 * Регистрация пользователя.
 *
 * POST /auth/register
 */
export async function register({ email, password, fullName, organization = '' }) {
    return request('/auth/register', {
        method: 'POST',
        body: {
            email,
            password,
            fullName,
            organization,
        },
        auth: false,
    });
}

/**
 * Вход в систему.
 *
 * POST /auth/login
 */
export async function login({ email, password }) {
    const data = await request('/auth/login', {
        method: 'POST',
        body: {
            email,
            password,
        },
        auth: false,
    });

    if (data && (data.access_token || data.accessToken)) {
        setSession(data, {
            email,
            fullName: data.full_name || '',
        });
    }

    return data;
}

/**
 * Выход из системы.
 *
 * POST /auth/logout
 */
export async function logout() {
    const refreshToken = getRefreshToken();
    const currentUser = getStoredUser();

    try {
        if (refreshToken) {
            await request('/auth/logout', {
                method: 'POST',
                body: {
                    refreshToken,
                },
                auth: true,
                retry: true,
            });
        }
    } catch {
        // Даже если сервер не ответил, всё равно очищаем локальную сессию.
    } finally {
        clearSession();
    }

    return currentUser;
}

/**
 * Обновление токена.
 *
 * POST /auth/refresh
 */
export async function refreshToken() {
    const token = getRefreshToken();

    if (!token) {
        throw new Error('Нет refresh-токена');
    }

    return request('/auth/refresh', {
        method: 'POST',
        body: {
            refresh_token: token,
        },
        auth: false,
    });
}

/**
 * Запрос на восстановление пароля.
 *
 * POST /auth/forgot-password
 */
export async function forgotPassword(email) {
    return request('/auth/forgot-password', {
        method: 'POST',
        body: {
            email,
        },
        auth: false,
    });
}

/**
 * Сброс пароля.
 *
 * POST /auth/reset-password
 */
export async function resetPassword(token, newPassword) {
    return request('/auth/reset-password', {
        method: 'POST',
        body: {
            token,
            newPassword,
        },
        auth: false,
    });
}

/**
 * Подтверждение email.
 *
 * GET /auth/confirm-email?token=...
 */
export async function confirmEmail(token) {
    return request(`/auth/confirm-email?token=${encodeURIComponent(token)}`, {
        method: 'GET',
        auth: false,
    });
}