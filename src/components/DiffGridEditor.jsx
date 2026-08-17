import { useState, useEffect } from 'react';

const primaryBtn = (disabled = false) => ({
    background: '#1976d2',
    color: '#fff',
    border: 'none',
    borderRadius: 6,
    padding: '8px 6px',
    fontSize: 13,
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.6 : 1,
    flex: 1,
    minWidth: 0,
});

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
const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

const MULT_TOOLTIP =
    'Кратность задает во сколько раз ширина ячейки дифпосева будет больше ширины сеялки';

export function DiffGridEditor({ existing, onPreview, onForm, onApply, onReset, onClose }) {
    const saved = Boolean(existing);              // сетка уже сохранена в этом поле
    const [formed, setFormed] = useState(false);  // сформирована в текущей сессии

    // При открытии «на просмотр» подставляем сохранённые параметры
    const p = existing?.params;
    const [direction, setDirection]       = useState(String(p?.direction ?? 0));
    const [seederWidth, setSeederWidth]   = useState(String(p?.seederWidth ?? 6));
    const [multiplicity, setMultiplicity] = useState(String(p?.multiplicity ?? 5));
    const [offsetX, setOffsetX]           = useState(String(p?.offsetX ?? 0));
    const [offsetY, setOffsetY]           = useState(String(p?.offsetY ?? 0));

    const params = {
        direction:    clamp(Number(direction) || 0, 0, 360),
        seederWidth:  clamp(Number(seederWidth) || 0, 1, 30),
        multiplicity: clamp(Number(multiplicity) || 1, 1, 50),
        offsetX:      clamp(Number(offsetX) || 0, -99, 200),
        offsetY:      clamp(Number(offsetY) || 0, -99, 200),
    };

    const locked  = saved || formed;   // поля и «Сформировать» заблокированы
    const editing = !locked;

    // Живое превью — только в режиме редактирования
    useEffect(() => {
        if (!editing) return;
        onPreview(params);
    }, [editing, direction, seederWidth, multiplicity, offsetX, offsetY]);

    const cell = params.seederWidth * params.multiplicity;
    const inputStyle = { opacity: locked ? 0.55 : 1 };

    // 3-я кнопка: Применить ↔ Сбросить
    const handleThird = () => {
        if (saved) {
            onReset();        // удаляем сохранённую сетку
            setFormed(false); // возвращаемся в режим редактирования
        } else {
            onApply(params);  // сохраняем результат, окно остаётся открытым
        }
    };

    return (
        <div
            className="modal"
            style={{
                position: 'fixed', top: 16, right: 16, zIndex: 1000,
                width: 380, margin: 0, transform: 'none',
            }}
        >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <h3 style={{ margin: 0 }}>Создание сетки дифпосева</h3>
                <button type="button" onClick={onClose}
                        style={{ border: 'none', background: 'none', fontSize: 16, cursor: 'pointer', color: '#888' }}>
                    ✕
                </button>
            </div>

            <label>
                Направление основного гона, гр
                <input type="number" min="0" max="360" step="1" disabled={locked} style={inputStyle}
                       value={direction} onChange={e => setDirection(e.target.value)} />
            </label>

            <label>
                Ширина сеялки, м
                <input type="number" min="1" max="30" step="0.5" disabled={locked} style={inputStyle}
                       value={seederWidth} onChange={e => setSeederWidth(e.target.value)} />
            </label>

            <label title={MULT_TOOLTIP}>
                Кратность{' '}
                <span title={MULT_TOOLTIP} style={{ cursor: 'help', color: '#888' }}>ⓘ</span>
                <input type="number" min="1" max="50" step="1" disabled={locked} style={inputStyle}
                       value={multiplicity} onChange={e => setMultiplicity(e.target.value)}
                       title={MULT_TOOLTIP} />
            </label>

            <label>
                Смещение по горизонтали, м
                <input type="number" min="-99" max="200" step="1" disabled={locked} style={inputStyle}
                       value={offsetX} onChange={e => setOffsetX(e.target.value)} />
            </label>

            <label>
                Смещение по вертикали, м
                <input type="number" min="-99" max="200" step="1" disabled={locked} style={inputStyle}
                       value={offsetY} onChange={e => setOffsetY(e.target.value)} />
            </label>

            <div style={{ fontSize: 12, color: '#666', margin: '4px 0 12px' }}>
                Размер ячейки: {cell > 0 ? `${cell} × ${cell} м` : '—'}
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
                <button
                    type="button"
                    disabled={locked}
                    style={primaryBtn(locked)}
                    onClick={() => { onForm(params); setFormed(true); }}
                >
                    Сформировать
                </button>
                <button type="button" style={secondaryBtn} onClick={onClose}>
                    Отмена
                </button>
                <button
                    type="button"
                    disabled={!saved && !formed}
                    style={saved ? secondaryBtn : primaryBtn(!saved && !formed)}
                    onClick={handleThird}
                >
                    {saved ? 'Сбросить' : 'Применить'}
                </button>
            </div>
        </div>
    );
}