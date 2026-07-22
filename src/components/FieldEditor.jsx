import { useState } from 'react';

/**
 * @param {Object} props
 * @param {{id?: number, coordinates: number[][], data?: FieldData}} props.field
 * @param {function(FieldData): void} props.onSave
 * @param {function(): void} props.onClose
 */
export function FieldEditor({ field, onSave, onClose }) {
    const [formData, setFormData] = useState(field?.data || {
        name: '',
        cropType: '',
        area: '',
        soilType: '',
        notes: ''
    });

    /**
     * @param {React.ChangeEvent<HTMLInputElement|HTMLSelectElement>} e
     */
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
                        <option value="wheat">Пшеница озимая</option>
                        <option value="wheat_spring">Пшеница яровая</option>
                        <option value="corn">Кукуруза</option>
                        <option value="soy">Соя</option>
                        <option value="sunflower">Подсолнечник</option>
                        <option value="rapeseed">Рапс</option>
                        <option value="barley">Ячмень</option>
                        <option value="fallow">Пар</option>
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
                    <input
                        name="soilType"
                        value={formData.soilType}
                        onChange={handleChange}
                        placeholder="Чернозём, суглинок..."
                    />
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
            </form>
        </div>
    );
}