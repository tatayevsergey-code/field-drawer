import { request } from './client';

export async function listProjects() {
    return request('/projects', { method: 'GET', auth: true });
}

export async function createProject(name) {
    return request('/projects', {
        method: 'POST',
        body: { name },
        auth: true,
    });
}

export async function updateProject(id, name) {
    return request(`/projects/${id}`, {
        method: 'PUT',
        body: { name },
        auth: true,
    });
}

export async function deleteProject(id) {
    return request(`/projects/${id}`, {
        method: 'DELETE',
        auth: true,
    });
}

export async function listFields(projectId) {
    return request(`/projects/${projectId}/fields`, {
        method: 'GET',
        auth: true,
    });
}

export async function createField(fieldData) {
    return request('/fields', {
        method: 'POST',
        body: fieldData,
        auth: true,
    });
}

export async function updateField(id, fieldData) {
    return request(`/fields/${id}`, {
        method: 'PUT',
        body: fieldData,
        auth: true,
    });
}

export async function deleteField(id) {
    return request(`/fields/${id}`, {
        method: 'DELETE',
        auth: true,
    });
}