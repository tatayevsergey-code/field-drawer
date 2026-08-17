import { useState } from 'react';
import { useReferences } from '../context/ReferenceContext';

const PRIMARY_BTN = {
    background: '#1976d2',
    color: '#fff',
    border: 'none',
    borderRadius: 6,
    padding: '8px 16px',
    cursor: 'pointer',
};

export function AgrochemistryEditor({ field, onSave, onClose }) {
    const refs = useReferences();  // ← получаем справочники из контекста

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
    const [selectedRegionId, setSelectedRegionId] = useState(
        field.data?.regionId || ''
    );

    const currentSample = samplesByPlot[activePlot]?.[0] || { values: {} };

    // ─── Получаем группу почв из данных поля ──────────────────────
    const soilTypeId = field.data?.soilType;
    const soilGroupId = refs.getSoilGroupByTypeId(soilTypeId);

    // ─── Проверка значения ──────────────────────────────────────────
    const getValidationStatus = (paramId, value) => {
        if (!selectedRegionId || value === undefined || value === null || value === '') {
            return null;
        }
        return refs.validateParamValue(
            paramId,
            Number(selectedRegionId),
            Number(value),
            soilGroupId
        );
    };

    // ─── Изменение значения параметра ──────────────────────────────
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
        if (isNaN(val) || val < 0) return;

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
            regionId: selectedRegionId || field.data?.regionId,
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

                {/* Информация о типе почвы */}
                <div style={{
                    marginBottom: '12px',
                    padding: '8px 12px',
                    background: '#f5f5f5',
                    borderRadius: '4px',
                    fontSize: '13px',
                    color: '#555'
                }}>
                    <span>
                            🌱 Тип почвы:{' '}
                        {soilTypeId
                            ? `${refs.getSoilName(soilTypeId)} (${soilGroupId ? refs.getSoilGroupName(soilGroupId) : 'группа не определена'})`
                            : 'не указан'}
                    </span>
                </div>

                {/* Селектор региона */}
                <div className="region-selector" style={{ marginBottom: '12px' }}>
                    <label style={{ fontSize: '13px', color: '#555', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span>Регион:</span>
                        <select
                            value={selectedRegionId}
                            onChange={(e) => setSelectedRegionId(e.target.value)}
                            style={{ padding: '4px 8px', borderRadius: '4px', border: '1px solid #ccc' }}
                        >
                            <option value="">--- выберите регион ---</option>
                            {refs.zones.map(r => (
                                <option key={r.id} value={r.id}>{r.name}</option>
                            ))}
                        </select>
                    </label>
                </div>

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
                            <th className="col-status" style={{ width: '18%' }}>Статус</th>
                        </tr>
                        </thead>
                        <tbody>
                        {refs.agro_params.map(param => {
                            const value = currentSample.values[param.id];
                            const validation = getValidationStatus(param.id, value);

                            let statusColor = '#999';
                            let statusText = '—';
                            if (validation && validation.max !== null) {
                                if (!validation.isValid) {
                                    statusColor = '#d32f2f';
                                    // statusText = `⚠️ > ${validation.max}`;
                                    statusText = `⚠️`;
                                } else {
                                    statusColor = '#2e7d32';
                                    // statusText = `✅ ≤ ${validation.max}`;
                                    statusText = `✅`;
                                }
                            }

                            return (
                                <tr key={param.id}>
                                    <td className="col-param">{param.name}</td>
                                    <td className="col-unit">{param.unit}</td>
                                    <td className="col-val">
                                        <input
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            value={value ?? ''}
                                            onChange={e => handleValueChange(param.id, e.target.value)}
                                            placeholder="---"
                                            style={{
                                                borderColor: validation && validation.max !== null && !validation.isValid
                                                    ? '#d32f2f'
                                                    : validation && validation.max !== null
                                                        ? '#2e7d32'
                                                        : '#ddd'
                                            }}
                                        />
                                    </td>
                                    <td className="col-status" style={{ fontSize: '12px', color: statusColor }}>
                                        {statusText}
                                        {validation && validation.max !== null && (
                                            <div style={{ fontSize: '9px', color: '#999', marginTop: '1px' }}>
                                                макс: {validation.max}
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            );
                        })}
                        </tbody>
                    </table>
                </div>

                <div className="modal-actions">
                    <button type="button" onClick={handleSave} className="btn-primary" style={PRIMARY_BTN}>
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