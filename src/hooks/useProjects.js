import { useState, useCallback } from 'react';

export function useProjects() {
    const [projects, setProjects] = useState([]);
    const [activeProjectId, setActiveProjectId] = useState(null);

    // Создать проект
    const createProject = useCallback((name) => {
        const newProject = {
            id: Date.now(),
            name: name || 'Новый проект',
            fields: [],
            createdAt: new Date()
        };
        setProjects(prev => [...prev, newProject]);
        setActiveProjectId(newProject.id);
        return newProject.id;
    }, []);

    // Удалить проект
    const deleteProject = useCallback((id) => {
        setProjects(prev => prev.filter(p => p.id !== id));
        if (activeProjectId === id) {
            setActiveProjectId(null);
        }
    }, [activeProjectId]);

    // Переименовать проект
    const renameProject = useCallback((id, newName) => {
        setProjects(prev => prev.map(p =>
            p.id === id ? { ...p, name: newName } : p
        ));
    }, []);

    // Получить активный проект
    const activeProject = projects.find(p => p.id === activeProjectId) || null;

    // --- Операции с полями внутри активного проекта ---

    const addField = useCallback((coordinates, data) => {
        if (!activeProjectId) return;

        const newField = {
            id: Date.now(),
            plots: [{ coordinates, area: data.area }],
            data,
            createdAt: new Date()
        };

        setProjects(prev => prev.map(p =>
            p.id === activeProjectId
                ? { ...p, fields: [...p.fields, newField] }
                : p
        ));
    }, [activeProjectId]);

    const updateField = useCallback((fieldId, newData) => {
        if (!activeProjectId) return;

        setProjects(prev => prev.map(p =>
            p.id === activeProjectId
                ? {
                    ...p,
                    fields: p.fields.map(f =>
                        f.id === fieldId ? { ...f, data: newData } : f
                    )
                }
                : p
        ));
    }, [activeProjectId]);

    const updateFieldPlots = useCallback((fieldId, newPlots) => {
        if (!activeProjectId) return;

        setProjects(prev => prev.map(p =>
            p.id === activeProjectId
                ? {
                    ...p,
                    fields: p.fields.map(f =>
                        f.id === fieldId ? { ...f, plots: newPlots } : f
                    )
                }
                : p
        ));
    }, [activeProjectId]);

    const deleteField = useCallback((fieldId) => {
        if (!activeProjectId) return;

        setProjects(prev => prev.map(p =>
            p.id === activeProjectId
                ? { ...p, fields: p.fields.filter(f => f.id !== fieldId) }
                : p
        ));
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
        updateField,
        updateFieldPlots,
        deleteField
    };
}