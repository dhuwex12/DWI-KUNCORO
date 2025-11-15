import React from 'react';
import { HistorySession } from '../types';
import { STYLE_DEFINITIONS } from '../types';
import { motion } from 'framer-motion';

interface HistoryDisplayProps {
    history: HistorySession[];
    onPreview: (session: HistorySession) => void;
}

const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.5,
        staggerChildren: 0.1
      }
    }
};

const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0 },
};

const HistoryDisplay: React.FC<HistoryDisplayProps> = ({ history, onPreview }) => {
    if (!history || history.length === 0) {
        return null;
    }

    return (
        <motion.div 
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="mt-12"
        >
            <h2 className="text-2xl font-bold text-white mb-4">Riwayat Sesi</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {history.map((session) => (
                    <motion.button
                        key={session.id}
                        variants={itemVariants}
                        onClick={() => onPreview(session)}
                        className="bg-gray-800/50 p-4 rounded-2xl border border-gray-700 shadow-lg text-left w-full h-full flex flex-col hover:bg-gray-700/50 transition-colors duration-200 group"
                    >
                        <div className="flex items-start gap-4">
                            <img 
                                src={`data:${session.originalImage.mimeType};base64,${session.originalImage.base64}`} 
                                alt="Original Input"
                                className="w-20 h-20 object-cover rounded-lg flex-shrink-0"
                            />
                            <div className="flex-grow">
                                <p className="text-sm font-semibold text-indigo-400">
                                    {STYLE_DEFINITIONS[session.selectedStyle]?.name || 'Gaya Kustom'}
                                </p>
                                <p className="text-xs text-gray-400 mt-1">
                                    {new Date(session.timestamp).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}
                                </p>
                                <p className="text-xs text-gray-500 mt-2">
                                    {session.results.length} gambar dihasilkan. Klik untuk melihat.
                                </p>
                            </div>
                        </div>
                        <div className="flex -space-x-2 mt-3 overflow-hidden">
                            {session.results.slice(0, 5).map((result, i) => (
                                <img key={i} src={result.imageUrl} className="inline-block h-8 w-8 rounded-full ring-2 ring-gray-800" alt={`Result ${i}`}/>
                            ))}
                            {session.results.length > 5 && <div className="flex items-center justify-center h-8 w-8 rounded-full bg-gray-700 ring-2 ring-gray-800 text-xs font-bold">+{session.results.length - 5}</div>}
                        </div>
                    </motion.button>
                ))}
            </div>
        </motion.div>
    );
};

export default HistoryDisplay;