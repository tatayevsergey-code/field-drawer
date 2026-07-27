import { useState, useCallback, useRef, useEffect } from 'react';
import { MapContainer, TileLayer, Polygon, useMap, LayersControl, BaseLayer } from 'react-leaflet';
import { FieldEditor } from './components/FieldEditor';
import { useFields } from './hooks/useFields';
import { calculateArea } from './utils/geo';
import L from 'leaflet';
import '@geoman-io/leaflet-geoman-free';
import '@geoman-io/leaflet-geoman-free/dist/leaflet-geoman.css';
import 'leaflet/dist/leaflet.css';
import './App.css';
import { getCropName } from './utils/crops';

// ─── Подложки ───────────────────────────────────────────────────────
const BASEMAPS = {
    osm: {
        name: 'Карта',
        url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
        attribution: '&copy; OpenStreetMap contributors'
    },
    satellite: {
        name: 'Спутник',
        url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        attribution: '&copy; Esri'
    },
    hybrid: {
        name: 'Гибрид',
        url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        attribution: '&copy; Esri',
        overlay: {
            url: 'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',
            attribution: '&copy; Esri'
        }
    }
};

// ─── Geoman-контроллер (без изменений) ─────────────────────────────
function GeomanController({ isDrawing, editingFieldId, fields, onCreate, getCurrentEdit }) {
    const map = useMap();
    const layerRef = useRef(null);
    const initRef = useRef(false);

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

    useEffect(() => {
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

// ─── Компонент переключателя подложек (упрощённый) ─────────────────
function BasemapSelector({ current, onChange }) {
    return (
        <div className="basemap-selector">
            {Object.entries(BASEMAPS).map(([key, cfg]) => (
                <button
                    key={key}
                    className={current === key ? 'active' : ''}
                    onClick={() => onChange(key)}
                >
                    {cfg.name}
                </button>
            ))}
        </div>
    );
}

// ─── Главный компонент ──────────────────────────────────────────────
export default function App() {
    const [isDrawing, setIsDrawing] = useState(false);
    const [editingFieldId, setEditingFieldId] = useState(null);
    const [modalField, setModalField] = useState(null);
    const [basemap, setBasemap] = useState('osm');
    const { fields, addField, updateField, updateFieldCoords, deleteField } = useFields();

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

    const currentBasemap = BASEMAPS[basemap];

    return (
        <div className="app">
            <aside className="sidebar">

                <BasemapSelector current={basemap} onChange={setBasemap} />

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
                                {f.data.cropType && `${getCropName(f.data.cropType)} · `}
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
                    {/* Подложка */}
                    <TileLayer
                        key={currentBasemap.url}  // key принудительно пересоздаёт слой при смене
                        url={currentBasemap.url}
                        attribution={currentBasemap.attribution}
                    />

                    {/* Оверлей для гибрида */}
                    {currentBasemap.overlay && (
                        <TileLayer
                            key={currentBasemap.overlay.url}
                            url={currentBasemap.overlay.url}
                            attribution={currentBasemap.overlay.attribution}
                        />
                    )}

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