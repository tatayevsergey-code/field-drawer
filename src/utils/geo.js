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

    // Пробы с значениями — группируем по plotIndex, для каждого участка первая проба
    const rawSamples = field.data.agrochemistry?.samples || [];
    const samples = [];

    field.plots.forEach((_, plotIdx) => {
        const plotSamples = rawSamples.filter(s =>
            s.plotIndex !== undefined ? s.plotIndex === plotIdx : s.number === plotIdx + 1
        );
        // Берём первую пробу участка (или создаём пустую заглушку)
        const s = plotSamples[0] || { values: {} };
        samples.push({
            number: plotIdx + 1,
            count_substances: Object.entries(s.values || {}).map(([subId, count]) => ({
                count: count,
                substance_id: Number(subId)
            }))
        });
    });

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

/**
 * Расчёт площади полигона по формуле Гаусса (шаровая аппроксимация)
 * Возвращает площадь в гектарах
 */
export function calculateArea(coords) {
    if (!coords || coords.length < 3) return 0;
    let area = 0;
    const n = coords.length;
    for (let i = 0; i < n; i++) {
        const [lat1, lng1] = coords[i];
        const [lat2, lng2] = coords[(i + 1) % n];
        area += (lng2 - lng1) * (2 + Math.sin(lat1 * Math.PI / 180) + Math.sin(lat2 * Math.PI / 180));
    }
    area = Math.abs(area) * 6371 * 6371 / 2 * Math.PI / 180;
    return area * 100; // км² → га (приближённо)
}

/**
 * Суммарная площадь всех участков поля
 */
export function calculateTotalArea(field) {
    return field.plots.reduce((sum, p) => sum + (parseFloat(p.area) || 0), 0);
}