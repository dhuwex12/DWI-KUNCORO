
import React from 'react';
import { motion } from 'framer-motion';

const WarningTriangleIcon: React.FC<{ className?: string }> = ({ className = "w-5 h-5" }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
        <path fillRule="evenodd" d="M9.401 3.003c1.155-2 4.043-2 5.197 0l7.5 13c1.155 2-0.289 4.5-2.598 4.5H4.499c-2.31 0-3.753-2.5-2.598-4.5l7.5-13zM12 17a1 1 0 110-2 1 1 0 010 2zm-1-6a1 1 0 011-1h.01a1 1 0 110 2H12a1 1 0 01-1-1z" clipRule="evenodd" />
    </svg>
);

const Section: React.FC<{ title: string; children: React.ReactNode, titleIcon?: React.ReactNode }> = ({ title, children, titleIcon }) => (
    <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.3 }}
        transition={{ duration: 0.5 }}
        className="bg-gray-800/50 p-6 rounded-2xl border border-gray-700 shadow-lg"
    >
        <h3 className="font-bold text-xl text-indigo-400 mb-4 flex items-center gap-2">
            {titleIcon}
            {title}
        </h3>
        <div className="text-gray-300 text-base space-y-3 prose prose-invert max-w-none">
            {children}
        </div>
    </motion.div>
);

