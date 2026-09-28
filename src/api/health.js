import { request } from './client';

export async function getDetailedHealth() {
    return request('/health/detailed', { method: 'GET', auth: true });
}

export async function getReadiness() {
    return request('/health/readiness', { method: 'GET', auth: true });
}

export async function getLiveness() {
    return request('/health/liveness', { method: 'GET', auth: true });
}