import { useState, useCallback, useRef, useEffect } from 'react';
import { MapContainer, TileLayer, Polygon, Polyline, CircleMarker, Tooltip, useMap, useMapEvents } from 'react-leaflet';
import { FieldEditor } from './components/FieldEditor';
import { useFields } from './hooks/useFields';
import { calculateArea } from './utils/geo';
import { getCropName } from './utils/crops';
import { ConfirmDialog } from './components/ConfirmDialog';
import L from 'leaflet';
import '@geoman-io/leaflet-geoman-free';
import '@geoman-io/leaflet-geoman-free/dist/leaflet-geoman.css';
import 'leaflet/dist/leaflet.css';
import './App.css';
import { splitPolygonByLine } from './utils/polygonSplit';

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

// ─── Geoman-контроллер ─────────────────────────────────────────────
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

// ─── Компонент переключателя подложек ──────────────────────────────
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

// ─── Обработчик событий карты для режима разбиения ─────────────────
function MapEventHandler({ mode, splitField, splitPoints, onSplitClick, onMouseMove }) {
    useMapEvents({
        click(e) {
            if (mode === 'split' && splitField && splitPoints.length < 2) {
                onSplitClick(e.latlng);
            }
        },
        mousemove(e) {
            if (mode === 'split' && splitField && splitPoints.length === 1) {
                onMouseMove(e.latlng);
            }
        }
    });
    return null;
}

