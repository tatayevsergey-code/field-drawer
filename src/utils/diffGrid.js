// Математика сетки дифпосева: локальная метровая проекция, поворот
// ПО ЧАСОВОЙ, смещения, линии превью и ячейки, обрезанные по контуру поля.

const M_PER_DEG_LAT = 110540;
const mPerDegLng = (lat0) => 111320 * Math.cos((lat0 * Math.PI) / 180);

function createProjector(coords) {
    let lat0 = 0, lng0 = 0;
    coords.forEach(([lat, lng]) => { lat0 += lat; lng0 += lng; });
    lat0 /= coords.length;
    lng0 /= coords.length;
    const kx = mPerDegLng(lat0);
    const ky = M_PER_DEG_LAT;
    return {
        toXY: ([lat, lng]) => [(lng - lng0) * kx, (lat - lat0) * ky],
        toLatLng: ([x, y]) => [lat0 + y / ky, lng0 + x / kx],
    };
}

// Каркас сетки: проекция, поворот, размер ячейки, диапазон
function createGridFrame(allCoords, p) {
    const direction = Number(p.direction) || 0;
    const cell = (Number(p.seederWidth) || 0) * (Number(p.multiplicity) || 0);
    const offsetX = Number(p.offsetX) || 0;
    const offsetY = Number(p.offsetY) || 0;

    const proj = createProjector(allCoords);
    const rad = (direction * Math.PI) / 180;
    const cos = Math.cos(rad), sin = Math.sin(rad);
    // поворот ПО ЧАСОВОЙ стрелке
    const toGrid   = ([x, y]) => [ x * cos - y * sin,  x * sin + y * cos];
    const fromGrid = ([u, v]) => [ u * cos + v * sin, -u * sin + v * cos];

    let umin = Infinity, umax = -Infinity, vmin = Infinity, vmax = -Infinity;
    for (const pt of allCoords) {
        const [u, v] = toGrid(proj.toXY(pt));
        if (u < umin) umin = u;
        if (u > umax) umax = u;
        if (v < vmin) vmin = v;
        if (v > vmax) vmax = v;
    }

    return { proj, toGrid, fromGrid, cell, offsetX, offsetY, umin, umax, vmin, vmax };
}

/**
 * Линии сетки для живого превью (не обрезаны, с запасом вокруг поля).
 * @param {number[][]} fieldCoords плоский массив [lat,lng] всех участков
 */
export function buildDiffGrid(fieldCoords, p) {
    if (!fieldCoords || fieldCoords.length < 3) return null;
    const f = createGridFrame(fieldCoords, p);
    if (f.cell <= 0) return null;

    const margin = f.cell;
    const umin = f.umin - margin, umax = f.umax + margin;
    const vmin = f.vmin - margin, vmax = f.vmax + margin;
    const u0 = Math.floor((umin - f.offsetX) / f.cell) * f.cell + f.offsetX;
    const v0 = Math.floor((vmin - f.offsetY) / f.cell) * f.cell + f.offsetY;

    const lines = [];
    for (let u = u0; u <= umax; u += f.cell) {
        lines.push([f.proj.toLatLng(f.fromGrid([u, vmin])), f.proj.toLatLng(f.fromGrid([u, vmax]))]);
    }
    for (let v = v0; v <= vmax; v += f.cell) {
        lines.push([f.proj.toLatLng(f.fromGrid([umin, v])), f.proj.toLatLng(f.fromGrid([umax, v]))]);
    }
    return { cellSize: f.cell, lines };
}

// ─── Обрезка полигона прямоугольником (Сазерленд–Ходжман) ─────
function intersectEdge(a, b, axis, value) {
    const ai = axis === 'x' ? a[0] : a[1];
    const bi = axis === 'x' ? b[0] : b[1];
    const t = (value - ai) / (bi - ai);
    if (axis === 'x') return [value, a[1] + t * (b[1] - a[1])];
    return [a[0] + t * (b[0] - a[0]), value];
}

function clipPolygonByRect(poly, minX, minY, maxX, maxY) {
    let output = poly.slice();
    const clip = (inside, intersect) => {
        const input = output;
        output = [];
        for (let i = 0; i < input.length; i++) {
            const cur = input[i];
            const prev = input[(i + input.length - 1) % input.length];
            const curIn = inside(cur);
            const prevIn = inside(prev);
            if (curIn) {
                if (!prevIn) output.push(intersect(prev, cur));
                output.push(cur);
            } else if (prevIn) {
                output.push(intersect(prev, cur));
            }
        }
    };
    clip(pt => pt[0] >= minX, (a, b) => intersectEdge(a, b, 'x', minX));
    clip(pt => pt[0] <= maxX, (a, b) => intersectEdge(a, b, 'x', maxX));
    clip(pt => pt[1] >= minY, (a, b) => intersectEdge(a, b, 'y', minY));
    clip(pt => pt[1] <= maxY, (a, b) => intersectEdge(a, b, 'y', maxY));
    return output;
}

/**
 * Ячейки сетки, обрезанные по контуру поля.
 * @param {number[][][]} plots массив контуров участков ([lat,lng][])
 * @returns {{cellSize:number, cells:number[][][]}|null}
 */
export function buildDiffGridCells(plots, p) {
    const polys = (plots || []).filter(c => c && c.length >= 3);
    if (polys.length === 0) return null;
    const f = createGridFrame(polys.flat(), p);
    if (f.cell <= 0) return null;

    const u0 = Math.floor((f.umin - f.offsetX) / f.cell) * f.cell + f.offsetX;
    const v0 = Math.floor((f.vmin - f.offsetY) / f.cell) * f.cell + f.offsetY;

    const cells = [];
    for (const poly of polys) {
        const gp = poly.map(pt => f.toGrid(f.proj.toXY(pt)));
        for (let u = u0; u < f.umax; u += f.cell) {
            for (let v = v0; v < f.vmax; v += f.cell) {
                const clipped = clipPolygonByRect(gp, u, v, u + f.cell, v + f.cell);
                if (clipped.length >= 3) {
                    cells.push(clipped.map(([gu, gv]) => f.proj.toLatLng(f.fromGrid([gu, gv]))));
                }
            }
        }
    }
    return { cellSize: f.cell, cells };
}