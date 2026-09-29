// import { describe, it, expect } from 'vitest';
import { parseSowingRaw, sowingPointErrors, formatSowingTime } from './sowing';

describe('parseSowingRaw', () => {
    it('возвращает {} при отсутствии raw', () => {
        expect(parseSowingRaw({})).toEqual({});
        expect(parseSowingRaw(null)).toEqual({});
        expect(parseSowingRaw(undefined)).toEqual({});
    });

    it('парсит JSON-строку', () => {
        const raw = '{"alarmSowingUnit":[1,2],"speed":10}';
        expect(parseSowingRaw({ raw })).toEqual({
            alarmSowingUnit: [1, 2],
            speed: 10,
        });
    });

    it('возвращает {} при невалидном JSON', () => {
        expect(parseSowingRaw({ raw: 'not a json' })).toEqual({});
    });

    it('возвращает объект как есть, если это уже объект', () => {
        const obj = { alarmSowingUnit: [1] };
        expect(parseSowingRaw({ raw: obj })).toBe(obj);
    });
});

describe('sowingPointErrors', () => {
    it('возвращает пустой массив при отсутствии тревог', () => {
        expect(sowingPointErrors({})).toEqual([]);
        expect(sowingPointErrors({ alarmSowingUnit: 0 })).toEqual([]);
        expect(sowingPointErrors({ alarmSowingUnit: [0, 0] })).toEqual([]);
    });

    it('декодирует все 5 типов тревог', () => {
        const raw = {
            alarmSowingUnit: [1],
            alarmEmptyBunker: 1,
            alarmBlower: [0, 1],
            alarmPressureBunker: 1,
            alarmSpeed: 1,
        };
        const errors = sowingPointErrors(raw);
        expect(errors.length).toBe(5);
        expect(errors[0]).toMatch(/высевающ/i);
        expect(errors[1]).toMatch(/бункер/i);
        expect(errors[2]).toMatch(/вентилятор/i);
        expect(errors[3]).toMatch(/давление/i);
        expect(errors[4]).toMatch(/скорость/i);
    });

    it('работает с массивами и числами', () => {
        expect(sowingPointErrors({ alarmSowingUnit: [0, 0, 1] }).length).toBe(1);
        expect(sowingPointErrors({ alarmSowingUnit: 5 }).length).toBe(1);
    });
});

describe('formatSowingTime', () => {
    it('форматирует ISO в русский формат', () => {
        const result = formatSowingTime('2024-11-18T07:16:18.677Z');
        // Ожидаем что-то вроде "18.11.2024 10:16:18" (локальное время)
        expect(result).toMatch(/\d{2}\.\d{2}\.\d{4} \d{2}:\d{2}:\d{2}/);
    });

    it('возвращает исходную строку при невалидной дате', () => {
        expect(formatSowingTime('not-a-date')).toBe('not-a-date');
    });

    it('возвращает "" для пустого ввода', () => {
        expect(formatSowingTime('')).toBe('');
        expect(formatSowingTime(null)).toBe('');
        expect(formatSowingTime(undefined)).toBe('');
    });
});