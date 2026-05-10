import React from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface ModalProps {
  title: React.ReactNode;
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidth?: string;
}

export default function Modal({ title, isOpen, onClose, children, footer, maxWidth = 'max-w-xl' }: ModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[10000] p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div 
            className={`bg-[#0d2d3a] border border-white/10 rounded-2xl flex flex-col w-full ${maxWidth} max-h-[90vh] shadow-2xl relative overflow-hidden`}
            onClick={(e) => e.stopPropagation()}
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            transition={{ type: "spring", bounce: 0, duration: 0.3 }}
          >
            <header className="px-5 py-4 border-b border-white/10 flex justify-between items-center text-white font-bold text-lg">
              {title}
              <button 
                onClick={onClose}
                className="text-gray-400 hover:text-white transition-colors"
              >
                ✕
              </button>
            </header>
            
            <div className="p-5 overflow-y-auto custom-scrollbar flex-1 text-white">
              {children}
            </div>
            
            {footer && (
              <footer className="px-5 py-4 border-t border-white/10 bg-black/20 flex gap-3 justify-end">
                {footer}
              </footer>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
