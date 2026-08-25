import { useState } from 'react';
import { useReferences } from '../context/ReferenceContext';
import { calculateSeedingRate } from '../utils/seedingRate';

const inp = {
    width: '100%', padding: '8px 10px', marginTop: 4,
    borderRadius: 6, border: '1px solid #ccc', fontSize: 14, boxSizing: 'border-box',
};
const lbl = { display: 'block', marginBottom: 10, fontSize: 13, color: '#333' };
const h4 = { margin: '14px 0 10px', fontSize: 14 };

export function SeedingRateEditor({ field, onApply, onClose }) {
    const refs = useReferences();

    // ─── Параметры семенного материала ─────────────────────────
    const [cropId, setCropId] = useState(
        Number(field.data?.cropType) || refs.crops[0]?.id || ''
    );
    const [mass1000, setMass1000] = useState(40);
    const [purity, setPurity] = useState(98);
    const [germination, setGermination] = useState(95);

    // ─── Параметры удобрений ───────────────────────────────────
    const [manual, setManual] = useState(false);
    const [fertilizerId, setFertilizerId] = useState('');
    const [manualNpk, setManualNpk] = useState({ k: '', p: '', n: '' });

    // ─── Дополнительные параметры ──────────────────────────────
    const [soilId, setSoilId] = useState(Number(field.data?.soilType) || '');
    const [subjectId, setSubjectId] = useState(Number(field.data?.subjectId) || '');

    const [result, setResult] = useState(null);

    const fertilizer = refs.getFertilizer(fertilizerId);
    const npk = manual
        ? { k: Number(manualNpk.k) || 0, p: Number(manualNpk.p) || 0, n: Number(manualNpk.n) || 0 }
        : { k: fertilizer?.k2o ?? 0, p: fertilizer?.p2o5 ?? 0, n: fertilizer?.nitrogen ?? 0 };

    const totalArea = (field.plots || [])
        .reduce((s, p) => s + (parseFloat(p.area) || 0), 0);

    const handleCalc = () => {
        const soilGroupId = refs.getSoilGroupByTypeId(soilId);
        const zoneId = refs.getSubject(subjectId)?.zone_id ?? null;
        setResult(calculateSeedingRate({
            cropId,
            thousandGrainMass: mass1000,
            purity,
            germination,
            soilGroupId,
            zoneId,
        }));
    };

    return (
        <div
            className="modal"
            style={{
                position: 'fixed', top: 16, right: 16, zIndex: 1000,
                width: 380, margin: 0, transform: 'none',
                maxHeight: 'calc(100vh - 32px)', overflowY: 'auto',
            }}
        >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <h3 style={{ margin: 0 }}>Режим расчета нормы высева</h3>
                <button type="button" onClick={onClose}
                        style={{ border: 'none', background: 'none', fontSize: 16, cursor: 'pointer', color: '#888' }}>
                    ✕
                </button>
            </div>

            {/* ─── Семенной материал ─── */}
            <h4 style={h4}>Параметры семенного материала</h4>

            <label style={lbl}>Культура
                <select style={inp} value={cropId} onChange={e => setCropId(e.target.value)}>
                    {refs.crops.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
            </label>

            <label style={lbl}>Масса 1000 зерен, г
                <input style={inp} type="number" min="1" step="1"
                       value={mass1000} onChange={e => setMass1000(e.target.value)} />
            </label>

            <label style={lbl}>Чистота семян, %
                <input style={inp} type="number" min="0" max="100" step="1"
                       value={purity} onChange={e => setPurity(e.target.value)} />
            </label>

            <label style={lbl}>Всхожесть, %
                <input style={inp} type="number" min="0" max="100" step="1"
                       value={germination} onChange={e => setGermination(e.target.value)} />
            </label>

            {/* ─── Удобрения ─── */}
            <h4 style={h4}>Параметры удобрений</h4>

            <label style={{ ...lbl, display: 'flex', alignItems: 'center', gap: 8 }}>
                <input type="checkbox" checked={manual}
                       onChange={e => setManual(e.target.checked)} />
                Ручной ввод
            </label>

            <label style={lbl}>Удобрение
                <select style={inp} value={fertilizerId} disabled={manual}
                        onChange={e => setFertilizerId(e.target.value)}>
                    <option value="">--- выберите ---</option>
                    {(refs.fertilizers || []).map(f => (
                        <option key={f.id} value={f.id}>{f.name}</option>
                    ))}
                </select>
            </label>

            <label style={lbl}>Калий, %
                <input style={inp} type="number" min="0" max="100" step="0.1" disabled={!manual}
                       value={manual ? manualNpk.k : (fertilizer ? npk.k : '')}
                       onChange={e => setManualNpk(s => ({ ...s, k: e.target.value }))} />
            </label>

            <label style={lbl}>Фосфор, %
                <input style={inp} type="number" min="0" max="100" step="0.1" disabled={!manual}
                       value={manual ? manualNpk.p : (fertilizer ? npk.p : '')}
                       onChange={e => setManualNpk(s => ({ ...s, p: e.target.value }))} />
            </label>

            <label style={lbl}>Азот, %
                <input style={inp} type="number" min="0" max="100" step="0.1" disabled={!manual}
                       value={manual ? manualNpk.n : (fertilizer ? npk.n : '')}
                       onChange={e => setManualNpk(s => ({ ...s, n: e.target.value }))} />
            </label>

            {/* ─── Дополнительные параметры ─── */}
            <h4 style={h4}>Дополнительные параметры</h4>

            <label style={lbl}>Тип почвы
                <select style={inp} value={soilId} onChange={e => setSoilId(e.target.value)}>
                    <option value="">--- выберите ---</option>
                    {refs.soils.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
            </label>

            <label style={lbl}>Район
                <select style={inp} value={subjectId} onChange={e => setSubjectId(e.target.value)}>
                    <option value="">--- выберите ---</option>
                    {refs.subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
            </label>

            {/* ─── Результат ─── */}
            {result && (
                <div style={{
                    background: '#e8f5e9', border: '1px solid #4caf50', borderRadius: 6,
                    padding: '10px 12px', fontSize: 13, color: '#2e7d32', marginBottom: 12,
                }}>
                    <div>Посевная годность: <b>{result.pog.toFixed(1)} %</b></div>
                    <div>Норма высева: <b>{result.normMln.toFixed(2)} млн шт/га</b></div>
                    <div style={{ fontSize: 15, marginTop: 4 }}>
                        Норма высева: <b>{result.rateKgHa.toFixed(1)} кг/га</b>
                    </div>
                    {totalArea > 0 && (
                        <div style={{ marginTop: 4 }}>
                            На поле {totalArea.toFixed(2)} га: <b>{(result.rateKgHa * totalArea / 1000).toFixed(2)} т</b>
                        </div>
                    )}
                </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <button type="button" onClick={handleCalc}
                        style={{ background: '#1976d2', color: '#fff', border: 'none', borderRadius: 6, padding: '10px', fontSize: 14, cursor: 'pointer' }}>
                    Расчет
                </button>
                <button type="button" disabled={!result}
                        onClick={() => onApply({ ...result, npk, cropId, fertilizerId: fertilizerId || null })}
                        style={{
                            background: result ? '#1976d2' : '#ccc', color: '#fff', border: 'none',
                            borderRadius: 6, padding: '10px', fontSize: 14,
                            cursor: result ? 'pointer' : 'not-allowed',
                        }}>
                    Применить
                </button>
            </div>
        </div>
    );
}