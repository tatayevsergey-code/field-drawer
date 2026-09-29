// import { describe, it, expect } from 'vitest';
import { parseSowingCsv } from './parseSowingCsv';

const validCsv = [
    'time;longitude;latitude;speed;course;alarmSowingUnit;alarmEmptyBunker',
    '2024-11-18T07:16:18Z;37.61;55.75;10.5;180;0;0',
    '2024-11-18T07:16:19Z;37.62;55.76;11.0;180;1,2;0',
].join('\n');

describe('parseSowingCsv', () => {
    it('выбрасывает ошибку для пустого файла или файла только с заголовком', () => {
        expect(() => parseSowingCsv('')).toThrow(/Файл пуст/);
        expect(() => parseSowingCsv('time;longitude;latitude')).toThrow(/Файл пуст/);
    });

    it('выбрасывает ошибку при отсутствии обязательных колонок', () => {
        expect(() => parseSowingCsv('a;b;c\n1;2;3')).toThrow(/time\/longitude\/latitude/);
    });

    it('парсит валидный CSV', () => {
        const result = parseSowingCsv(validCsv);
        expect(result.points.length).toBe(2);
        expect(result.points[0].lat).toBeCloseTo(55.75);
        expect(result.points[0].lng).toBeCloseTo(37.61);
        expect(result.points[0].speed).toBeCloseTo(10.5);
        expect(result.points[0].time).toBe('2024-11-18T07:16:18Z');
    });

    it('обрабатывает списки тревог', () => {
        const result = parseSowingCsv(validCsv);
        // Вторая точка: alarmSowingUnit = "1,2" → status = max(0, 1, 2) = 2
        expect(result.points[1].status).toBeGreaterThanOrEqual(1);
    });

    it('пропускает строки с невалидными координатами', () => {
        const csv = [
            'time;longitude;latitude',
            '2024-01-01T00:00:00Z;abc;55.0',  // не число
            '2024-01-01T00:00:01Z;37.0;55.0', // ок
        ].join('\n');
        const result = parseSowingCsv(csv);
        expect(result.points.length).toBe(1);
    });
});