const ReadMePage: React.FC = () => {
    return (
        <div className="max-w-4xl mx-auto space-y-8">
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="text-center"
            >
                <h1 className="text-4xl sm:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-indigo-500 mb-2 leading-tight">Panduan Pengguna & Informasi Penting</h1>
                <p className="text-lg text-gray-400">Selamat datang di Ultimate AI Product Studio Pro. Halaman ini berisi semua yang perlu Anda ketahui.</p>
            </motion.div>

            <Section title="Filosofi Kami">
                <p>
                    Ultimate AI Product Studio Pro dirancang sebagai pusat kreatif terpadu Anda. Kami percaya bahwa setiap orang, dari pemilik usaha kecil hingga pemasar profesional, harus memiliki akses ke alat canggih untuk membuat aset pemasaran berkualitas tinggi. Misi kami adalah menyederhanakan proses kreatif yang kompleks, memungkinkan Anda mengubah satu ide atau gambar produk menjadi kampanye pemasaran lengkap—semua dalam satu platform.
                </p>
            </Section>

            <Section title="Penting: Limitasi Penggunaan" titleIcon={<WarningTriangleIcon className="w-6 h-6 text-yellow-300"/>}>
                <div className="bg-yellow-900/50 p-4 rounded-lg border border-yellow-700 text-yellow-200">
                    <p className="mb-3">
                        Banyak fitur di studio ini, terutama yang berkaitan dengan pembuatan <strong>gambar dan video</strong>, menggunakan teknologi AI canggih yang membutuhkan daya komputasi sangat besar. Untuk memastikan layanan tetap adil dan dapat diakses oleh semua pengguna, batasan berikut berlaku:
                    </p>
                    <ul className="list-disc list-inside space-y-2 pl-2">
                        <li><strong>Waktu Proses Video:</strong> Pembuatan satu klip video (3-5 detik) bisa memakan waktu **2 hingga 5 menit**. Harap bersabar selama proses ini.</li>
                        <li><strong>Kualitas Aset:</strong> Aset yang dihasilkan (gambar & video) memiliki resolusi standar (misalnya 720p untuk video) untuk menyeimbangkan kualitas dan kecepatan.</li>
                        <li><strong>Kuota Harian:</strong> Terdapat batas penggunaan harian untuk fitur-fitur berat seperti pembuatan video (sekitar 5-10 klip per hari) dan gambar. Kuota akan di-reset setiap 24 jam.</li>
                        <li><strong>Watermark:</strong> Beberapa aset yang dihasilkan mungkin akan memiliki watermark kecil.</li>
                    </ul>
                     <p className="mt-4 font-semibold">
                        Untuk penggunaan tanpa batas dan kualitas lebih tinggi, sangat disarankan menggunakan API Key Anda sendiri atau memanfaatkan <a href="https://cloud.google.com/free" target="_blank" rel="noopener noreferrer" className="font-bold text-white underline hover:text-yellow-100">kredit gratis $300 dari Google Cloud</a>.
                    </p>
                    <div className="mt-4 pt-4 border-t border-yellow-600/50">
                        <h4 className="font-bold text-white">Cara Mengaktifkan API Key untuk Generate Video:</h4>
                        <p className="mt-1">Jika Anda mengalami kegagalan saat membuat video, Anda mungkin perlu mengaktifkan API Key khusus video terlebih dahulu:</p>
                        <ol className="list-decimal list-inside space-y-1 mt-2 pl-2">
                            <li>Klik ikon kunci (API Key) yang biasanya terletak di pojok kanan atas layar.</li>
                            <li>Sebuah dialog akan muncul. Cukup klik tombol "Done" atau "Selesai".</li>
                            <li>Setelah itu, coba buat ulang video Anda.</li>
                        </ol>
                    </div>
                </div>
            </Section>

            <Section title="Tips Alur Kerja Kreatif">
                <p>
                    Setiap alat di studio ini dirancang untuk bekerja sama. Berikut adalah contoh alur kerja ideal dari awal hingga akhir:
                </p>
                <ol className="list-decimal list-inside space-y-3 mt-3 pl-2">
                    <li>
                        <strong className="text-white">Strategi Awal (Marketo):</strong> Mulailah dengan mengobrol bersama <strong>Marketo: Konsultan AI</strong> untuk mematangkan ide, target audiens, dan strategi pemasaran Anda.
                    </li>
                    <li>
                        <strong className="text-white">Pembuatan Visual Inti (Fotografi & Stylo):</strong> Gunakan <strong>Spesialis Fotografi</strong> untuk mengubah foto produk Anda menjadi gambar komersial, atau gunakan <strong>Stylo</strong> untuk memasangkannya dengan model AI.
                    </li>
                    <li>
                        <strong className="text-white">Produksi Video (AI Affiliator / Video Generator):</strong> Bawa gambar Anda ke <strong>AI Affiliator</strong> untuk membuat alur video lengkap dengan naskah, atau ke <strong>Generator Video Produk</strong> untuk membuat klip pendek yang dinamis.
                    </li>
                    <li>
                        <strong className="text-white">Naskah Pemasaran (Copywriter Pro):</strong> Setelah visual Anda siap, buka <strong>AI Copywriter Pro</strong> untuk membuat caption media sosial, deskripsi produk, atau judul iklan yang menarik.
                    </li>
                    <li>
                        <strong className="text-white">Audio Profesional (Studio Voiceover AI):</strong> Kirim naskah dari <strong>AI Affiliator</strong> atau tulis naskah baru di <strong>Studio Voiceover AI</strong> untuk menghasilkan audio berkualitas tinggi.
                    </li>
                     <li>
                        <strong className="text-white">Aset Final (Desain Poster & LP Generator):</strong> Gunakan gambar dan naskah yang sudah ada untuk membuat poster promosi di <strong>Desain Poster AI</strong>, atau rancang naskah landing page lengkap dengan <strong>LP Generator Pro</strong>.
                    </li>
                </ol>
                <p className="mt-4">
                    Jangan ragu untuk bereksperimen! Anda juga bisa mengunduh aset dari satu alat dan menggunakannya sebagai input di alat lain, atau bahkan di aplikasi eksternal seperti CapCut untuk pengeditan video lebih lanjut.
                </p>
            </Section>

             <Section title="Disclaimer">
                <p>
                    Konten yang dihasilkan oleh AI bersifat probabilistik dan terkadang bisa tidak terduga. Selalu tinjau dan sunting hasil yang diberikan AI agar sesuai dengan citra merek dan pesan Anda. Kualitas output sangat bergantung pada kualitas input (gambar dan teks) yang Anda berikan. Platform ini adalah alat bantu untuk mempercepat kreativitas Anda, bukan pengganti penilaian manusia.
                </p>
            </Section>
        </div>
    );
};

export default ReadMePage;
