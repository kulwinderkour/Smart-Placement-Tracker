interface ConfirmActionModalProps {
  isOpen: boolean;
  title?: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmActionModal({
  isOpen,
  title = "Confirm Action",
  message = "Are you sure?",
  confirmText = "Yes",
  cancelText = "No",
  onConfirm,
  onCancel,
}: ConfirmActionModalProps) {
  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0, 0, 0, 0.55)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 10000,
      }}
      onClick={onCancel}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: 380,
          background: "#1c1c1c",
          border: "1px solid #2d2d2d",
          borderRadius: 12,
          padding: "18px 18px 16px",
          boxShadow: "0 24px 48px rgba(0,0,0,0.45)",
        }}
      >
        <h3 style={{ margin: 0, fontSize: 16, color: "#e0e0e0", fontWeight: 600 }}>
          {title}
        </h3>
        <p style={{ margin: "8px 0 0", fontSize: 13, color: "#9aa0a6", lineHeight: 1.5 }}>
          {message}
        </p>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 16 }}>
          <button
            onClick={onCancel}
            style={{
              background: "transparent",
              color: "#c9d1d9",
              border: "1px solid #3a3a3a",
              borderRadius: 8,
              padding: "8px 14px",
              fontSize: 12,
              cursor: "pointer",
            }}
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            style={{
              background: "#da3633",
              color: "#fff",
              border: "1px solid #da3633",
              borderRadius: 8,
              padding: "8px 14px",
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
