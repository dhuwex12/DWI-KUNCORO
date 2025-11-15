import React, { useRef, useState, useCallback } from 'react';
import { UploadedImage } from '../types';
import { UploadIcon } from './icons/UploadIcon';
import ImageCropModal from './ImageCropModal'; // Import the new modal
import { AnimatePresence } from 'framer-motion';

interface ImageUploaderProps {
  onImageUpload: (image: UploadedImage | null) => void;
  image: UploadedImage | null;
  enableCropper?: boolean; // New prop to enable/disable cropper
}

const MAX_DIMENSION = 1280;

const resizeImage = (file: File): Promise<{ base64: string; mimeType: string }> => {
    // ... existing resize logic ...
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new Image();
            img.onload = () => {
                const { width, height } = img;
                if (width <= MAX_DIMENSION && height <= MAX_DIMENSION) {
                    const base64String = event.target?.result?.toString().split(',')[1];
                    if (base64String) {
                         resolve({ base64: base64String, mimeType: file.type });
                    } else {
                        reject(new Error("Tidak dapat membaca file untuk konversi base64."));
                    }
                    return;
                }

                let newWidth, newHeight;
                if (width > height) {
                    newWidth = MAX_DIMENSION;
                    newHeight = (height * MAX_DIMENSION) / width;
                } else {
                    newHeight = MAX_DIMENSION;
                    newWidth = (width * MAX_DIMENSION) / height;
                }

                const canvas = document.createElement('canvas');
                canvas.width = newWidth;
                canvas.height = newHeight;
                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    return reject(new Error('Tidak dapat memperoleh konteks kanvas'));
                }
                ctx.drawImage(img, 0, 0, newWidth, newHeight);

                const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
                const base64String = dataUrl.split(',')[1];

                if (base64String) {
                    resolve({ base64: base64String, mimeType: 'image/jpeg' });
                } else {
                    reject(new Error('Tidak dapat mengonversi kanvas ke base64.'));
                }
            };
            img.onerror = (err) => reject(err);
            if(event.target?.result) {
                img.src = event.target.result as string;
            } else {
                reject(new Error("Hasil FileReader adalah null."));
            }
        };
        reader.onerror = (err) => reject(err);
        reader.readAsDataURL(file);
    });
};

const ImageUploader: React.FC<ImageUploaderProps> = ({ onImageUpload, image, enableCropper = false }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [cropState, setCropState] = useState<{ image: string | null; file: File | null }>({ image: null, file: null });

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        alert("Ukuran file terlalu besar. Harap unggah gambar yang lebih kecil dari 10MB.");
        return;
      }
      
      if (enableCropper) {
        const reader = new FileReader();
        reader.onload = (e) => {
            setCropState({ image: e.target?.result as string, file });
        };
        reader.readAsDataURL(file);
      } else {
         resizeImage(file).then(resizedImage => {
            onImageUpload({
                base64: resizedImage.base64,
                mimeType: resizedImage.mimeType,
                name: file.name,
            });
         }).catch(error => {
            console.error("Kesalahan pemrosesan gambar:", error);
            alert("Tidak dapat memproses gambar. Silakan coba file lain.");
         });
      }
    }
  };
  
  const handleCropComplete = (croppedImageBase64: string) => {
    onImageUpload({
        base64: croppedImageBase64,
        mimeType: 'image/jpeg', // Cropper outputs jpeg
        name: cropState.file?.name || 'cropped-image.jpg',
    });
    setCropState({ image: null, file: null });
  };
  
  const handleRemoveImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    onImageUpload(null);
    if(fileInputRef.current) {
        fileInputRef.current.value = "";
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <>
      <div>
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          className="hidden"
          accept="image/png, image/jpeg, image/webp"
        />
        <div
          onClick={handleClick}
          className="w-full h-64 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg flex flex-col justify-center items-center text-gray-500 dark:text-gray-400 hover:border-indigo-500 hover:text-indigo-500 dark:hover:text-indigo-400 transition-colors cursor-pointer bg-gray-50 dark:bg-gray-900/50 relative overflow-hidden"
        >
          {image ? (
            <>
               {image.base64 ? (
                <img
                  src={`data:${image.mimeType};base64,${image.base64}`}
                  alt={image.name}
                  className="w-full h-full object-contain"
                />
               ) : (
                  <div className="flex flex-col items-center justify-center text-center">
                      <div className="w-8 h-8 border-2 border-dashed border-gray-800 dark:border-white border-t-transparent rounded-full animate-spin"></div>
                      <p className="mt-2 text-sm">Memproses gambar...</p>
                  </div>
               )}
              <button 
                  onClick={handleRemoveImage}
                  className="absolute top-2 right-2 bg-black/50 text-white rounded-full p-1.5 hover:bg-red-500 transition-colors text-xs"
                  title="Hapus gambar"
                  aria-label="Hapus gambar"
              >
                &#x2715;
              </button>
            </>
          ) : (
            <div className="text-center">
              <UploadIcon />
              <p className="mt-2 font-semibold">Klik untuk mengunggah</p>
              <p className="text-xs text-gray-500">PNG, JPG, WEBP (Maks. 10MB)</p>
            </div>
          )}
        </div>
      </div>
      <AnimatePresence>
        {cropState.image && (
            <ImageCropModal 
                imageUrl={cropState.image}
                onCropComplete={handleCropComplete}
                onClose={() => setCropState({ image: null, file: null })}
            />
        )}
      </AnimatePresence>
    </>
  );
};

export default ImageUploader;