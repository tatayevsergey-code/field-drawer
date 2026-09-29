// import { describe, it, expect } from 'vitest';
import { parseImportedField } from './importFieldJson';

const mockSubjects = [
    { id: 5, name: 'Тамбовская область', zone_id: 2, codes: ['68'] },
];
const mockZones = [{ id: 2, name: 'Центральная' }];

const refs = {
    soils: [{ id: 10, group_id: 1, name: 'Чернозём' }],
    subjects: mockSubjects,
    zones: mockZones,
    // Добавляем хелперы, которые вызывает importFieldJson.js
    getSubject: (id) => mockSubjects.find(s => s.id === Number(id)),
    getRegion: (id) => mockZones.find(z => z.id === Number(id)),
    findRegionByCode: (code) => {
        const subj = mockSubjects.find(s => (s.codes || []).includes(String(code)));
        return subj ? subj.zone_id : null;
    },
    findRegionByName: (name) => {
        const subj = mockSubjects.find(s => s.name.toLowerCase().includes(name.toLowerCase()));
        return subj ? subj.zone_id : null;
    },
};

const baseJson = {
    name: 'Поле 1',
    cadastral_number: '68:01:0001234:567',
    characteristic: {
        coordinate: {
            type: 'MultiPolygon',
            coordinates: [[[37.0, 55.0], [37.01, 55.0], [37.01, 55.01], [37.0, 55.01]]],
        },
    },
    soil_agrophysical_property: { soil_type: { id: 1 } },
    country_region: { id: 5 },
};

describe('parseImportedField', () => {
    it('парсит минимальный JSON', () => {
        const { coordinates, data } = parseImportedField(baseJson, refs);
        expect(coordinates.length).toBe(4);
        expect(data.name).toBe('Поле 1');
        expect(data.cadastralNumber).toBe('68:01:0001234:567');
        expect(data.soilType).toBe(10); // первый тип из группы 1
        expect(data.subjectId).toBe(5);
        expect(data.regionId).toBe(2);
    });

    it('определяет субъект по коду', () => {
        const json = {
            ...baseJson,
            country_region: { code: '68' },
        };
        const { data } = parseImportedField(json, refs);
        expect(data.subjectId).toBe(5);
    });

    it('определяет субъект по точному имени', () => {
        const json = {
            ...baseJson,
            country_region: { full_name: 'Тамбовская область' },
        };
        const { data } = parseImportedField(json, refs);
        expect(data.subjectId).toBe(5);
    });

    it('обрабатывает агрохимию', () => {
        const json = {
            ...baseJson,
            agrochemical_analysis: {
                samples: [{ number: 1, count_substances: [{ substance_id: 2, count: 15 }] }],
                grid_cells: [
                    { number: 1, border: { type: 'Polygon', coordinates: [[[37, 55], [37.005, 55], [37.005, 55.005], [37, 55.005]]] } },
                ],
            },
        };
        const { data } = parseImportedField(json, refs);
        expect(data.agrochemistry.samples.length).toBe(1);
        expect(data.agrochemistry.samples[0].values[2]).toBe(15);
        expect(data.agrochemistry.gridCells.length).toBe(1);
    });

    it('выбрасывает ошибку при неверном формате координат', () => {
        const json = {
            ...baseJson,
            characteristic: { coordinate: { type: 'MultiPolygon', coordinates: [[['a', 'b']]] } },
        };
        expect(() => parseImportedField(json, refs)).toThrow();
    });
});