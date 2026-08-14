import { request } from './client';

let cached = null;
let fetchPromise = null;

/**
 * Загружает справочники с backend.
 * Кэширует результат на время жизни страницы.
 */
export async function fetchDictionaries({ force = false } = {}) {
    if (!force && cached) return cached;
    if (fetchPromise) return fetchPromise;

    fetchPromise = request('/dictionaries', {
        method: 'GET',
        auth: true,
        retry: true,
    })
        .then((data) => {
            if (!data?.success) {
                throw new Error(data?.error || 'Не удалось загрузить справочники');
            }
            cached = data;
            return data;
        })
        .finally(() => {
            fetchPromise = null;
        });

    return fetchPromise;
}

/** Сбрасывает кэш (например, после выхода из системы) */
export function clearDictionariesCache() {
    cached = null;
}