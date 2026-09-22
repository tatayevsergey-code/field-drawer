import { useState, useEffect, useCallback } from 'react';
import {
    listBackups,
    createBackup,
    restoreBackup,
    deleteBackup,
    getBackupStatus,
} from '../../api/backups';
import { ConfirmDialog } from '../ConfirmDialog';

const btnPrimary = {
    background: '#1976d2',
    color: '#fff',
    border: 'none',
    borderRadius: 6,
    padding: '8px 16px',
    cursor: 'pointer',
    fontSize: 14,
};

const btnSecondary = {
    background: '#f0f0f0',
    color: '#333',
    border: '1px solid #ccc',
    borderRadius: 6,
    padding: '8px 16px',
    cursor: 'pointer',
    fontSize: 14,
};

const btnDanger = {
    background: '#d32f2f',
    color: '#fff',
    border: 'none',
    borderRadius: 6,
    padding: '6px 12px',
    cursor: 'pointer',
    fontSize: 12,
};

const btnSmall = {
    padding: '4px 10px',
    fontSize: 12,
    borderRadius: 4,
    border: '1px solid #ccc',
    background: '#fff',
    cursor: 'pointer',
};

export function BackupManager({ currentUser, onClose, inline = false }) {
    const [backups, setBackups] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [page, setPage] = useState(1);
    const [perPage] = useState(10);
    const [total, setTotal] = useState(0);
    const [creating, setCreating] = useState(false);
    const [description, setDescription] = useState('');
    const [confirmAction, setConfirmAction] = useState(null);
    // const [statusPolling, setStatusPolling] = useState({});
    const [success, setSuccess] = useState('');

    const fetchBackups = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const data = await listBackups({ page, perPage });
            if (data.success) {
                setBackups(data.backups || []);
                setTotal(data.total || 0);
            } else {
                setError(data.error || 'Ошибка загрузки бэкапов');
            }
        } catch (err) {
            setError(err.message || 'Ошибка загрузки бэкапов');
        } finally {
            setLoading(false);
        }
    }, [page, perPage]);

    useEffect(() => {
        fetchBackups();
    }, [fetchBackups]);

    // Поллинг статусов in_progress
    useEffect(() => {
        const inProgress = backups.filter(b => b.status === 'in_progress');
        if (inProgress.length === 0) return;

        const interval = setInterval(async () => {
            for (const backup of inProgress) {
                try {
                    const data = await getBackupStatus(backup.id);
                    if (data.success && data.backup) {
                        setBackups(prev =>
                            prev.map(b => b.id === backup.id ? data.backup : b)
                        );
                    }
                } catch (e) {
                    console.error('[BackupManager] status poll error:', e);
                }
            }
        }, 3000);

        return () => clearInterval(interval);
    }, [backups]);

    const handleCreate = async () => {
        setCreating(true);
        setError('');
        try {
            const data = await createBackup(description);
            if (data.success) {
                setDescription('');
                await fetchBackups();
            } else {
                setError(data.error || 'Ошибка создания бэкапа');
            }
        } catch (err) {
            setError(err.message || 'Ошибка создания бэкапа');
        } finally {
            setCreating(false);
        }
    };

    const handleRestore = async (backupId) => {
        setError('');
        setSuccess('');  // ← очистить предыдущее
        try {
            const data = await restoreBackup(backupId, false);
            if (data.success) {
                await fetchBackups();
                setSuccess('Бэкап успешно восстановлен');
                // Авто-скрытие через 4 секунды
                setTimeout(() => setSuccess(''), 4000);
            } else {
                setError(data.error || 'Ошибка восстановления');
            }
        } catch (err) {
            setError(err.message || 'Ошибка восстановления');
        }
    };

    const handleDelete = async (backupId) => {
        setError('');
        setSuccess('');  // ← очистить предыдущее
        try {
            const data = await deleteBackup(backupId);
            if (data.success) {
                await fetchBackups();
                setSuccess('Бэкап удалён');
                // Авто-скрытие через 4 секунды
                setTimeout(() => setSuccess(''), 4000);
            } else {
                setError(data.error || 'Ошибка удаления');
            }
        } catch (err) {
            setError(err.message || 'Ошибка удаления');
        }
    };

    const confirmRestore = (backup) => {
        setConfirmAction({
            title: 'Восстановление бэкапа',
            message: `Вы уверены, что хотите восстановить бэкап «${backup.filename}»? Существующие данные будут заменены.`,
            confirmText: 'Продолжить',        // ← было «Удалить»
            confirmClass: 'btn-primary',      // ← было «btn-danger» (красная)
            onConfirm: () => {
                handleRestore(backup.id);
                setConfirmAction(null);
            },
            onCancel: () => setConfirmAction(null),
        });
    };

    const confirmDelete = (backup) => {
        setConfirmAction({
            title: 'Удаление бэкапа',
            message: `Вы уверены, что хотите удалить бэкап «${backup.filename}»? Это действие необратимо.`,
            onConfirm: () => {
                handleDelete(backup.id);
                setConfirmAction(null);
            },
            onCancel: () => setConfirmAction(null),
        });
    };

    const formatSize = (bytes) => {
        if (!bytes) return '—';
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
        return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return '—';
        const d = new Date(dateStr);
        if (isNaN(d)) return dateStr;
        return d.toLocaleString('ru-RU');
    };

    // const statusBadge = (status) => {
    //     const colors = {
    //         completed: { bg: '#e8f5e9', color: '#2e7d32', text: 'Готов' },
    //         failed: { bg: '#ffebee', color: '#c62828', text: 'Ошибка' },
    //         in_progress: { bg: '#fff3e0', color: '#ef6c00', text: 'Создаётся...' },
    //         restored: { bg: '#e3f2fd', color: '#1565c0', text: 'Восстановлен' },
    //     };
    //     const cfg = colors[status] || { bg: '#f5f5f5', color: '#666', text: status };
    //     return (
    //         <span style={{
    //             display: 'inline-block',
    //             padding: '2px 8px',
    //             borderRadius: 12,
    //             fontSize: 11,
    //             fontWeight: 600,
    //             background: cfg.bg,
    //             color: cfg.color,
    //             whiteSpace: 'nowrap',
    //         }}>
    //             {cfg.text}
    //         </span>
    //     );
    // };

    const totalPages = Math.max(1, Math.ceil(total / perPage));

    const content = (
        <>
            <h3 style={{ marginBottom: '20px' }}>💾 Резервное копирование</h3>

            {error && (
                <div style={{
                    padding: '10px 14px',
                    background: '#ffebee',
                    borderRadius: 6,
                    marginBottom: 12,
                    fontSize: 13,
                    color: '#c62828',
                    border: '1px solid #ef5350',
                }}>
                    {error}
                </div>
            )}

            {/* блок успеха */}
            {success && (
                <div style={{
                    padding: '10px 14px',
                    background: '#e8f5e9',
                    borderRadius: 6,
                    marginBottom: 12,
                    fontSize: 13,
                    color: '#2e7d32',
                    border: '1px solid #4caf50',
                }}>
                    {success}
                </div>
            )}

            {/* Форма создания бэкапа */}
            <div style={{
                background: '#f5f5f5',
                padding: 16,
                borderRadius: 8,
                marginBottom: 20,
            }}>
                <div style={{ marginBottom: 12 }}>
                    <label style={{ display: 'block', fontSize: 13, marginBottom: 4, color: '#555' }}>
                        Описание (необязательно):
                    </label>
                    <input
                        type="text"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Например: Перед обновлением системы"
                        style={{
                            width: '100%',
                            padding: '8px 12px',
                            borderRadius: 4,
                            border: '1px solid #ccc',
                            fontSize: 14,
                            boxSizing: 'border-box',
                        }}
                    />
                </div>
                <button
                    type="button"
                    onClick={handleCreate}
                    disabled={creating}
                    style={{
                        ...btnPrimary,
                        opacity: creating ? 0.6 : 1,
                        cursor: creating ? 'not-allowed' : 'pointer',
                    }}
                >
                    {creating ? 'Создание...' : 'Создать бэкап'}
                </button>
            </div>

            {/* Таблица бэкапов */}
            <div style={{ maxHeight: inline ? 'calc(100vh - 380px)' : '55vh', overflow: 'auto' }}>
                <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
                    <thead>
                    <tr style={{ background: '#f5f5f5' }}>
                        <th style={{ padding: '8px', textAlign: 'left', borderBottom: '2px solid #ddd' }}>Файл</th>
                        <th style={{ padding: '8px', textAlign: 'left', borderBottom: '2px solid #ddd' }}>Описание</th>
                        <th style={{ padding: '8px', textAlign: 'center', borderBottom: '2px solid #ddd' }}>Размер</th>
                        {/*<th style={{ padding: '8px', textAlign: 'center', borderBottom: '2px solid #ddd' }}>Статус</th>*/}
                        <th style={{ padding: '8px', textAlign: 'left', borderBottom: '2px solid #ddd' }}>Дата</th>
                        <th style={{ padding: '8px', textAlign: 'center', borderBottom: '2px solid #ddd' }}>Действия</th>
                    </tr>
                    </thead>
                    <tbody>
                    {loading && backups.length === 0 && (
                        <tr>
                            <td colSpan={6} style={{ textAlign: 'center', padding: 24, color: '#888' }}>
                                Загрузка...
                            </td>
                        </tr>
                    )}
                    {!loading && backups.length === 0 && (
                        <tr>
                            <td colSpan={6} style={{ textAlign: 'center', padding: 24, color: '#888' }}>
                                Бэкапов нет
                            </td>
                        </tr>
                    )}
                    {backups.map((b) => (
                        <tr key={b.id} style={{ borderBottom: '1px solid #eee' }}>
                            <td style={{ padding: 8, fontFamily: 'monospace', fontSize: 12 }}>
                                {b.filename}
                            </td>
                            <td style={{ padding: 8, fontSize: 12, color: '#666' }}>
                                {b.description || '—'}
                            </td>
                            <td style={{ padding: 8, textAlign: 'center' }}>
                                {formatSize(b.size_bytes)}
                            </td>
                            {/*<td style={{ padding: 8, textAlign: 'center' }}>*/}
                            {/*    {statusBadge(b.status)}*/}
                            {/*</td>*/}
                            <td style={{ padding: 8, fontSize: 12 }}>
                                {formatDate(b.created_at)}
                            </td>
                            <td style={{ padding: 8, textAlign: 'center' }}>
                                <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
                                    {(b.status === 'completed' || b.status === 'restored') && (
                                        <button
                                            type="button"
                                            onClick={() => confirmRestore(b)}
                                            style={{ ...btnSmall, background: '#e3f2fd', color: '#1565c0' }}
                                            title="Восстановить"
                                        >
                                            ↻ Восстановить
                                        </button>
                                    )}
                                    <button
                                        type="button"
                                        onClick={() => confirmDelete(b)}
                                        style={{ ...btnSmall, background: '#ffebee', color: '#c62828' }}
                                        title="Удалить"
                                    >
                                        🗑 Удалить
                                    </button>
                                </div>
                            </td>
                        </tr>
                    ))}
                    </tbody>
                </table>
            </div>

            {/* Пагинация */}
            <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                gap: 10,
                marginTop: 14,
            }}>
                <button
                    className="btn-primary"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => p - 1)}
                    style={{
                        ...btnSecondary,
                        opacity: page <= 1 ? 0.6 : 1,
                        cursor: page <= 1 ? 'not-allowed' : 'pointer',
                    }}
                >
                    ← Назад
                </button>
                <span style={{ fontSize: 13, color: '#555' }}>
                    Страница {page} из {totalPages} · {total} всего
                </span>
                <button
                    className="btn-primary"
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => p + 1)}
                    style={{
                        ...btnSecondary,
                        opacity: page >= totalPages ? 0.6 : 1,
                        cursor: page >= totalPages ? 'not-allowed' : 'pointer',
                    }}
                >
                    Вперёд →
                </button>
            </div>

            {confirmAction && (
                <ConfirmDialog
                    title={confirmAction.title}
                    message={confirmAction.message}
                    confirmText={confirmAction.confirmText}
                    confirmClass={confirmAction.confirmClass}
                    onConfirm={confirmAction.onConfirm}
                    onCancel={confirmAction.onCancel}
                />
            )}
        </>
    );

    if (inline) {
        return (
            <div style={{
                background: '#fff',
                borderRadius: 8,
                padding: 24,
                boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
            }}>
                {content}
            </div>
        );
    }

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div
                className="modal modal-wide"
                onClick={(e) => e.stopPropagation()}
                style={{ maxWidth: 1100, width: '94%' }}
            >
                {content}
            </div>
        </div>
    );
}