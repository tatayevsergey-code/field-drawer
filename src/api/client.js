import { API_BASE_URL } from './config';

const ACCESS_TOKEN_KEY = 'access_token';
const REFRESH_TOKEN_KEY = 'refresh_token';
const USER_KEY = 'auth_user';

const AUTH_CHANGE_EVENT = 'app-auth-change';

function emitAuthChange() {
    window.dispatchEvent(new Event(AUTH_CHANGE_EVENT));
}

export function onAuthChange(callback) {
    window.addEventListener(AUTH_CHANGE_EVENT, callback);

    return () => {
        window.removeEventListener(AUTH_CHANGE_EVENT, callback);
    };
}

export function getAccessToken() {
    return localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function getRefreshToken() {
    return localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function getStoredUser() {
    try {
        const raw = localStorage.getItem(USER_KEY);

        if (!raw) {
            return null;
        }

        return JSON.parse(raw);
    } catch {
        return null;
    }
}

export function setSession(response, extra = {}) {
    if (!response) {
        return;
    }

    // Поддерживаем оба формата: snake_case и camelCase
    const accessToken = response.access_token || response.accessToken;
    const refreshToken = response.refresh_token || response.refreshToken;
    const userId = response.user_id ?? response.userId ?? null;

    if (!accessToken) {
        console.warn('[setSession] Нет access_token в ответе', response);
        return;
    }

    localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);

    if (refreshToken) {
        localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
    }

    const user = {
        id: userId,
        role: response.role ?? null,
        email: extra.email || response.email || '',
        fullName: response.full_name || response.fullName || extra.fullName || '',
    };

    localStorage.setItem(USER_KEY, JSON.stringify(user));

    emitAuthChange();
}
export function clearSession() {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(USER_KEY);

    emitAuthChange();
}

function buildHeaders(headers = {}, auth = false) {
    const result = {
        'Content-Type': 'application/json',
        ...headers,
    };

    if (auth) {
        const token = getAccessToken();

        if (token) {
            result.Authorization = `Bearer ${token}`;
        }
    }

    return result;
}

async function parseBody(response) {
    if (response.status === 204) {
        return null;
    }

    const text = await response.text();

    if (!text) {
        return null;
    }

    try {
        return JSON.parse(text);
    } catch {
        return { raw: text };
    }
}

let refreshPromise = null;

export function refreshAccessToken() {
    if (!refreshPromise) {
        refreshPromise = doRefreshAccessToken().finally(() => {
            refreshPromise = null;
        });
    }

    return refreshPromise;
}

async function doRefreshAccessToken() {
    const refreshToken = getRefreshToken();

    if (!refreshToken) {
        return false;
    }

    try {
        const data = await request('/auth/refresh', {
            method: 'POST',
            body: {
                refresh_token: refreshToken,
            },
            auth: false,
            retry: false,
        });

        if (data && (data.access_token || data.accessToken)) {
            const currentUser = getStoredUser() || {};

            setSession(data, {
                email: currentUser.email,
                fullName: currentUser.fullName,
            });

            return true;
        }

        clearSession();

        return false;
    } catch {
        clearSession();

        return false;
    }
}

/**
 * Универсальная функция запросов к Gateway.
 *
 * Пример:
 * await request('/fields', {
 *   method: 'POST',
 *   body: {...},
 *   auth: true
 * });
 */
export async function request(path, options = {}) {
    const {
        method = 'GET',
        body,
        headers = {},
        auth = false,
        retry = true,
    } = options;

    const config = {
        method,
        headers: buildHeaders(headers, auth),
    };

    if (body !== undefined) {
        config.body = JSON.stringify(body);
    }

    let response;

    try {
        response = await fetch(`${API_BASE_URL}${path}`, config);
    } catch (error) {

        console.error('[API fetch error]', {
            url: `${API_BASE_URL}${path}`,
            method,
            error,
        });

        throw new Error(
            `Нет соединения с сервером: ${method} ${API_BASE_URL}${path}`
        );
    }

    const canRefresh =
        auth &&
        retry &&
        path !== '/auth/refresh' &&
        path !== '/auth/login';

    if (response.status === 401 && canRefresh) {
        const refreshed = await refreshAccessToken();

        if (refreshed) {
            return request(path, {
                ...options,
                retry: false,
            });
        }

        clearSession();

        const data = await parseBody(response);

        const error = new Error(
            data?.error || data?.message || 'Сессия истекла. Войдите снова.'
        );

        error.status = response.status;
        error.data = data;

        throw error;
    }

    const data = await parseBody(response);

    // Добавляем отладку
    // console.log('[API response]', {
    //     path,
    //     status: response.status,
    //     ok: response.ok,
    // });
    console.log('[API response data]', data);

    if (!response.ok) {
        const message =
            data?.error ||
            data?.message ||
            data?.detail ||
            `Ошибка запроса (${response.status})`;

        const error = new Error(message);

        error.status = response.status;
        error.data = data;

        throw error;
    }

    if (data && data.success === false) {
        const error = new Error(
            data.error || data.message || 'Операция отклонена сервером'
        );

        error.data = data;

        throw error;
    }

    return data;
}