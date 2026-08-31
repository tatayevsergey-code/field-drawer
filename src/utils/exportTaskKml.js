import { TASK_EXPORT_FORMAT } from '../config';

const esc = (s) => String(s ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// [lat,lng] → "lng,lat,0 lng,lat,0 ..." (KML-порядок!), кольцо замыкаем
function ringCoordinates(coords) {
    const pts = coords.map(([lat, lng]) => `${lng.toFixed(8)},${lat.toFixed(8)},0`);
    const [la0, lo0] = coords[0];
    const [laN, loN] = coords[coords.length - 1];
    if (la0 !== laN || lo0 !== loN) pts.push(`${lo0.toFixed(8)},${la0.toFixed(8)},0`);
    return pts.join(' ');
}

function collectStats(calc) {
    const norms = (calc.norms || []).filter(n => n.seeding_rate != null);
    const sr = norms.map(n => n.seeding_rate);
    const fr = norms.map(n => n.fertilization_rate ?? 0);
    return {
        maxSeed: sr.length ? Math.max(...sr) : 0,
        minSeed: sr.length ? Math.min(...sr) : 0,
        maxFert: fr.length ? Math.max(...fr) : 0,
        minFert: fr.length ? Math.min(...fr) : 0,
    };
}

// ─── Вариант по эталонному примеру ────────────────────────────
function buildExample(field, calc, refs) {
    const stats = collectStats(calc);
    const area = field.plots.reduce((s, p) => s + (parseFloat(p.area) || 0), 0);
    const fert = refs.getFertilizer(calc.fertilizer_id);
    const fertName = esc(calc.manual_fertilizer ? 'Ручной ввод' : (fert?.name || ''));

    const placemarks = field.plots.map((plot, idx) => {
        const n = (calc.norms || []).find(x => x.plot_index === idx) || {};
        const num = idx + 1;
        return `            <Placemark>
                <name>${num}</name>
                <ExtendedData>
                    <SchemaData schemaUrl="#radiozavod">
                        <SimpleData name="seedingRate">${Math.round(n.seeding_rate ?? 0)}</SimpleData>
                        <SimpleData name="fertilizerRate">${Math.round(n.fertilization_rate ?? 0)}</SimpleData>
                    </SchemaData>
                </ExtendedData>
                <description>${num}</description>
                <Style>
                    <LineStyle>
                        <color>ff0000ff</color>
                    </LineStyle>
                    <PolyStyle>
                        <color>0</color>
                    </PolyStyle>
                </Style>
                <Polygon>
                    <outerBoundaryIs>
                        <LinearRing>
                            <coordinates>${ringCoordinates(plot.coordinates)}</coordinates>
                        </LinearRing>
                    </outerBoundaryIs>
                </Polygon>
            </Placemark>`;
    }).join('\n');

    return `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
    <Document id="root_doc">
        <Schema name="radiozavod" id="radiozavod">
            <SimpleField name="seedingRate" type="int"/>
            <SimpleField name="fertilizerRate" type="int"/>
        </Schema>
        <Schema name="initParameters" id="initParameters">
            <SimpleField name="seedType" type="String"/>
            <SimpleField name="fertilizerType" type="String"/>
            <SimpleField name="fieldArea" type="float"/>
            <SimpleField name="maxSeedingRate" type="float"/>
            <SimpleField name="minSeedingRate" type="float"/>
            <SimpleField name="maxFertilizerRate" type="float"/>
            <SimpleField name="minFertilizerRate" type="float"/>
            <SimpleField name="seedDepth" type="int"/>
            <SimpleField name="rowWidth" type="int"/>
        </Schema>
        <Folder>
            <name>${esc(field.data?.name || '')}</name>
            <ExtendedData>
                <SchemaData schemaUrl="#initParameters">
                    <SimpleData name="seedType" type="String">${esc(refs.getCropName(calc.crop_id))}</SimpleData>
                    <SimpleData name="fertilizerType" type="String">${fertName}</SimpleData>
                    <SimpleData name="fieldArea" type="float">${area.toFixed(2)}</SimpleData>
                    <SimpleData name="maxSeedingRate" type="float">${stats.maxSeed.toFixed(2)}</SimpleData>
                    <SimpleData name="minSeedingRate" type="float">${stats.minSeed.toFixed(2)}</SimpleData>
                    <SimpleData name="maxFertilizerRate" type="float">${stats.maxFert.toFixed(2)}</SimpleData>
                    <SimpleData name="minFertilizerRate" type="float">${stats.minFert.toFixed(2)}</SimpleData>
                    <SimpleData name="seedDepth" type="int">${Math.round(calc.seed_depth ?? 0)}</SimpleData>
                    <SimpleData name="rowWidth" type="int">${Math.round(calc.row_width ?? 0)}</SimpleData>
                </SchemaData>
            </ExtendedData>
${placemarks}
        </Folder>
    </Document>
</kml>
`;
}

// ─── Вариант по утверждённому протоколу ───────────────────────
function buildProtocol(field, calc) {
    const placemarks = field.plots.map((plot, idx) => {
        const n = (calc.norms || []).find(x => x.plot_index === idx) || {};
        const num = idx + 1;
        return `            <Placemark>
                <name>${num}</name>
                <description>${num}</description>
                <Style>
                    <LineStyle>
                        <color>ff0000ff</color>
                    </LineStyle>
                    <PolyStyle>
                        <fill>0</fill>
                    </PolyStyle>
                </Style>
                <ExtendedData>
                    <SchemaData schemaUrl="#radiozavod">
                        <SimpleData name="RATE_SEED">${Math.round(n.seeding_rate ?? 0)}</SimpleData>
                        <SimpleData name="RATE_FERT">${Math.round(n.fertilization_rate ?? 0)}</SimpleData>
                    </SchemaData>
                </ExtendedData>
                <Polygon>
                    <outerBoundaryIs>
                        <LinearRing>
                            <coordinates>${ringCoordinates(plot.coordinates)}</coordinates>
                        </LinearRing>
                    </outerBoundaryIs>
                </Polygon>
            </Placemark>`;
    }).join('\n');

    return `<?xml version="1.0" encoding="utf-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
    <Document id="root_doc">
        <Schema name="radiozavod" id="radiozavod">
            <SimpleField name="RATE_SEED" type="int"></SimpleField> <!-- Норма высева, кг/га -->
            <SimpleField name="RATE_FERT" type="int"></SimpleField> <!-- Норма внесения удобрения, кг/га -->
        </Schema>
        <Folder depth_seed="${Math.round(calc.seed_depth ?? 0)}" row_width="${Math.round(calc.row_width ?? 0)}">
            <name>${esc(field.data?.name || '')}</name>
${placemarks}
        </Folder>
    </Document>
</kml>
`;
}

export function buildTaskKml(field, calc, refs) {
    return TASK_EXPORT_FORMAT === 'protocol'
        ? buildProtocol(field, calc)
        : buildExample(field, calc, refs);
}

export function downloadTaskKml(field, calc, refs) {
    const kml = buildTaskKml(field, calc, refs);
    const blob = new Blob([kml], { type: 'application/vnd.google-earth.kml+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(field.data?.name || 'field').replace(/[\\/:*?"<>|]+/g, '_')}_task.kml`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
}