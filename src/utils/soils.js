export const SOIL_TYPES = {
    sod_podzolic: 'Дерново-подзолистые',
    podzolic: 'Подзолистые',
    brown_forest: 'Бурые лесные (бурозёмы)',
    grey_forest: 'Серые лесные',
    chernozem: 'Чернозёмы',
    chestnut: 'Каштановые',
    greyzem: 'Серо-зёмные',
    meadow_chernozem: 'Лугово-чернозёмные',
    meadow: 'Луговые',
    swamp: 'Болотные',
    peat_swamp: 'Торфяно-болотные',
    solonetz: 'Солонцы',
    solonchak: 'Солончаки',
    alluvial: 'Аллювиальные (пойменные)',
    tundra: 'Тундровые',
    desert: 'Пустынные (серые, бурые)'
};

export function getSoilName(code) {
    return SOIL_TYPES[code] || code || '—';
}