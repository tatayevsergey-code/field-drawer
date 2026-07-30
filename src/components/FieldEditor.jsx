import { useState } from 'react';
import { CROP_NAMES } from '../utils/crops';
import { SOIL_TYPES } from '../utils/soils';

/**
 * @param {Object} props
 * @param {{id?: number, coordinates: number[][], data?: FieldData}} props.field
 * @param {function(FieldData): void} props.onSave
 * @param {function(): void} props.onClose
 * @param {function(): void} props.onOpenAgrochemistry
 */
export function FieldEditor({ field, onSave, onClose, onOpenAgrochemistry }) {
    const [formData, setFormData] = useState(field?.data || {
        name: '',
        cropType: '',
        area: '',
        soilType: '',
        notes: ''
    });

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave(formData);
    };

    return (
        <div className="modal-overlay">
            <form className="modal" onSubmit={handleSubmit}>
                <h3>{field.id ? 'Редактирование' : 'Новое поле'}</h3>

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
                        <option value="">— выберите —</option>
                        {Object.entries(CROP_NAMES).map(([code, name]) => (
                            <option key={code} value={code}>{name}</option>
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
                    <select name="soilType" value={formData.soilType} onChange={handleChange}>
                        <option value="">— выберите —</option>
                        {Object.entries(SOIL_TYPES).map(([code, name]) => (
                            <option key={code} value={code}>{name}</option>
                        ))}
                    </select>
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
                    <button type="submit" className="btn-primary">Сохранить</button>
                    <button type="button" onClick={onClose} className="btn-secondary">Отмена</button>
                </div>

                {/*{onOpenAgrochemistry && (*/}
                {/*    <div style={{ marginTop: '16px', paddingTop: '12px', borderTop: '1px solid #eee' }}>*/}
                {/*        <button*/}
                {/*            type="button"*/}
                {/*            onClick={onOpenAgrochemistry}*/}
                {/*            className="btn-secondary"*/}
                {/*            style={{ width: '100%' }}*/}
                {/*        >*/}
                {/*            🧪 Агрохимический состав почвы*/}
                {/*        </button>*/}
                {/*    </div>*/}
                {/*)}*/}
            </form>
        </div>
    );
}