import React from 'react';
import { HiOutlineExclamation, HiOutlineInformationCircle, HiOutlineX } from 'react-icons/hi';

const CustomDialog = ({ 
  isOpen, 
  title, 
  message, 
  confirmLabel = 'Confirm', 
  cancelLabel = 'Cancel', 
  onConfirm, 
  onCancel, 
  type = 'confirm', // 'confirm', 'alert', 'danger'
  icon = null
}) => {
  if (!isOpen) return null;

  const getTypeStyles = () => {
    switch (type) {
      case 'danger':
        return {
          iconBg: 'bg-red-100',
          iconColor: 'text-red-600',
          confirmBtn: 'bg-red-600 hover:bg-red-700 text-white',
          Icon: icon || HiOutlineExclamation
        };
      case 'alert':
        return {
          iconBg: 'bg-blue-100',
          iconColor: 'text-blue-600',
          confirmBtn: 'bg-blue-600 hover:bg-blue-700 text-white',
          Icon: icon || HiOutlineInformationCircle
        };
      default:
        return {
          iconBg: 'bg-primary/10',
          iconColor: 'text-primary',
          confirmBtn: 'bg-primary hover:bg-primary-dark text-white',
          Icon: icon || HiOutlineInformationCircle
        };
    }
  };

  const styles = getTypeStyles();

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in" 
        onClick={onCancel}
      />
      
      {/* Dialog */}
      <div className="relative bg-white w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden animate-slide-up transform transition-all">
        <div className="p-6">
          <div className="flex items-start gap-4">
            <div className={`w-12 h-12 shrink-0 rounded-full flex items-center justify-center ${styles.iconBg}`}>
              <styles.Icon className={`text-2xl ${styles.iconColor}`} />
            </div>
            
            <div className="flex-1 min-w-0">
              <h3 className="text-xl font-black text-txt-primary uppercase tracking-tight mb-2">
                {title}
              </h3>
              <p className="text-txt-muted text-sm font-medium leading-relaxed">
                {message}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-surface-alt px-6 py-4 flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
          {type !== 'alert' && (
            <button 
              onClick={onCancel}
              className="px-4 py-2.5 rounded-xl border border-surface-border text-txt-muted font-bold text-sm hover:bg-white transition-all uppercase tracking-widest"
            >
              {cancelLabel}
            </button>
          )}
          <button 
            onClick={onConfirm}
            className={`px-6 py-2.5 rounded-xl font-black text-sm uppercase tracking-widest shadow-lg transition-all active:scale-95 ${styles.confirmBtn}`}
          >
            {confirmLabel}
          </button>
        </div>

        <button 
          onClick={onCancel} 
          className="absolute top-4 right-4 text-txt-muted hover:text-txt-primary transition-colors"
        >
          <HiOutlineX className="text-xl" />
        </button>
      </div>
    </div>
  );
};

export default CustomDialog;
