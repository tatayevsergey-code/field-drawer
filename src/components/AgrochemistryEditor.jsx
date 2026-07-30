export function AgrochemistryEditor({ field, onClose }) {
    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal" onClick={e => e.stopPropagation()}>
                <h3>🧪 Агрохимический состав почвы</h3>
                <p style={{ color: '#999', margin: '20px 0', textAlign: 'center' }}>
                    Здесь будет форма ввода агрохимических показателей.
                </p>
                <div className="modal-actions">
                    <button type="button" onClick={onClose} className="btn-secondary">
                        Закрыть
                    </button>
                </div>
            </div>
        </div>
    );
}