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
                    <div className="auth-title" style={{ color: '#c62828' }}>
                        Ошибка загрузки
                    </div>
                    <div style={{ color: '#666', marginTop: 8, fontSize: 14 }}>{error}</div>
                    <button
                        type="button"
                        className="btn-primary"
                        style={{ marginTop: 16 }}
                        onClick={() => window.location.reload()}
                    >
                        Перезагрузить
                    </button>
                </div>
            </div>
        );
    }

    return (
        <ReferenceContext.Provider value={refs}>{children}</ReferenceContext.Provider>
    );
}

export function useReferences() {
    const ctx = useContext(ReferenceContext);
    if (!ctx) {
        throw new Error('useReferences должен использоваться внутри ReferenceProvider');
    }
    return ctx;
}