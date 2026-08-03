import { calculateArea } from './geo';
import { SOIL_TYPES, SOIL_GROUPS } from './soils';

function isPoint(arr) {
    return Array.isArray(arr) && arr.length === 2 && typeof arr[0] === 'number';
}

/**
 * GeoJSON → наш формат [lat, lng]
 */
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

/**
 * Парсит JSON поля из внешней системы
 * @param {Object} json
 * @returns {{coordinates: number[][], data: Object}}
 */
export function parseImportedField(json) {
    // --- Геометрия ---
    const coordinates = convertGeoJSONCoords(json.characteristic.coordinate.coordinates);
    const area = calculateArea(coordinates).toFixed(2);

    // --- Тип почвы: ID группы из JSON → первый тип из нашей группы ---
    let soilTypeId = '';
    const importedGroupId = json.soil_agrophysical_property?.soil_type?.id;
    if (importedGroupId && SOIL_GROUPS[importedGroupId]) {
        const firstSoil = SOIL_TYPES.find(s => s.groupId === importedGroupId);
        if (firstSoil) {
            soilTypeId = firstSoil.id;
        }
    }

    // --- Примечания: только регион ---
    const notesParts = [];
    if (json.country_region?.full_name) {
        notesParts.push(`Регион: ${json.country_region.full_name}`);
    }

    // --- Агрохимия ---
    const agrochemistry = {
        samples: [],
        gridCells: []
    };

    if (json.agrochemical_analysis) {
        if (json.agrochemical_analysis.samples) {
            agrochemistry.samples = json.agrochemical_analysis.samples.map(s => {
                const values = {};
                s.count_substances?.forEach(cs => {
                    values[cs.substance_id] = cs.count;
                });
                // plotIndex связывает пробу с участком (number-1 из внешнего формата)
                return {
                    number: s.number,
                    plotIndex: s.number - 1,
                    values
                };
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
        area: area,
        soilType: soilTypeId,
        notes: notesParts.join('\n'),
        agrochemistry,
        outerBoundary: coordinates,
        countryRegion: json.country_region || null
    };

    return { coordinates, data };
}