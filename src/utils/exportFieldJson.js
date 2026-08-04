import { AGRO_PARAMS } from './agrochemistry';
import { getSoilName } from './soils';
import { getRegion, getSubject } from './regions';

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

    let countryRegion = field.data.countryRegion || null;
    // Если нет country_region, но есть regionId, создаём из наших данных
    if (!countryRegion && field.data.regionId) {
        const region = getRegion(field.data.regionId);
        if (region) {
            countryRegion = {
                full_name: region.name,
                name: region.name,
                // code пытаемся найти среди субъектов
                code: null
            };
        }
    }

    return {
        id: field.id,
        name: field.data.name || "Без названия",
        region_id: field.data.regionId || null, // ← добавляем region_id
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