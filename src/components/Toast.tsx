import React from 'react';

export interface ToastProps {
  message: string;
  icon?: string;
  visible: boolean;
  onClose?: () => void;
}

export const Toast: React.FC<ToastProps> = ({ message, icon = 'check_circle', visible }) => {
  return (
    <div
      className={`fixed bottom-6 right-6 z-50 bg-[#233144] text-[#eaf1ff] px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2.5 transform transition-all duration-300 ${
        visible ? 'translate-y-0 opacity-100 pointer-events-auto' : 'translate-y-20 opacity-0 pointer-events-none'
      }`}
      role="alert"
    >
      <span className="material-symbols-outlined text-[#5bb8fe] text-[20px]">{icon}</span>
      <span className="font-label-md text-sm">{message}</span>
    </div>
  );
};
