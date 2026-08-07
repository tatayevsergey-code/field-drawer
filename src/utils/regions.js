/**
 * Справочник регионов (зон)
 */
export const REGIONS = [
    { id: 1, name: 'Северный' },
    { id: 2, name: 'Северо-Западный' },
    { id: 3, name: 'Центральный' },
    { id: 4, name: 'Волго-Вятский' },
    { id: 5, name: 'Центрально-Черноземный' },
    { id: 6, name: 'Северо-Кавказский' },
    { id: 7, name: 'Средневолжский' },
    { id: 8, name: 'Нижневолжский' },
    { id: 9, name: 'Уральский' },
    { id: 10, name: 'Западно-Сибирский' },
    { id: 11, name: 'Восточно-Сибирский' },
    { id: 12, name: 'Дальневосточный' }
];

/**
 * Справочник субъектов РФ с привязкой к регионам
 */
export const REGION_SUBJECTS = [
    { id: 1, name: 'Архангельская область', regionId: 1, codes: ['29'] },
    { id: 2, name: 'Мурманская область', regionId: 1, codes: ['51'] },
    { id: 3, name: 'Республика Карелия', regionId: 1, codes: ['10'] },
    { id: 4, name: 'Республика Коми', regionId: 1, codes: ['11', '111'] },
    { id: 5, name: 'Ненецкий автономный округ', regionId: 1, codes: ['83'] },

    { id: 6, name: 'Вологодская область', regionId: 2, codes: ['35'] },
    { id: 7, name: 'Калининградская область', regionId: 2, codes: ['39', '91'] },
    { id: 8, name: 'Костромская область', regionId: 2, codes: ['44'] },
    { id: 9, name: 'Ленинградская область', regionId: 2, codes: ['47'] },
    { id: 10, name: 'Новгородская область', regionId: 2, codes: ['53'] },
    { id: 11, name: 'Псковская область', regionId: 2, codes: ['60'] },
    { id: 12, name: 'Тверская область', regionId: 2, codes: ['69'] },
    { id: 13, name: 'Ярославская область', regionId: 2, codes: ['76', '176'] },

    { id: 14, name: 'Брянская область', regionId: 3, codes: ['32'] },
    { id: 15, name: 'Владимирская область', regionId: 3, codes: ['33'] },
    { id: 16, name: 'Ивановская область', regionId: 3, codes: ['37'] },
    { id: 17, name: 'Калужская область', regionId: 3, codes: ['40'] },
    { id: 18, name: 'Московская область', regionId: 3, codes: ['50', '90', '150', '190', '750'] },
    { id: 19, name: 'Рязанская область', regionId: 3, codes: ['62'] },
    { id: 20, name: 'Смоленская область', regionId: 3, codes: ['67'] },
    { id: 21, name: 'Тульская область', regionId: 3, codes: ['71'] },

    { id: 22, name: 'Кировская область', regionId: 4, codes: ['43'] },
    { id: 23, name: 'Нижегородская область', regionId: 4, codes: ['52', '152'] },
    { id: 24, name: 'Пермский край', regionId: 4, codes: ['59', '81', '159'] },
    { id: 25, name: 'Республика Марий Эл', regionId: 4, codes: ['12'] },
    { id: 26, name: 'Свердловская область', regionId: 4, codes: ['66', '96', '196'] },
    { id: 27, name: 'Удмуртская Республика', regionId: 4, codes: ['18'] },
    { id: 28, name: 'Чувашская Республика', regionId: 4, codes: ['21', '121'] },

    { id: 29, name: 'Белгородская область', regionId: 5, codes: ['31'] },
    { id: 30, name: 'Воронежская область', regionId: 5, codes: ['36', '136'] },
    { id: 31, name: 'Курская область', regionId: 5, codes: ['46'] },
    { id: 32, name: 'Липецкая область', regionId: 5, codes: ['48'] },
    { id: 33, name: 'Орловская область', regionId: 5, codes: ['57'] },
    { id: 34, name: 'Тамбовская область', regionId: 5, codes: ['68'] },

    { id: 35, name: 'Кабардино-Балкарская Республика', regionId: 6, codes: ['7'] },
    { id: 36, name: 'Карачаево-Черкесская Республика', regionId: 6, codes: ['9', '109'] },
    { id: 37, name: 'Краснодарский край', regionId: 6, codes: ['23', '93', '123'] },
    { id: 38, name: 'Республика Адыгея', regionId: 6, codes: ['1', '101'] },
    { id: 39, name: 'Республика Дагестан', regionId: 6, codes: ['5'] },
    { id: 40, name: 'Республика Ингушетия', regionId: 6, codes: ['6'] },
    { id: 41, name: 'Республика Крым', regionId: 6, codes: ['82'] },
    { id: 42, name: 'Республика Северная Осетия - Алания', regionId: 6, codes: ['15'] },
    { id: 43, name: 'Ростовская область', regionId: 6, codes: ['61', '161', '761'] },
    { id: 44, name: 'Ставропольский край', regionId: 6, codes: ['26', '126'] },
    { id: 45, name: 'Чеченская Республика', regionId: 6, codes: ['20', '95'] },

    { id: 46, name: 'Пензенская область', regionId: 7, codes: ['58'] },
    { id: 47, name: 'Республика Мордовия', regionId: 7, codes: ['13', '113'] },
    { id: 48, name: 'Республика Татарстан', regionId: 7, codes: ['16', '116', '716'] },
    { id: 49, name: 'Самарская область', regionId: 7, codes: ['63', '163', '763'] },
    { id: 50, name: 'Ульяновская область', regionId: 7, codes: ['73', '173'] },

    { id: 51, name: 'Астраханская область', regionId: 8, codes: ['30'] },
    { id: 52, name: 'Волгоградская область', regionId: 8, codes: ['34', '134'] },
    { id: 53, name: 'Республика Калмыкия', regionId: 8, codes: ['8'] },
    { id: 54, name: 'Саратовская область', regionId: 8, codes: ['64', '164'] },

    { id: 55, name: 'Курганская область', regionId: 9, codes: ['45'] },
    { id: 56, name: 'Оренбургская область', regionId: 9, codes: ['56'] },
    { id: 57, name: 'Республика Башкортостан', regionId: 9, codes: ['2', '102', '702'] },
    { id: 58, name: 'Челябинская область', regionId: 9, codes: ['74', '174'] },

    { id: 59, name: 'Алтайский край', regionId: 10, codes: ['22'] },
    { id: 60, name: 'Кемеровская область', regionId: 10, codes: ['42', '142'] },
    { id: 61, name: 'Новосибирская область', regionId: 10, codes: ['54', '154'] },
    { id: 62, name: 'Омская область', regionId: 10, codes: ['55'] },
    { id: 63, name: 'Республика Алтай', regionId: 10, codes: ['4'] },
    { id: 64, name: 'Томская область', regionId: 10, codes: ['70'] },
    { id: 65, name: 'Тюменская область', regionId: 10, codes: ['72'] },
    { id: 66, name: 'Ханты-Мансийский автономный округ - Югра', regionId: 10, codes: ['86', '186'] },
    { id: 67, name: 'Ямало-Ненецкий автономный округ', regionId: 10, codes: ['89'] },

    { id: 68, name: 'Забайкальский край', regionId: 11, codes: ['75', '80'] },
    { id: 69, name: 'Иркутская область', regionId: 11, codes: ['38', '85', '1387'] },
    { id: 70, name: 'Красноярский край', regionId: 11, codes: ['24', '84', '88', '124'] },
    { id: 71, name: 'Республика Бурятия', regionId: 11, codes: ['3', '103'] },
    { id: 72, name: 'Республика Саха (Якутия)', regionId: 11, codes: ['14'] },
    { id: 73, name: 'Республика Тыва', regionId: 11, codes: ['17'] },
    { id: 74, name: 'Республика Хакасия', regionId: 11, codes: ['19'] },

    { id: 75, name: 'Амурская область', regionId: 12, codes: ['28'] },
    { id: 76, name: 'Камчатский край', regionId: 12, codes: ['41'] },
    { id: 77, name: 'Магаданская область', regionId: 12, codes: ['49'] },
    { id: 78, name: 'Приморский край', regionId: 12, codes: ['25', '125'] },
    { id: 79, name: 'Хабаровский край', regionId: 12, codes: ['27'] },
    { id: 80, name: 'Еврейская автономная область', regionId: 12, codes: ['79'] },
    { id: 81, name: 'Чукотский автономный округ', regionId: 12, codes: ['87'] },
    { id: 82, name: 'Сахалинская область', regionId: 12, codes: ['65'] },
    { id: 83, name: 'Москва', regionId: 3, codes: ['77', '97', '99', '177', '197', '199', '777'] },
    { id: 84, name: 'Санкт-Петербург', regionId: 2, codes: ['78', '98', '178'] }
];

