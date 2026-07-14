import Button from './Button';

export default function ConfirmModal({
  title,
  message,
  onConfirm,
  onCancel,
  confirmText = 'Delete',
  cancelText = 'Cancel',
  confirmVariant = 'danger',
  loading = false,
  loadingLabel = 'Working...',
}) {
  return (
    <div
      className="fixed inset-0 z-[1200] flex items-center justify-center bg-black/40 p-4"
      onClick={onCancel}
      role="presentation"
    >
      <div
        className="w-full max-w-md rounded-lg border border-pine-200 bg-white p-6 shadow-lg"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-modal-title"
      >
        {title && (
          <h2 id="confirm-modal-title" className="text-lg font-medium text-pine-900">
            {title}
          </h2>
        )}
        <p className={`text-sm text-pine-700 ${title ? 'mt-2' : ''}`}>{message}</p>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="secondary" onClick={onCancel} disabled={loading}>
            {cancelText}
          </Button>
          <Button variant={confirmVariant} onClick={onConfirm} disabled={loading}>
            {loading ? loadingLabel : confirmText}
          </Button>
        </div>
      </div>
    </div>
  );
}
