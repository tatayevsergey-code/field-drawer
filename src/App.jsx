import { useState, useCallback, useRef, useEffect } from 'react';
import { MapContainer, TileLayer, Polygon, useMap } from 'react-leaflet';
import { FieldEditor } from './components/FieldEditor';
import { useFields } from './hooks/useFields';
import { calculateArea } from './utils/geo';
import L from 'leaflet';
import '@geoman-io/leaflet-geoman-free';
import '@geoman-io/leaflet-geoman-free/dist/leaflet-geoman.css';
import 'leaflet/dist/leaflet.css';
import './App.css';

// ─── Geoman-контроллер ──────────────────────────────────────────────
function GeomanController({ isDrawing, editingFieldId, fields, onCreate, getCurrentEdit }) {
    const map = useMap();
    const layerRef = useRef(null);
    const initRef = useRef(false);

    // Экспонируем функцию получения текущих координат наружу
    useEffect(() => {
        getCurrentEdit.current = () => {
            if (layerRef.current && layerRef.current._fieldId === editingFieldId) {
                const coords = layerRef.current.getLatLngs()[0].map(p => [p.lat, p.lng]);
                const area = calculateArea(coords);
                return { fieldId: editingFieldId, coords, area: area.toFixed(2) };
            }
            return null;
        };
    }, [editingFieldId, getCurrentEdit]);

    // Инициализация (один раз)
    useEffect(() => {
        if (initRef.current) return;
        initRef.current = true;

        map.pm.setGlobalOptions({
            pathOptions: {
                color: '#1976d2',
                fillColor: '#64b5f6',
                fillOpacity: 0.2,
                weight: 2
            }
        });

        map.on('pm:create', (e) => {
            const layer = e.layer;
            const coords = layer.getLatLngs()[0].map(p => [p.lat, p.lng]);
            const area = calculateArea(coords);
            layer.pm.disable();
            map.removeLayer(layer);
            onCreate(coords, area);
        });
    }, [map, onCreate]);

    // Режим рисования
    useEffect(() => {
        if (isDrawing) {
            map.pm.enableDraw('Polygon', {
                snappable: true,
                snapDistance: 20,
                allowSelfIntersection: false,
                finishOn: 'dblclick'
            });
        } else {
            map.pm.disableDraw();
        }
    }, [isDrawing, map]);

    // Синхронизация редактируемого поля
    useEffect(() => {
        // Удаляем старый слой
        if (layerRef.current) {
            layerRef.current.pm.disable();
            map.removeLayer(layerRef.current);
            layerRef.current = null;
        }

        if (editingFieldId) {
            const field = fields.find(f => f.id === editingFieldId);
            if (field) {
                const layer = L.polygon(field.coordinates, {
                    color: '#1976d2',
                    fillColor: '#64b5f6',
                    fillOpacity: 0.2,
                    weight: 2
                }).addTo(map);

                layer._fieldId = field.id;
                layer.pm.enable({ allowSelfIntersection: false });
                layerRef.current = layer;
            }
        }
    }, [editingFieldId, fields, map]);

    return null;
}

// ─── Главный компонент ──────────────────────────────────────────────
export default function App() {
    const [isDrawing, setIsDrawing] = useState(false);
    const [editingFieldId, setEditingFieldId] = useState(null);
    const [modalField, setModalField] = useState(null);
    const { fields, addField, updateField, updateFieldCoords, deleteField } = useFields();

    // Ref для доступа к текущим координатам из GeomanController
    const getCurrentEditRef = useRef(() => null);

    const handleCreate = useCallback((coords, area) => {
        setIsDrawing(false);
        setModalField({
            coordinates: coords,
            data: { area: area.toFixed(2) }
        });
    }, []);

    const handleSaveEdit = useCallback(() => {
        const result = getCurrentEditRef.current();
        if (result) {
            updateFieldCoords(result.fieldId, result.coords, result.area);
        }
        setEditingFieldId(null);
    }, [updateFieldCoords]);

    const handleSaveField = (data) => {
        if (modalField.id) {
            updateField(modalField.id, data);
        } else {
            addField(modalField.coordinates, data);
        }
        setModalField(null);
    };

    const handleFieldClick = (field) => {
        setModalField(field);
    };

    const handleEditGeometry = (field) => {
        setEditingFieldId(field.id);
    };

    const handleDeleteField = (id) => {
        deleteField(id);
        if (editingFieldId === id) setEditingFieldId(null);
        if (modalField?.id === id) setModalField(null);
    };

    const handleCancelEdit = () => {
        setEditingFieldId(null);
    };

    return (
        <div className="app">
            <aside className="sidebar">
                <div className="toolbar">
                    <button
                        className={isDrawing ? 'btn-active' : 'btn-primary'}
                        onClick={() => {
                            setIsDrawing(!isDrawing);
                            setEditingFieldId(null);
                        }}
                    >
                        {isDrawing ? '✕ Отменить' : '✎ Нарисовать поле'}
                    </button>
                </div>

                {isDrawing && (
                    <div className="hint">
                        Кликайте по карте для вершин.
                        Двойной клик — завершить.
                    </div>
                )}

                {editingFieldId && (
                    <div className="hint hint-edit">
                        <span>Редактирование: перетаскивайте точки</span>
                        <button onClick={handleSaveEdit} className="btn-small">
                            Готово
                        </button>
                    </div>
                )}

                <div className="stats">
                    <span>Полей: {fields.length}</span>
                    <span>
                        Общая площадь: {' '}
                        {fields.reduce((s, f) => s + (parseFloat(f.data.area) || 0), 0).toFixed(2)} га
                    </span>
                </div>

                <h3>Список полей</h3>
                <div className="field-list">
                    {fields.length === 0 && (
                        <div className="empty">Нет созданных полей</div>
                    )}
                    {fields.map(f => (
                        <div
                            key={f.id}
                            className={`field-item ${editingFieldId === f.id ? 'active' : ''}`}
                        >
                            <div className="field-name" onClick={() => handleFieldClick(f)}>
                                {f.data.name || 'Без названия'}
                            </div>
                            <div className="field-meta" onClick={() => handleFieldClick(f)}>
                                {f.data.cropType && `${f.data.cropType} · `}
                                {f.data.area} га
                            </div>
                            <div className="field-actions">
                                <button
                                    className="btn-edit-geo"
                                    onClick={() => handleEditGeometry(f)}
                                    title="Редактировать геометрию"
                                >
                                    ✎
                                </button>
                                <button
                                    className="btn-delete"
                                    onClick={() => handleDeleteField(f.id)}
                                    title="Удалить"
                                >
                                    ✕
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </aside>

            <main className="map-wrapper">
                <MapContainer
                    center={[55.7558, 37.6173]}
                    zoom={13}
                    style={{ height: '100vh', width: '100%' }}
                >
                    <TileLayer
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        attribution='&copy; OpenStreetMap contributors'
                    />

                    <GeomanController
                        isDrawing={isDrawing}
                        editingFieldId={editingFieldId}
                        fields={fields}
                        onCreate={handleCreate}
                        getCurrentEdit={getCurrentEditRef}
                    />

                    {fields
                        .filter(f => f.id !== editingFieldId)
                        .map(f => (
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
                </MapContainer>
            </main>

            {modalField && (
                <FieldEditor
                    field={modalField}
                    onSave={handleSaveField}
                    onClose={() => setModalField(null)}
                />
            )}
        </div>
    );
}