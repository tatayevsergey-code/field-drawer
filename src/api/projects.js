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

export async function getDiffGrid(fieldId) {
    return request(`/fields/${fieldId}/diff-grid`, {
        method: 'GET',
        auth: true,
    });
}

export async function saveDiffGrid(fieldId, params) {
    return request(`/fields/${fieldId}/diff-grid`, {
        method: 'PUT',
        body: params,
        auth: true,
    });
}

export async function deleteDiffGrid(fieldId) {
    return request(`/fields/${fieldId}/diff-grid`, {
        method: 'DELETE',
        auth: true,
    });
}

export async function getSeeding(fieldId) {
    return request(`/fields/${fieldId}/seeding`, { method: 'GET', auth: true });
}
export async function saveSeeding(fieldId, payload) {
    return request(`/fields/${fieldId}/seeding`, { method: 'PUT', body: payload, auth: true });
}
export async function deleteSeeding(fieldId) {
    return request(`/fields/${fieldId}/seeding`, { method: 'DELETE', auth: true });
}

// ─── Треки результатов посева ─────────────────────────────────
export async function listSowingTracks(fieldId) {
    return request(`/fields/${fieldId}/sowing-tracks`, { method: 'GET', auth: true });
}

export async function saveSowingTrack(fieldId, payload) {
    return request(`/fields/${fieldId}/sowing-tracks`, { method: 'POST', body: payload, auth: true });
}

export async function getSowingTrack(trackId) {
    return request(`/sowing-tracks/${trackId}`, { method: 'GET', auth: true });
}

export async function deleteSowingTrack(trackId) {
    return request(`/sowing-tracks/${trackId}`, { method: 'DELETE', auth: true });
}