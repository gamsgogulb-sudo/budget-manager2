
import React, { createContext, useContext, useState, ReactNode, useCallback } from 'react';

type SnackbarType = 'success' | 'error' | 'info';

interface UIContextType {
  showSnackbar: (message: string, type?: SnackbarType) => void;
  showConfirm: (message: string, onConfirm: () => void, onCancel?: () => void) => void;
}

const UIContext = createContext<UIContextType | undefined>(undefined);

export const useUI = () => {
  const context = useContext(UIContext);
  if (!context) {
    throw new Error('useUI must be used within a UIProvider');
  }
  return context;
};

interface UIProviderProps {
  children: ReactNode;
}

export const UIProvider: React.FC<UIProviderProps> = ({ children }) => {
  // Snackbar State
  const [snackbar, setSnackbar] = useState<{ message: string; type: SnackbarType; isOpen: boolean }>({
    message: '',
    type: 'info',
    isOpen: false,
  });

  // Confirm Modal State
  const [confirmModal, setConfirmModal] = useState<{
    message: string;
    isOpen: boolean;
    onConfirm: () => void;
    onCancel: () => void;
  }>({
    message: '',
    isOpen: false,
    onConfirm: () => {},
    onCancel: () => {},
  });

  const showSnackbar = useCallback((message: string, type: SnackbarType = 'info') => {
    setSnackbar({ message, type, isOpen: true });
    // Auto-hide after 3 seconds
    setTimeout(() => {
      setSnackbar((prev) => ({ ...prev, isOpen: false }));
    }, 3000);
  }, []);

  const showConfirm = useCallback((message: string, onConfirm: () => void, onCancel: () => void = () => {}) => {
    setConfirmModal({
      message,
      isOpen: true,
      onConfirm: () => {
        onConfirm();
        setConfirmModal((prev) => ({ ...prev, isOpen: false }));
      },
      onCancel: () => {
        onCancel();
        setConfirmModal((prev) => ({ ...prev, isOpen: false }));
      },
    });
  }, []);

  return (
    <UIContext.Provider value={{ showSnackbar, showConfirm }}>
      {children}

      {/* Snackbar Component - High z-index */}
      <div
        className={`fixed bottom-24 left-1/2 -translate-x-1/2 z-[1000] transition-all duration-300 transform pointer-events-none ${
          snackbar.isOpen ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
        }`}
      >
        <div
          className={`px-6 py-3 rounded-full shadow-xl font-bold text-sm flex items-center gap-3 whitespace-nowrap backdrop-blur-md ${
            snackbar.type === 'success'
              ? 'bg-green-600/90 text-white shadow-green-900/20'
              : snackbar.type === 'error'
              ? 'bg-red-600/90 text-white shadow-red-900/20'
              : 'bg-gray-800/90 dark:bg-white/90 text-white dark:text-black shadow-black/20'
          }`}
        >
          <span>
            {snackbar.type === 'success' && '✅'}
            {snackbar.type === 'error' && '⚠️'}
            {snackbar.type === 'info' && 'ℹ️'}
          </span>
          {snackbar.message}
        </div>
      </div>

      {/* Confirm Modal Component - Very high z-index */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 z-[1010] flex items-center justify-center p-5 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-[#1c1c1e] w-full max-w-xs rounded-2xl p-6 shadow-2xl border border-gray-200 dark:border-white/10 scale-100 animate-fade-in">
            <h3 className="text-lg font-bold mb-3 dark:text-white">확인</h3>
            <p className="text-gray-600 dark:text-gray-300 mb-8 text-sm leading-relaxed whitespace-pre-wrap">
              {confirmModal.message}
            </p>
            <div className="flex gap-3">
              <button
                onClick={confirmModal.onCancel}
                className="flex-1 py-3.5 bg-gray-100 dark:bg-white/5 text-gray-700 dark:text-gray-300 rounded-xl font-bold text-sm hover:bg-gray-200 dark:hover:bg-white/10 transition-colors"
              >
                취소
              </button>
              <button
                onClick={confirmModal.onConfirm}
                className="flex-1 py-3.5 bg-blue-600 text-white rounded-xl font-bold text-sm shadow-lg shadow-blue-500/30 hover:bg-blue-700 transition-colors"
              >
                확인
              </button>
            </div>
          </div>
        </div>
      )}
    </UIContext.Provider>
  );
};
