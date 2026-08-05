// Родительские группы почв
export const SOIL_GROUPS = {
    1: 'Дерново-подзолистые',
    2: 'Серые лесные',
    3: 'Чернозёмы',
    4: 'Каштановые'
};

// Справочник типов почв с идентификаторами
export const SOIL_TYPES = [
    { id: 1,  name: 'Дерново-подзолистая тяжело-суглинистая', groupId: 1 },
    { id: 2,  name: 'Дерново-подзолистая средне- и легкосуглинистая', groupId: 1 },
    { id: 3,  name: 'Дерново-подзолистая супесчаная', groupId: 1 },
    { id: 4,  name: 'Дерново-подзолистая песчаная', groupId: 1 },
    { id: 5,  name: 'Дерново-карбонатная суглинистая', groupId: 1 },
    { id: 6,  name: 'Серая лесная светло-серая лесная', groupId: 2 },
    { id: 7,  name: 'Серая лесная серая лесная', groupId: 2 },
    { id: 8,  name: 'Серая лесная темно-серая лесная', groupId: 2 },
    { id: 9,  name: 'Чернозем оподзоленный', groupId: 3 },
    { id: 10, name: 'Чернозем выщелоченный', groupId: 3 },
    { id: 11, name: 'Чернозем типичный', groupId: 3 },
    { id: 12, name: 'Чернозем обыкновенный', groupId: 3 },
    { id: 13, name: 'Чернозем южный', groupId: 3 },
    { id: 14, name: 'Каштановая темно-каштановая', groupId: 4 },
    { id: 15, name: 'Каштановая каштановая', groupId: 4 },
    { id: 16, name: 'Каштановая светло-каштановая', groupId: 4 }
];

// Для быстрого поиска по id
const soilMap = new Map(SOIL_TYPES.map(s => [s.id, s]));

export function getSoilName(id) {
    return soilMap.get(Number(id))?.name || '—';
}

export function getSoilGroupName(groupId) {
    return SOIL_GROUPS[groupId] || '—';
}

// Для select с группировкой: { groupId: [soil1, soil2, ...] }
export function getSoilsByGroup() {
    const grouped = {};
    SOIL_TYPES.forEach(soil => {
        if (!grouped[soil.groupId]) grouped[soil.groupId] = [];
        grouped[soil.groupId].push(soil);
    });
    return grouped;
}

/**
 * Получить ID группы почвы по ID конкретного типа почвы
 * @param {number|string} soilTypeId - ID типа почвы из SOIL_TYPES
 * @returns {number|null} ID группы почвы из SOIL_GROUPS
 */
export function getSoilGroupByTypeId(soilTypeId) {
    if (!soilTypeId) return null;

    const soil = soilMap.get(Number(soilTypeId));

    if (!soil) return null;

    return soil.groupId ?? null;
}