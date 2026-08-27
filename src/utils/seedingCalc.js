// src/utils/seedingCalc.js
// Порт методики расчёта десктопного SeedCalculator / SeedingAlgorithm.

export const SUBST = { P: 2, K: 3, HUMUS: 7, PH: 18 };

const MIN_PH = 3.5, MIN_P = 2.0, MIN_K = 2.0, MIN_HUMUS = 0.5;

// ─── Москва и СПб приравниваются к Московской и Ленинградской областям ───
const BONITET_REGION_ALIAS = { 83: 18, 84: 9 };
export const bonitetRegionFor = (subjectId) =>
    BONITET_REGION_ALIAS[Number(subjectId)] || Number(subjectId);

// SeedingAlgorithm::recomendedNorm
function recommendedNorm(bonitetMax, kap, rec, offset, k = 0.1) {
    if (kap < bonitetMax) {
        const max = rec + rec * offset;
        const norm = rec + (bonitetMax - kap) * k;
        return norm > max ? max : norm;
    }
    if (kap > bonitetMax) {
        const min = rec - rec * offset;
        const norm = rec - (kap - bonitetMax) * k;
        return norm < min ? min : norm;
    }
    return rec;
}

// SeedingAlgorithm::seedingRate
export function seedingRateKgHa(bonitetMax, recSeedRate, kap, purityFr, germinationFr, mass1000) {
    if (purityFr === 0 || germinationFr === 0) return 0;
    const norm = recommendedNorm(bonitetMax, kap, recSeedRate, 0.2, 0.1);
    return (norm * mass1000) / (purityFr * germinationFr);
}

// SeedingAlgorithm::fertilizerRate
export function fertilizerRateKgHa(bonitetMax, recFertRate, kap, substancePercent) {
    if (substancePercent === 0) return 0;
    const value = (recFertRate * 100) / substancePercent;
    return recommendedNorm(bonitetMax, kap, value, 0.15, 1.0);
}

const findMax = (refs, agrochemId, zoneId, soilGroupId) => {
    const row = (refs.limits || []).find(l =>
        l.agrochem_id === Number(agrochemId) &&
        l.zone_id === Number(zoneId) &&
        l.soil_group_id === Number(soilGroupId));
    return row ? row.max_value : null;
};

/**
 * Расчёт нормы для одной ячейки/участка.
 * @param cellValues значения пробы { [agrochemId]: value }
 * @param p { cropId, soilId, soilGroupId, zoneId, subjectId,
 *            mass1000, purity, germination, percentageK, percentageP }
 */
export function calcCellNorm(cellValues, p, refs) {
    const pH = cellValues[SUBST.PH], G = cellValues[SUBST.HUMUS];
    const P  = cellValues[SUBST.P],  K = cellValues[SUBST.K];
    const pHMax = findMax(refs, SUBST.PH,    p.zoneId, p.soilGroupId);
    const GMax  = findMax(refs, SUBST.HUMUS, p.zoneId, p.soilGroupId);
    const KMax  = findMax(refs, SUBST.K,     p.zoneId, p.soilGroupId);
    const PMax  = findMax(refs, SUBST.P,     p.zoneId, p.soilGroupId);
    if ([pH, G, P, K, pHMax, GMax, KMax, PMax].some(v => v == null)) {
        return { error: 'Нет нормативов/значений для расчёта баллов' };
    }

    const scorePh    = ((pH - MIN_PH)     / (pHMax - MIN_PH)) * 100;
    const scoreGumus = ((G  - MIN_HUMUS)  / (GMax  - MIN_HUMUS)) * 100;
    const scoreK     = ((K * 0.1 - MIN_K) / (KMax  - MIN_K)) * 100;
    const scoreP     = ((P * 0.1 - MIN_P) / (PMax  - MIN_P)) * 100;

    const op = (scorePh + scoreGumus + scoreK + scoreP) / 4;
    const kopt = 1 - ((Math.abs(op - scoreP) + Math.abs(op - scoreGumus) +
        Math.abs(op - scoreK) + Math.abs(op - scorePh)) / (op * 4));
    const kap = op * kopt;

    const seedRow = (refs.seed_rates || []).find(r =>
        r.crop_id === p.cropId && r.soil_id === p.soilId && r.zone_id === p.zoneId);
    if (!seedRow) return { error: 'Не найдена норма высева (seed_rate)' };

    const limiting = scoreK <= scoreP
        ? { id: SUBST.K, percent: p.percentageK }
        : { id: SUBST.P, percent: p.percentageP };

    const fertRow = (refs.fert_rates || []).find(r =>
        r.crop_id === p.cropId && r.zone_id === p.zoneId &&
        r.agrochem_id === limiting.id && r.soil_group_id === p.soilGroupId);
    if (!fertRow) return { error: 'Не найдена норма удобрения (fert_rate)' };

    // ← ВОТ ЗДЕСЬ работает алиас Москва→Моск.обл., СПб→Ленингр.обл.
    const bonitet = (refs.bonitet || []).find(b =>
        b.region_id === bonitetRegionFor(p.subjectId) && b.soil_id === p.soilId);
    if (!bonitet) return { error: 'Не найден бонитет (bonitet)' };

    return {
        kap,
        seedingRate: seedingRateKgHa(bonitet.max_value, seedRow.seed_rate, kap,
            p.purity / 100, p.germination / 100, p.mass1000),
        fertilizationRate: fertilizerRateKgHa(bonitet.max_value, fertRow.value, kap, limiting.percent),
    };
}

// SeedParametersRepository: ширина междурядий и глубина заделки
export function calcSeedingParameters(p, refs) {
    const rw = (refs.row_widths || []).find(r =>
        r.crop_id === p.cropId && r.soil_group_id === p.soilGroupId && r.zone_id === p.zoneId);
    const sd = (refs.seed_depths || []).find(r =>
        r.crop_id === p.cropId && r.soil_id === p.soilId && r.zone_id === p.zoneId);
    return { rowWidth: rw?.width ?? 0, seedDepth: sd?.depth ?? 0 };
}