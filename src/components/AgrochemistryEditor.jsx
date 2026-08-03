import { useState } from 'react';
import { AGRO_PARAMS } from '../utils/agrochemistry';

export function AgrochemistryEditor({ field, onSave, onClose }) {
    const plots = field.plots || [{ coordinates: field.coordinates }];
    const hasMultiplePlots = plots.length > 1;

    // ─── Инициализация: одна проба на участок ───────────────────────
    const [samplesByPlot, setSamplesByPlot] = useState(() => {
        const existing = field.data?.agrochemistry?.samples || [];
        const grouped = {};

        plots.forEach((_, idx) => {
            const plotSamples = existing.filter(s =>
                s.plotIndex !== undefined
                    ? s.plotIndex === idx
                    : s.number === idx + 1
            );

            grouped[idx] = plotSamples.length > 0
                ? [{
                    id: `plot-${idx}`,
                    plotIndex: idx,
                    values: { ...(plotSamples[0].values || {}) }
                }]
                : [{ id: `plot-${idx}`, plotIndex: idx, values: {} }];
        });

        return grouped;
    });

    const [activePlot, setActivePlot] = useState(0);

    const currentSample = samplesByPlot[activePlot]?.[0] || { values: {} };

    // ─── Изменение значения параметра (только ≥ 0) ──────────────────
    const handleValueChange = (paramId, raw) => {
        if (raw === '') {
            setSamplesByPlot(prev => {
                const s = { ...prev[activePlot][0], values: { ...prev[activePlot][0].values } };
                delete s.values[paramId];
                return { ...prev, [activePlot]: [s] };
            });
            return;
        }

        const val = parseFloat(raw);
        if (isNaN(val) || val < 0) return; // игнорируем отрицательные

        setSamplesByPlot(prev => {
            const s = { ...prev[activePlot][0], values: { ...prev[activePlot][0].values } };
            s.values[paramId] = val;
            return { ...prev, [activePlot]: [s] };
        });
    };

    // ─── Сохранение ─────────────────────────────────────────────────
    const handleSave = () => {
        const flat = [];
        Object.values(samplesByPlot).forEach(list => {
            list.forEach(s => {
                flat.push({
                    plotIndex: s.plotIndex,
                    number: s.plotIndex + 1,
                    values: s.values
                });
            });
        });

        onSave({
            ...field.data,
            agrochemistry: {
                ...(field.data?.agrochemistry || {}),
                samples: flat
            }
        });
        onClose();
    };

    // ─── Render ─────────────────────────────────────────────────────
    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal modal-wide" onClick={e => e.stopPropagation()}>
                <h3>🧪 Агрохимический состав почвы</h3>
                <p className="agro-subtitle">
                    {field.data.name || 'Без названия'}
                    {hasMultiplePlots && (
                        <span> · {plots.length} участков</span>
                    )}
                </p>

                {/* Табы участков */}
                {hasMultiplePlots && (
                    <div className="plot-tabs">
                        {plots.map((plot, idx) => (
                            <button
                                key={idx}
                                className={activePlot === idx ? 'active' : ''}
                                onClick={() => setActivePlot(idx)}
                            >
                                <span>Участок {idx + 1}</span>
                                <small>{(parseFloat(plot.area) || 0).toFixed(2)} га</small>
                            </button>
                        ))}
                    </div>
                )}

                {/* Таблица параметров */}
                <div className="agro-table-wrap">
                    <table className="agro-table">
                        <thead>
                        <tr>
                            <th className="col-param">Параметр</th>
                            <th className="col-unit">Ед. изм.</th>
                            <th className="col-val">Значение</th>
                        </tr>
                        </thead>
                        <tbody>
                        {AGRO_PARAMS.map(param => (
                            <tr key={param.id}>
                                <td className="col-param">{param.name}</td>
                                <td className="col-unit">{param.unit}</td>
                                <td className="col-val">
                                    <input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        value={currentSample.values[param.id] ?? ''}
                                        onChange={e => handleValueChange(param.id, e.target.value)}
                                        placeholder="—"
                                    />
                                </td>
                            </tr>
                        ))}
                        </tbody>
                    </table>
                </div>

                <div className="modal-actions">
                    <button type="button" onClick={handleSave} className="btn-primary">
                        Сохранить
                    </button>
                    <button type="button" onClick={onClose} className="btn-secondary">
                        Отмена
                    </button>
                </div>
            </div>
        </div>
    );
}