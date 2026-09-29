// import { describe, it, expect } from 'vitest';
import {
    calcCellNorm,
    calcSeedingParameters,
    seedingRateKgHa,
    fertilizerRateKgHa,
    SUBST,
} from './seedingCalc';

// ─── Моковые справочники ───────────────────────────────────────
const makeRefs = (overrides = {}) => ({
    limits: [
        { agrochem_id: SUBST.PH,    zone_id: 2, soil_group_id: 1, max_value: 7.5, is_extrapolated: false },
        { agrochem_id: SUBST.HUMUS, zone_id: 2, soil_group_id: 1, max_value: 8.0, is_extrapolated: false },
        { agrochem_id: SUBST.K,     zone_id: 2, soil_group_id: 1, max_value: 40,  is_extrapolated: true  }, // экстраполяция
        { agrochem_id: SUBST.P,     zone_id: 2, soil_group_id: 1, max_value: 35,  is_extrapolated: false },
    ],
    seed_rates: [{ crop_id: 2, soil_id: 3, zone_id: 2, seed_rate: 2.5, is_extrapolated: false }],
    fert_rates: [{ crop_id: 2, zone_id: 2, agrochem_id: SUBST.K, soil_group_id: 1, value: 90, is_extrapolated: false }],
    bonitet:  [{ region_id: 2, soil_id: 3, max_value: 55 }],
    row_widths:  [{ crop_id: 2, soil_group_id: 1, zone_id: 2, width: 15, is_extrapolated: false }],
    seed_depths: [{ crop_id: 2, soil_id: 3, zone_id: 2, depth: 40, is_extrapolated: false }],
    ...overrides,
});

const baseParams = {
    cropId: 2, soilId: 3, soilGroupId: 1, zoneId: 2, subjectId: 2,
    mass1000: 40, purity: 98, germination: 95,
    percentageK: 16, percentageP: 16,
};

const baseValues = {
    [SUBST.PH]: 6.0,
    [SUBST.HUMUS]: 5.0,
    [SUBST.P]: 40,
    [SUBST.K]: 20,
};

describe('seedingRateKgHa', () => {
    it('возвращает 0 при нулевой чистоте', () => {
        expect(seedingRateKgHa(55, 2.5, 50, 0, 0.95, 40)).toBe(0);
    });

    it('возвращает 0 при нулевой всхожести', () => {
        expect(seedingRateKgHa(55, 2.5, 50, 0.98, 0, 40)).toBe(0);
    });

    it('положительное значение при валидных данных', () => {
        const rate = seedingRateKgHa(55, 2.5, 50, 0.98, 0.95, 40);
        expect(rate).toBeGreaterThan(0);
        expect(Number.isFinite(rate)).toBe(true);
    });
});

describe('fertilizerRateKgHa', () => {
    it('возвращает 0 при нулевом проценте вещества', () => {
        expect(fertilizerRateKgHa(55, 90, 50, 0)).toBe(0);
    });

    it('положительное значение при валидных данных', () => {
        const rate = fertilizerRateKgHa(55, 90, 50, 16);
        expect(rate).toBeGreaterThan(0);
    });
});

describe('calcCellNorm', () => {
    it('возвращает ошибку при отсутствии pH', () => {
        const values = { ...baseValues };
        delete values[SUBST.PH];
        const result = calcCellNorm(values, baseParams, makeRefs());
        expect(result.error).toMatch(/pH/);
    });

    it('возвращает ошибку при отсутствии всех значений агрохимии', () => {
        const result = calcCellNorm({}, baseParams, makeRefs());
        expect(result.error).toMatch(/Нет значений агрохимии/);
    });

    it('возвращает ошибку при отсутствии норматива для зоны', () => {
        const refs = makeRefs({
            limits: [], // пусто
        });
        const result = calcCellNorm(baseValues, baseParams, refs);
        expect(result.error).toMatch(/Нет нормативов/);
    });

    it('возвращает ошибку при отсутствии нормы высева', () => {
        const refs = makeRefs({ seed_rates: [] });
        const result = calcCellNorm(baseValues, baseParams, refs);
        expect(result.error).toMatch(/норма высева/);
    });

    it('возвращает ошибку при отсутствии нормы удобрения', () => {
        const refs = makeRefs({ fert_rates: [] });
        const result = calcCellNorm(baseValues, baseParams, refs);
        expect(result.error).toMatch(/норма удобрения/);
    });

    it('возвращает ошибку при отсутствии бонитета', () => {
        const refs = makeRefs({ bonitet: [] });
        const result = calcCellNorm(baseValues, baseParams, refs);
        expect(result.error).toMatch(/бонитет/);
    });

    it('успешный расчёт: все поля заполнены', () => {
        const result = calcCellNorm(baseValues, baseParams, makeRefs());
        expect(result.error).toBeUndefined();
        expect(result.seedingRate).toBeGreaterThan(0);
        expect(result.fertilizationRate).toBeGreaterThan(0);
        expect(typeof result.kap).toBe('number');
    });

    it('флаг hasExtrapolated=true, если K экстраполирован', () => {
        const result = calcCellNorm(baseValues, baseParams, makeRefs());
        expect(result.hasExtrapolated).toBe(true);
    });

    it('флаг hasExtrapolated=false, если всё "родное"', () => {
        const refs = makeRefs({
            limits: [
                { agrochem_id: SUBST.PH,    zone_id: 2, soil_group_id: 1, max_value: 7.5, is_extrapolated: false },
                { agrochem_id: SUBST.HUMUS, zone_id: 2, soil_group_id: 1, max_value: 8.0, is_extrapolated: false },
                { agrochem_id: SUBST.K,     zone_id: 2, soil_group_id: 1, max_value: 40,  is_extrapolated: false },
                { agrochem_id: SUBST.P,     zone_id: 2, soil_group_id: 1, max_value: 35,  is_extrapolated: false },
            ],
        });
        const result = calcCellNorm(baseValues, baseParams, refs);
        expect(result.hasExtrapolated).toBe(false);
    });

    it('результат стабилен: одинаковые входные → одинаковый выход', () => {
        const r1 = calcCellNorm(baseValues, baseParams, makeRefs());
        const r2 = calcCellNorm(baseValues, baseParams, makeRefs());
        expect(r1.seedingRate).toBe(r2.seedingRate);
        expect(r1.fertilizationRate).toBe(r2.fertilizationRate);
    });
});

describe('calcSeedingParameters', () => {
    it('возвращает rowWidth и seedDepth из справочников', () => {
        const result = calcSeedingParameters(baseParams, makeRefs());
        expect(result.rowWidth).toBe(15);
        expect(result.seedDepth).toBe(40);
    });

    it('возвращает 0, если в справочниках нет записи', () => {
        const refs = makeRefs({ row_widths: [], seed_depths: [] });
        const result = calcSeedingParameters(baseParams, refs);
        expect(result.rowWidth).toBe(0);
        expect(result.seedDepth).toBe(0);
    });
});