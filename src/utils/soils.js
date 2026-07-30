// список типов почв из справочника
// export const SOIL_TYPES = {
//     sod_podzolic: 'Дерново-подзолистые',
//     podzolic: 'Подзолистые',
//     brown_forest: 'Бурые лесные (бурозёмы)',
//     grey_forest: 'Серые лесные',
//     chernozem: 'Чернозёмы',
//     chestnut: 'Каштановые',
//     greyzem: 'Серо-зёмные',
//     meadow_chernozem: 'Лугово-чернозёмные',
//     meadow: 'Луговые',
//     swamp: 'Болотные',
//     peat_swamp: 'Торфяно-болотные',
//     solonetz: 'Солонцы',
//     solonchak: 'Солончаки',
//     alluvial: 'Аллювиальные (пойменные)',
//     tundra: 'Тундровые',
//     desert: 'Пустынные (серые, бурые)'
// };

export const SOIL_TYPES = {
    sod_carbonate_clay_loam: 'Дерново-карбонатная суглинистая',
    sod_podzolic_sandy: 'Дерново-подзолистая песчаная',
    sod_podzolic_light_clay_loam: 'Дерново-подзолистая средне- и легкосуглинистая',
    sod_podzolic_loamy_sand: 'Дерново-подзолистая супесчаная',
    sod_podzolic_heavy_clay_loam: 'Дерново-подзолистая тяжелосуглинистая',
    chestnut_chestnut: 'Каштановая каштановая',
    chestnut_light_chestnut: 'Каштановая светло-каштановая',
    chestnut_dark_chestnut: 'Каштановая темно-каштановая',
    grey_forest_light_grey: 'Серая лесная светло-серая лесная',
    grey_forest_grey: 'Серая лесная серая лесная',
    grey_forest_dark_grey: 'Серая лесная темно-серая лесная',
    chernozem_leached: 'Чернозем выщелоченный',
    chernozem_ordinary: 'Чернозем обыкновенный',
    chernozem_podzolized: 'Чернозем оподзоленный',
    chernozem_typical: 'Чернозем типичный',
    chernozem_southern: 'Чернозем южный'
};

export function getSoilName(code) {
    return SOIL_TYPES[code] || code || '—';
}