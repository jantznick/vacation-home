export default function Modal({ title, onClose, children, footer }) {
  return (
    <div
      className="fixed inset-0 z-[1200] flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-lg border border-pine-200 bg-white shadow-lg"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? 'modal-title' : undefined}
      >
        {title && (
          <div className="border-b border-pine-200 px-6 py-4">
            <h2 id="modal-title" className="text-lg font-medium text-pine-900">
              {title}
            </h2>
          </div>
        )}
        <div className="px-6 py-4">{children}</div>
        {footer && (
          <div className="flex justify-end gap-2 border-t border-pine-200 px-6 py-4">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
