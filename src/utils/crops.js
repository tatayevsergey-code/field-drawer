export const CROP_NAMES = {
    wheat: 'Пшеница озимая',
    wheat_spring: 'Пшеница яровая',
    corn: 'Кукуруза',
    soy: 'Соя',
    sunflower: 'Подсолнечник',
    rapeseed: 'Рапс',
    barley: 'Ячмень',
    oat: 'Овёс',
    rye: 'Рожь',
    pea: 'Горох',
    buckwheat: 'Гречиха',
    potato: 'Картофель',
    sugarbeet: 'Свёкла сахарная',
    flax: 'Лён',
    hemp: 'Конопля',
    fallow: 'Пар',
    grass: 'Многолетние травы',
    other: 'Другое'
};

export function getCropName(code) {
    return CROP_NAMES[code] || code || '—';
}