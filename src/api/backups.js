import { request } from './client';

/**
 * Список бэкапов с пагинацией
 */
export async function listBackups({ page = 1, perPage = 10, sortBy = 'created_at', sortOrder = 'desc' } = {}) {
    const qs = new URLSearchParams({
        page: String(page),
        per_page: String(perPage),
        sort_by: sortBy,
        sort_order: sortOrder,
    }).toString();
    return request(`/admin/backups?${qs}`, { method: 'GET', auth: true });  // ← добавлен /admin
}

/**
 * Создать новый бэкап
 */
export async function createBackup(description = '', includeUploads = false) {
    return request('/admin/backup', {  // ← /admin + backup (без 's'!)
        method: 'POST',
        body: { description, include_uploads: includeUploads },
        auth: true,
    });
}

/**
 * Восстановить бэкап
 */
export async function restoreBackup(backupId, dropExisting = false) {
    return request(`/admin/backups/${backupId}/restore`, {  // ← добавлен /admin
        method: 'POST',
        body: { drop_existing: dropExisting },
        auth: true,
    });
}

/**
 * Удалить бэкап
 */
export async function deleteBackup(backupId) {
    return request(`/admin/backups/${backupId}`, {  // ← добавлен /admin
        method: 'DELETE',
        auth: true,
    });
}

/**
 * Получить статус бэкапа
 */
export async function getBackupStatus(backupId) {
    return request(`/admin/backups/${backupId}/status`, {  // ← добавлен /admin
        method: 'GET',
        auth: true,
    });
}