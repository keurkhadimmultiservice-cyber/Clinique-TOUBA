'use client';

import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertCircle, X } from 'lucide-react';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'warning' | 'info';
}

export default function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirmer',
  cancelText = 'Annuler',
  type = 'danger'
}: ConfirmationModalProps) {
  const getColors = () => {
    switch (type) {
      case 'danger':
        return {
          bg: 'bg-rose-50',
          text: 'text-rose-600',
          button: 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/20',
          icon: 'text-rose-600'
        };
      case 'warning':
        return {
          bg: 'bg-amber-50',
          text: 'text-amber-600',
          button: 'bg-amber-600 hover:bg-amber-700 shadow-amber-600/20',
          icon: 'text-amber-600'
        };
      default:
        return {
          bg: 'bg-blue-50',
          text: 'text-blue-600',
          button: 'bg-blue-600 hover:bg-blue-700 shadow-blue-600/20',
          icon: 'text-blue-600'
        };
    }
  };

  const colors = getColors();

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl"
          >
            <div className="flex items-center justify-between mb-6">
              <div className={`p-3 ${colors.bg} rounded-2xl`}>
                <AlertCircle size={24} className={colors.icon} />
              </div>
              <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                <X size={24} className="text-slate-400" />
              </button>
            </div>

            <h3 className="text-2xl font-bold text-slate-900 mb-2">{title}</h3>
            <p className="text-slate-500 mb-8">{message}</p>

            <div className="flex gap-4">
              <button
                onClick={onClose}
                className="flex-1 px-6 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-all"
              >
                {cancelText}
              </button>
              <button
                onClick={() => {
                  onConfirm();
                  onClose();
                }}
                className={`flex-1 px-6 py-3 text-white rounded-xl font-bold transition-all shadow-lg ${colors.button}`}
              >
                {confirmText}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
