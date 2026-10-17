import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Trash2, X } from "lucide-react";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Delete",
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;

    cancelRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCancel();
    };
    document.addEventListener("keydown", handleKeyDown);

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, onCancel]);

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
    >
      <div
        className="animate-fade-in absolute inset-0 bg-ink/40"
        onClick={onCancel}
        aria-hidden="true"
      />

      <div className="animate-scale-in relative w-full max-w-sm rounded-2xl border border-neutral-200 bg-white p-5 shadow-[0_24px_64px_-24px_rgba(9,9,11,0.55)]">
        <div className="flex items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-neutral-100">
            <Trash2 className="h-4 w-4 text-ink" aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <h3 id="confirm-dialog-title" className="text-sm font-semibold text-ink">
              {title}
            </h3>
            {description && (
              <p className="mt-1 text-xs leading-relaxed text-neutral-500">
                {description}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onCancel}
            title="Close"
            aria-label="Close"
            className="-mt-1 -mr-1 shrink-0 cursor-pointer rounded-lg p-1.5 text-neutral-400 transition hover:bg-neutral-100 hover:text-ink active:scale-90"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button
            ref={cancelRef}
            type="button"
            onClick={onCancel}
            className="inline-flex cursor-pointer items-center rounded-lg border border-neutral-200 bg-white px-3.5 py-2 text-xs font-medium text-neutral-700 transition hover:border-neutral-300 hover:bg-neutral-50 hover:text-ink active:scale-[0.96]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-ink px-3.5 py-2 text-xs font-medium text-white transition hover:bg-neutral-800 active:scale-[0.96]"
          >
            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
