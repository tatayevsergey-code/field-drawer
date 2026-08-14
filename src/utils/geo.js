/**
 * Преобразует координаты из нашего формата [lat, lng] в GeoJSON [lng, lat]
 */
function convertToGeoJSON(coords) {
    return coords.map(([lat, lng]) => [lng, lat]);
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