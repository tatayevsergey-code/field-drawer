import { useState, useCallback, useRef, useEffect } from 'react';
import { MapContainer, TileLayer, Polygon, Polyline, CircleMarker, Tooltip, useMap, useMapEvents } from 'react-leaflet';
import { FieldEditor } from './components/FieldEditor';
import { ProjectManager } from './components/ProjectManager';
import { ConfirmDialog } from './components/ConfirmDialog';
import { useProjects } from './hooks/useProjects';
import { calculateArea, calculateTotalArea } from './utils/geo';
import { splitPolygonByLine } from './utils/polygonSplit';
import L from 'leaflet';
import '@geoman-io/leaflet-geoman-free';
import '@geoman-io/leaflet-geoman-free/dist/leaflet-geoman.css';
import 'leaflet/dist/leaflet.css';
import './App.css';
import { AgrochemistryEditor } from './components/AgrochemistryEditor';
import { parseImportedField } from './utils/importFieldJson';
import { useAuth } from './auth/AuthContext';
import { UserManager } from './components/admin/UserManager';
import { useReferences } from './context/ReferenceContext';
import { DiffGridEditor } from './components/DiffGridEditor';
import { buildDiffGrid, buildDiffGridCells } from './utils/diffGrid';
import { getDiffGrid, saveDiffGrid, deleteDiffGrid } from './api/projects';

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

        // ─── Перевод подсказок Geoman ─────────────────────────────
        map.pm.setLang('ru', {
            tooltips: {
                firstVertex: 'Кликните, чтобы поставить первую вершину',
                continueLine: 'Кликните, чтобы продолжить рисование',
                finishPoly: 'Кликните на первую точку, чтобы завершить',
                placeMarker: 'Кликните, чтобы поставить точку',
                removeLastVertex: 'Кликните на последнюю точку, чтобы удалить её',
            }
        }, 'en');
        // ───────────────────────────────────────────────────────────

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
            if (field && field.plots && field.plots.length > 0) {
                const plot = field.plots[0];
                if (plot && plot.coordinates && plot.coordinates.length >= 3) {
                    const layer = L.polygon(plot.coordinates, {
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

function MapFocusController({ focusTrigger }) {
    const map = useMap();

    useEffect(() => {
        if (!focusTrigger) return;

        const { field, force = false } = focusTrigger;

        let bounds = null;

        field.plots.forEach(plot => {
            if (plot.coordinates && plot.coordinates.length > 0) {
                plot.coordinates.forEach(([lat, lng]) => {
                    const latLng = L.latLng(lat, lng);

                    if (!bounds) {
                        bounds = L.latLngBounds(latLng, latLng);
                    } else {
                        bounds.extend(latLng);
                    }
                });
            }
        });

        if (!bounds) return;

        const isOutsideVisibleArea = !map.getBounds().intersects(bounds);

        if (force || isOutsideVisibleArea) {
            map.flyToBounds(bounds, {
                padding: [60, 60],
                maxZoom: 16,
                duration: 0.6
            });
        }
    }, [focusTrigger, map]);

    return null;
}

function ZoomTracker({ onZoomChange }) {
    const map = useMap();
    useEffect(() => {
        const handler = () => onZoomChange(map.getZoom());
        map.on('zoomend', handler);
        onZoomChange(map.getZoom());
        return () => map.off('zoomend', handler);
    }, [map, onZoomChange]);
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
    const [focusTrigger, setFocusTrigger] = useState(null);
    const [agrochemField, setAgrochemField] = useState(null);
    const [mapZoom, setMapZoom] = useState(13);
    const { user, logout } = useAuth();
    const [showUserManager, setShowUserManager] = useState(false);
    const [diffGridField, setDiffGridField] = useState(null);     // поле, для которого открыт диалог
    const [diffGridPreview, setDiffGridPreview] = useState(null); // превью: { fieldId, cellSize, lines }
    const [diffGrids, setDiffGrids] = useState({});               // применённые сетки: { [fieldId]: {…params, lines} }

    const refs = useReferences();

    const {
        projects,
        activeProjectId,
        activeProject,
        setActiveProjectId,
        createProject,
        deleteProject,
        renameProject,
        addField,
        addFieldWithPlots,
        updateField,
        updateFieldPlots,
        deleteField
    } = useProjects();

    const getCurrentEditRef = useRef(() => null);
    const fileInputRef = useRef(null);

    // Поля активного проекта
    const fields = activeProject?.fields || [];

    // ─── Создание поля ──────────────────────────────────────────────
    const handleCreate = useCallback((coords, area) => {
        // console.log('📝 Создание нового поля');
        setMode('view');
        const tempField = {
            coordinates: coords,
            data: { area: area.toFixed(2) }
        };

        setModalField({
            ...tempField,
            detectedRegionId: null,
            detectedSubjectId: null,
            isDetecting: true
        });
    }, []);

    // ─── Сохранение редактирования геометрии ────────────────────────
    const handleSaveEdit = useCallback(() => {
        const result = getCurrentEditRef.current();
        if (result) {
            const field = fields.find(f => f.id === result.fieldId);
            if (field) {
                const newPlots = field.plots.map((plot, idx) => {
                    if (idx === 0) {
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

    // ─── Сохранение данных поля ──────────────────────────────────────
    const handleSaveField = (data) => {
        if (modalField.id) {
            updateField(modalField.id, data);
        } else {
            addField(modalField.coordinates, data);
        }
        setModalField(null);
    };

    // ─── Импорт поля из JSON ────────────────────────────────────────
    const handleImportFile = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const json = JSON.parse(event.target.result);
                const { coordinates, data } = parseImportedField(json,refs);

                // Если в JSON есть country_region, пробуем найти регион
                if (!data.regionId && data.countryRegion) {
                    const regionId = refs.findRegionByName(data.countryRegion.full_name || data.countryRegion.name);
                    if (regionId) {
                        data.regionId = regionId;
                    }
                }

                // Если всё ещё нет regionId, определяем в фоне
                if (!data.regionId) {
                    const tempField = { coordinates, data };
                    // Открываем форму с флагом определения
                    setModalField({
                        coordinates,
                        data,
                        detectedRegionId: null,
                        detectedSubjectId: null,
                        isDetecting: true
                    });
                    return;
                }

                if (data.agrochemistry?.gridCells?.length > 0) {
                    const plots = data.agrochemistry.gridCells.map(cell => ({
                        coordinates: cell.coordinates,
                        area: calculateArea(cell.coordinates).toFixed(2)
                    }));
                    addFieldWithPlots(plots, data);
                } else {
                    addField(coordinates, data);
                }
            } catch (err) {
                alert('Ошибка импорта: ' + err.message);
            }
        };
        reader.readAsText(file);
        e.target.value = '';
    };

    // ─── Взаимодействие с полями ────────────────────────────────────
    const handleFieldClick = (field) => {
        if (mode === 'split' && !splitField) {
            setSplitField(field);
            return;
        }
        if (mode === 'split' && splitField) return;
        setModalField(field);
        setFocusTrigger({ field, ts: Date.now() });
    };

    const handleEditGeometry = (field) => {
        if (field.plots.length > 1) {
            alert('Редактирование геометрии доступно только для полей с одним участком.');
            return;
        }
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
                        if (coords && coords.length >= 3) {
                            const area = calculateArea(coords);
                            if (area > 0.01) {
                                newPlots.push({
                                    coordinates: coords,
                                    area: area.toFixed(2)
                                });
                            }
                        }
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

    // ─── Сетка дифпосева ──────────────────────────────────────────
    // ─── Открытие окна: загрузка сетки с сервера ─────────────────
    const handleDiffOpen = async (field) => {
        setDiffGridField(field);
        setDiffGridPreview(null);
        setFocusTrigger({ field, ts: Date.now(), force: true });

        // В текущей сессии уже загружено — используем без запроса
        if (diffGrids[field.id]) return;

        try {
            const data = await getDiffGrid(field.id);
            console.log('[handleDiffOpen] response:', data);   // ← диагностика

            // ВАЖНО: grid_present, а не has_grid!
            if (data?.success && data.grid_present && data.grid) {
                const g = data.grid;
                const params = {
                    direction:    Number(g.direction ?? 0),
                    seederWidth:  Number(g.seeder_width ?? 6),
                    multiplicity: Number(g.multiplicity ?? 5),
                    offsetX:      Number(g.offset_x ?? 0),
                    offsetY:      Number(g.offset_y ?? 0),
                };
                // Пересчитываем ячейки по контуру поля
                const plots = (field.plots || []).map(pl => pl.coordinates);
                const grid = buildDiffGridCells(plots, params);
                console.log('[handleDiffOpen] rebuilt cells:', grid?.cells?.length);  // ← диагностика

                setDiffGrids(prev => ({
                    ...prev,
                    [field.id]: {
                        params,
                        cellSize: grid?.cellSize ?? 0,
                        cells: grid?.cells ?? [],
                    },
                }));
            }
        } catch (e) {
            console.error('[handleDiffOpen] error:', e);
        }
    };

    const handleDiffPreview = (params) => {
        if (!diffGridField || !params) {
            setDiffGridPreview(null);
            return;
        }
        const coords = (diffGridField.plots || []).flatMap(pl => pl.coordinates || []);
        const grid = buildDiffGrid(coords, params);
        setDiffGridPreview(grid ? { kind: 'lines', lines: grid.lines } : null);
    };

    // «Сформировать сетку» — строим обрезанные по контуру ячейки и показываем их.
    // Окно НЕ закрывается, диалог сам заблокирует поля и кнопку.
    const handleDiffForm = (params) => {
        console.log('[handleDiffForm] diffGridField:', diffGridField);
        console.log('[handleDiffForm] plots:', diffGridField?.plots);
        if (!diffGridField) return;

        const plots = (diffGridField.plots || []).map(pl => pl.coordinates);
        console.log('[handleDiffForm] coords plots:', plots);

        const grid = buildDiffGridCells(plots, params);
        console.log('[handleDiffForm] grid:', grid);

        setDiffGridPreview(grid
            ? { kind: 'cells', cells: grid.cells, cellSize: grid.cellSize, params }
            : null);
    };

    // «Сбросить» — удаляем сохранённую сетку, возвращаемся в режим редактирования
    // ─── удаляем на сервере и в state ────────────────
    const handleDiffReset = async () => {
        setDiffGridPreview(null);
        if (diffGridField) {
            try {
                await deleteDiffGrid(diffGridField.id);
            } catch (e) {
                console.error('[handleDiffReset] delete error:', e);
            }
            setDiffGrids(prev => {
                if (!(diffGridField.id in prev)) return prev;
                const next = { ...prev };
                delete next[diffGridField.id];
                return next;
            });
        }
    };

    // ─── «Применить» — сохраняем на сервер и закрываем окно ───────
    const handleDiffApply = async (params) => {
        console.log('[handleDiffApply] diffGridPreview:', diffGridPreview);
        if (!diffGridField || !diffGridPreview || diffGridPreview.kind !== 'cells') {
            console.warn('[handleDiffApply] выход: нет diffGridPreview kind=cells');
            return;
        };

        try {
            const result = await saveDiffGrid(diffGridField.id, params);
            if (!result?.success) {
                alert('Не удалось сохранить сетку: ' + (result?.error || 'неизвестная ошибка'));
                return;
            }
        } catch (e) {
            alert('Ошибка сохранения сетки: ' + e.message);
            return;
        }

        setDiffGrids(prev => ({
            ...prev,
            [diffGridField.id]: {
                params,
                cellSize: diffGridPreview.cellSize,
                cells: diffGridPreview.cells,
            },
        }));
        setDiffGridPreview(null);
        setDiffGridField(null);   // закрываем окно только после успешного сохранения
    };

    const handleDiffClose = () => {
        setDiffGridPreview(null);
        setDiffGridField(null);
    };

    const currentBasemap = BASEMAPS[basemap];

    const getTotalArea = (field) => {
        return field.plots.reduce((sum, p) => sum + (parseFloat(p.area) || 0), 0);
    };

    // ─── Admin view: no map, no fields, only user management ──────
    if (user?.role === 'admin') {
        return (
            <div className="admin-app" style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
                <header style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '12px 24px',
                    background: '#fff',
                    borderBottom: '1px solid #ddd',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                }}>
                    <div style={{ fontWeight: 600, fontSize: '16px' }}>🌾 АгроПО-M — Панель администратора</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <span style={{ color: '#555', fontSize: '14px' }}>
                            {user.fullName || user.email}
                        </span>
                        <button
                            type="button"
                            className="btn-primary"
                            onClick={logout}
                            style={{
                                padding: '6px 18px',
                                fontSize: '14px',
                                borderRadius: '6px',
                                border: 'none',
                                cursor: 'pointer'
                            }}
                        >
                            Выйти
                        </button>
                    </div>
                </header>
                <main style={{ flex: 1, padding: '24px', overflow: 'auto', background: '#f5f5f5' }}>
                    <UserManager currentUser={user} inline />
                </main>
            </div>
        );
    }

    return (
        <div className="app">
            <aside className="sidebar">
                <BasemapSelector current={basemap} onChange={setBasemap} />
                <hr className="sidebar-divider" />

                <ProjectManager
                    projects={projects}
                    activeProjectId={activeProjectId}
                    onSelect={(id) => {
                        setActiveProjectId(id);
                    }}
                    onCreate={createProject}
                    onDelete={deleteProject}
                    onRename={renameProject}
                />

                {activeProject && (
                    <>
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
                            <button
                                className="btn-primary"
                                onClick={() => fileInputRef.current?.click()}
                            >
                                📁 Импорт поля (JSON)
                            </button>
                            <input
                                type="file"
                                accept=".json"
                                ref={fileInputRef}
                                onChange={handleImportFile}
                                style={{ display: 'none' }}
                            />
                        </div>

                        {mode === 'draw' && (
                            <div className="hint">
                                Кликайте по карте для вершин. Двойной клик — завершить.
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
                                        : 'Кликните вторую точку на противоположной границе.'}
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
                                        {f.data.cropType && `${refs.getCropName(f.data.cropType)} · `}
                                        {getTotalArea(f).toFixed(2)} га
                                        {/*{f.data.regionId && ` · ${f.data.regionId}`}*/}
                                    </div>
                                    <div className="field-actions">
                                        {f.plots.length === 1 && (
                                            <button
                                                className="btn-edit-geo"
                                                onClick={() => handleEditGeometry(f)}
                                                title="Редактировать геометрию"
                                            >
                                                ✎
                                            </button>
                                        )}
                                        <button
                                            className="btn-split-action"
                                            onClick={() => handleSplitStart(f)}
                                            title="Разбить на участки"
                                        >
                                            ✂
                                        </button>
                                        <button
                                            className="btn-agrochem"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setAgrochemField(f);
                                                setFocusTrigger({
                                                    field: f,
                                                    ts: Date.now(),
                                                    force: true
                                                });
                                            }}
                                            title="Агрохимический состав почвы"
                                        >
                                            🧪
                                        </button>
                                        <button
                                            className="btn-agrochem"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleDiffOpen(f);
                                            }}
                                            title="Сетка дифпосева"
                                        >
                                            ▦
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
                    </>
                )}

                {!activeProject && (
                    <div className="hint">
                        Создайте проект или выберите существующий
                    </div>
                )}

                <div className="sidebar-bottom">
                    {user && (
                        <div className="auth-panel">
                            <div className="auth-user" title={user.email}>
                                <span className="auth-avatar" aria-hidden="true">
                                  <svg
                                      width="16"
                                      height="16"
                                      viewBox="0 0 24 24"
                                      fill="currentColor"
                                  >
                                    <path d="M12 12c2.761 0 5-2.239 5-5s-2.239-5-5-5-5 2.239-5 5 2.239 5 5 5zm0 2c-3.314 0-9 1.657-9 5v1c0 .552.448 1 1 1h16c.552 0 1-.448 1-1v-1c0-3.343-5.686-5-9-5z" />
                                  </svg>
                                </span>

                                <span className="auth-name">
                                    {user.fullName || user.email || 'Пользователь'}
                                </span>
                            </div>

                            <button
                                type="button"
                                className="btn-secondary auth-logout"
                                onClick={logout}
                                title="Выйти из системы"
                            >
                                Выйти
                            </button>
                        </div>
                    )}

                    <div className="sidebar-copyright">
                        © OpenStreetMap contributors · © Esri
                    </div>
                </div>
            </aside>

            <main className="map-wrapper">
                <MapContainer
                    center={[55.7558, 37.6173]}
                    zoom={13}
                    attributionControl={false}
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

                    <MapFocusController focusTrigger={focusTrigger} />
                    <ZoomTracker onZoomChange={setMapZoom} />

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

                    {fields.map(f => (
                        f.plots.map((plot, plotIdx) => (
                            <Polygon
                                key={`${f.id}-${plotIdx}-${plot.coordinates.length}-${plot.area}`}
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
                                {plotIdx === 0 && mapZoom < 14 && (
                                    <Tooltip
                                        direction="center"
                                        offset={[0, 0]}
                                        opacity={1}
                                        permanent
                                        className="field-label"
                                    >
                                        <span>{f.data.name || 'Без названия'}</span>
                                        <br />
                                        <small>{refs.getCropName(f.data.cropType)} · {getTotalArea(f).toFixed(2)} га</small>
                                    </Tooltip>
                                )}

                                {mapZoom >= 14 && (
                                    <Tooltip
                                        direction="center"
                                        offset={[0, 0]}
                                        opacity={1}
                                        permanent
                                        className="plot-agro-label"
                                    >
                                        <div className="plot-label-num">№ {plotIdx + 1}</div>
                                        {(() => {
                                            const samples = f.data?.agrochemistry?.samples || [];
                                            const sample = samples.find(s =>
                                                s.plotIndex !== undefined ? s.plotIndex === plotIdx : s.number === plotIdx + 1
                                            );
                                            if (!sample?.values) return null;
                                            return Object.entries(sample.values).map(([paramId, val]) => {
                                                const param = refs.getAgroParam(paramId);
                                                if (!param) return null;
                                                return (
                                                    <div key={paramId} className="plot-label-param">
                                                        {param.unit} {val}
                                                    </div>
                                                );
                                            });
                                        })()}
                                    </Tooltip>
                                )}
                            </Polygon>
                        ))
                    ))}

                    {/* Живое превью: пунктирные линии (режим edit) */}
                    {diffGridPreview?.kind === 'lines' && diffGridPreview.lines.map((line, i) => (
                        <Polyline
                            key={`dgp-${i}`}
                            positions={line}
                            interactive={false}
                            pathOptions={{ color: '#1565c0', weight: 1, opacity: 0.8, dashArray: '4,4' }}
                        />
                    ))}

                    {/* Сформированная сетка (обрезанные ячейки) после «Сформировать» ▼▼▼ */}
                    {diffGridPreview?.kind === 'cells' && diffGridPreview.cells.map((cellPoly, i) => (
                        <Polygon
                            key={`dgf-${i}`}
                            positions={cellPoly}
                            interactive={false}
                            pathOptions={{ color: '#5e35b1', weight: 1.5, fillColor: '#7e57c2', fillOpacity: 0.1 }}
                        />
                    ))}

                    {/* Сохранённая сетка поля, для которого открыто окно (режим locked) */}
                    {diffGridField && diffGrids[diffGridField.id] && !diffGridPreview &&
                        diffGrids[diffGridField.id].cells.map((cellPoly, i) => (
                            <Polygon
                                key={`dg-saved-${diffGridField.id}-${i}`}
                                positions={cellPoly}
                                interactive={false}
                                pathOptions={{ color: '#5e35b1', weight: 1.5, fillColor: '#7e57c2', fillOpacity: 0.1 }}
                            />
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
                    detectedRegionId={modalField.detectedRegionId}
                    detectedSubjectId={modalField.detectedSubjectId}
                    isDetecting={modalField.isDetecting || false}
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

            {agrochemField && (
                <AgrochemistryEditor
                    field={agrochemField}
                    onSave={(data) => updateField(agrochemField.id, data)}
                    onClose={() => setAgrochemField(null)}
                />
            )}

            {showUserManager && (
                <UserManager
                    currentUser={user}
                    onClose={() => setShowUserManager(false)}
                />
            )}

            {diffGridField && (
                <DiffGridEditor
                    existing={diffGrids[diffGridField.id] || null}
                    onPreview={handleDiffPreview}
                    onForm={handleDiffForm}
                    onApply={handleDiffApply}
                    onReset={handleDiffReset}
                    onClose={handleDiffClose}
                />
            )}
        </div>
    );
}