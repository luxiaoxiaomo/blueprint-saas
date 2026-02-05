
import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
}

const ConfirmModal: React.FC<ConfirmModalProps> = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title, 
  message, 
  confirmText = "确认删除", 
  cancelText = "放弃" 
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in duration-200">
        <div className="p-8 flex flex-col items-center text-center space-y-6">
          <div className="bg-red-50 p-4 rounded-full text-red-500 animate-bounce">
            <AlertTriangle size={32} />
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-black text-slate-800 tracking-tight">{title}</h3>
            <p className="text-sm text-slate-400 font-medium leading-relaxed">{message}</p>
          </div>
          <div className="flex gap-3 w-full pt-2">
            <button 
              onClick={onClose}
              className="flex-1 px-6 py-4 bg-slate-50 text-slate-500 text-sm font-black rounded-2xl hover:bg-slate-100 transition-all"
            >
              {cancelText}
            </button>
            <button 
              onClick={() => { onConfirm(); onClose(); }}
              className="flex-1 px-6 py-4 bg-red-500 text-white text-sm font-black rounded-2xl hover:bg-red-600 shadow-xl shadow-red-100 transition-all active:scale-95"
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;
