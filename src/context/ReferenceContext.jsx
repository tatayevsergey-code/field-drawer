import { createContext, useContext, useEffect, useState } from 'react';
import { fetchDictionaries } from '../api/dictionaries';

const ReferenceContext = createContext(null);

export function ReferenceProvider({ children }) {
    const [refs, setRefs] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        let mounted = true;
        setLoading(true);

        fetchDictionaries()
            .then((data) => {
                if (mounted) {
                    setRefs(data);
                    setError(null);
                }
            })
            .catch((err) => {
                if (mounted) {
                    console.error('[ReferenceProvider] Ошибка загрузки справочников:', err);
                    setError(err.message || 'Не удалось загрузить справочники');
                }
            })
            .finally(() => {
                if (mounted) setLoading(false);
            });

        return () => {
            mounted = false;
        };
    }, []);

    if (loading) {
        return (
            <div className="auth-page">
                <div className="auth-card">
                    <div className="auth-title">Загрузка справочников...</div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="auth-page">
                <div className="auth-card">
                    <div className="auth-title" style={{ color: '#c62828' }}>Ошибка загрузки</div>
                    <div style={{ color: '#666', marginTop: 8, fontSize: 14 }}>{error}</div>
                    <button type="button" className="btn-primary" style={{ marginTop: 16 }}
                            onClick={() => window.location.reload()}>
                        Перезагрузить
                    </button>
                </div>
            </div>
        );
    }

    // ─── Локальные хелперы над загруженными данными ──────────────
    const getAgroParam = (id) => refs.agro_params.find(p => p.id === Number(id));
    const getRegion = (id) => refs.zones.find(r => r.id === Number(id));
    const getSubject = (id) => refs.subjects.find(s => s.id === Number(id));
    const getSoil = (id) => refs.soils.find(s => s.id === Number(id));
    const getSoilGroup = (id) => refs.soil_groups.find(g => g.id === Number(id));

    const findRegionByCode = (code) => {
        const codeStr = String(code);
        for (const subject of refs.subjects) {
            if ((subject.codes || []).includes(codeStr)) return subject.zone_id;
        }
        return null;
    };

    const findRegionByName = (name) => {
        if (!name) return null;
        const nameLower = name.toLowerCase().trim();
        // Эвристики сопоставления названий (не данные, а логика поиска)
        const specialCases = {
            'москва': 3,
            'санкт-петербург': 2,
            'спб': 2,
            'московская область': 3,
            'ленинградская область': 2,
            'мордовия': 7,
            'республика мордовия': 7
        };
        for (const [key, regionId] of Object.entries(specialCases)) {
            if (nameLower.includes(key) || key.includes(nameLower)) return regionId;
        }
        for (const subject of refs.subjects) {
            const subjectLower = subject.name.toLowerCase();
            if (subjectLower.includes(nameLower) || nameLower.includes(subjectLower)) {
                return subject.zone_id;
            }
        }
        return null;
    };

    const getParamMax = (agrochemId, regionId, soilGroupId = null) => {
        const limits = refs.limits.filter(l =>
            l.agrochem_id === Number(agrochemId) && l.zone_id === Number(regionId)
        );
        if (limits.length === 0) return null;
        if (soilGroupId !== null && soilGroupId !== undefined) {
            const specific = limits.find(l => l.soil_group_id === Number(soilGroupId));
            if (specific) return specific.max_value;
        }
        return Math.max(...limits.map(l => l.max_value));
    };

    const validateParamValue = (agrochemId, regionId, value, soilGroupId = null) => {
        const max = getParamMax(agrochemId, regionId, soilGroupId);
        if (max === null || max === undefined ||
            value === undefined || value === null || value === '') {
            return { isValid: true, max: null, message: 'Лимиты не заданы' };
        }
        return {
            isValid: Number(value) <= max,
            max,
            message: Number(value) <= max ? 'В норме' : `Превышение (макс. ${max})`
        };
    };

    const value = {
        ...refs,
        // Агрохимия
        getAgroParam,
        getAgroParamName: (id) => getAgroParam(id)?.name || '—',
        getAgroParamUnit: (id) => getAgroParam(id)?.unit || '',
        // Регионы / субъекты
        getRegion,
        getRegionName: (id) => getRegion(id)?.name || '---',
        getSubject,
        getSubjectName: (id) => getSubject(id)?.name || '---',
        findRegionByCode,
        findRegionByName,
        // Почвы
        getSoilGroupName: (id) => getSoilGroup(id)?.name || '—',
        getSoilName: (id) => getSoil(id)?.name || '—',
        getSoilGroupByTypeId: (soilTypeId) => getSoil(soilTypeId)?.group_id || null,
        // Культуры
        getCropName: (id) => refs.crops.find(c => c.id === Number(id))?.name || '—',
        // Лимиты
        getParamMax,
        validateParamValue,
    };

    return (
        <ReferenceContext.Provider value={value}>{children}</ReferenceContext.Provider>
    );
}

export function useReferences() {
    const ctx = useContext(ReferenceContext);
    if (!ctx) {
        throw new Error('useReferences должен использоваться внутри ReferenceProvider');
    }
    return ctx;
}