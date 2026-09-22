export function ConfirmDialog({
                                  title,
                                  message,
                                  onConfirm,
                                  onCancel,
                                  confirmText = 'Удалить',      // ← новый пропс
                                  confirmClass = 'btn-danger',   // ← новый пропс
                              }) {
    return (
        <div className="modal-overlay" onClick={onCancel}>
            <div className="modal modal-small" onClick={e => e.stopPropagation()}>
                <h3>{title || 'Подтвердите действие'}</h3>
                <p className="confirm-message">{message}</p>
                <div className="modal-actions">
                    <button onClick={onConfirm} className={confirmClass}>
                        {confirmText}
                    </button>
                    <button onClick={onCancel} className="btn-secondary">
                        Отмена
                    </button>
                </div>
            </div>
        </div>
    );
}