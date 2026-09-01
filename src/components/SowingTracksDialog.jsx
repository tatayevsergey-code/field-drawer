import { useEffect, useRef, useState } from 'react';
import { listSowingTracks, saveSowingTrack, deleteSowingTrack } from '../api/projects';
import { parseSowingCsv } from '../utils/parseSowingCsv';

const btn = { padding: '4px 8px', fontSize: 12, borderRadius: 4, border: '1px solid #ccc', background: '#fff', cursor: 'pointer' };

const secondaryBtn = {
    background: '#f0f0f0',
    color: '#333',
    border: '1px solid #ccc',
    borderRadius: 6,
    padding: '8px 6px',
    fontSize: 13,
    cursor: 'pointer',
    flex: 1,
    minWidth: 0,
};

export function SowingTracksDialog({ field, visibleIds, onToggleTrack, onClose }) {
    const [tracks, setTracks] = useState([]);
    const [busy, setBusy] = useState(false);
    const fileRef = useRef(null);

    const refresh = async () => {
        try {
            const data = await listSowingTracks(field.id);
            if (data?.success) setTracks(data.tracks || []);
        } catch (e) { console.error('[sowing] list error:', e); }
    };
    useEffect(() => { refresh(); }, [field.id]);

    const handleFile = async (e) => {
        const file = e.target.files[0];
        e.target.value = '';
        if (!file) return;
        setBusy(true);
        try {
            const parsed = parseSowingCsv(await file.text());
            const res = await saveSowingTrack(field.id, { filename: file.name, points: parsed.points });
            if (res?.success) {
                await refresh();
                onToggleTrack(res.track_id);   // сразу показываем трек на карте
            } else {
                alert('Ошибка сохранения: ' + (res?.error || 'неизвестная ошибка'));
            }
        } catch (err) {
            alert('Ошибка импорта: ' + err.message);
        } finally { setBusy(false); }
    };

    const fmt = (s) => (s || '').replace('T', ' ').replace(/\.\d+Z?$/, '').slice(0, 16);

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal" style={{ maxWidth: 520, maxHeight: '85vh', overflowY: 'auto' }}
                 onClick={e => e.stopPropagation()}>
                <h3>Результаты посева: {field.data?.name || ''}</h3>
                <button type="button" disabled={busy} onClick={() => fileRef.current?.click()}
                        style={{ ...btn, background: '#1976d2', color: '#fff', border: 'none', padding: '8px 12px', width: '100%', marginBottom: 10 }}>
                    {busy ? 'Импорт…' : 'Импортировать CSV'}
                </button>
                <input ref={fileRef} type="file" accept=".csv,text/csv" style={{ display: 'none' }} onChange={handleFile} />
                {tracks.length === 0 && <div style={{ color: '#888', fontSize: 13 }}>Импортированных треков нет</div>}
                {tracks.map(t => (
                    <div key={t.id} style={{ border: '1px solid #ddd', borderRadius: 6, padding: '8px 10px', marginBottom: 8, fontSize: 13 }}>
                        <div style={{ fontWeight: 600 }}>{t.filename || `трек #${t.id}`}</div>
                        <div style={{ color: '#666', fontSize: 12 }}>
                            {fmt(t.time_start)} → {fmt(t.time_end)} · точек: {t.point_count} ·
                            <span style={{ color: t.alarm_points > 0 ? '#d32f2f' : '#2e7d32' }}> с тревогами: {t.alarm_points}</span>
                        </div>
                        <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                            <button style={btn} onClick={() => onToggleTrack(t.id)}>
                                {visibleIds.has?.(t.id) || visibleIds[t.id] ? 'Скрыть с карты' : 'Показать на карте'}
                            </button>
                            <button style={{ ...btn, color: '#d32f2f' }} onClick={async () => { await deleteSowingTrack(t.id); refresh(); }}>
                                Удалить
                            </button>
                        </div>
                    </div>
                ))}
                <div style={{ textAlign: 'right', marginTop: 8 }}>
                    {/*<button type="button" className="btn-secondary" onClick={onClose}>Закрыть</button>*/}
                    <button type="button" style={secondaryBtn} onClick={onClose}>
                        Закрыть
                    </button>
                </div>
            </div>
        </div>
    );
}