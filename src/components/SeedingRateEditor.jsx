import { useState, useMemo } from 'react';
import { useReferences } from '../context/ReferenceContext';
import { calcCellNorm, calcSeedingParameters } from '../utils/seedingCalc';

const inp = {
    width: '100%', padding: '6px 8px', marginTop: 4,
    borderRadius: 4, border: '1px solid #ccc', fontSize: 14, boxSizing: 'border-box',
};
const lbl = { display: 'block', marginBottom: 8, fontSize: 13 };
const h4 = { margin: '14px 0 8px', fontSize: 14 };

const toNum = (v) => {
    const n = Number(v);
    return Number.isFinite(n) && n > 0 ? n : '';
};

export function SeedingRateEditor({ field, onSave, onClose }) {
    const refs = useReferences();
    const d = field?.data || {};

    // ─── Параметры семенного материала ───
    const [cropId, setCropId]         = useState(toNum(d.cropType) || refs.crops[0]?.id || '');
    const [mass1000, setMass1000]     = useState(40);
    const [purity, setPurity]         = useState(98);
    const [germination, setGermination] = useState(95);

    // ─── Параметры удобрений ───
    const [manual, setManual]         = useState(false);
    const [fertilizerId, setFertilizerId] = useState('');
    const [npk, setNpk]               = useState({ k: 16, p: 16, n: 16 });

    // ─── Дополнительные параметры: СРАЗУ из структуры поля ───
    const [soilId, setSoilId]         = useState(toNum(d.soilType));
    // ─── Район: из поля; если пусто — восстанавливаем из импортированного country_region ───
    const [subjectId, setSubjectId] = useState(() => {
        // 1) прямой subjectId поля
        const direct = toNum(d.subjectId);
        if (direct) return direct;

        // 2) country_region.id — это id субъекта из справочника regions
        const cr = d.countryRegion;
        if (cr) {
            const byId = toNum(cr.id);
            if (byId && refs.getSubject(byId)) return byId;

            // 3) фолбэк — точное совпадение названия
            if (cr.full_name) {
                const byName = refs.subjects.find(
                    s => s.name.toLowerCase() === String(cr.full_name).toLowerCase()
                )?.id;
                if (byName) return byName;
            }
        }
        return '';
    });
    const [result, setResult]         = useState(null);

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
                s.plotIndex !== undefined ? s.plotIndex === idx : s.number === idx + 1);
            if (!sample?.values) return { plotIndex: idx, error: 'Нет пробы агрохимии' };
            return { plotIndex: idx, ...calcCellNorm(sample.values, p, refs) };
        });
        setResult({ cells, ...calcSeedingParameters(p, refs), params: p });
    };

    const handleApply = () => {
        onSave({ ...d, seeding: result });
        onClose();
    };

    // console.log('[SeedingRate] field.data:', field.data);

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

                {/*<h4 style={h4}>Дополнительные параметры</h4>*/}
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
                            width: '100%',
                            fontSize: 12,
                            marginTop: 6,
                            borderCollapse: 'collapse',   // ← схлопываем границы
                            textAlign: 'center',         // ← центрируем текст
                        }}>
                            <thead>
                            <tr>
                                <th style={{ border: '1px solid #bbb', padding: '4px 6px', background: '#e8e8e8', textAlign: 'center' }}>Участок</th>
                                <th style={{ border: '1px solid #bbb', padding: '4px 6px', background: '#e8e8e8', textAlign: 'center' }}>Высев, кг/га</th>
                                <th style={{ border: '1px solid #bbb', padding: '4px 6px', background: '#e8e8e8', textAlign: 'center' }}>Удобр., кг/га</th>
                            </tr>
                            </thead>
                            <tbody>
                            {result.cells.map(c => (
                                <tr key={c.plotIndex}>
                                    <td style={{ border: '1px solid #bbb', padding: '4px 6px', textAlign: 'center' }}>№ {c.plotIndex + 1}</td>
                                    <td style={{ border: '1px solid #bbb', padding: '4px 6px', textAlign: 'center' }}>
                                        {c.seedingRate ? c.seedingRate.toFixed(1) : `⚠️ ${c.error}`}
                                    </td>
                                    <td style={{ border: '1px solid #bbb', padding: '4px 6px', textAlign: 'center' }}>
                                        {c.fertilizationRate ? c.fertilizationRate.toFixed(1) : '—'}
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