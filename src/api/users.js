import { request } from './client';

function buildQueryString(params) {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
            qs.append(key, String(value));
        }
    });
    const str = qs.toString();
    return str ? `?${str}` : '';
}

export async function listUsers({ page = 1, perPage = 10, search = '' } = {}) {
    const qs = buildQueryString({ page, perPage, search });
    return request(`/admin/users${qs}`, { method: 'GET', auth: true });
}

export async function updateUserRole(userId, role) {
    return request(`/admin/users/${userId}/role`, {
        method: 'PUT',
        body: { role },
        auth: true,
    });
}

export async function deactivateUser(userId) {
    return request(`/admin/users/${userId}/deactivate`, {
        method: 'POST',
        auth: true,
    });
}

export async function activateUser(userId) {
    return request(`/admin/users/${userId}/activate`, {
        method: 'POST',
        auth: true,
    });
}