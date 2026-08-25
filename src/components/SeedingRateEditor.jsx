import { useState } from 'react';
import { useReferences } from '../context/ReferenceContext';
import { calcCellNorm, calcSeedingParameters } from '../utils/seedingCalc';

const inp = { width: '100%', padding: '6px 8px', marginTop: 4, borderRadius: 4, border: '1px solid #ccc', boxSizing: 'border-box' };
const lbl = { display: 'block', marginBottom: 8, fontSize: 13 };

export function SeedingRateEditor({ field, onSave, onClose }) {
    const refs = useReferences();
    const d = field.data || {};

    const [cropId, setCropId] = useState(Number(d.cropType) || refs.crops[0]?.id || 1);
    const [mass1000, setMass1000] = useState(40);
    const [purity, setPurity] = useState(98);
    const [germination, setGermination] = useState(95);
    const [manual, setManual] = useState(false);
    const [fertilizerId, setFertilizerId] = useState('');
    const [npk, setNpk] = useState({ k: 16, p: 16, n: 16 });
    const [soilId, setSoilId] = useState(Number(d.soilType) || '');
    const [subjectId, setSubjectId] = useState(Number(d.subjectId) || '');
    const [result, setResult] = useState(null);

    const invalidate = () => setResult(null);
    const soilGroupId = soilId ? refs.getSoilGroupByTypeId(soilId) : null;
    const zoneId = subjectId ? refs.getSubject(subjectId)?.zone_id ?? null : null;

    const pickFertilizer = (id) => {
        setFertilizerId(id);
        const f = (refs.fertilizers || []).find(x => x.id === Number(id));
        if (f) setNpk({ k: f.k2o, p: f.p2o5, n: f.nitrogen });
        invalidate();
    };

    const buildParams = () => ({
        cropId: Number(cropId), soilId: Number(soilId), soilGroupId, zoneId,
        subjectId: Number(subjectId), mass1000: Number(mass1000),
        purity: Number(purity), germination: Number(germination),
        percentageK: Number(npk.k), percentageP: Number(npk.p),
    });

    const handleCalc = () => {
        const p = buildParams();
        const cells = (field.plots || []).map((plot, idx) => {
            const sample = (d.agrochemistry?.samples || []).find(s =>
                s.plotIndex !== undefined ? s.plotIndex === idx : s.number === idx + 1);
            if (!sample?.values) return { plotIndex: idx, error: 'Нет пробы агрохимии' };
            return { plotIndex: idx, ...calcCellNorm(sample.values, p, refs) };
        });
        setResult({ cells, ...calcSeedingParameters(p, refs) });
    };

    const handleApply = () => {
        onSave({ ...d, seeding: { params: buildParams(), ...result } });
        onClose();
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal" style={{ maxWidth: 420, maxHeight: '90vh', overflowY: 'auto' }}
                 onClick={e => e.stopPropagation()}>
                <h3>🌱 Режим расчёта нормы высева</h3>

                <b style={{ fontSize: 13 }}>Параметры семенного материала</b>
                <label style={lbl}>Культура
                    <select style={inp} value={cropId} onChange={e => { setCropId(e.target.value); invalidate(); }}>
                        {refs.crops.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                </label>
                <label style={lbl}>Масса 1000 зерен, г
                    <input style={inp} type="number" value={mass1000} onChange={e => { setMass1000(e.target.value); invalidate(); }} /></label>
                <label style={lbl}>Чистота семян, %
                    <input style={inp} type="number" value={purity} onChange={e => { setPurity(e.target.value); invalidate(); }} /></label>
                <label style={lbl}>Всхожесть, %
                    <input style={inp} type="number" value={germination} onChange={e => { setGermination(e.target.value); invalidate(); }} /></label>

                <b style={{ fontSize: 13 }}>Параметры удобрений</b>
                <label style={lbl}><input type="checkbox" checked={manual}
                                          onChange={e => { setManual(e.target.checked); invalidate(); }} /> Ручной ввод</label>
                {!manual && (
                    <label style={lbl}>Удобрение
                        <select style={inp} value={fertilizerId} onChange={e => pickFertilizer(e.target.value)}>
                            <option value="">--- выберите ---</option>
                            {(refs.fertilizers || []).map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
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

                <b style={{ fontSize: 13 }}>Дополнительные параметры</b>
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
                        <div>Междурядья: <b>{result.rowWidth} см</b>, глубина: <b>{result.seedDepth} мм</b></div>
                        <table style={{ width: '100%', fontSize: 12, marginTop: 6 }}>
                            <thead><tr><th>Участок</th><th>Высев, кг/га</th><th>Удобр., кг/га</th></tr></thead>
                            <tbody>
                            {result.cells.map(c => (
                                <tr key={c.plotIndex}>
                                    <td>№ {c.plotIndex + 1}</td>
                                    <td>{c.seedingRate ? c.seedingRate.toFixed(1) : `⚠️ ${c.error}`}</td>
                                    <td>{c.fertilizationRate ? c.fertilizationRate.toFixed(1) : '—'}</td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    </div>
                )}

                <div className="modal-actions">
                    <button className="btn-primary" onClick={handleCalc}
                            disabled={!soilId || !subjectId}>Расчет</button>
                    <button className="btn-primary" onClick={handleApply} disabled={!result}>Применить</button>
                    <button className="btn-secondary" onClick={onClose}>Отмена</button>
                </div>
            </div>
        </div>
    );
}