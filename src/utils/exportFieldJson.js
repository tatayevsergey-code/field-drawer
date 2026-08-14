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
export function exportFieldToJson(field, refs) {
    const outerBoundary = field.data.outerBoundary || field.plots[0]?.coordinates || [];
    const outerCoords = convertToGeoJSON(outerBoundary);

    const gridCells = field.plots.map((plot, idx) => ({
        number: idx + 1,
        border: { type: 'Polygon', coordinates: [convertToGeoJSON(plot.coordinates)] }
    }));

    const substances = refs.agro_params.map(p => ({
        id: p.id, name: p.name, symbol: p.unit
    }));

    const samples = (field.data.agrochemistry?.samples || []).map(s => ({
        number: s.number,
        count_substances: Object.entries(s.values || {}).map(([subId, count]) => ({
            count, substance_id: Number(subId)
        }))
    }));

    const soilTypeId = field.data.soilType ? Number(field.data.soilType) : null;
    let countryRegion = field.data.countryRegion || null;
    if (!countryRegion && field.data.regionId) {
        const region = refs.getRegion(field.data.regionId);
        if (region) {
            countryRegion = { full_name: region.name, name: region.name, code: null };
        }
    }

    return {
        id: field.id,
        name: field.data.name || 'Без названия',
        region_id: field.data.regionId || null,
        characteristic: { coordinate: { type: 'MultiPolygon', coordinates: [[outerCoords]] } },
        soil_agrophysical_property: {
            soil_type: soilTypeId ? {
                id: soilTypeId,
                name: refs.getSoilName(soilTypeId),
                name_with_organization: refs.getSoilName(soilTypeId)
            } : null
        },
        agrochemical_analysis: { substances, grid_cells: gridCells, samples },
        country_region: countryRegion
    };
}