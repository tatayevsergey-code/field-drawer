import { useState, useMemo, useEffect } from 'react';
import { useReferences } from '../context/ReferenceContext';
import { calcCellNorm, calcSeedingParameters } from '../utils/seedingCalc';

const inp = {
    width: '100%', padding: '6px 8px', marginTop: 4,
    borderRadius: 4, border: '1px solid #ccc', fontSize: 14, boxSizing: 'border-box',
};
const lbl = { display: 'block', marginBottom: 8, fontSize: 13 };
const h4 = { margin: '14px 0 8px', fontSize: 14 };
const cellStyle = { border: '1px solid #bbb', padding: '4px 6px', textAlign: 'center' };
const thStyle = { ...cellStyle, background: '#e8e8e8' };

const toNum = (v) => {
    const n = Number(v);
    return Number.isFinite(n) && n > 0 ? n : '';
};

export function SeedingRateEditor({ field, existing, onSave, onClose }) {
    const refs = useReferences();
    const d = field?.data || {};

    // ─── Параметры семенного материала ───
    const [cropId, setCropId]             = useState(toNum(d.cropType) || refs.crops[0]?.id || '');
    const [mass1000, setMass1000]         = useState(40);
    const [purity, setPurity]             = useState(98);
    const [germination, setGermination]   = useState(95);

    // ─── Параметры удобрения ───
    const [manual, setManual]             = useState(false);
    const [fertilizerId, setFertilizerId] = useState('');
    const [npk, setNpk]                   = useState({ k: 16, p: 16, n: 16 });

    // ─── Дополнительные параметры: сразу из структуры поля ───
    const [soilId, setSoilId]             = useState(toNum(d.soilType));
    const [subjectId, setSubjectId]       = useState(() => {
        const direct = toNum(d.subjectId);
        if (direct) return direct;
        const cr = d.countryRegion;
        if (cr) {
            const byId = toNum(cr.id);
            if (byId && refs.getSubject(byId)) return byId;
            if (cr.full_name) {
                const byName = refs.subjects.find(
                    s => s.name.toLowerCase() === String(cr.full_name).toLowerCase()
                )?.id;
                if (byName) return byName;
            }
        }
        return '';
    });

    const [result, setResult] = useState(null);

    // ─── Догрузился сохранённый расчёт с сервера — подставляем в форму и таблицу ───
    useEffect(() => {
        if (!existing) return;
        if (existing.crop_id)     setCropId(existing.crop_id);
        if (existing.soil_id)     setSoilId(existing.soil_id);
        if (existing.subject_id)  setSubjectId(existing.subject_id);
        if (existing.mass_1000)   setMass1000(existing.mass_1000);
        if (existing.purity)      setPurity(existing.purity);
        if (existing.germination) setGermination(existing.germination);
        setManual(Boolean(existing.manual_fertilizer));
        if (existing.fertilizer_id) setFertilizerId(String(existing.fertilizer_id));
        setNpk({
            k: existing.percentage_k ?? 16,
            p: existing.percentage_p ?? 16,
            n: existing.percentage_n ?? 16,
        });
        if (Array.isArray(existing.norms) && existing.norms.length > 0) {
            setResult({
                cells: existing.norms.map(n => ({
                    plotIndex: n.plot_index,
                    kap: n.kap,
                    seedingRate: n.seeding_rate,
                    fertilizationRate: n.fertilization_rate,
                })),
                rowWidth: existing.row_width ?? 0,
                seedDepth: existing.seed_depth ?? 0,
            });
        }
    }, [existing]);

    // Удобрения по алфавиту
    const fertilizers = useMemo(
        () => [...(refs.fertilizers || [])].sort((a, b) => a.name.localeCompare(b.name, 'ru')),
        [refs.fertilizers]
    );

    const pickFertilizer = (id) => {
        setFertilizerId(id);
        const f = fertilizers.find(x => x.id === Number(id));
        if (f) setNpk({ k: f.k2o, p: f.p2o5, n: f.nitrogen });
        setResult(null);
    };

    const invalidate = () => setResult(null);

    const buildParams = () => ({
        cropId: Number(cropId),
        soilId: Number(soilId),
        soilGroupId: refs.getSoilGroupByTypeId(soilId),
        zoneId: refs.getSubject(subjectId)?.zone_id ?? null,
        subjectId: Number(subjectId),
        mass1000: Number(mass1000),
        purity: Number(purity),
        germination: Number(germination),
        percentageK: Number(npk.k),
        percentageP: Number(npk.p),
    });

    const handleCalc = () => {
        const p = buildParams();
        const cells = (field.plots || []).map((plot, idx) => {
            const sample = (d.agrochemistry?.samples || []).find(s =>
                s.plotIndex !== undefined ? s.plotIndex === idx : s.number === idx + 1
            );
            if (!sample?.values) return { plotIndex: idx, error: 'Нет пробы агрохимии' };
            return { plotIndex: idx, ...calcCellNorm(sample.values, p, refs) };
        });
        setResult({ cells, ...calcSeedingParameters(p, refs), params: p });
    };

    // «Применить» — отдаём payload наверх (App сохраняет через gateway в БД)
    const handleApply = () => {
        const p = buildParams();
        onSave({
            cropId: p.cropId,
            soilId: p.soilId,
            subjectId: p.subjectId,
            mass1000: p.mass1000,
            purity: p.purity,
            germination: p.germination,
            percentageK: p.percentageK,
            percentageP: p.percentageP,
            percentageN: Number(npk.n),
            fertilizerId: fertilizerId ? Number(fertilizerId) : 0,
            manualFertilizer: manual,
            rowWidth: result?.rowWidth ?? 0,
            seedDepth: result?.seedDepth ?? 0,
            norms: (result?.cells || [])
                .filter(c => c.seedingRate != null)
                .map(c => ({
                    plotIndex: c.plotIndex,
                    kap: c.kap ?? 0,
                    seedingRate: c.seedingRate,
                    fertilizationRate: c.fertilizationRate ?? 0,
                })),
        });
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal" style={{ maxWidth: 420, maxHeight: '90vh', overflowY: 'auto' }}
                 onClick={e => e.stopPropagation()}>
                <h3>🌱 Режим расчёта нормы высева</h3>

                <h4 style={h4}>Параметры семенного материала</h4>
                <label style={lbl}>Культура
                    <select style={inp} value={cropId} onChange={e => { setCropId(e.target.value); invalidate(); }}>
                        {refs.crops.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                </label>
                <label style={lbl}>Масса 1000 зерен, г
                    <input style={inp} type="number" value={mass1000}
                           onChange={e => { setMass1000(e.target.value); invalidate(); }} /></label>
                <label style={lbl}>Чистота семян, %
                    <input style={inp} type="number" value={purity}
                           onChange={e => { setPurity(e.target.value); invalidate(); }} /></label>
                <label style={lbl}>Всхожесть, %
                    <input style={inp} type="number" value={germination}
                           onChange={e => { setGermination(e.target.value); invalidate(); }} /></label>

                <h4 style={h4}>Параметры удобрений</h4>
                {/* чекбокс и подпись в одну строку */}
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, fontSize: 13, cursor: 'pointer' }}>
                    <input type="checkbox" checked={manual}
                           onChange={e => { setManual(e.target.checked); invalidate(); }}
                           style={{ width: 'auto', margin: 0, cursor: 'pointer' }} />
                    <span>Ручной ввод</span>
                </label>
                {!manual && (
                    <label style={lbl}>Удобрение
                        <select style={inp} value={fertilizerId} onChange={e => pickFertilizer(e.target.value)}>
                            <option value="">--- выберите ---</option>
                            {fertilizers.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                        </select>
                    </label>
                )}
                <label style={lbl}>Калий, %
                    <input style={inp} type="number" disabled={!manual} value={npk.k}
                           onChange={e => { setNpk(s => ({ ...s, k: e.target.value })); invalidate(); }} /></label>
                <label style={lbl}>Фосфор, %
                    <input style={inp} type="number" disabled={!manual} value={npk.p}
                           onChange={e => { setNpk(s => ({ ...s, p: e.target.value })); invalidate(); }} /></label>
                <label style={lbl}>Азот, %
                    <input style={inp} type="number" disabled={!manual} value={npk.n}
                           onChange={e => { setNpk(s => ({ ...s, n: e.target.value })); invalidate(); }} /></label>

                <label style={lbl}>Тип почвы
                    <select style={inp} value={soilId} onChange={e => { setSoilId(e.target.value); invalidate(); }}>
                        <option value="">--- выберите ---</option>
                        {refs.soils.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                </label>
                <label style={lbl}>Район
                    <select style={inp} value={subjectId} onChange={e => { setSubjectId(e.target.value); invalidate(); }}>
                        <option value="">--- выберите ---</option>
                        {refs.subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                </label>

                {result && (
                    <div style={{ background: '#f5f5f5', borderRadius: 6, padding: 10, fontSize: 13, marginBottom: 10 }}>
                        <div style={{ textAlign: 'center' }}>
                            Междурядья: <b>{result.rowWidth} см</b>, глубина: <b>{result.seedDepth} мм</b>
                        </div>
                        <table style={{
                            width: '100%', fontSize: 12, marginTop: 6,
                            borderCollapse: 'collapse', textAlign: 'center',
                        }}>
                            <thead>
                            <tr>
                                <th style={thStyle}>Участок</th>
                                <th style={thStyle}>Высев, кг/га</th>
                                <th style={thStyle}>Удобр., кг/га</th>
                            </tr>
                            </thead>
                            <tbody>
                            {result.cells.map(c => (
                                <tr key={c.plotIndex}>
                                    <td style={cellStyle}>№ {c.plotIndex + 1}</td>
                                    <td style={cellStyle}>
                                        {c.seedingRate != null ? c.seedingRate.toFixed(1) : `⚠️ ${c.error || '—'}`}
                                    </td>
                                    <td style={cellStyle}>
                                        {c.fertilizationRate != null ? c.fertilizationRate.toFixed(1) : '—'}
                                    </td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    </div>
                )}

                <div className="modal-actions">
                    <button type="button" className="btn-primary" onClick={handleCalc}
                            disabled={!soilId || !subjectId || !cropId}>Расчет</button>
                    <button type="button" className="btn-primary" onClick={handleApply}
                            disabled={!result} style={!result ? { opacity: 0.5, cursor: 'not-allowed' } : undefined}>
                        Применить</button>
                    <button type="button" className="btn-secondary" onClick={onClose}>Отмена</button>
                </div>
            </div>
        </div>
    );
}