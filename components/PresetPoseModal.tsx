import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence, Variants } from 'framer-motion';
import { CloseIcon } from './icons/CloseIcon';

interface PresetPoseModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (selectedPoses: string[]) => void;
    categoryName: string;
    poses: string[];
    initialSelectedPoses: string[];
}

const modalContentVariants: Variants = {
    hidden: { opacity: 0, scale: 0.95, y: 20 },
    visible: { opacity: 1, scale: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' } },
    exit: { opacity: 0, scale: 0.95, y: 20, transition: { duration: 0.2, ease: "easeIn" } }
};

const CheckIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 text-indigo-500"><polyline points="20 6 9 17 4 12"></polyline></svg>
);

const PresetPoseModal: React.FC<PresetPoseModalProps> = ({ isOpen, onClose, onSave, categoryName, poses, initialSelectedPoses }) => {
    const [selectedPoses, setSelectedPoses] = useState<Set<string>>(new Set());

    useEffect(() => {
        if (isOpen) {
            setSelectedPoses(new Set(initialSelectedPoses));
        }
    }, [isOpen, initialSelectedPoses]);

    const handleTogglePose = (pose: string) => {
        setSelectedPoses(prev => {
            const newSet = new Set(prev);
            if (newSet.has(pose)) {
                newSet.delete(pose);
            } else {
                newSet.add(pose);
            }
            return newSet;
        });
    };

    const handleSave = () => {
        onSave(Array.from(selectedPoses));
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 bg-black/70 z-50 flex justify-center items-center p-4" onClick={onClose} role="dialog" aria-modal="true">
                    <motion.div
                        variants={modalContentVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        className="bg-gray-800 rounded-2xl p-6 border border-gray-700 shadow-xl w-full max-w-2xl flex flex-col max-h-[90vh]"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex justify-between items-center mb-4 flex-shrink-0">
                            <h2 className="text-xl font-bold text-white">Pilih Pose: {categoryName}</h2>
                            <button onClick={onClose} className="p-1 rounded-full text-gray-400 hover:bg-gray-700 hover:text-white transition-colors">
                                <CloseIcon />
                            </button>
                        </div>
                        <div className="overflow-y-auto pr-2 -mr-2 space-y-2">
                            {poses.map((pose, index) => {
                                const isSelected = selectedPoses.has(pose);
                                return (
                                    <button
                                        key={index}
                                        onClick={() => handleTogglePose(pose)}
                                        className={`w-full text-left p-3 rounded-lg transition-all flex items-start gap-3 transform hover:scale-105 ${
                                            isSelected ? 'bg-gray-700/80 ring-2 ring-indigo-500' : 'hover:bg-gray-700/50 bg-gray-900/50'
                                        }`}
                                    >
                                        <div className={`mt-1 w-6 h-6 flex-shrink-0 rounded-md flex items-center justify-center border-2 ${isSelected ? 'bg-white border-indigo-500' : 'border-gray-600'}`}>
                                            {isSelected && <CheckIcon />}
                                        </div>
                                        <span className={`text-sm ${isSelected ? 'text-white' : 'text-gray-300'}`}>{pose}</span>
                                    </button>
                                );
                            })}
                        </div>
                        <div className="mt-6 flex justify-between items-center flex-shrink-0">
                            <p className="text-sm font-semibold text-gray-400">{selectedPoses.size} pose dipilih</p>
                            <div className="flex gap-3">
                                <button onClick={onClose} className="px-5 py-2 rounded-lg bg-gray-600 text-white font-semibold hover:bg-gray-500 transition">
                                    Batal
                                </button>
                                <button onClick={handleSave} className="px-5 py-2 rounded-lg bg-indigo-600 text-white font-bold hover:bg-indigo-500 transition">
                                    Simpan Pilihan
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default PresetPoseModal;