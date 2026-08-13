import { useState, useEffect, useCallback } from 'react';
import {
    listUsers,
    updateUserRole,
    deactivateUser,
    activateUser,
} from '../../api/users';
import { ConfirmDialog } from '../ConfirmDialog';

export function UserManager({ currentUser, onClose, inline = false }) {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [page, setPage] = useState(1);
    const [perPage] = useState(10);
    const [total, setTotal] = useState(0);
    const [search, setSearch] = useState('');
    const [searchDebounce, setSearchDebounce] = useState('');
    const [confirmAction, setConfirmAction] = useState(null);

    const fetchUsers = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const data = await listUsers({ page, perPage, search: searchDebounce });
            if (data.success) {
                // Сортировка по убыванию ID
                const sorted = (data.users || []).slice().sort((a, b) => a.id - b.id);
                setUsers(sorted);
                setTotal(data.total || 0);
            } else {
                setError(data.error || 'Ошибка загрузки пользователей');
            }
        } catch (err) {
            setError(err.message || 'Ошибка загрузки пользователей');
        } finally {
            setLoading(false);
        }
    }, [page, perPage, searchDebounce]);

    useEffect(() => {
        const timer = setTimeout(() => {
            setSearchDebounce(search);
            setPage(1);
        }, 300);
        return () => clearTimeout(timer);
    }, [search]);

    useEffect(() => {
        fetchUsers();
    }, [fetchUsers]);

    const totalPages = Math.max(1, Math.ceil(total / perPage));

    const handleRoleChange = async (userId, newRole) => {
        if (currentUser?.id === userId) {
            setError('Нельзя изменить свою собственную роль');
            return;
        }
        setError('');
        try {
            const data = await updateUserRole(userId, newRole);
            if (data.success) {
                fetchUsers();
            } else {
                setError(data.error || 'Не удалось обновить роль');
            }
        } catch (err) {
            setError(err.message || 'Не удалось обновить роль');
        }
    };

    const handleToggleActive = async (user) => {
        if (currentUser?.id === user.id) {
            setError('Нельзя деактивировать самого себя');
            return;
        }
        setError('');
        try {
            const data = user.isActive
                ? await deactivateUser(user.id)
                : await activateUser(user.id);
            if (data.success) {
                fetchUsers();
            } else {
                setError(data.error || 'Операция не выполнена');
            }
        } catch (err) {
            setError(err.message || 'Операция не выполнена');
        }
    };

    const confirmToggle = (user) => {
        setConfirmAction({
            title: user.isActive ? 'Деактивация пользователя' : 'Активация пользователя',
            message: `Вы уверены, что хотите ${user.isActive ? 'отключить' : 'активировать'} пользователя «${user.fullName || user.email}»?`,
            onConfirm: () => {
                handleToggleActive(user);
                setConfirmAction(null);
            },
            onCancel: () => setConfirmAction(null),
        });
    };

    const content = (
        <>
            <h3 style={{ marginBottom: '20px' }}>👥 Управление пользователями</h3>

            {error && (
                <div
                    style={{
                        padding: '10px 14px',
                        background: '#ffebee',
                        borderRadius: '6px',
                        marginBottom: '12px',
                        fontSize: '13px',
                        color: '#c62828',
                        border: '1px solid #ef5350',
                    }}
                >
                    {error}
                </div>
            )}

            <div style={{ marginBottom: '14px' }}>
                <input
                    type="text"
                    placeholder="Поиск по email или имени..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    style={{
                        width: '100%',
                        padding: '8px 12px',
                        borderRadius: '4px',
                        border: '1px solid #ccc',
                        fontSize: '14px',
                        boxSizing: 'border-box',
                    }}
                />
            </div>

            <div
                className="agro-table-wrap"
                style={{ maxHeight: inline ? 'calc(100vh - 280px)' : '55vh', overflow: 'auto' }}
            >
                <table
                    className="agro-table"
                    style={{ width: '100%', fontSize: '13px' }}
                >
                    <thead>
                    <tr>
                        <th style={{ width: '40px' }}>ID</th>
                        <th>Email</th>
                        <th>ФИО</th>
                        <th>Организация</th>
                        <th style={{ width: '90px' }}>Роль</th>
                        <th style={{ width: '80px' }}>Статус</th>
                        <th style={{ width: '50px' }}>Почта</th>
                        <th style={{ width: '120px' }}>Действие</th>
                    </tr>
                    </thead>
                    <tbody>
                    {loading && users.length === 0 && (
                        <tr>
                            <td
                                colSpan={8}
                                style={{
                                    textAlign: 'center',
                                    padding: '24px',
                                    color: '#888',
                                }}
                            >
                                Загрузка…
                            </td>
                        </tr>
                    )}
                    {!loading && users.length === 0 && (
                        <tr>
                            <td
                                colSpan={8}
                                style={{
                                    textAlign: 'center',
                                    padding: '24px',
                                    color: '#888',
                                }}
                            >
                                Пользователи не найдены
                            </td>
                        </tr>
                    )}
                    {users.map((u) => (
                        <tr key={u.id}>
                            <td>{u.id}</td>
                            <td>{u.email}</td>
                            <td>{u.fullName || '—'}</td>
                            <td>{u.organization || '—'}</td>
                            <td>
                                {currentUser?.id !== u.id ? (
                                    <select
                                        value={u.role}
                                        onChange={(e) =>
                                            handleRoleChange(u.id, e.target.value)
                                        }
                                        style={{
                                            padding: '3px 6px',
                                            fontSize: '12px',
                                            borderRadius: '4px',
                                            border: '1px solid #ccc',
                                            width: '100%',
                                        }}
                                    >
                                        <option value="user">user</option>
                                        <option value="admin">admin</option>
                                    </select>
                                ) : (
                                    <span style={{ fontSize: '12px', color: '#888' }}>
                                            {u.role}
                                        </span>
                                )}
                            </td>
                            <td>
                                    <span
                                        style={{
                                            display: 'inline-block',
                                            padding: '2px 8px',
                                            borderRadius: '12px',
                                            fontSize: '11px',
                                            fontWeight: 600,
                                            background: u.isActive ? '#e8f5e9' : '#ffebee',
                                            color: u.isActive ? '#2e7d32' : '#c62828',
                                            whiteSpace: 'nowrap',
                                        }}
                                    >
                                        {u.isActive ? 'Активен' : 'Отключён'}
                                    </span>
                            </td>
                            <td style={{ textAlign: 'center' }}>
                                {u.emailConfirmed ? '✅' : '❌'}
                            </td>
                            <td>
                                {currentUser?.id !== u.id ? (
                                    <button
                                        type="button"
                                        onClick={() => confirmToggle(u)}
                                        className={u.isActive ? 'btn-danger' : 'btn-primary'}
                                        style={{ padding: '4px 10px', fontSize: '12px', width: '100%' }}
                                    >
                                        {u.isActive ? 'Отключить' : 'Активировать'}
                                    </button>
                                ) : (
                                    <span style={{ fontSize: '11px', color: '#888' }}>Вы</span>
                                )}
                            </td>
                        </tr>
                    ))}
                    </tbody>
                </table>
            </div>

            <div
                style={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    gap: '10px',
                    marginTop: '14px',
                }}
            >
                <button
                    className="btn-primary"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => p - 1)}
                    style={{
                        padding: '6px 14px',
                        fontSize: '13px',
                        borderRadius: '6px',
                        border: 'none',
                        cursor: page <= 1 ? 'not-allowed' : 'pointer',
                        opacity: page <= 1 ? 0.6 : 1,
                    }}
                >
                    ← Назад
                </button>
                <span style={{ fontSize: '13px', color: '#555' }}>
                    Страница {page} из {totalPages} · {total} всего
                </span>
                <button
                    className="btn-primary"
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => p + 1)}
                    style={{
                        padding: '6px 14px',
                        fontSize: '13px',
                        borderRadius: '6px',
                        border: 'none',
                        cursor: page >= totalPages ? 'not-allowed' : 'pointer',
                        opacity: page >= totalPages ? 0.6 : 1,
                    }}
                >
                    Вперёд →
                </button>
            </div>

            {!inline && (
                <div className="modal-actions">
                    <button type="button" onClick={onClose} className="btn-secondary">
                        Закрыть
                    </button>
                </div>
            )}
        </>
    );

    if (inline) {
        return (
            <div style={{ background: '#fff', borderRadius: '8px', padding: '24px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
                {content}
                {confirmAction && (
                    <ConfirmDialog
                        title={confirmAction.title}
                        message={confirmAction.message}
                        onConfirm={confirmAction.onConfirm}
                        onCancel={confirmAction.onCancel}
                    />
                )}
            </div>
        );
    }

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div
                className="modal modal-wide"
                onClick={(e) => e.stopPropagation()}
                style={{ maxWidth: '1000px', width: '94%' }}
            >
                {content}
            </div>
            {confirmAction && (
                <ConfirmDialog
                    title={confirmAction.title}
                    message={confirmAction.message}
                    onConfirm={confirmAction.onConfirm}
                    onCancel={confirmAction.onCancel}
                />
            )}
        </div>
    );
}