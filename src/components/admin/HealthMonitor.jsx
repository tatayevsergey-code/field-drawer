import { useState, useEffect, useCallback } from 'react';
import { getDetailedHealth, getReadiness, getLiveness } from '../../api/health';

const btnPrimary = {
    background: '#1976d2', color: '#fff', border: 'none', borderRadius: 6,
    padding: '8px 16px', cursor: 'pointer', fontSize: 14,
};

const statusBadge = (status, isHealthy = true) => {
    const colors = isHealthy
        ? { bg: '#e8f5e9', color: '#2e7d32', text: status || 'Healthy' }
        : { bg: '#ffebee', color: '#c62828', text: status || 'Unhealthy' };

    return (
        <span style={{
            display: 'inline-block', padding: '4px 10px', borderRadius: 12,
            fontSize: 12, fontWeight: 600, background: colors.bg, color: colors.color, whiteSpace: 'nowrap',
        }}>
            {colors.text}
        </span>
    );
};

export function HealthMonitor({ onClose, inline = false }) {
    const [healthData, setHealthData] = useState(null);
    const [readinessData, setReadinessData] = useState(null);
    const [livenessData, setLivenessData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [lastUpdated, setLastUpdated] = useState(null);

    const fetchHealth = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            // Запрашиваем все три эндпоинта параллельно для максимальной скорости UI
            const [detailed, readiness, liveness] = await Promise.all([
                getDetailedHealth(),
                getReadiness(),
                getLiveness()
            ]);

            setHealthData(detailed);
            setReadinessData(readiness.readiness);
            setLivenessData(liveness.liveness);
            setLastUpdated(new Date().toLocaleTimeString('ru-RU'));
        } catch (err) {
            setError(err.message || 'Ошибка загрузки данных о здоровье сервиса');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchHealth();
        const interval = setInterval(fetchHealth, 30000); // Автообновление каждые 30 сек
        return () => clearInterval(interval);
    }, [fetchHealth]);

    const content = (
        <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <h3 style={{ margin: 0 }}>🩺 Мониторинг состояния системы</h3>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    {lastUpdated && <span style={{ fontSize: 12, color: '#666' }}>Обновлено: {lastUpdated}</span>}
                    <button onClick={fetchHealth} disabled={loading} style={btnPrimary}>
                        {loading ? 'Обновление...' : '🔄 Обновить'}
                    </button>
                </div>
            </div>

            {error && (
                <div style={{ padding: '10px 14px', background: '#ffebee', borderRadius: 6, marginBottom: 12, fontSize: 13, color: '#c62828', border: '1px solid #ef5350' }}>
                    {error}
                </div>
            )}

            {loading && !healthData && <div style={{ textAlign: 'center', padding: 40, color: '#888' }}>Загрузка данных...</div>}

            {healthData && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                    {/* Общая информация + Новые бейджи */}
                    <div style={{ background: '#f5f5f5', padding: 16, borderRadius: 8 }}>
                        <h4 style={{ margin: '0 0 12px 0', fontSize: 14, color: '#555' }}>Общий статус</h4>
                        <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', alignItems: 'center' }}>
                            <div>
                                <div style={{ fontSize: 12, color: '#666' }}>Сервис</div>
                                <div style={{ fontSize: 16, fontWeight: 600 }}>{healthData.service || 'gateway'}</div>
                            </div>
                            <div>
                                <div style={{ fontSize: 12, color: '#666' }}>Статус</div>
                                <div>{statusBadge(healthData.status, healthData.status === 'healthy')}</div>
                            </div>
                            <div>
                                <div style={{ fontSize: 12, color: '#666' }}>Версия</div>
                                <div style={{ fontSize: 16, fontWeight: 600 }}>{healthData.dependencies?.version?.version || '—'}</div>
                            </div>

                            {/* 🟢 НОВЫЕ БЕЙДЖИ Readiness и Liveness */}
                            {readinessData && (
                                <div>
                                    <div style={{ fontSize: 12, color: '#666' }}>Readiness</div>
                                    <div>{statusBadge(readinessData.ready ? 'Ready' : 'Not Ready', readinessData.ready)}</div>
                                </div>
                            )}
                            {livenessData && (
                                <div>
                                    <div style={{ fontSize: 12, color: '#666' }}>Liveness</div>
                                    <div>{statusBadge(livenessData.alive ? 'Alive' : 'Dead', livenessData.alive)}</div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Метрики */}
                    {healthData.dependencies?.metrics && (
                        <div style={{ background: '#f5f5f5', padding: 16, borderRadius: 8 }}>
                            <h4 style={{ margin: '0 0 12px 0', fontSize: 14, color: '#555' }}>Метрики Backend</h4>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 12 }}>
                                <MetricCard label="Uptime" value={`${healthData.dependencies.metrics.uptime_seconds} с`} />
                                <MetricCard label="Подключения" value={healthData.dependencies.metrics.active_connections} />
                                <MetricCard label="Запросов/сек" value={healthData.dependencies.metrics.requests_per_second} />
                                <MetricCard label="Всего запросов" value={healthData.dependencies.metrics.total_requests} />
                                <MetricCard label="Память" value={`${healthData.dependencies.metrics.memory_usage_mb} МБ`} />
                                <MetricCard label="CPU" value={`${healthData.dependencies.metrics.cpu_usage_percent}%`} />
                                <MetricCard label="Потоки" value={healthData.dependencies.metrics.goroutines} />
                            </div>
                        </div>
                    )}

                    {/* Зависимости */}
                    {healthData.dependencies?.dependencies && healthData.dependencies.dependencies.length > 0 && (
                        <div style={{ background: '#f5f5f5', padding: 16, borderRadius: 8 }}>
                            <h4 style={{ margin: '0 0 12px 0', fontSize: 14, color: '#555' }}>Зависимости</h4>
                            <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
                                <thead>
                                <tr style={{ borderBottom: '2px solid #ddd' }}>
                                    <th style={{ padding: '8px', textAlign: 'left' }}>Имя</th>
                                    <th style={{ padding: '8px', textAlign: 'left' }}>Тип</th>
                                    <th style={{ padding: '8px', textAlign: 'center' }}>Статус</th>
                                    <th style={{ padding: '8px', textAlign: 'right' }}>Задержка (мс)</th>
                                    <th style={{ padding: '8px', textAlign: 'left' }}>Сообщение</th>
                                </tr>
                                </thead>
                                <tbody>
                                {healthData.dependencies.dependencies.map((dep, idx) => (
                                    <tr key={idx} style={{ borderBottom: '1px solid #eee' }}>
                                        <td style={{ padding: '8px', fontWeight: 500 }}>{dep.name}</td>
                                        <td style={{ padding: '8px', color: '#666' }}>{dep.type}</td>
                                        <td style={{ padding: '8px', textAlign: 'center' }}>
                                            {statusBadge(dep.healthy ? 'OK' : 'Error', dep.healthy)}
                                        </td>
                                        <td style={{ padding: '8px', textAlign: 'right', fontFamily: 'monospace' }}>{dep.latency_ms}</td>
                                        <td style={{ padding: '8px', color: '#666' }}>{dep.message}</td>
                                    </tr>
                                ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}
        </>
    );

    if (inline) {
        return <div style={{ background: '#fff', borderRadius: 8, padding: 24, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>{content}</div>;
    }

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal modal-wide" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 900, width: '94%' }}>
                {content}
            </div>
        </div>
    );
}

function MetricCard({ label, value }) {
    return (
        <div style={{ background: '#fff', padding: 12, borderRadius: 6, border: '1px solid #e0e0e0', textAlign: 'center' }}>
            <div style={{ fontSize: 11, color: '#888', marginBottom: 4, textTransform: 'uppercase' }}>{label}</div>
            <div style={{ fontSize: 18, fontWeight: 600, color: '#333' }}>{value}</div>
        </div>
    );
}