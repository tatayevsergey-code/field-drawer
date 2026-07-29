/**
 * Вычисляет площадь полигона на сфероиде WGS-84
 * Формула сферического эксцесса (Гаусса-Бонне)
 * @param {number[][]} coords - массив точек [[lat, lng], ...]
 * @returns {number} площадь в гектарах
 */
export function calculateArea(coords) {
    if (!coords || coords.length < 3) return 0;

    const R = 6371000; // радиус Земли в метрах
    let area = 0;
    const n = coords.length;

    for (let i = 0; i < n; i++) {
        const [lat1, lng1] = coords[i];
        const [lat2, lng2] = coords[(i + 1) % n];

        const lat1Rad = lat1 * Math.PI / 180;
        const lat2Rad = lat2 * Math.PI / 180;
        const dLng = (lng2 - lng1) * Math.PI / 180;

        area += dLng * (2 + Math.sin(lat1Rad) + Math.sin(lat2Rad));
    }

    area = Math.abs(area) * R * R / 2;
    return area / 10000; // в гектарах
}

export function calculateTotalArea(plots) {
    return plots.reduce((sum, plot) => sum + (parseFloat(plot.area) || 0), 0);
}

/**
 * Сдвигает точку за пределы полигона в направлении от центра
 * Это гарантирует, что линия разреза пересечёт полигон
 */
export function adjustPointOutsidePolygon(point, polygon) {
    // Находим центр масс полигона
    let centerLat = 0, centerLng = 0;
    for (const [lat, lng] of polygon) {
        centerLat += lat;
        centerLng += lng;
    }
    centerLat /= polygon.length;
    centerLng /= polygon.length;

    // Вектор от центра к точке
    const dLat = point[0] - centerLat;
    const dLng = point[1] - centerLng;

    // Удлиняем вектор в 10 раз — точка далеко за пределами полигона
    const extendedLat = centerLat + dLat * 10;
    const extendedLng = centerLng + dLng * 10;

    return [extendedLat, extendedLng];
}

/**
 * Ray casting algorithm — точка внутри полигона?
 */
export function isPointInPolygon(point, polygon) {
    const [lat, lng] = point;
    let inside = false;

    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
        const [latI, lngI] = polygon[i];
        const [latJ, lngJ] = polygon[j];

        if (((latI > lat) !== (latJ > lat)) &&
            (lng < (lngJ - lngI) * (lat - latI) / (latJ - latI) + lngI)) {
            inside = !inside;
        }
    }

    return inside;
}