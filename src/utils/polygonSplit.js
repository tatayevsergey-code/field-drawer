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
            // Считаем расстояние от начала линии для сортировки
            const dist = Math.hypot(inter[0] - lineStart[0], inter[1] - lineStart[1]);
            intersections.push({ point: inter, edgeIndex: i, distance: dist });
        }
    }

    // Сортируем по расстоянию от начала линии
    intersections.sort((a, b) => a.distance - b.distance);

    return intersections;
}

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
 * Расстояние от точки до отрезка
 */
function pointToSegmentDistance(p, a, b) {
    const [px, py] = [p[1], p[0]];
    const [ax, ay] = [a[1], a[0]];
    const [bx, by] = [b[1], b[0]];

    const len2 = (bx - ax) ** 2 + (by - ay) ** 2;
    if (len2 === 0) return Math.hypot(px - ax, py - ay);

    let t = ((px - ax) * (bx - ax) + (py - ay) * (by - ay)) / len2;
    t = Math.max(0, Math.min(1, t));

    const projX = ax + t * (bx - ax);
    const projY = ay + t * (by - ay);

    return Math.hypot(px - projX, py - projY);
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
        const dist = pointToSegmentDistance(point, p1, p2);

        if (dist < minDist) {
            minDist = dist;
            const [px, py] = [point[1], point[0]];
            const [ax, ay] = [p1[1], p1[0]];
            const [bx, by] = [p2[1], p2[0]];
            const len2 = (bx - ax) ** 2 + (by - ay) ** 2;
            let t = len2 === 0 ? 0 : Math.max(0, Math.min(1, ((px - ax) * (bx - ax) + (py - ay) * (by - ay)) / len2));
            result = {
                point: [ay + t * (by - ay), ax + t * (bx - ax)],
                edgeIndex: i,
                distance: dist
            };
        }
    }

    return result;
}

/**
 * Строит полигон, обходя от точки A до точки B по контуру
 */
function buildSubPolygon(polygon, pointA, edgeA, pointB, edgeB) {
    const result = [];
    const n = polygon.length;

    result.push([...pointA]);

    let idx = edgeA;
    while (true) {
        idx = (idx + 1) % n;
        result.push([...polygon[idx]]);
        if (idx === edgeB) {
            result.push([...pointB]);
            break;
        }
        if (result.length > n + 2) break;
    }

    return result;
}

/**
 * Разрезает полигон линией, проходящей через две точки.
 * Если линия пересекает полигон 2N раз, создаёт N разрезов.
 * @param {number[][]} polygonCoords — массив вершин [lat, lng]
 * @param {number[]} pointA — первая точка [lat, lng] (клик пользователя)
 * @param {number[]} pointB — вторая точка [lat, lng] (клик пользователя)
 * @returns {number[][][]} массив полигонов-результата
 */
export function splitPolygonByLine(polygonCoords, pointA, pointB) {
    // 1. Находим ВСЕ пересечения линии с полигоном
    const intersections = findAllIntersections(pointA, pointB, polygonCoords);

    // Должно быть чётное количество пересечений (вход-выход)
    if (intersections.length < 2 || intersections.length % 2 !== 0) {
        return null;
    }

    // 2. Если только 2 пересечения — один разрез (старая логика)
    if (intersections.length === 2) {
        const [interA, interB] = intersections;
        const poly1 = buildSubPolygon(polygonCoords, interA.point, interA.edgeIndex, interB.point, interB.edgeIndex);
        const poly2 = buildSubPolygon(polygonCoords, interB.point, interB.edgeIndex, interA.point, interA.edgeIndex);
        return [poly1, poly2];
    }

    // 3. Множественные пересечения: разбиваем попарно
    // Собираем все точки разреза: пересечения + вершины между ними
    const cuts = [];
    for (let i = 0; i < intersections.length; i += 2) {
        const start = intersections[i];
        const end = intersections[i + 1];

        // Строим полигон для этой пары
        const subPoly = buildSubPolygon(
            polygonCoords,
            start.point, start.edgeIndex,
            end.point, end.edgeIndex
        );

        if (subPoly.length >= 3) {
            cuts.push(subPoly);
        }
    }

    // Также нужен "остаточный" полигон между последней и первой точкой
    // если линия входит-выходит несколько раз, остаток тоже полигон
    const lastInter = intersections[intersections.length - 1];
    const firstInter = intersections[0];
    const remainder = buildSubPolygon(
        polygonCoords,
        lastInter.point, lastInter.edgeIndex,
        firstInter.point, firstInter.edgeIndex
    );

    if (remainder.length >= 3) {
        cuts.push(remainder);
    }

    return cuts.length >= 2 ? cuts : null;
}