import { useState, useEffect, useRef, useMemo } from 'react';
import { useReferences } from '../context/ReferenceContext';
import { detectRegionForField } from '../utils/regionDetector';

export function FieldEditor({
                                field,
                                onSave,
                                onClose,
                                detectedRegionId: initialDetectedRegionId,
                                detectedSubjectId: initialDetectedSubjectId,
                                isDetecting: initialIsDetecting = false
                            }) {
    const refs = useReferences();

    const [formData, setFormData] = useState(field?.data || {
        name: '',
        cropType: '',
        area: '',
        soilType: '',
        regionId: initialDetectedRegionId || '',
        subjectId: initialDetectedSubjectId || '',
        notes: ''
    });

    const [detectedRegionId, setDetectedRegionId] = useState(initialDetectedRegionId || null);
    const [detectedSubjectId, setDetectedSubjectId] = useState(initialDetectedSubjectId || null);
    const [isDetecting, setIsDetecting] = useState(initialIsDetecting || false);
    const [detectionError, setDetectionError] = useState(null);
    const [isAutoDetected, setIsAutoDetected] = useState(false);
    const [isAutoSubjectSet, setIsAutoSubjectSet] = useState(false);
    const detectionStartedRef = useRef(false);

    // Группировка почв по group_id для select с optgroup
    const soilsByGroup = useMemo(() => {
        const grouped = {};
        refs.soils.forEach(soil => {
            if (!grouped[soil.group_id]) grouped[soil.group_id] = [];
            grouped[soil.group_id].push(soil);
        });
        return grouped;
    }, [refs.soils]);

    // Автоопределение региона при открытии формы (только один раз)
    useEffect(() => {
        if (detectedRegionId || detectionStartedRef.current) return;
        const coords = field?.coordinates || field?.plots?.[0]?.coordinates;
        if (!coords || coords.length === 0) return;
        detectionStartedRef.current = true;
        setIsDetecting(true);
        setDetectionError(null);
        detectRegionForField(field,refs)
            .then(result => {
                if (result) {
                    setDetectedRegionId(result.regionId);
                    setDetectedSubjectId(result.subjectId);
                    setIsAutoDetected(true);
                    setIsAutoSubjectSet(true);
                    setFormData(prev => ({
                        ...prev,
                        regionId: result.regionId,
                        subjectId: result.subjectId || prev.subjectId
                    }));
                } else {
                    setDetectionError('Не удалось определить регион автоматически');
                }
            })
            .catch(err => {
                setDetectionError('Ошибка при определении региона');
            })
            .finally(() => {
                setIsDetecting(false);
            });
    }, [field, detectedRegionId]);

    // При выборе субъекта автоматически устанавливаем регион
    const handleSubjectChange = (subjectId) => {
        const subject = refs.subjects.find(s => s.id === Number(subjectId));
        if (subject) {
            setFormData(prev => ({
                ...prev,
                subjectId: subjectId,
                regionId: subject.zone_id // В БД это id_zone, в proto это zone_id
            }));

            // Если пользователь выбрал субъект вручную (не совпадает с автоопределённым)
            if (detectedSubjectId && subjectId !== String(detectedSubjectId)) {
                setIsAutoSubjectSet(false);
            } else if (detectedSubjectId && subjectId === String(detectedSubjectId)) {
                setIsAutoSubjectSet(true);
            }
        } else {
            setFormData(prev => ({
                ...prev,
                subjectId: subjectId,
                regionId: ''
            }));
            setIsAutoSubjectSet(false);
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        if (name === 'subjectId') {
            handleSubjectChange(value);
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave(formData);
    };

    // Находим название региона для отображения через ReferenceContext
    const regionName = formData.regionId ? refs.getRegionName(formData.regionId) : null;

    // Находим название автоопределённого субъекта
    const detectedSubjectName = detectedSubjectId
        ? refs.subjects.find(s => s.id === Number(detectedSubjectId))?.name
        : null;

    // Проверяем, совпадает ли выбранный субъект с автоматически определённым
    const isSubjectMatched = detectedSubjectId && formData.subjectId === String(detectedSubjectId);

    // Показываем предупреждение только если:
    // 1. Был автоопределён субъект
    // 2. Пользователь вручную изменил выбор
    // 3. Выбранный субъект не совпадает с автоопределённым
    const showSubjectMismatch = isAutoDetected &&
        !isAutoSubjectSet &&
        detectedSubjectId &&
        formData.subjectId &&
        !isSubjectMatched;

    return (
        <div className="modal-overlay">
            <form className="modal" onSubmit={handleSubmit}>
                <h3>{field.id ? 'Редактирование' : 'Новое поле'}</h3>

                {/* Индикатор определения региона */}
                {isDetecting && (
                    <div style={{
                        padding: '10px 14px',
                        background: '#e3f2fd',
                        borderRadius: '6px',
                        marginBottom: '16px',
                        fontSize: '13px',
                        color: '#1565c0',
                        border: '1px solid #1976d2',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                    }}>
                        <span style={{ fontSize: '18px' }}>🔍</span>
                        <div>
                            <div>Определение региона по координатам...</div>
                            <div style={{ fontSize: '12px', opacity: 0.8 }}>Это может занять несколько секунд</div>
                        </div>
                    </div>
                )}

                {!isDetecting && detectedRegionId && (
                    <div style={{
                        padding: '10px 14px',
                        background: '#e8f5e9',
                        borderRadius: '6px',
                        marginBottom: '16px',
                        fontSize: '13px',
                        color: '#2e7d32',
                        border: '1px solid #4caf50',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                    }}>
                        <span style={{ fontSize: '18px' }}>✅</span>
                        <div>
                            <div style={{ fontWeight: '500' }}>
                                Регион определён автоматически: {regionName || detectedRegionId}
                            </div>
                            {detectedSubjectId && isAutoSubjectSet && (
                                <div style={{ fontSize: '12px', opacity: 0.8 }}>
                                    Субъект: {detectedSubjectName || 'не определён'}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {!isDetecting && !detectedRegionId && detectionError && (
                    <div style={{
                        padding: '10px 14px',
                        background: '#ffebee',
                        borderRadius: '6px',
                        marginBottom: '16px',
                        fontSize: '13px',
                        color: '#c62828',
                        border: '1px solid #ef5350',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                    }}>
                        <span style={{ fontSize: '18px' }}>⚠️</span>
                        <div>
                            <div>{detectionError}</div>
                            <div style={{ fontSize: '12px', opacity: 0.8 }}>Выберите субъект вручную из списка ниже</div>
                        </div>
                    </div>
                )}

                <label>
                    Название:
                    <input
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        placeholder="Например, Поле северное"
                    />
                </label>

                <label>
                    Культура:
                    <select name="cropType" value={formData.cropType} onChange={handleChange}>
                        <option value="">--- выберите ---</option>
                        {refs.crops.map(crop => (
                            <option key={crop.id} value={crop.id}>{crop.name}</option>
                        ))}
                    </select>
                </label>

                <label>
                    Площадь, га:
                    <input
                        name="area"
                        type="number"
                        step="0.01"
                        value={formData.area}
                        onChange={handleChange}
                        placeholder="Авторасчёт или вручную"
                    />
                </label>

                <label>
                    Тип почвы:
                    <select
                        name="soilType"
                        value={formData.soilType || ''}
                        onChange={handleChange}
                    >
                        <option value="">--- выберите ---</option>
                        {refs.soil_groups.map(group => (
                            <optgroup key={group.id} label={group.name}>
                                {(soilsByGroup[group.id] || []).map(soil => (
                                    <option key={soil.id} value={soil.id}>
                                        {soil.name}
                                    </option>
                                ))}
                            </optgroup>
                        ))}
                    </select>
                </label>

                {/* Только выбор субъекта, регион скрыт */}
                <label>
                    Субъект РФ:
                    <select
                        name="subjectId"
                        value={formData.subjectId || ''}
                        onChange={handleChange}
                    >
                        <option value="">--- выберите субъект ---</option>
                        {refs.subjects.map(s => (
                            <option key={s.id} value={s.id}>
                                {s.name}
                                {detectedSubjectId === s.id && isAutoSubjectSet && ' ✓ (авто)'}
                            </option>
                        ))}
                    </select>
                    {formData.subjectId && (
                        <small style={{ color: '#666', display: 'block', marginTop: '4px' }}>
                            📍 Регион: {regionName || 'определяется автоматически'}
                        </small>
                    )}
                    {showSubjectMismatch && (
                        <small style={{ color: '#ff9800', display: 'block', marginTop: '4px' }}>
                            ⚠️ Выбранный субъект отличается от автоматически определённого
                        </small>
                    )}
                </label>

                <label>
                    Примечания:
                    <textarea
                        name="notes"
                        value={formData.notes}
                        onChange={handleChange}
                        rows={3}
                    />
                </label>

                <div className="modal-actions">
                    <button
                        type="submit"
                        className="btn-primary"
                        disabled={isDetecting}
                    >
                        {isDetecting ? '⏳ Определение региона...' : 'Сохранить'}
                    </button>
                    <button
                        type="button"
                        onClick={onClose}
                        className="btn-secondary"
                        disabled={isDetecting}
                    >
                        Отмена
                    </button>
                </div>
            </form>
        </div>
    );
}