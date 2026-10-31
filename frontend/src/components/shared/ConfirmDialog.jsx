import Button from "../ui/Button";

// Simple "Are you sure?" popup with confirm and cancel buttons
const ConfirmDialog = ({
  open, // controls visibility
  title = "Are you sure?", // dialog heading
  message, // optional supporting text
  confirmText = "Delete", // confirm button label
  loadingText = "Deleting...", // confirm button label while loading
  isLoading = false, // disables buttons and shows loading state
  onConfirm, // confirm click handler
  onCancel, // cancel click handler
}) => {
  if (!open) return null; // render nothing when closed

  return (
    // modal overlay
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      {/* dialog card */}
      <div className="w-full max-w-sm rounded-2xl bg-white shadow-2xl">
        {/* dialog header */}
        <div className="border-b border-slate-100 px-6 py-4">
          {/* dialog title */}
          <h2 className="text-base font-bold text-slate-800">{title}</h2>
          {/* optional message text */}
          {message && <p className="mt-0.5 text-xs text-slate-600">{message}</p>}
        </div>
        {/* confirm/cancel buttons */}
        <div className="flex items-center gap-3 px-6 py-4">
          {/* cancel button */}
          <Button variant="secondary" fullWidth onClick={onCancel}>
            Cancel
          </Button>
          {/* destructive confirm button */}
          <Button
            variant="danger"
            fullWidth
            disabled={isLoading}
            loading={isLoading}
            loadingText={loadingText}
            onClick={onConfirm}
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;
