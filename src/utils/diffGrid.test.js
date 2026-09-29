// import { describe, it, expect } from 'vitest';
import { buildDiffGrid, buildDiffGridCells } from './diffGrid';

const square = [
    [55.00, 37.00],
    [55.00, 37.01],
    [55.01, 37.01],
    [55.01, 37.00],
];

const baseParams = {
    direction: 0,
    seederWidth: 6,
    multiplicity: 5,
    offsetX: 0,
    offsetY: 0,
};

describe('buildDiffGrid', () => {
    it('возвращает null для пустого массива', () => {
        expect(buildDiffGrid([], baseParams)).toBeNull();
        expect(buildDiffGrid(null, baseParams)).toBeNull();
    });

    it('возвращает null для менее 3 точек', () => {
        expect(buildDiffGrid([[0, 0], [1, 1]], baseParams)).toBeNull();
    });

    it('возвращает null при cell <= 0 (ширина сеялки 0)', () => {
        expect(buildDiffGrid(square, { ...baseParams, seederWidth: 0 })).toBeNull();
        expect(buildDiffGrid(square, { ...baseParams, multiplicity: 0 })).toBeNull();
    });

    it('возвращает линии и cellSize для валидного полигона', () => {
        const grid = buildDiffGrid(square, baseParams);
        expect(grid).not.toBeNull();
        expect(grid.cellSize).toBe(30); // 6 * 5
        expect(grid.lines.length).toBeGreaterThan(0);
        grid.lines.forEach(line => {
            expect(line.length).toBe(2);
            expect(line[0].length).toBe(2);
        });
    });
});

describe('buildDiffGridCells', () => {
    it('возвращает null для пустого списка участков', () => {
        expect(buildDiffGridCells([], baseParams)).toBeNull();
    });

    it('возвращает ячейки, обрезанные по контуру', () => {
        const grid = buildDiffGridCells([square], baseParams);
        expect(grid).not.toBeNull();
        expect(grid.cellSize).toBe(30);
        expect(grid.cells.length).toBeGreaterThan(0);
        grid.cells.forEach(cell => {
            expect(cell.length).toBeGreaterThanOrEqual(3);
        });
    });

    it('работает с несколькими участками', () => {
        const square2 = [
            [55.02, 37.00],
            [55.02, 37.01],
            [55.03, 37.01],
            [55.03, 37.00],
        ];
        const grid = buildDiffGridCells([square, square2], baseParams);
        expect(grid.cells.length).toBeGreaterThan(0);
    });
});