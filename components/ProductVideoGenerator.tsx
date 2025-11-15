import React, { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { UploadedImage, ResultData, PhotoStyle } from '../types';
import { generateVideo, checkVideoStatus, generateVideoConceptIdea } from '../services/geminiService';
import ImageUploader from './ImageUploader';
import Loader from './Loader';
import { FilmIcon } from './icons/FilmIcon';
import { SparklesIcon } from './icons/SparklesIcon';
import ImagePreviewModal from './ImagePreviewModal';
import VideoGenerationModal from './VideoGenerationModal';
import FreeTierVideoWarningModal from './FreeTierVideoWarningModal';

const ProductVideoGenerator: React.FC = () => {
  const [sourceImage, setSourceImage] = useState<UploadedImage | null>(null);
  const [resultData, setResultData] = useState<ResultData | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  // --- Video Generation State & Logic (Mirrored from other apps for consistency) ---
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);
  const [isFreeTierWarningOpen, setIsFreeTierWarningOpen] = useState(false);
  const [videoToGenerate, setVideoToGenerate] = useState<ResultData | null>(null);
  const [isGeneratingVideo, setIsGeneratingVideo] = useState(false);
  const [videoLoadingMessage, setVideoLoadingMessage] = useState('');
  const [generatedVideoUrl, setGeneratedVideoUrl] = useState<string | null>(null);
  const videoPollingRef = useRef<number | null>(null);
  
   // Seed from other apps
   useEffect(() => {
    const seededDataRaw = sessionStorage.getItem('video-generator-seed');
    if (seededDataRaw) {
      try {
        const { imageUrl, prompt } = JSON.parse(seededDataRaw);
        if (imageUrl) {
          fetch(imageUrl)
            .then(res => res.blob())
            .then(blob => {
              const reader = new FileReader();
              reader.onloadend = () => {
                const base64String = reader.result?.toString().split(',')[1];
                if (base64String) {
                  const uploadedImage = { base64: base64String, mimeType: blob.type, name: 'seeded-image.png' };
                  handleImageUpload(uploadedImage, prompt);
                }
              };
              reader.readAsDataURL(blob);
            });
        }
      } catch (e) {
        console.error("Gagal mengurai data seeded:", e);
      } finally {
        sessionStorage.removeItem('video-generator-seed');
      }
    }
  }, []);

  const handleImageUpload = (image: UploadedImage | null, seededPrompt: string = '') => {
    setSourceImage(image);
    if (image) {
      const imageUrl = `data:${image.mimeType};base64,${image.base64}`;
      const newResultData: ResultData = {
        imageUrl: imageUrl,
        prompt: "Gambar yang diunggah pengguna untuk pembuatan video.",
        style: PhotoStyle.KonsepKustom, // Generic style
        videoPrompt: seededPrompt,
      };
      setResultData(newResultData);
    } else {
      setResultData(null);
    }
  };
  
  const handleUpdateVideoPrompt = useCallback((index: number, prompt: string) => {
    if (resultData) {
        setResultData(prev => prev ? { ...prev, videoPrompt: prompt } : null);
    }
  }, [resultData]);
  
  const handleUpdatePromoScript = useCallback((index: number, script: string) => {
    if (resultData) {
        setResultData(prev => prev ? { ...prev, promoScript: script } : null);
    }
  }, [resultData]);


  const handleVideoGenerationRequest = useCallback((result: ResultData) => {
    setVideoToGenerate(result);
    setIsFreeTierWarningOpen(true);
  }, []);

  const proceedWithVideoGeneration = useCallback(() => {
    if (videoToGenerate) {
      setIsVideoModalOpen(true);
    }
    setIsFreeTierWarningOpen(false);
  }, [videoToGenerate]);

  const handleCloseVideoModal = useCallback(() => {
    setIsVideoModalOpen(false);
    setVideoToGenerate(null);
    setIsGeneratingVideo(false);
    if (videoPollingRef.current) {
      clearInterval(videoPollingRef.current);
      videoPollingRef.current = null;
    }
    if (generatedVideoUrl && generatedVideoUrl.startsWith('blob:')) {
      URL.revokeObjectURL(generatedVideoUrl);
    }
    setGeneratedVideoUrl(null);
  }, [generatedVideoUrl]);

  const handleGenerateVideo = useCallback(async (prompt: string, aspectRatio: '16:9' | '9:16') => {
    if (!videoToGenerate) return;

    setIsGeneratingVideo(true);
    setGeneratedVideoUrl(null);

    const messages = ["Mengirim tugas ke AI...", "AI sedang memproses video Anda...", "Menganimasikan gambar Anda...", "Menambahkan efek sinematik...", "Hampir selesai..."];
    let msgIndex = 0;
    setVideoLoadingMessage(messages[msgIndex]);
    const msgInterval = setInterval(() => {
        msgIndex = (msgIndex + 1) % messages.length;
        setVideoLoadingMessage(messages[msgIndex]);
    }, 8000);

    try {
        const imageUrl = videoToGenerate.imageUrl;
        const mimeTypeMatch = imageUrl.match(/^data:(.*?);/);
        const mimeType = mimeTypeMatch ? mimeTypeMatch[1] : 'image/png';
        const base64data = imageUrl.split(',')[1];
        if (!base64data) throw new Error("Gagal membaca data gambar.");
        const image: UploadedImage = { base64: base64data, mimeType, name: 'scene_image.png' };

        const initialOp = await generateVideo(prompt, aspectRatio, image, false, 'veo-2.0-generate-001');

        const poll = async (op: any) => {
            try {
                const updatedOp = await checkVideoStatus(op);
                if (updatedOp.done) {
                    if (videoPollingRef.current) clearInterval(videoPollingRef.current);
                    videoPollingRef.current = null;
                    clearInterval(msgInterval);
                    setVideoLoadingMessage("Mengunduh video...");

                    const downloadLink = updatedOp.response?.generatedVideos?.[0]?.video?.uri;
                    if (!downloadLink) throw new Error("Operasi selesai tetapi tidak ada tautan video.");

                    const videoResponse = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
                    if (!videoResponse.ok) throw new Error(`Gagal mengunduh video: ${videoResponse.statusText}`);
                    const videoBlob = await videoResponse.blob();
                    setGeneratedVideoUrl(URL.createObjectURL(videoBlob));
                    setIsGeneratingVideo(false);
                }
            } catch (pollErr) {
                throw pollErr;
            }
        };
        
        videoPollingRef.current = window.setInterval(() => poll(initialOp), 10000);

    } catch (err) {
        clearInterval(msgInterval);
        const errorMsg = err instanceof Error ? err.message : 'Terjadi kesalahan tidak diketahui.';
        console.error("Video generation failed:", errorMsg);
        handleCloseVideoModal();
    }
  }, [videoToGenerate, handleCloseVideoModal]);


  const handleStartOver = () => {
    setSourceImage(null);
    setResultData(null);
    setIsPreviewOpen(false);
  };

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        {/* Left Panel */}
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="lg:col-span-1 bg-gray-800/50 p-6 rounded-2xl border border-gray-700 shadow-lg flex flex-col gap-6">
          <h2 className="text-xl font-bold text-white">1. Unggah Gambar Kunci</h2>
          <p className="text-sm text-gray-400 -mt-4">Pilih gambar final yang ingin Anda ubah menjadi video.</p>
          <ImageUploader onImageUpload={handleImageUpload} image={sourceImage} enableCropper={true} />
        </motion.div>

        {/* Right Panel */}
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="lg:col-span-1 bg-gray-800/50 p-6 rounded-2xl border border-gray-700 shadow-lg min-h-[30rem] flex flex-col justify-center items-center">
          <AnimatePresence mode="wait">
            {resultData ? (
              <motion.div
                key="result"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-full flex flex-col items-center gap-4"
              >
                <h2 className="text-xl font-bold text-white">2. Animasikan Gambar Anda</h2>
                <div className="w-full max-w-sm aspect-square bg-gray-900 rounded-lg overflow-hidden">
                  <img src={resultData.imageUrl} alt="Uploaded product" className="w-full h-full object-contain" />
                </div>
                <button
                  onClick={() => setIsPreviewOpen(true)}
                  className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white font-bold py-3 px-4 rounded-lg transition-all hover:bg-indigo-500"
                >
                  <SparklesIcon /> Buka Pratinjau & Buat Video
                </button>
                <button
                  onClick={handleStartOver}
                  className="text-sm text-gray-400 hover:text-white"
                >
                  Ganti Gambar
                </button>
              </motion.div>
            ) : (
              <motion.div
                key="placeholder"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-center text-gray-500"
              >
                <FilmIcon />
                <h3 className="font-bold text-lg text-gray-400 mt-2">Pratinjau Video</h3>
                <p className="text-sm mt-1 max-w-sm">Unggah gambar di sebelah kiri untuk memulai.</p>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>

      <AnimatePresence>
        {isPreviewOpen && resultData && (
          <ImagePreviewModal
            results={[resultData]}
            currentIndex={0}
            onClose={() => setIsPreviewOpen(false)}
            onNavigate={() => {}} // No navigation needed for single image
            onRegenerate={() => {}} // No regeneration for uploaded image
            onOpenVideoModal={() => handleVideoGenerationRequest(resultData)}
            onUpdateVideoPrompt={handleUpdateVideoPrompt}
            onUpdatePromoScript={handleUpdatePromoScript}
            productDescription={resultData.prompt}
          />
        )}
      </AnimatePresence>
      
      <AnimatePresence>
          {isFreeTierWarningOpen && (
              <FreeTierVideoWarningModal
                  isOpen={isFreeTierWarningOpen}
                  onClose={() => {
                      setIsFreeTierWarningOpen(false);
                      setVideoToGenerate(null);
                  }}
                  onContinue={proceedWithVideoGeneration}
              />
          )}
      </AnimatePresence>
      
      <AnimatePresence>
          {isVideoModalOpen && videoToGenerate && (
              <VideoGenerationModal
                  isOpen={isVideoModalOpen}
                  onClose={handleCloseVideoModal}
                  imageToAnimateUrl={videoToGenerate.imageUrl}
                  initialPrompt={videoToGenerate.videoPrompt || ''}
                  onGenerate={handleGenerateVideo}
                  isLoading={isGeneratingVideo}
                  loadingMessage={videoLoadingMessage}
                  generatedVideoUrl={generatedVideoUrl}
                  sourceImageAspectRatio="1:1" // Assume cropped to square or let the modal warn user
              />
          )}
      </AnimatePresence>
    </>
  );
};

export default ProductVideoGenerator;