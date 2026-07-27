/**
 * Разрезает полигон линией через две точки на его границе
 * Использует алгоритм "обход с вставкой точек разреза"
 */
export function splitPolygonByLine(polygonCoords, pointA, pointB) {
    // Привязываем точки к ближайшим рёбрам
    const snapA = snapToEdge(pointA, polygonCoords);
    const snapB = snapToEdge(pointB, polygonCoords);

    if (!snapA || !snapB) return null;
    if (snapA.edgeIndex === snapB.edgeIndex) return null;

    // Находим порядок точек на контуре
    const n = polygonCoords.length;

    // Строим первый полигон: от A до B по часовой стрелке
    const poly1 = [];
    poly1.push([...snapA.point]);

    let idx = snapA.edgeIndex;
    while (true) {
        idx = (idx + 1) % n;
        poly1.push([...polygonCoords[idx]]);
        if (idx === snapB.edgeIndex) {
            poly1.push([...snapB.point]);
            break;
        }
        if (poly1.length > n + 2) break; // защита
    }

    // Строим второй полигон: от B до A по часовой стрелке
    const poly2 = [];
    poly2.push([...snapB.point]);

    idx = snapB.edgeIndex;
    while (true) {
        idx = (idx + 1) % n;
        poly2.push([...polygonCoords[idx]]);
        if (idx === snapA.edgeIndex) {
            poly2.push([...snapA.point]);
            break;
        }
        if (poly2.length > n + 2) break; // защита
    }

    // Добавляем линию разреза в оба полигона (точки уже вставлены)
    // poly1: A -> ... -> B -> (линия обратно к A)
    // poly2: B -> ... -> A -> (линия обратно к B)

    // Замыкаем полигоны
    if (poly1.length >= 3 && poly2.length >= 3) {
        return [poly1, poly2];
    }

    return null;
}

/**
 * Привязывает точку к ближайшему ребру полигона
 */
function snapToEdge(point, polygon) {
    let minDist = Infinity;
    let result = null;

    for (let i = 0; i < polygon.length; i++) {
        const p1 = polygon[i];
        const p2 = polygon[(i + 1) % polygon.length];
        const proj = projectToSegment(point, p1, p2);
        const dist = haversine(point, proj);

        if (dist < minDist) {
            minDist = dist;
            result = { point: proj, edgeIndex: i, distance: dist };
        }
    }

    return result;
}

/**
 * Проекция точки на отрезок
 */
function projectToSegment(p, a, b) {
    const [px, py] = [p[1], p[0]]; // lng, lat
    const [ax, ay] = [a[1], a[0]];
    const [bx, by] = [b[1], b[0]];

    const len2 = (bx - ax) ** 2 + (by - ay) ** 2;
    if (len2 === 0) return [...a];

    let t = ((px - ax) * (bx - ax) + (py - ay) * (by - ay)) / len2;
    t = Math.max(0, Math.min(1, t));

    return [
        ay + t * (by - ay), // lat
        ax + t * (bx - ax)  // lng
    ];
}

/**
 * Расстояние Хаверсина (метры)
 */
function haversine(a, b) {
    const R = 6371000;
    const dLat = (b[0] - a[0]) * Math.PI / 180;
    const dLng = (b[1] - a[1]) * Math.PI / 180;
    const lat1 = a[0] * Math.PI / 180;
    const lat2 = b[0] * Math.PI / 180;

    const h = Math.sin(dLat / 2) ** 2 +
        Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(h));
}