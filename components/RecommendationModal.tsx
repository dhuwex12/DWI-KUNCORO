
import React from 'react';
import Loader from './Loader';

interface RecommendationModalProps {
  isOpen: boolean;
  onClose: () => void;
  isLoading: boolean;
  recommendation: string | null;
  error: string | null;
}

const RecommendationModal: React.FC<RecommendationModalProps> = ({ isOpen, onClose, isLoading, recommendation, error }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex justify-center items-center p-4 animate-fade-in-fast" onClick={onClose}>
      <div className="bg-gray-800 rounded-2xl p-6 border border-gray-700 shadow-xl w-full max-w-lg min-h-[15rem] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-xl font-bold text-white mb-4">Rekomendasi Gaya Foto AI</h2>
        <div className="flex-grow flex items-center justify-center">
          {isLoading && <Loader />}
          {error && !isLoading && (
            <div className="text-center text-red-400">
              <h3 className="font-bold text-lg">Gagal Mendapatkan Rekomendasi</h3>
              <p className="text-sm mt-2">{error}</p>
            </div>
          )}
          {recommendation && !isLoading && (
            <div className="text-gray-300">
              <p className="whitespace-pre-wrap">{recommendation}</p>
            </div>
          )}
        </div>
        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-indigo-600 text-white font-bold hover:bg-indigo-500 transition"
          >
            Tutup
          </button>
        </div>
      </div>
       <style>{`
        @keyframes fade-in-fast {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .animate-fade-in-fast {
          animation: fade-in-fast 0.2s ease-out forwards;
        }
      `}</style>
    </div>
  );
};

export default RecommendationModal;
