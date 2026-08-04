// utils/regionLimits.js

// import { SOIL_GROUPS } from './soils';

import { REGIONS } from './regions';

/**
 * Карта регионов для быстрого поиска
 */
const regionMap = new Map(REGIONS.map(r => [r.id, r]));

export function getRegionName(id) {
    return regionMap.get(Number(id))?.name || '---';
}

/**
 * Структура лимитов:
 * {
 *   agrochemId: {
 *     regionId: {
 *       soilGroupId: max_value
 *     }
 *   }
 * }
 *
 * Параметр → Регион → Группа почв → Максимальное значение
 */
export const PARAM_LIMITS = {
    // Гидролитическая кислотность (id_agrochem: 7)
    7: {
        1: { 1: 3.8 },
        2: { 1: 5 },
        3: { 1: 6, 2: 4.7, 3: 6, 4: 5 },
        4: { 1: 5.5, 2: 3.4, 3: 5, 4: 5 },
        5: { 2: 7, 3: 9 },
        6: { 2: 7, 3: 9, 4: 5 },
        7: { 1: 3, 2: 4.7, 3: 7, 4: 5 },
        8: { 3: 10, 4: 6 },
        9: { 1: 3, 2: 3.4, 3: 8 },
        10: { 1: 2.5, 2: 4.7, 3: 6, 4: 5 },
        11: { 1: 2.5, 2: 5 },
        12: { 1: 2.5 }
    },
    // pH (id_agrochem: 18)
    18: {
        1: { 1: 4 },
        2: { 1: 5 },
        3: { 1: 5, 2: 5.7, 3: 6.5, 4: 7 },
        4: { 1: 6, 2: 5.4, 3: 7, 4: 7 },
        5: { 2: 6, 3: 8 },
        6: { 2: 6, 3: 6.5, 4: 7 },
        7: { 1: 5.5, 2: 5.5, 3: 5.5, 4: 7 },
        8: { 3: 7, 4: 7.5 },
        9: { 1: 5.5, 2: 5.4, 3: 7 },
        10: { 1: 5, 2: 5.2, 3: 7, 4: 7 },
        11: { 1: 5, 2: 5 },
        12: { 1: 4.5 }
    },
    // Подвижный Фосфор (id_agrochem: 2)
    2: {
        1: { 1: 5 },
        2: { 1: 10 },
        3: { 1: 20, 2: 8, 3: 13, 4: 90 },
        4: { 1: 25, 2: 6, 3: 25, 4: 250 },
        5: { 2: 12, 3: 40 },
        6: { 2: 12, 3: 35, 4: 35 },
        7: { 1: 20, 2: 8, 3: 40, 4: 30 },
        8: { 3: 45, 4: 40 },
        9: { 1: 20, 2: 12, 3: 45 },
        10: { 1: 20, 2: 12, 3: 55, 4: 35 },
        11: { 1: 20, 2: 12 },
        12: { 1: 15 }
    },
    // Обменный Калий (id_agrochem: 3)
    3: {
        1: { 1: 10 },
        2: { 1: 15 },
        3: { 1: 20, 2: 13, 3: 220, 4: 10 },
        4: { 1: 30, 2: 10, 3: 250, 4: 80 },
        5: { 2: 15, 3: 300 },
        6: { 2: 15, 3: 280, 4: 90 },
        7: { 1: 20, 2: 13, 3: 320, 4: 80 },
        8: { 3: 300, 4: 100 },
        9: { 1: 30, 2: 16, 3: 320 },
        10: { 1: 25, 2: 15, 3: 280, 4: 75 },
        11: { 1: 30, 2: 15 },
        12: { 1: 20 }
    },
    // Бор (id_agrochem: 4)
    4: {
        3: { 2: 3.4, 3: 7 },
        4: { 2: 3.4, 3: 7 },
        5: { 2: 3.4, 3: 7 },
        6: { 2: 3.4, 3: 7 },
        7: { 2: 3.4, 3: 7 },
        8: { 3: 7 },
        9: { 2: 3.4, 3: 7 },
        10: { 2: 3.4, 3: 7 }
    },
    // Цинк (id_agrochem: 5)
    5: {
        3: { 2: 7, 3: 9 },
        4: { 2: 7, 3: 9 },
        5: { 2: 7, 3: 9 },
        6: { 2: 7, 3: 9 },
        7: { 2: 7, 3: 9 },
        8: { 3: 9 },
        9: { 2: 7, 3: 9 },
        10: { 2: 7, 3: 9 }
    },
    // Азот (id_agrochem: 6)
    6: {
        3: { 2: 6, 3: 6.5 },
        4: { 2: 6, 3: 6.5 },
        5: { 2: 6, 3: 6.5 },
        6: { 2: 6, 3: 6.5 },
        7: { 2: 6, 3: 6.5 },
        8: { 3: 6.5 },
        9: { 2: 6, 3: 6.5 },
        10: { 2: 6, 3: 6.5 }
    }
};

/**
 * Получить максимальное значение для параметра, региона и группы почв
 * @param {number} agrochemId - ID агрохимического параметра
 * @param {number} regionId - ID региона
 * @param {number} soilGroupId - ID группы почв (опционально)
 * @returns {number|null} максимальное значение или null
 */
export function getParamMax(agrochemId, regionId, soilGroupId = null) {
    const paramLimits = PARAM_LIMITS[agrochemId];
    if (!paramLimits) return null;

    const regionLimits = paramLimits[regionId];
    if (!regionLimits) return null;

    // Если указана группа почв, ищем конкретное значение
    if (soilGroupId !== null && soilGroupId !== undefined) {
        return regionLimits[soilGroupId] || null;
    }

    // Иначе возвращаем максимальное значение среди всех групп почв для этого региона
    const values = Object.values(regionLimits);
    if (values.length === 0) return null;
    return Math.max(...values);
}

/**
 * Проверить значение
 * @param {number} agrochemId - ID агрохимического параметра
 * @param {number} regionId - ID региона
 * @param {number} value - Проверяемое значение
 * @param {number} soilGroupId - ID группы почв (опционально)
 * @returns {Object} { isValid, max, message }
 */
export function validateParamValue(agrochemId, regionId, value, soilGroupId = null) {
    const max = getParamMax(agrochemId, regionId, soilGroupId);

    if (!max || value === undefined || value === null || value === '') {
        return {
            isValid: true,
            max: null,
            message: 'Лимиты для этого параметра и региона не заданы'
        };
    }

    return {
        isValid: Number(value) <= max,
        max: max,
        message: Number(value) <= max
            ? 'Значение в допустимом диапазоне'
            : `Превышает допустимое значение (макс. ${max})`
    };
}

/**
 * Получить все параметры с лимитами для региона и группы почв
 * @param {number} regionId - ID региона
 * @param {number} soilGroupId - ID группы почв
 * @returns {Array} Массив объектов { agrochemId, max }
 */
export function getParamsWithLimits(regionId, soilGroupId) {
    const result = [];
    for (const [agrochemId, regionLimits] of Object.entries(PARAM_LIMITS)) {
        const regionData = regionLimits[regionId];
        if (regionData) {
            const max = regionData[soilGroupId] || null;
            if (max !== null) {
                result.push({
                    agrochemId: Number(agrochemId),
                    max: max
                });
            }
        }
    }
    return result;
}