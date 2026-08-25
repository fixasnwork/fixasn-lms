"use client";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  width?: number | string;
  closeOnOverlayClick?: boolean;
}

export default function Modal({
  open,
  onClose,
  title,
  children,
  width = 500,
  closeOnOverlayClick = true,
}: ModalProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 bg-black/55 z-50 flex items-center justify-center p-3 sm:p-5"
      onClick={(e) => {
        if (closeOnOverlayClick && e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="bg-white rounded-2xl sm:rounded-3xl w-full max-h-[92vh] overflow-hidden shadow-2xl flex flex-col"
        style={{
          maxWidth: typeof width === "number" ? `${width}px` : width,
        }}
      >
        <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-white z-10 gap-2">
          <h3 className="font-['Montserrat',sans-serif] font-extrabold text-base sm:text-lg text-brand m-0 break-words">
            {title}
          </h3>
          <button
            onClick={onClose}
            className="bg-none border-none text-2xl cursor-pointer text-gray-400 leading-none p-1"
          >
            ×
          </button>
        </div>
        <div className="p-4 sm:p-6 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}
