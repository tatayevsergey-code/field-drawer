// Разбор raw-строки точки трека (gateway хранит raw как JSON-строку)
export function parseSowingRaw(p) {
    if (!p?.raw) return {};
    if (typeof p.raw === 'string') {
        try { return JSON.parse(p.raw); } catch { return {}; }
    }
    return p.raw;
}

// Декодирование флагов тревог в человекочитаемые ошибки (как в десктопе)
export function sowingPointErrors(raw) {
    const on = (v) => Array.isArray(v) ? v.some(x => Number(x) > 0) : Number(v) > 0;
    const errors = [];
    if (on(raw.alarmSowingUnit))     errors.push('Неисправность высевающего аппарата');
    if (on(raw.alarmEmptyBunker))    errors.push('Опустошение бункера');
    if (on(raw.alarmBlower))         errors.push('Неисправность вентилятора');
    if (on(raw.alarmPressureBunker)) errors.push('Давление в бункере не в норме');
    if (on(raw.alarmSpeed))          errors.push('Скорость перемещения не в пределах нормы');
    return errors;
}

// '2024-11-18T07:16:18.677733Z' → '18.11.2024 10:16:18' (локальное время)
export function formatSowingTime(iso) {
    const d = new Date(iso);
    if (isNaN(d)) return iso || '';
    const p = (n) => String(n).padStart(2, '0');
    return `${p(d.getDate())}.${p(d.getMonth() + 1)}.${d.getFullYear()} ` +
        `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}