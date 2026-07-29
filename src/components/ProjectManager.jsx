import { useState } from 'react';

export function ProjectManager({ projects, activeProjectId, onSelect, onCreate, onDelete, onRename }) {
    const [newName, setNewName] = useState('');
    const [editingId, setEditingId] = useState(null);
    const [editName, setEditName] = useState('');

    const handleCreate = (e) => {
        e.preventDefault();
        if (newName.trim()) {
            onCreate(newName.trim());
            setNewName('');
        }
    };

    const startRename = (project) => {
        setEditingId(project.id);
        setEditName(project.name);
    };

    const handleRename = (e) => {
        e.preventDefault();
        if (editName.trim()) {
            onRename(editingId, editName.trim());
            setEditingId(null);
        }
    };

    return (
        <div className="project-manager">
            <h3>Проекты</h3>

            <form onSubmit={handleCreate} className="project-form">
                <input
                    value={newName}
                    onChange={e => setNewName(e.target.value)}
                    placeholder="Новый проект..."
                />
                <button type="submit">+</button>
            </form>

            <div className="project-list">
                {projects.length === 0 && (
                    <div className="empty">Нет проектов</div>
                )}
                {projects.map(p => (
                    <div
                        key={p.id}
                        className={`project-item ${activeProjectId === p.id ? 'active' : ''}`}
                    >
                        {editingId === p.id ? (
                            <form onSubmit={handleRename} className="project-rename">
                                <input
                                    value={editName}
                                    onChange={e => setEditName(e.target.value)}
                                    autoFocus
                                />
                                <button type="submit">✓</button>
                                <button type="button" onClick={() => setEditingId(null)}>✕</button>
                            </form>
                        ) : (
                            <>
                                <span onClick={() => onSelect(p.id)} className="project-name">
                                    {p.name}
                                    <small>{p.fields.length} полей</small>
                                </span>
                                <div className="project-actions">
                                    <button onClick={() => startRename(p)} title="Переименовать">✎</button>
                                    <button onClick={() => onDelete(p.id)} title="Удалить">🗑</button>
                                </div>
                            </>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}