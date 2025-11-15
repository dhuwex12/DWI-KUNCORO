import React, { useEffect } from 'react';
import { motion, Variants } from 'framer-motion';
import { CloseIcon } from './icons/CloseIcon';

interface DesignOptionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  options: string[];
  currentValue: string;
  onSelect: (value: string) => void;
}

const modalContentVariants: Variants = {
  hidden: { opacity: 0, scale: 0.95, y: 20 },
  visible: { opacity: 1, scale: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' } },
  exit: { opacity: 0, scale: 0.95, y: 20, transition: { duration: 0.2, ease: "easeIn" } }
};

const CheckIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><polyline points="20 6 9 17 4 12"></polyline></svg>
);


const DesignOptionsModal: React.FC<DesignOptionsModalProps> = ({ isOpen, onClose, title, options, currentValue, onSelect }) => {

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex justify-center items-center p-4" onClick={onClose} role="dialog" aria-modal="true">
        <motion.div 
            variants={modalContentVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="bg-gray-800 rounded-2xl p-6 border border-gray-700 shadow-xl w-full max-w-2xl flex flex-col" 
            onClick={(e) => e.stopPropagation()}
        >
            <div className="flex justify-between items-center mb-4 flex-shrink-0">
                <h2 className="text-xl font-bold text-white">{title}</h2>
                <button onClick={onClose} className="p-1 rounded-full text-gray-400 hover:bg-gray-700 hover:text-white transition-colors">
                    <CloseIcon />
                </button>
            </div>
            <div className="overflow-y-auto max-h-[60vh] pr-2 -mr-2">
                <div className="space-y-2">
                    {options.map((option) => {
                        const isSelected = option === currentValue;
                        return (
                            <button
                                key={option}
                                onClick={() => onSelect(option)}
                                className={`w-full text-left p-3 rounded-lg transition-all flex justify-between items-center transform hover:scale-105 ${
                                    isSelected 
                                    ? 'bg-indigo-600 text-white font-semibold' 
                                    : 'hover:bg-gray-700/50 text-gray-300'
                                }`}
                            >
                                <span>{option}</span>
                                {isSelected && <CheckIcon />}
                            </button>
                        );
                    })}
                </div>
            </div>
        </motion.div>
    </div>
  );
};

export default DesignOptionsModal;