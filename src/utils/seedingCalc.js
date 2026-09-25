// src/utils/seedingCalc.js

export const SUBST = { P: 2, K: 3, HUMUS: 7, PH: 18 };
const MIN_PH = 3.5, MIN_P = 2.0, MIN_K = 2.0, MIN_HUMUS = 0.5;

const BONITET_REGION_ALIAS = { 83: 18, 84: 9 };
export const bonitetRegionFor = (subjectId) =>
    BONITET_REGION_ALIAS[Number(subjectId)] || Number(subjectId);

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

export function seedingRateKgHa(bonitetMax, recSeedRate, kap, purityFr, germinationFr, mass1000) {
    if (purityFr === 0 || germinationFr === 0) return 0;
    const norm = recommendedNorm(bonitetMax, kap, recSeedRate, 0.2, 0.1);
    return (norm * mass1000) / (purityFr * germinationFr);
}

export function fertilizerRateKgHa(bonitetMax, recFertRate, kap, substancePercent) {
    if (substancePercent === 0) return 0;
    const value = (recFertRate * 100) / substancePercent;
    return recommendedNorm(bonitetMax, kap, value, 0.15, 1.0);
}

// ← ИЗМЕНЕНО: возвращаем объект { value, isExtrapolated } вместо просто значения
const findMax = (refs, agrochemId, zoneId, soilGroupId) => {
    const row = (refs.limits || []).find(l =>
        l.agrochem_id === Number(agrochemId) &&
        l.zone_id === Number(zoneId) &&
        l.soil_group_id === Number(soilGroupId));
    return row ? { value: row.max_value, isExtrapolated: !!row.is_extrapolated } : null;
};

const findSeedRate = (refs, cropId, soilId, zoneId) => {
    const row = (refs.seed_rates || []).find(r =>
        r.crop_id === Number(cropId) && r.soil_id === Number(soilId) && r.zone_id === Number(zoneId));
    return row ? { value: row.seed_rate, isExtrapolated: !!row.is_extrapolated } : null;
};

const findFertRate = (refs, cropId, zoneId, agrochemId, soilGroupId) => {
    const row = (refs.fert_rates || []).find(r =>
        r.crop_id === Number(cropId) && r.zone_id === Number(zoneId) &&
        r.agrochem_id === Number(agrochemId) && r.soil_group_id === Number(soilGroupId));
    return row ? { value: row.value, isExtrapolated: !!row.is_extrapolated } : null;
};

const findBonitet = (refs, subjectId, soilId) => {
    const row = (refs.bonitet || []).find(b =>
        b.region_id === bonitetRegionFor(subjectId) && b.soil_id === Number(soilId));
    return row ? { value: row.max_value, isExtrapolated: false } : null; // бонитет не экстраполируется
};

const findRowWidth = (refs, cropId, soilGroupId, zoneId) => {
    const row = (refs.row_widths || []).find(r =>
        r.crop_id === Number(cropId) && r.soil_group_id === Number(soilGroupId) && r.zone_id === Number(zoneId));
    return row ? { value: row.width, isExtrapolated: !!row.is_extrapolated } : null;
};

const findSeedDepth = (refs, cropId, soilId, zoneId) => {
    const row = (refs.seed_depths || []).find(r =>
        r.crop_id === Number(cropId) && r.soil_id === Number(soilId) && r.zone_id === Number(zoneId));
    return row ? { value: row.depth, isExtrapolated: !!row.is_extrapolated } : null;
};

// Вспомогательная: собирает все флаги isExtrapolated из найденных нормативов
const anyExtrapolated = (...items) => items.some(v => v?.isExtrapolated);

