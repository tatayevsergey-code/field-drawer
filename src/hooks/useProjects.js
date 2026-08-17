import { useState, useCallback, useEffect } from 'react';
import * as api from '../api/projects';

// ─── Адаптер: плоский proto-формат → вложенный data-формат ───
function adaptField(f) {
    if (!f) return f;
    return {
        id: f.id,
        plots: (f.plots || []).map(p => ({
            plotIndex: p.plot_index ?? 0,
            coordinates: (p.points || []).map(pt => [pt.lat, pt.lng]),
            area: p.area_ha ? String(p.area_ha) : '0',
        })),
        data: {
            name: f.name || '',
            cropType: f.crop_id || '',
            soilType: f.soil_id || '',
            regionId: f.region_id || '',
            subjectId: f.subject_id || '',
            notes: f.notes || '',
            area: f.total_area_ha ? String(f.total_area_ha) : '0',
            countryRegion: f.country_region_json
                ? (() => { try { return JSON.parse(f.country_region_json); } catch { return null; } })()
                : null,
            agrochemistry: {
                samples: (f.samples || []).map(s => {
                    const values = {};
                    (s.values || []).forEach(v => { values[v.agrochem_id] = v.value; });
                    return { number: s.number, plotIndex: s.plot_index, values };
                }),
            },
        },
    };
}

// ─── Обратный адаптер: data-формат → плоский proto-формат ────
function toProtoFormat(data, plots) {
    return {
        name: data.name || '',
        cropId: data.cropType ? Number(data.cropType) : 0,
        soilId: data.soilType ? Number(data.soilType) : 0,
        regionId: data.regionId ? Number(data.regionId) : 0,
        subjectId: data.subjectId ? Number(data.subjectId) : 0,
        notes: data.notes || '',
        countryRegion: data.countryRegion || null,
        plots: (plots || []).map((p, idx) => ({
            plotIndex: p.plotIndex ?? idx,
            coordinates: (p.coordinates || []).map(([lat, lng]) => ({ lat, lng })),
        })),
        samples: (data.agrochemistry?.samples || []).map(s => ({
            number: s.number,
            plotIndex: s.plotIndex ?? 0,
            values: Object.entries(s.values || {}).map(([aid, val]) => ({
                agrochem_id: Number(aid),
                value: val,
            })),
        })),
    };
}

