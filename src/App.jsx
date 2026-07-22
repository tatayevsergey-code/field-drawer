import { useState, useMemo } from 'react';
import { MapView } from './components/MapContainer';
import { DrawingLayer } from './components/FieldDrawer';
import { FieldEditor } from './components/FieldEditor';
import { useFields } from './hooks/useFields';
import { calculateArea } from './utils/geo';
import { Polygon } from 'react-leaflet';
import './App.css';

export default function App() {
    const [isDrawing, setIsDrawing] = useState(false);
    const [editingField, setEditingField] = useState(null);
    const { fields, addField, updateField, deleteField } = useFields();

    const totalArea = useMemo(() => {
        return fields.reduce((sum, f) => sum + (parseFloat(f.data.area) || 0), 0);
    }, [fields]);

    const handlePolygonComplete = (coords) => {
        const area = calculateArea(coords);
        setIsDrawing(false);
        setEditingField({
            coordinates: coords,
            data: { area: area.toFixed(2) }
        });
    };

    const handleSaveField = (data) => {
        if (editingField.id) {
            updateField(editingField.id, data);
        } else {
            addField(editingField.coordinates, data);
        }
        setEditingField(null);
    };

    const handleFieldClick = (field) => {
        setEditingField(field);
    };

    const handleDeleteField = (id) => {
        deleteField(id);
        if (editingField?.id === id) setEditingField(null);
    };

    return (
        <div className="app">
            {/* Боковая панель */}
            <aside className="sidebar">
                <div className="toolbar">
                    <button
                        className={isDrawing ? 'btn-active' : 'btn-primary'}
                        onClick={() => setIsDrawing(!isDrawing)}
                    >
                        {isDrawing ? '✕ Отменить' : '✎ Нарисовать поле'}
                    </button>
                </div>

                {isDrawing && (
                    <div className="hint">
                        Кликайте по карте для добавления вершин.
                        Двойной клик — завершить полигон.
                    </div>
                )}

                <div className="stats">
                    <span>Полей: {fields.length}</span>
                    <span>Общая площадь: {totalArea.toFixed(2)} га</span>
                </div>

                <h3>Список полей</h3>
                <div className="field-list">
                    {fields.length === 0 && (
                        <div className="empty">Нет созданных полей</div>
                    )}
                    {fields.map(f => (
                        <div
                            key={f.id}
                            className="field-item"
                            onClick={() => handleFieldClick(f)}
                        >
                            <div className="field-name">
                                {f.data.name || 'Без названия'}
                            </div>
                            <div className="field-meta">
                                {f.data.cropType && `${f.data.cropType} · `}
                                {f.data.area} га
                            </div>
                            <button
                                className="btn-delete"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteField(f.id);
                                }}
                            >
                                ✕
                            </button>
                        </div>
                    ))}
                </div>
            </aside>

            {/* Карта */}
            <main className="map-wrapper">
                <MapView>
                    <DrawingLayer
                        isDrawing={isDrawing}
                        onPolygonComplete={handlePolygonComplete}
                    />
                    {fields.map(f => (
                        <Polygon
                            key={f.id}
                            positions={f.coordinates}
                            pathOptions={{
                                color: '#2e7d32',
                                fillColor: '#4caf50',
                                fillOpacity: 0.3,
                                weight: 2
                            }}
                            eventHandlers={{
                                click: () => handleFieldClick(f)
                            }}
                        />
                    ))}
                </MapView>
            </main>

            {/* Модальное окно */}
            {editingField && (
                <FieldEditor
                    field={editingField}
                    onSave={handleSaveField}
                    onClose={() => setEditingField(null)}
                />
            )}
        </div>
    );
}