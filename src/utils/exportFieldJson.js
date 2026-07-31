import { AGRO_PARAMS } from './agrochemistry';
import { getSoilName } from './soils';

/**
 * Преобразует координаты из нашего формата [lat, lng] в GeoJSON [lng, lat]
 */
function convertToGeoJSON(coords) {
    return coords.map(([lat, lng]) => [lng, lat]);
}

/**
 * Экспортирует поле в JSON для передачи на backend
 * @param {Object} field - объект поля из состояния
 * @returns {Object} JSON в формате backend
 */
export function exportFieldToJson(field) {
    // Внешний контур: если сохранён при импорте — используем его, иначе берём первый plot
    const outerBoundary = field.data.outerBoundary || field.plots[0]?.coordinates || [];
    const outerCoords = convertToGeoJSON(outerBoundary);

    // Участки (grid_cells)
    const gridCells = field.plots.map((plot, idx) => ({
        number: idx + 1,
        border: {
            type: "Polygon",
            coordinates: [convertToGeoJSON(plot.coordinates)]
        }
    }));

    // Вещества из справочника
    const substances = AGRO_PARAMS.map(p => ({
        id: p.id,
        name: p.name,
        symbol: p.unit
    }));

    // Пробы с значениями
    const samples = (field.data.agrochemistry?.samples || []).map(s => ({
        number: s.number,
        count_substances: Object.entries(s.values || {}).map(([subId, count]) => ({
            count: count,
            substance_id: Number(subId)
        }))
    }));

    // Тип почвы
    const soilTypeId = field.data.soilType ? Number(field.data.soilType) : null;

    return {
        id: field.id,
        name: field.data.name || "Без названия",
        characteristic: {
            coordinate: {
                type: "MultiPolygon",
                coordinates: [[outerCoords]]
            }
        },
        soil_agrophysical_property: {
            soil_type: soilTypeId ? {
                id: soilTypeId,
                name: getSoilName(soilTypeId),
                name_with_organization: getSoilName(soilTypeId)
            } : null
        },
        agrochemical_analysis: {
            substances,
            grid_cells: gridCells,
            samples
        },
        country_region: field.data.countryRegion || null
    };
}