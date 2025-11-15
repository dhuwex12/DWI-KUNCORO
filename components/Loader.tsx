import React from 'react';

interface LoaderProps {
    message?: string;
}

const Loader: React.FC<LoaderProps> = ({ message = 'AI sedang bekerja...' }) => {
  return (
    <div className="flex flex-col items-center justify-center text-center">
      <div className="w-16 h-16 border-4 border-dashed border-indigo-500 dark:border-indigo-400 border-t-transparent rounded-full animate-spin"></div>
      <h3 className="mt-4 text-lg font-semibold text-gray-800 dark:text-white">{message}</h3>
      <p className="text-sm text-gray-500 dark:text-gray-400">Proses ini mungkin memakan waktu sejenak.</p>
      <style>{`
        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
        .animate-spin {
          animation: spin 1s linear infinite;
        }
      `}</style>
    </div>
  );
};

export default Loader;