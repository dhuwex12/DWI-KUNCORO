import React, { useState } from 'react';
import { motion, AnimatePresence, Variants } from 'framer-motion';
import { CloseIcon } from './icons/CloseIcon';
import { PROMO_TYPES } from './StyloApp';
import Loader from './Loader';
import { SparklesIcon } from './icons/SparklesIcon';

interface SmartPromoModalProps {
    isOpen: boolean;
    onClose: () => void;
    onGeneratePoses: (promoType: string) => Promise<any>;
}

const modalContentVariants: Variants = {
    hidden: { opacity: 0, scale: 0.95, y: 20 },
    visible: { opacity: 1, scale: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' } },
    exit: { opacity: 0, scale: 0.95, y: 20, transition: { duration: 0.2, ease: "easeIn" } }
};

const SmartPromoModal: React.FC<SmartPromoModalProps> = ({ isOpen, onClose, onGeneratePoses }) => {
    const [selectedType, setSelectedType] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleGenerate = async () => {
        if (!selectedType) return;
        setIsLoading(true);
        setError(null);
        try {
            await onGeneratePoses(selectedType);
            // The parent component will close the modal on success
        } catch (e) {
            setError(e instanceof Error ? e.message : "Gagal menghasilkan pose.");
        } finally {
            setIsLoading(false);
        }
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
                            <h2 className="text-xl font-bold text-white">Generator Pose Promosi Cerdas ✨</h2>
                            <button onClick={onClose} className="p-1 rounded-full text-gray-400 hover:bg-gray-700 hover:text-white transition-colors">
                                <CloseIcon />
                            </button>
                        </div>
                        
                        {isLoading ? (
                            <div className="flex-grow flex items-center justify-center">
                                <Loader message="AI sedang merancang pose..." />
                            </div>
                        ) : (
                             <div className="overflow-y-auto pr-2 -mr-2 space-y-3">
                                <p className="text-sm text-gray-400 mb-4">Pilih tujuan promosi Anda. AI akan membuatkan ide pose yang paling efektif secara visual untuk tujuan tersebut.</p>
                                {PROMO_TYPES.map((promo) => {
                                    const isSelected = selectedType === promo.name;
                                    return (
                                        <button
                                            key={promo.name}
                                            onClick={() => setSelectedType(promo.name)}
                                            className={`w-full text-left p-4 rounded-lg transition-all flex items-center gap-4 transform hover:scale-105 ${
                                                isSelected ? 'bg-gray-700/80 ring-2 ring-indigo-500' : 'hover:bg-gray-700/50 bg-gray-900/50'
                                            }`}
                                        >
                                            <div className="text-2xl">{promo.icon}</div>
                                            <div>
                                                <h3 className={`font-semibold ${isSelected ? 'text-white' : 'text-gray-200'}`}>{promo.name}</h3>
                                                <p className="text-xs text-gray-400">{promo.desc}</p>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        )}

                        <div className="mt-6 flex justify-between items-center flex-shrink-0">
                           {error && <p className="text-sm text-red-400">{error}</p>}
                           <div className="flex-grow"></div>
                            <div className="flex gap-3">
                                <button onClick={onClose} className="px-5 py-2 rounded-lg bg-gray-600 text-white font-semibold hover:bg-gray-500 transition">
                                    Batal
                                </button>
                                <button onClick={handleGenerate} disabled={!selectedType || isLoading} className="flex items-center gap-2 px-5 py-2 rounded-lg bg-indigo-600 text-white font-bold hover:bg-indigo-500 transition disabled:bg-gray-600 disabled:cursor-not-allowed">
                                    <SparklesIcon />
                                    Hasilkan Pose
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default SmartPromoModal;
