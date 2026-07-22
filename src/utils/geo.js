/**
 * Вычисляет площадь полигона на сфероиде WGS-84
 * @param {number[][]} coords - массив точек [[lat, lng], ...]
 * @returns {number} площадь в гектарах
 */
export function calculateArea(coords) {
    const R = 6371000;
    let area = 0;

    for (let i = 0; i < coords.length; i++) {
        const [lat1, lng1] = coords[i];
        const [lat2, lng2] = coords[(i + 1) % coords.length];

        const x = (lng2 - lng1) * Math.cos((lat1 + lat2) / 2 * Math.PI / 180);
        const y = (lat2 - lat1);
        area += x * y;
    }

    return Math.abs(area) * R * R * Math.PI / 180 / 180 / 10000;
}