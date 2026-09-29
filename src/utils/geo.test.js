// import { describe, it, expect } from 'vitest';
import { calculateArea, calculateTotalArea } from './geo';

describe('calculateArea', () => {
    it('возвращает 0 для менее 3 точек', () => {
        expect(calculateArea([])).toBe(0);
        expect(calculateArea([[0, 0]])).toBe(0);
        expect(calculateArea([[0, 0], [1, 1]])).toBe(0);
    });

    it('возвращает 0 для null/undefined', () => {
        expect(calculateArea(null)).toBe(0);
        expect(calculateArea(undefined)).toBe(0);
    });

    it('квадрат ~100x111 м в центре Москвы ≈ 1.11 га', () => {
        // 1° широты ≈ 111 км, 1° долготы на 55° ≈ 63.8 км
        // Берём прямоугольник 0.001° × 0.001° ≈ 63.8 × 111 м ≈ 0.71 га
        const coords = [
            [55.7500, 37.6100],
            [55.7500, 37.6110],
            [55.7510, 37.6110],
            [55.7510, 37.6100],
        ];
        const area = calculateArea(coords);
        expect(area).toBeGreaterThan(0.5);
        expect(area).toBeLessThan(1.0);
    });

    it('площадь не зависит от порядка обхода (по/против часовой)', () => {
        const cw = [
            [55.0, 37.0],
            [55.0, 37.01],
            [55.01, 37.01],
            [55.01, 37.0],
        ];
        const ccw = [...cw].reverse();
        const a1 = calculateArea(cw);
        const a2 = calculateArea(ccw);
        expect(a1).toBeCloseTo(a2, 6);
    });

    it('очень маленький полигон даёт маленькую площадь', () => {
        const tiny = [
            [55.0, 37.0],
            [55.0, 37.00001],
            [55.00001, 37.00001],
            [55.00001, 37.0],
        ];
        expect(calculateArea(tiny)).toBeLessThan(0.001); // меньше 0.001 га
    });
});

describe('calculateTotalArea', () => {
    it('суммирует площади всех участков', () => {
        const field = {
            plots: [{ area: '1.5' }, { area: '2.3' }, { area: '0.7' }],
        };
        expect(calculateTotalArea(field)).toBeCloseTo(4.5, 6);
    });

    it('игнорирует нечисловые значения', () => {
        const field = { plots: [{ area: '1.5' }, { area: '' }, { area: null }] };
        expect(calculateTotalArea(field)).toBeCloseTo(1.5, 6);
    });

    it('пустое поле → 0', () => {
        expect(calculateTotalArea({ plots: [] })).toBe(0);
    });
});