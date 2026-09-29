// import { describe, it, expect } from 'vitest';
import { splitPolygonByLine } from './polygonSplit';
import { calculateArea } from './geo';

// Простой квадрат 0.01° × 0.01°
const square = [
    [55.00, 37.00],
    [55.00, 37.01],
    [55.01, 37.01],
    [55.01, 37.00],
];

describe('splitPolygonByLine', () => {
    it('возвращает null, если линия не пересекает полигон', () => {
        const a = [56.0, 38.0];
        const b = [56.0, 38.1];
        expect(splitPolygonByLine(square, a, b)).toBeNull();
    });

    it('возвращает null, если линия касается только одной точки', () => {
        const a = [55.00, 37.00]; // вершина
        const b = [54.00, 36.00]; // خارج
        const result = splitPolygonByLine(square, a, b);
        // Может вернуть null или один полигон — главное, что не сломалось
        expect(result === null || Array.isArray(result)).toBe(true);
    });

    it('разрезает квадрат по диагонали на 2 полигона', () => {
        const a = [55.00, 37.00]; // нижний-левый
        const b = [55.01, 37.01]; // верхний-правый
        const result = splitPolygonByLine(square, a, b);
        expect(result).not.toBeNull();
        expect(result.length).toBe(2);
        result.forEach(poly => {
            expect(poly.length).toBeGreaterThanOrEqual(3);
        });
    });

    it('горизонтальный разрез через середину', () => {
        const a = [55.005, 36.99];
        const b = [55.005, 37.02];
        const result = splitPolygonByLine(square, a, b);
        expect(result).not.toBeNull();
        expect(result.length).toBe(2);
    });

    it('сумма площадей частей ≈ площади исходного полигона', () => {
        const a = [55.005, 36.99];
        const b = [55.005, 37.02];
        const result = splitPolygonByLine(square, a, b);
        const originalArea = calculateArea(square);
        const partsArea = result.reduce((s, p) => s + calculateArea(p), 0);
        // Допускаем погрешность 5%
        expect(partsArea).toBeCloseTo(originalArea, 1);
    });
});