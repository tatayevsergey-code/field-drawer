import { calculateArea } from './geo';

export function parseImportedField(json, refs) {
    // --- Геометрия ---
    const coordinates = convertGeoJSONCoords(json.characteristic.coordinate.coordinates);
    const area = calculateArea(coordinates).toFixed(2);

    // --- Тип почвы: ID группы из JSON → первый тип из группы в БД ---
    let soilTypeId = '';
    const importedGroupId = json.soil_agrophysical_property?.soil_type?.id;
    if (importedGroupId) {
        const firstSoil = refs.soils.find(s => s.group_id === Number(importedGroupId));
        if (firstSoil) soilTypeId = firstSoil.id;
    }

    // --- Регион ---
    let regionId = null;
    const countryRegion = json.country_region;
    if (countryRegion) {
        if (countryRegion.code) {
            regionId = refs.findRegionByCode(countryRegion.code);
        }
        if (!regionId && countryRegion.full_name) {
            regionId = refs.findRegionByName(countryRegion.full_name);
        }
        if (!regionId && countryRegion.name) {
            regionId = refs.findRegionByName(countryRegion.name);
        }
    }
    if (!regionId && json.region_id) {
        regionId = Number(json.region_id);
        if (!refs.getRegion(regionId)) regionId = null;
    }

    // --- Агрохимия (без изменений) ---
    const agrochemistry = { samples: [], gridCells: [] };
    if (json.agrochemical_analysis) {
        if (json.agrochemical_analysis.samples) {
            agrochemistry.samples = json.agrochemical_analysis.samples.map(s => {
                const values = {};
                s.count_substances?.forEach(cs => {
                    values[cs.substance_id] = cs.count;
                });
                return { number: s.number, plotIndex: s.number - 1, values };
            });
        }
        if (json.agrochemical_analysis.grid_cells) {
            agrochemistry.gridCells = json.agrochemical_analysis.grid_cells.map(cell => ({
                number: cell.number,
                coordinates: convertGeoJSONCoords(cell.border.coordinates)
            }));
        }
    }

    const data = {
        name: json.name || 'Импортированное поле',
        cropType: '',
        area,
        soilType: soilTypeId,
        regionId,
        notes: '',
        agrochemistry,
        outerBoundary: coordinates,
        countryRegion: json.country_region || null
    };
    return { coordinates, data };
}

function convertGeoJSONCoords(geoJsonCoords) {
    let ring;
    if (isPoint(geoJsonCoords[0][0])) {
        ring = geoJsonCoords[0];
    } else if (isPoint(geoJsonCoords[0][0][0])) {
        ring = geoJsonCoords[0][0];
    } else {
        throw new Error('Неизвестный формат координат GeoJSON');
    }
    return ring.map(([lng, lat]) => [lat, lng]);
}

function isPoint(arr) {
    return Array.isArray(arr) && arr.length === 2 && typeof arr[0] === 'number';
}