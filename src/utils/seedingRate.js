// ─────────────────────────────────────────────────────────────
// Расчёт нормы высева (стандартная агрономическая методика):
//
//   Посевная годность (ПГ, %) = Чистота × Всхожесть / 100
//   Норма высева (кг/га) = N × M1000 × 100 / ПГ, где
//     N     — рекомендованная плотность посева, млн шт/га;
//     M1000 — масса 1000 зёрен, г.
//
// ⚠️ BASE_NORMS_MLN / SOIL_COEFF / ZONE_COEFF — ВРЕМЕННЫЕ справочные
// значения (заглушка). Заменить на методику заказчика / таблицу в БД.
// ─────────────────────────────────────────────────────────────

// Рекомендованная плотность посева, млн шт/га (по culture.id из БД)
const BASE_NORMS_MLN = {
    1: 5.0,   // Озимая рожь
    2: 5.0,   // Озимая пшеница
    3: 6.0,   // Яровая пшеница
    4: 5.5,   // Ячмень
    5: 5.0,   // Овёс
    6: 0.08,  // Кукуруза (~80 тыс. шт/га)
};

// Поправочные коэффициенты по группе почв
const SOIL_COEFF = { 1: 1.0, 2: 1.0, 3: 0.95, 4: 0.90 };

// Поправочные коэффициенты по агрономической зоне
const ZONE_COEFF = {
    1: 0.90, 2: 1.0, 3: 1.0, 4: 1.0, 5: 1.0, 6: 1.0,
    7: 1.0, 8: 0.95, 9: 1.0, 10: 1.0, 11: 0.90, 12: 0.90,
};

/**
 * @returns {{pog:number, normMln:number, rateKgHa:number}|null}
 */
export function calculateSeedingRate({
                                         cropId, thousandGrainMass, purity, germination, soilGroupId, zoneId,
                                     }) {
    const base = BASE_NORMS_MLN[Number(cropId)];
    const m = Number(thousandGrainMass);
    if (!base || !m || m <= 0) return null;

    const pog = (Number(purity) * Number(germination)) / 100; // посевная годность, %
    if (pog <= 0) return null;

    const normMln = base
        * (SOIL_COEFF[Number(soilGroupId)] ?? 1)
        * (ZONE_COEFF[Number(zoneId)] ?? 1);

    const rateKgHa = (normMln * m * 100) / pog; // кг/га

    return { pog, normMln, rateKgHa };
}