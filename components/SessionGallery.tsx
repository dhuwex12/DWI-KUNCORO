import React from 'react';
import { ResultData } from '../types';
import { motion } from 'framer-motion';

interface SessionGalleryProps {
    results: ResultData[];
}

const galleryVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      staggerChildren: 0.05
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, scale: 0.8 },
  visible: { opacity: 1, scale: 1 },
};

const SessionGallery: React.FC<SessionGalleryProps> = ({ results }) => {
    return (
        <motion.div 
            variants={galleryVariants}
            initial="hidden"
            animate="visible"
            className="mt-12"
        >
            <h2 className="text-2xl font-bold text-white mb-4">Galeri Sesi Ini</h2>
            <div className="bg-gray-800/50 p-4 rounded-2xl border border-gray-700 shadow-lg">
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-3">
                    {results.map((result, index) => (
                        <motion.div
                            key={index}
                            variants={itemVariants}
                            className="relative aspect-square bg-gray-900 rounded-md overflow-hidden border-2 border-transparent hover:border-indigo-500 transition-colors group"
                        >
                            <img 
                                src={result.imageUrl} 
                                alt={`Result ${index + 1}`} 
                                className="w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <span className="text-white font-bold text-lg">#{index + 1}</span>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>
        </motion.div>
    );
};

export default SessionGallery;