export default function App() {
    const [mode, setMode] = useState('view');
    const [basemap, setBasemap] = useState('osm');
    const [editingFieldId, setEditingFieldId] = useState(null);
    const [modalField, setModalField] = useState(null);
    const [confirmDelete, setConfirmDelete] = useState(null);
    const [splitPoints, setSplitPoints] = useState([]);
    const [splitField, setSplitField] = useState(null);
    const [mousePos, setMousePos] = useState(null);

    const { fields, addField, updateField, updateFieldPlots, deleteField } = useFields();
    const getCurrentEditRef = useRef(() => null);

    const handleCreate = useCallback((coords, area) => {
        setMode('view');
        setModalField({
            coordinates: coords,
            data: { area: area.toFixed(2) }
        });
    }, []);

    const handleSaveEdit = useCallback(() => {
        const result = getCurrentEditRef.current();
        if (result) {
            // Обновляем координаты участка
            const field = fields.find(f => f.id === result.fieldId);
            if (field) {
                const newPlots = field.plots.map((plot, idx) => {
                    if (idx === 0) { // редактируем первый участок (упрощение)
                        return { ...plot, coordinates: result.coords, area: result.area };
                    }
                    return plot;
                });
                updateFieldPlots(result.fieldId, newPlots);
            }
        }
        setEditingFieldId(null);
        setMode('view');
    }, [fields, updateFieldPlots]);

    const handleSaveField = (data) => {
        if (modalField.id) {
            updateField(modalField.id, data);
        } else {
            addField(modalField.coordinates, data);
        }
        setModalField(null);
    };

    const handleFieldClick = (field) => {
        if (mode === 'split' && !splitField) {
            setSplitField(field);
            return;
        }
        if (mode === 'split' && splitField) return;
        setModalField(field);
    };

    const handleEditGeometry = (field) => {
        setMode('edit');
        setEditingFieldId(field.id);
    };

    const handleSplitStart = (field) => {
        setMode('split');
        setSplitField(field);
    };

    const handleDeleteClick = (field) => {
        setConfirmDelete({ id: field.id, name: field.data.name || 'Без названия' });
    };

    const handleConfirmDelete = () => {
        if (confirmDelete) {
            deleteField(confirmDelete.id);
            if (editingFieldId === confirmDelete.id) {
                setEditingFieldId(null);
                setMode('view');
            }
            if (modalField?.id === confirmDelete.id) setModalField(null);
            if (splitField?.id === confirmDelete.id) {
                setSplitField(null);
                setSplitPoints([]);
                setMode('view');
            }
            setConfirmDelete(null);
        }
    };

    const handleCancelModes = () => {
        setMode('view');
        setEditingFieldId(null);
        setSplitField(null);
        setSplitPoints([]);
    };

    const handleSplitClick = (latlng) => {
        if (mode !== 'split' || !splitField) return;

        const newPoints = [...splitPoints, [latlng.lat, latlng.lng]];
        setSplitPoints(newPoints);

        if (newPoints.length === 2) {
            const newPlots = [];

            splitField.plots.forEach(plot => {
                const result = splitPolygonByLine(plot.coordinates, newPoints[0], newPoints[1]);
                if (result && result.length >= 2) {
                    result.forEach(coords => {
                        newPlots.push({
                            coordinates: coords,
                            area: calculateArea(coords).toFixed(2)
                        });
                    });
                } else {
                    newPlots.push(plot);
                }
            });

            updateFieldPlots(splitField.id, newPlots);
            setSplitPoints([]);
            setSplitField(null);
            setMode('view');
        }
    };

    const handleMapMouseMove = (latlng) => {
        if (mode === 'split' && splitField && splitPoints.length === 1) {
            setMousePos([latlng.lat, latlng.lng]);
        }
    };

    const currentBasemap = BASEMAPS[basemap];

    // Суммарная площадь поля
    const getTotalArea = (field) => {
        return field.plots.reduce((sum, p) => sum + (parseFloat(p.area) || 0), 0);
    };

    return (
        <div className="app">
            <aside className="sidebar">
                <BasemapSelector current={basemap} onChange={setBasemap} />
                <hr className="sidebar-divider" />

                <div className="toolbar">
                    <button
                        className={mode === 'draw' ? 'btn-active' : 'btn-primary'}
                        onClick={() => {
                            if (mode === 'draw') {
                                setMode('view');
                            } else {
                                setMode('draw');
                                setEditingFieldId(null);
                                setSplitField(null);
                                setSplitPoints([]);
                            }
                        }}
                    >
                        {mode === 'draw' ? '✕ Отменить' : '✎ Нарисовать поле'}
                    </button>
                </div>

                {mode === 'draw' && (
                    <div className="hint">
                        Кликайте по карте для вершин.
                        Двойной клик — завершить.
                    </div>
                )}

                {mode === 'edit' && editingFieldId && (
                    <div className="hint hint-edit">
                        <span>Редактирование: перетаскивайте точки</span>
                        <button onClick={handleSaveEdit} className="btn-small">
                            Готово
                        </button>
                    </div>
                )}

                {mode === 'split' && (
                    <div className="hint hint-split">
                        {!splitField
                            ? 'Выберите поле для разбиения (клик на полигоне)'
                            : splitPoints.length === 0
                                ? `Разбиение «${splitField.data.name}». Кликните первую точку на границе.`
                                : 'Кликните вторую точку на противоположной границе.'
                        }
                        <button onClick={handleCancelModes} className="btn-small">
                            Отмена
                        </button>
                    </div>
                )}

                <div className="stats">
                    <span>Полей: {fields.length}</span>
                    <span>
                        Общая площадь: {' '}
                        {fields.reduce((s, f) => s + getTotalArea(f), 0).toFixed(2)} га
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
                            className={`field-item ${editingFieldId === f.id ? 'active' : ''} ${splitField?.id === f.id ? 'split-active' : ''}`}
                        >
                            <div className="field-name" onClick={() => handleFieldClick(f)}>
                                {f.data.name || 'Без названия'}
                                {f.plots.length > 1 && <span className="plot-count"> ({f.plots.length} уч.)</span>}
                            </div>
                            <div className="field-meta" onClick={() => handleFieldClick(f)}>
                                {f.data.cropType && `${getCropName(f.data.cropType)} · `}
                                {getTotalArea(f).toFixed(2)} га
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
                                    className="btn-split-action"
                                    onClick={() => handleSplitStart(f)}
                                    title="Разбить на участки"
                                >
                                    ✂
                                </button>
                                <button
                                    className="btn-delete"
                                    onClick={() => handleDeleteClick(f)}
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
                        key={currentBasemap.url}
                        url={currentBasemap.url}
                        attribution={currentBasemap.attribution}
                    />

                    {currentBasemap.overlay && (
                        <TileLayer
                            key={currentBasemap.overlay.url}
                            url={currentBasemap.overlay.url}
                            attribution={currentBasemap.overlay.attribution}
                        />
                    )}

                    <MapEventHandler
                        mode={mode}
                        splitField={splitField}
                        splitPoints={splitPoints}
                        onSplitClick={handleSplitClick}
                        onMouseMove={handleMapMouseMove}
                    />

                    <GeomanController
                        isDrawing={mode === 'draw'}
                        editingFieldId={editingFieldId}
                        fields={fields}
                        onCreate={handleCreate}
                        getCurrentEdit={getCurrentEditRef}
                    />

                    {/* Рендерим ВСЕ участки поля — подпись только у первого */}
                    {fields.map(f => (
                        f.plots.map((plot, plotIdx) => (
                            <Polygon
                                key={`${f.id}-${plotIdx}`}
                                positions={plot.coordinates}
                                pathOptions={{
                                    color: splitField?.id === f.id ? '#ff9800' : '#2e7d32',
                                    fillColor: splitField?.id === f.id ? '#ffe0b2' : '#4caf50',
                                    fillOpacity: splitField?.id === f.id ? 0.4 : 0.3,
                                    weight: splitField?.id === f.id ? 3 : 2
                                }}
                                eventHandlers={{
                                    click: () => handleFieldClick(f)
                                }}
                            >
                                {/* Подпись только у первого участка */}
                                {plotIdx === 0 && (
                                    <Tooltip
                                        direction="center"
                                        offset={[0, 0]}
                                        opacity={1}
                                        permanent
                                        className="field-label"
                                    >
                                        <span>{f.data.name || 'Без названия'}</span>
                                        <br />
                                        <small>{getCropName(f.data.cropType)} · {getTotalArea(f).toFixed(2)} га</small>
                                    </Tooltip>
                                )}
                            </Polygon>
                        ))
                    ))}


                    {mode === 'split' && splitPoints.map((p, i) => (
                        <CircleMarker
                            key={`split-${i}`}
                            center={p}
                            radius={6}
                            pathOptions={{ color: '#d32f2f', fillColor: '#d32f2f', fillOpacity: 1 }}
                        />
                    ))}

                    {mode === 'split' && splitPoints.length === 1 && mousePos && (
                        <Polyline
                            positions={[splitPoints[0], mousePos]}
                            pathOptions={{ color: '#d32f2f', dashArray: '5,5', weight: 2 }}
                        />
                    )}
                </MapContainer>
            </main>

            {modalField && (
                <FieldEditor
                    field={modalField}
                    onSave={handleSaveField}
                    onClose={() => setModalField(null)}
                />
            )}

            {confirmDelete && (
                <ConfirmDialog
                    title="Удаление поля"
                    message={`Удалить поле «${confirmDelete.name}»?`}
                    onConfirm={handleConfirmDelete}
                    onCancel={() => setConfirmDelete(null)}
                />
            )}
        </div>
    );
}