'use client';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  width?: number | string;
}

export default function Modal({ open, onClose, title, children, width = 500 }: ModalProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 bg-black/55 z-50 flex items-center justify-center p-3 sm:p-5"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="bg-white rounded-2xl sm:rounded-3xl w-full max-h-[92vh] overflow-auto shadow-2xl"
        style={{ maxWidth: typeof width === 'number' ? `${width}px` : width }}
      >
        <div className="flex items-center justify-between p-4 border-b border-gray-100 sticky top-0 bg-white z-10 gap-2">
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
        <div className="p-4 sm:p-6">
          {children}
        </div>
      </div>
    </div>
  );
}