export function calcCellNorm(cellValues, p, refs) {
    const pH = cellValues[SUBST.PH], G = cellValues[SUBST.HUMUS];
    const P  = cellValues[SUBST.P],  K = cellValues[SUBST.K];

    // Проверяем наличие значений агрохимии
    const missingValues = [];
    if (pH == null) missingValues.push('pH');
    if (G == null) missingValues.push('Гумус');
    if (P == null) missingValues.push('Фосфор');
    if (K == null) missingValues.push('Калий');

    if (missingValues.length > 0) {
        return { error: `Нет значений агрохимии: ${missingValues.join(', ')}` };
    }

    const pHMax   = findMax(refs, SUBST.PH,    p.zoneId, p.soilGroupId);
    const GMax    = findMax(refs, SUBST.HUMUS, p.zoneId, p.soilGroupId);
    const KMax    = findMax(refs, SUBST.K,     p.zoneId, p.soilGroupId);
    const PMax    = findMax(refs, SUBST.P,     p.zoneId, p.soilGroupId);

    // Проверяем наличие нормативов
    const missingNorms = [];
    if (!pHMax) missingNorms.push('pH');
    if (!GMax) missingNorms.push('Гумус');
    if (!KMax) missingNorms.push('Калий');
    if (!PMax) missingNorms.push('Фосфор');

    if (missingNorms.length > 0) {
        return { error: `Нет нормативов для: ${missingNorms.join(', ')} (зона ${p.zoneId}, группа почв ${p.soilGroupId})` };
    }

    const scorePh    = ((pH - MIN_PH)     / (pHMax.value - MIN_PH)) * 100;
    const scoreGumus = ((G  - MIN_HUMUS)  / (GMax.value  - MIN_HUMUS)) * 100;
    const scoreK     = ((K * 0.1 - MIN_K) / (KMax.value  - MIN_K)) * 100;
    const scoreP     = ((P * 0.1 - MIN_P) / (PMax.value  - MIN_P)) * 100;

    const op = (scorePh + scoreGumus + scoreK + scoreP) / 4;
    const kopt = 1 - ((Math.abs(op - scoreP) + Math.abs(op - scoreGumus) +
        Math.abs(op - scoreK) + Math.abs(op - scorePh)) / (op * 4));
    const kap = op * kopt;

    const seedRow = findSeedRate(refs, p.cropId, p.soilId, p.zoneId);
    if (!seedRow) return { error: `Не найдена норма высева (культура ${p.cropId}, почва ${p.soilId}, зона ${p.zoneId})` };

    const limiting = scoreK <= scoreP
        ? { id: SUBST.K, percent: p.percentageK }
        : { id: SUBST.P, percent: p.percentageP };

    const fertRow = findFertRate(refs, p.cropId, p.zoneId, limiting.id, p.soilGroupId);
    if (!fertRow) return { error: `Не найдена норма удобрения (культура ${p.cropId}, зона ${p.zoneId}, вещество ${limiting.id}, группа ${p.soilGroupId})` };

    const bonitet = findBonitet(refs, p.subjectId, p.soilId);
    if (!bonitet) return { error: `Не найден бонитет (субъект ${p.subjectId}, почва ${p.soilId})` };

    const hasExtrapolated = anyExtrapolated(pHMax, GMax, KMax, PMax, seedRow, fertRow);

    return {
        kap,
        hasExtrapolated,
        seedingRate: seedingRateKgHa(bonitet.value, seedRow.value, kap,
            p.purity / 100, p.germination / 100, p.mass1000),
        fertilizationRate: fertilizerRateKgHa(bonitet.value, fertRow.value, kap, limiting.percent),
    };
}

export function calcSeedingParameters(p, refs) {
    const rw = findRowWidth(refs, p.cropId, p.soilGroupId, p.zoneId);
    const sd = findSeedDepth(refs, p.cropId, p.soilId, p.zoneId);
    return {
        rowWidth: rw?.value ?? 0,
        seedDepth: sd?.value ?? 0,
        // ← НОВОЕ: флаг для параметров посева
        hasExtrapolatedParams: anyExtrapolated(rw, sd),
    };
}