// Карты для быстрого поиска
const regionMap = new Map(REGIONS.map(r => [r.id, r]));
const subjectMap = new Map(REGION_SUBJECTS.map(s => [s.id, s]));

/**
 * Получить регион по ID
 */
export function getRegion(id) {
    return regionMap.get(Number(id));
}

/**
 * Получить название региона по ID
 */
export function getRegionName(id) {
    return regionMap.get(Number(id))?.name || '---';
}

/**
 * Получить субъект по ID
 */
export function getSubject(id) {
    return subjectMap.get(Number(id));
}

/**
 * Получить название субъекта по ID
 */
export function getSubjectName(id) {
    return subjectMap.get(Number(id))?.name || '---';
}

/**
 * Найти регион по коду субъекта (из внешней системы)
 * @param {string|number} code - код региона (например, '29' для Архангельской)
 * @returns {number|null} ID региона или null
 */
export function findRegionByCode(code) {
    const codeStr = String(code);
    for (const subject of REGION_SUBJECTS) {
        if (subject.codes.includes(codeStr)) {
            return subject.regionId;
        }
    }
    return null;
}

/**
 * Найти регион по названию субъекта (улучшенная версия)
 */
export function findRegionByName(name) {
    if (!name) return null;
    const nameLower = name.toLowerCase().trim();

    // Специальные случаи
    const specialCases = {
        'москва': 3,
        'санкт-петербург': 2,
        'спб': 2,
        'московская область': 3,
        'ленинградская область': 2,
        'мордовия': 7,
        'республика мордовия': 7
    };

    // Проверяем специальные случаи
    for (const [key, regionId] of Object.entries(specialCases)) {
        if (nameLower.includes(key) || key.includes(nameLower)) {
            return regionId;
        }
    }

    // Ищем в справочнике субъектов
    for (const subject of REGION_SUBJECTS) {
        const subjectLower = subject.name.toLowerCase();
        // Проверяем вхождение
        if (subjectLower.includes(nameLower) || nameLower.includes(subjectLower)) {
            return subject.regionId;
        }
    }

    return null;
}