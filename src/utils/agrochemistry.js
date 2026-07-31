/**
 * Справочник параметров агрохимического анализа почвы
 * @typedef {Object} AgroParam
 * @property {number} id
 * @property {string} name - название показателя
 * @property {string} unit - единица измерения
 */

export const AGRO_PARAMS = [
    { id: 1,  name: 'Гидролитическая кислотность', unit: 'Нг' },
    { id: 2,  name: 'Подвижный Фосфор',            unit: 'P₂O₅' },
    { id: 3,  name: 'Обменный Калий',               unit: 'K₂O' },
    { id: 4,  name: 'Бор',                          unit: 'B' },
    { id: 5,  name: 'Цинк',                         unit: 'Zn' },
    { id: 6,  name: 'Азот',                         unit: 'Азот' },
    { id: 7,  name: 'Гумус',                        unit: 'Гумус' },
    { id: 8,  name: 'Кальций',                      unit: 'Ca' },
    { id: 9,  name: 'Магний',                       unit: 'Mg' },
    { id: 10, name: 'Карбонат кальция',             unit: 'CaCO₃' },
    { id: 11, name: 'Карбонат магния',              unit: 'MgCO₃' },
    { id: 12, name: 'Марганец',                     unit: 'Mn' },
    { id: 13, name: 'Кобальт',                      unit: 'Co' },
    { id: 14, name: 'Молибден',                     unit: 'Мо' },
    { id: 15, name: 'Медь',                         unit: 'Cu' },
    { id: 16, name: 'Железо',                       unit: 'Fe' },
    { id: 17, name: 'Сера',                         unit: 'S' },
    { id: 18, name: 'Водородный показатель',        unit: 'pH' }
];

// Для быстрого поиска по id
const paramMap = new Map(AGRO_PARAMS.map(p => [p.id, p]));

/**
 * Получить параметр по id
 * @param {number|string} id
 * @returns {AgroParam|undefined}
 */
export function getAgroParam(id) {
    return paramMap.get(Number(id));
}

/**
 * Получить название параметра по id
 * @param {number|string} id
 * @returns {string}
 */
export function getAgroParamName(id) {
    return getAgroParam(id)?.name || '—';
}

/**
 * Получить единицу измерения по id
 * @param {number|string} id
 * @returns {string}
 */
export function getAgroParamUnit(id) {
    return getAgroParam(id)?.unit || '';
}