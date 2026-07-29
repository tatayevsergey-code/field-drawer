/**
 * Пересечение двух отрезков [a,b] и [c,d]
 * Координаты: [lat, lng]
 */
function segmentIntersection(a, b, c, d) {
    const x1 = a[1], y1 = a[0];
    const x2 = b[1], y2 = b[0];
    const x3 = c[1], y3 = c[0];
    const x4 = d[1], y4 = d[0];

    const denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
    if (Math.abs(denom) < 1e-10) return null;

    const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denom;
    const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / denom;

    if (t >= -1e-10 && t <= 1 + 1e-10 && u >= -1e-10 && u <= 1 + 1e-10) {
        return [
            y1 + t * (y2 - y1),
            x1 + t * (x2 - x1)
        ];
    }
    return null;
}

/**
 * Находит все пересечения линии с рёбрами полигона
 */
function findAllIntersections(lineStart, lineEnd, polygon) {
    const intersections = [];
    const n = polygon.length;

    for (let i = 0; i < n; i++) {
        const p1 = polygon[i];
        const p2 = polygon[(i + 1) % n];
        const inter = segmentIntersection(lineStart, lineEnd, p1, p2);
        if (inter) {
            const dist = Math.hypot(inter[0] - lineStart[0], inter[1] - lineStart[1]);
            intersections.push({ point: inter, edgeIndex: i, distance: dist });
        }
    }

    intersections.sort((a, b) => a.distance - b.distance);
    return intersections;
}

/**
 * Строит подполигон, обходя контур от edge1 до edge2
 */
function buildSubPolygon(polygon, point1, edge1, point2, edge2) {
    const result = [];
    const n = polygon.length;

    result.push([...point1]);

    let idx = edge1;
    let safety = 0;
    while (safety < n + 2) {
        idx = (idx + 1) % n;
        result.push([...polygon[idx]]);
        if (idx === edge2) {
            result.push([...point2]);
            break;
        }
        safety++;
    }

    return result;
}

/**
 * Разрезает полигон линией через две точки.
 * @param {number[][]} polygonCoords — массив вершин [lat, lng]
 * @param {number[]} pointA — первая точка [lat, lng]
 * @param {number[]} pointB — вторая точка [lat, lng]
 * @returns {number[][][]} массив полигонов-результата
 */
export function splitPolygonByLine(polygonCoords, pointA, pointB) {
    // Удлиняем линию в 100 раз, чтобы гарантированно пересекла полигон
    const [lat1, lng1] = pointA;
    const [lat2, lng2] = pointB;
    const dLat = lat2 - lat1;
    const dLng = lng2 - lng1;

    const extendedA = [lat1 - dLat * 100, lng1 - dLng * 100];
    const extendedB = [lat2 + dLat * 100, lng2 + dLng * 100];

    const intersections = findAllIntersections(extendedA, extendedB, polygonCoords);

    if (intersections.length < 2) {
        return null;
    }

    // Берём первые 2 пересечения — они образуют линию разреза
    const [i1, i2] = intersections;

    const poly1 = buildSubPolygon(polygonCoords, i1.point, i1.edgeIndex, i2.point, i2.edgeIndex);
    const poly2 = buildSubPolygon(polygonCoords, i2.point, i2.edgeIndex, i1.point, i1.edgeIndex);

    const result = [];
    if (poly1.length >= 3) result.push(poly1);
    if (poly2.length >= 3) result.push(poly2);

    return result.length >= 2 ? result : null;
}