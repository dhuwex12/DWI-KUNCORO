
import React, { useEffect } from 'react';
import { motion, AnimatePresence, Variants } from 'framer-motion';
import { CloseIcon } from './icons/CloseIcon';

const WarningTriangleIcon: React.FC<{ className?: string }> = ({ className = "w-5 h-5" }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
        <path fillRule="evenodd" d="M9.401 3.003c1.155-2 4.043-2 5.197 0l7.5 13c1.155 2-0.289 4.5-2.598 4.5H4.499c-2.31 0-3.753-2.5-2.598-4.5l7.5-13zM12 17a1 1 0 110-2 1 1 0 010 2zm-1-6a1 1 0 011-1h.01a1 1 0 110 2H12a1 1 0 01-1-1z" clipRule="evenodd" />
    </svg>
);


interface AdsStoryboardProInfoModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const modalContentVariants: Variants = {
    hidden: { opacity: 0, scale: 0.95 },
    visible: { opacity: 1, scale: 1, transition: { duration: 0.2, ease: "easeOut" } },
    exit: { opacity: 0, scale: 0.95, transition: { duration: 0.2, ease: "easeIn" } }
};

const AdsStoryboardProInfoModal: React.FC<AdsStoryboardProInfoModalProps> = ({ isOpen, onClose }) => {

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/70 z-50 flex justify-center items-center p-4" onClick={onClose}>
            <motion.div
                variants={modalContentVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="bg-gray-800 rounded-2xl p-6 border border-gray-700 shadow-xl w-full max-w-2xl flex flex-col max-h-[90vh]"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex justify-between items-center mb-4 flex-shrink-0">
                    <h2 className="text-xl font-bold text-white">Tentang Ads Storyboard Pro & Batasan Penggunaan</h2>
                    <button onClick={onClose} className="p-1.5 rounded-full hover:bg-gray-700">
                        <CloseIcon />
                    </button>
                </div>
                
                <div className="overflow-y-auto pr-2 -mr-2 text-gray-300 text-sm space-y-6">
                    <div>
                        <h3 className="font-bold text-lg text-indigo-400 mb-2">Apa itu Ads Storyboard Pro?</h3>
                        <p>
                            Ads Storyboard Pro adalah alur kerja terpadu untuk mengubah satu gambar produk menjadi aset video iklan yang lengkap. AI akan memandu Anda melalui 4 langkah utama:
                        </p>
                        <ol className="list-decimal list-inside space-y-2 mt-3 pl-2">
                            <li><strong className="text-white">Input Aset:</strong> Anda menyediakan gambar produk dan (opsional) gambar model.</li>
                            <li><strong className="text-white">Arah Kreatif & Naskah:</strong> AI menganalisis produk Anda dan membuat storyboard lengkap dengan naskah iklan berdasarkan arahan kreatif yang Anda pilih.</li>
                            <li><strong className="text-white">Produksi Aset Visual:</strong> AI akan membuat gambar diam (still image) untuk setiap adegan dalam storyboard sebagai dasar untuk video.</li>
                             <li><strong className="text-white">Produksi Aset Video & Langkah Selanjutnya:</strong> Dari setiap gambar, AI dapat membuat prompt video sinematik dan menghasilkan klip video pendek. Naskah yang dihasilkan juga dapat langsung dikirim ke Studio Voiceover.</li>
                        </ol>
                    </div>

                    <div className="bg-yellow-900/50 p-4 rounded-lg border border-yellow-700">
                         <h3 className="font-bold text-lg text-yellow-300 mb-2 flex items-center gap-2">
                            <WarningTriangleIcon className="w-6 h-6" />
                            Penting: Limitasi Pengguna Free Tier
                        </h3>
                        <p className="mb-3 text-yellow-200">
                            Fitur pembuatan video ini menggunakan teknologi canggih yang membutuhkan sumber daya komputasi besar. Untuk memastikan layanan tetap dapat diakses oleh semua orang, batasan berikut berlaku untuk pengguna gratis:
                        </p>
                        <ul className="list-disc list-inside space-y-2 pl-2 text-yellow-200">
                            <li><strong>Waktu Proses:</strong> Pembuatan satu klip video (3-5 detik) dapat memakan waktu **2 hingga 5 menit**. Harap bersabar selama proses ini.</li>
                            <li><strong>Kualitas Video:</strong> Resolusi video yang dihasilkan adalah standar (720p).</li>
                            <li><strong>Durasi Video:</strong> Setiap klip video yang dibuat memiliki durasi sekitar 3-5 detik.</li>
                             <li><strong>Kuota Harian:</strong> Terdapat batas penggunaan harian sekitar **5-10 klip video per hari**. Kuota akan di-reset setiap 24 jam.</li>
                            <li><strong>Watermark:</strong> Video yang dihasilkan mungkin akan memiliki watermark kecil.</li>
                        </ul>
                        <div className="mt-4 pt-4 border-t border-yellow-600/50">
                            <h4 className="font-bold text-white">Cara Mengaktifkan API Key untuk Generate Video:</h4>
                            <p className="mt-1">Jika Anda mengalami kegagalan saat membuat video, Anda mungkin perlu mengaktifkan API Key khusus video terlebih dahulu:</p>
                            <ol className="list-decimal list-inside space-y-1 mt-2 pl-2 text-yellow-200">
                                <li>Klik ikon kunci (API Key) yang biasanya terletak di pojok kanan atas layar.</li>
                                <li>Sebuah dialog akan muncul. Cukup klik tombol "Done" atau "Selesai".</li>
                                <li>Setelah itu, coba buat ulang video Anda.</li>
                            </ol>
                        </div>
                    </div>
                     <div>
                        <h3 className="font-bold text-lg text-indigo-400 mb-2">Tips & Alur Kerja Alternatif</h3>
                         <div className="bg-blue-900/50 p-3 rounded-lg border border-blue-700 space-y-2 mb-4">
                            <p className="font-semibold text-blue-300">Maksimalkan Pengalaman Anda:</p>
                            <p>
                                Untuk generate video, sangat disarankan menggunakan kredit Google Cloud. Anda bisa mendapatkan <a href="https://cloud.google.com/free" target="_blank" rel="noopener noreferrer" className="font-bold text-white underline hover:text-blue-200">kredit gratis senilai $300 dari Google</a> untuk memulai.
                            </p>
                        </div>
                        <p className="mt-4">
                            Sebagai alternatif, Anda dapat membuat video secara manual menggunakan aset yang telah kita buat:
                        </p>
                        <ol className="list-decimal list-inside space-y-2 mt-2 pl-2">
                            <li>
                                <strong className="text-white">Unduh Gambar & Salin Prompt:</strong> Setelah visual adegan dibuat, unduh gambarnya dan salin "Prompt Video Sinematik" yang dihasilkan AI.
                            </li>
                            <li>
                                <strong className="text-white">Gunakan Aplikasi Video AI:</strong> Buka aplikasi generator video seperti <a href="https://aistudio.google.com/" target="_blank" rel="noopener noreferrer" className="font-bold text-white underline hover:text-blue-200">Google AI Studio</a>, <a href="https://deepmind.google/technologies/veo/" target="_blank" rel="noopener noreferrer" className="font-bold text-white underline hover:text-blue-200">Google Veo/Flow</a>, atau <a href="https://gemini.google.com/" target="_blank" rel="noopener noreferrer" className="font-bold text-white underline hover:text-blue-200">Gemini</a>. Unggah gambar adegan Anda dan tempelkan prompt yang telah disalin.
                            </li>
                            <li>
                                <strong className="text-white">Gabungkan Video:</strong> Setelah semua klip video adegan selesai dibuat, gabungkan menjadi satu video utuh menggunakan aplikasi editor video seperti CapCut.
                            </li>
                            <li>
                                <strong className="text-white">Tambahkan Voiceover:</strong> Gunakan naskah yang telah dibuat di aplikasi <strong className="text-indigo-300">"Studio Voiceover AI"</strong> yang ada di platform ini untuk membuat audio profesional.
                            </li>
                        </ol>
                    </div>
                </div>

                <div className="mt-6 flex-shrink-0 flex justify-end">
                    <button onClick={onClose} className="px-6 py-2 rounded-lg bg-indigo-600 text-white font-bold hover:bg-indigo-500 transition">
                        Saya Mengerti
                    </button>
                </div>
            </motion.div>
        </div>
    );
};

export default AdsStoryboardProInfoModal;
