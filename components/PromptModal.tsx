import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CloseIcon } from './icons/CloseIcon';

interface PromptModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    content: string;
}

const PromptModal: React.FC<PromptModalProps> = ({ isOpen, onClose, title, content }) => {
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        navigator.clipboard.writeText(content).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 bg-black/70 z-50 flex justify-center items-center p-4" onClick={onClose}>
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="bg-gray-800 rounded-2xl p-6 border border-gray-700 shadow-xl w-full max-w-2xl flex flex-col max-h-[90vh]"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex justify-between items-center mb-4 flex-shrink-0">
                            <h2 className="text-xl font-bold text-white">{title}</h2>
                            <button onClick={onClose} className="p-1 rounded-full text-gray-400 hover:bg-gray-700 hover:text-white">
                                <CloseIcon />
                            </button>
                        </div>
                        <div className="relative flex-grow bg-gray-900 p-3 rounded-md overflow-auto">
                            <pre className="text-xs text-gray-300 font-mono whitespace-pre-wrap break-all">
                                {content}
                            </pre>
                            <button onClick={handleCopy} className="absolute top-2 right-2 px-3 py-1 text-xs bg-gray-700 text-white hover:bg-indigo-600 rounded-md transition-colors">
                                {copied ? 'Tersalin!' : 'Salin'}
                            </button>
                        </div>
                        <div className="mt-6 flex-shrink-0 flex justify-end">
                            <button onClick={onClose} className="bg-gray-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-gray-500 transition">
                                Tutup
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default PromptModal;