export function useProjects() {
    const [projects, setProjects] = useState([]);
    const [activeProjectId, setActiveProjectId] = useState(null);
    const [loading, setLoading] = useState(true);

    // ─── Загрузка проектов при монтировании ─────────────────────
    useEffect(() => {
        loadProjects();
    }, []);

    const loadProjects = async () => {
        try {
            setLoading(true);
            const data = await api.listProjects();
            if (data?.success && Array.isArray(data.projects)) {
                // Для каждого проекта загружаем поля
                const withFields = await Promise.all(
                    data.projects.map(async (p) => {
                        try {
                            const fd = await api.listFields(p.id);
                            return {
                                id: p.id,
                                name: p.name,
                                fields: (fd?.fields || []).map(adaptField),
                            };
                        } catch (e) {
                            console.error('[loadProjects] fields load error', p.id, e);
                            return { id: p.id, name: p.name, fields: [] };
                        }
                    })
                );
                setProjects(withFields);
                if (withFields.length > 0 && !activeProjectId) {
                    setActiveProjectId(withFields[0].id);
                }
            }
        } catch (error) {
            console.error('[useProjects] Ошибка загрузки проектов:', error);
        } finally {
            setLoading(false);
        }
    };

    const activeProject = projects.find(p => String(p.id) === String(activeProjectId)) || null;

    // ─── Проекты ─────────────────────────────────────────────────
    const createProject = useCallback(async (name) => {
        try {
            const data = await api.createProject(name);
            if (data?.success) {
                const newProj = { id: data.project.id, name: data.project.name, fields: [] };
                setProjects(prev => [...prev, newProj]);
                setActiveProjectId(newProj.id);
                return newProj.id;
            }
        } catch (error) {
            console.error('[useProjects] createProject error:', error);
        }
    }, []);

    const deleteProject = useCallback(async (id) => {
        try {
            const data = await api.deleteProject(id);
            if (data?.success) {
                setProjects(prev => prev.filter(p => String(p.id) !== String(id)));
                if (String(activeProjectId) === String(id)) {
                    setActiveProjectId(null);
                }
            }
        } catch (error) {
            console.error('[useProjects] deleteProject error:', error);
        }
    }, [activeProjectId]);

    const renameProject = useCallback(async (id, newName) => {
        try {
            const data = await api.updateProject(id, newName);
            if (data?.success) {
                setProjects(prev =>
                    prev.map(p => String(p.id) === String(id) ? { ...p, name: newName } : p)
                );
            }
        } catch (error) {
            console.error('[useProjects] renameProject error:', error);
        }
    }, []);

    // ─── Поля ────────────────────────────────────────────────────
    const addField = useCallback(async (coordinates, data) => {
        if (!activeProjectId) return;
        try {
            const payload = toProtoFormat(data, [{ coordinates, area: data.area }]);
            payload.projectId = activeProjectId;
            const result = await api.createField(payload);
            if (result?.success) {
                const adapted = adaptField(result.field);
                setProjects(prev =>
                    prev.map(p =>
                        String(p.id) === String(activeProjectId)
                            ? { ...p, fields: [...p.fields, adapted] }
                            : p
                    )
                );
            }
        } catch (error) {
            console.error('[useProjects] addField error:', error);
        }
    }, [activeProjectId]);

    const addFieldWithPlots = useCallback(async (plots, data) => {
        if (!activeProjectId) return;
        try {
            const payload = toProtoFormat(data, plots);
            payload.projectId = activeProjectId;
            const result = await api.createField(payload);
            if (result?.success) {
                const adapted = adaptField(result.field);
                setProjects(prev =>
                    prev.map(p =>
                        String(p.id) === String(activeProjectId)
                            ? { ...p, fields: [...p.fields, adapted] }
                            : p
                    )
                );
            }
        } catch (error) {
            console.error('[useProjects] addFieldWithPlots error:', error);
        }
    }, [activeProjectId]);

    const updateField = useCallback(async (fieldId, newData) => {
        if (!activeProjectId) return;
        const field = activeProject?.fields.find(f => String(f.id) === String(fieldId));
        if (!field) return;
        try {
            const payload = toProtoFormat(newData, field.plots);
            const result = await api.updateField(fieldId, payload);
            if (result?.success) {
                const adapted = adaptField(result.field);
                setProjects(prev =>
                    prev.map(p =>
                        String(p.id) === String(activeProjectId)
                            ? { ...p, fields: p.fields.map(f => String(f.id) === String(fieldId) ? adapted : f) }
                            : p
                    )
                );
            }
        } catch (error) {
            console.error('[useProjects] updateField error:', error);
        }
    }, [activeProjectId, activeProject]);

    const updateFieldPlots = useCallback(async (fieldId, newPlots) => {
        if (!activeProjectId) return;
        const field = activeProject?.fields.find(f => String(f.id) === String(fieldId));
        if (!field) return;
        try {
            const payload = toProtoFormat(field.data, newPlots);
            const result = await api.updateField(fieldId, payload);
            if (result?.success) {
                const adapted = adaptField(result.field);
                setProjects(prev =>
                    prev.map(p =>
                        String(p.id) === String(activeProjectId)
                            ? { ...p, fields: p.fields.map(f => String(f.id) === String(fieldId) ? adapted : f) }
                            : p
                    )
                );
            }
        } catch (error) {
            console.error('[useProjects] updateFieldPlots error:', error);
        }
    }, [activeProjectId, activeProject]);

    const deleteField = useCallback(async (fieldId) => {
        if (!activeProjectId) return;
        try {
            const data = await api.deleteField(fieldId);
            if (data?.success) {
                setProjects(prev =>
                    prev.map(p =>
                        String(p.id) === String(activeProjectId)
                            ? { ...p, fields: p.fields.filter(f => String(f.id) !== String(fieldId)) }
                            : p
                    )
                );
            }
        } catch (error) {
            console.error('[useProjects] deleteField error:', error);
        }
    }, [activeProjectId]);

    return {
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
        deleteField,
        loading,
    };
}