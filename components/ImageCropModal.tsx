import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';

interface ImageCropModalProps {
  imageUrl: string;
  onCropComplete: (base64Image: string) => void;
  onClose: () => void;
}

type AspectRatio = 'free' | '1:1' | '9:16' | '16:9' | '4:3' | '3:4';

const ImageCropModal: React.FC<ImageCropModalProps> = ({ imageUrl, onCropComplete, onClose }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement>(new Image());
  const [crop, setCrop] = useState({ x: 10, y: 10, width: 200, height: 200 });
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('free');
  const [dragging, setDragging] = useState<boolean | string>(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw the full image first
    ctx.drawImage(imageRef.current, 0, 0, canvas.width, canvas.height);

    // Draw a semi-transparent overlay over the entire image
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw the cropped portion of the image again on top of the overlay, making it appear bright
    ctx.drawImage(imageRef.current,
      (crop.x / canvas.width) * imageRef.current.naturalWidth,
      (crop.y / canvas.height) * imageRef.current.naturalHeight,
      (crop.width / canvas.width) * imageRef.current.naturalWidth,
      (crop.height / canvas.height) * imageRef.current.naturalHeight,
      crop.x, crop.y, crop.width, crop.height
    );

    // Draw dashed border for the crop area
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.strokeRect(crop.x, crop.y, crop.width, crop.height);
    ctx.setLineDash([]); // Reset to solid line for handles

    // Draw handles
    const handleSize = 8;
    ctx.fillStyle = '#fff';
    ctx.strokeStyle = 'rgba(0,0,0,0.5)';
    ctx.lineWidth = 1;

    const drawHandle = (x: number, y: number) => {
        ctx.fillRect(x - handleSize / 2, y - handleSize / 2, handleSize, handleSize);
        ctx.strokeRect(x - handleSize / 2, y - handleSize / 2, handleSize, handleSize);
    };

    // corners
    drawHandle(crop.x, crop.y); // tl
    drawHandle(crop.x + crop.width, crop.y); // tr
    drawHandle(crop.x, crop.y + crop.height); // bl
    drawHandle(crop.x + crop.width, crop.y + crop.height); // br
    // midpoints
    drawHandle(crop.x + crop.width/2, crop.y); // t
    drawHandle(crop.x + crop.width, crop.y + crop.height/2); // r
    drawHandle(crop.x + crop.width/2, crop.y + crop.height); // b
    drawHandle(crop.x, crop.y + crop.height/2); // l

  }, [crop]);

  useEffect(() => {
    const img = imageRef.current;
    img.crossOrigin = "Anonymous";
    img.src = imageUrl;
    img.onload = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const container = canvas.parentElement;
      if (!container) return;
      
      const { clientWidth: containerWidth, clientHeight: containerHeight } = container;

      const imgAspectRatio = img.naturalWidth / img.naturalHeight;
      const containerAspectRatio = containerWidth / containerHeight;

      let canvasWidth;
      let canvasHeight;

      if (imgAspectRatio > containerAspectRatio) {
          canvasWidth = containerWidth;
          canvasHeight = containerWidth / imgAspectRatio;
      } else {
          canvasHeight = containerHeight;
          canvasWidth = containerHeight * imgAspectRatio;
      }

      canvas.width = canvasWidth;
      canvas.height = canvasHeight;
      
      const initialSize = Math.min(canvas.width, canvas.height) * 0.8;
      
      let newCrop = {
          x: 0,
          y: 0,
          width: initialSize,
          height: initialSize,
      };

      if (aspectRatio !== 'free') {
          const [w, h] = aspectRatio.split(':').map(Number);
          const ratio = w / h;
          if (newCrop.width > newCrop.height * ratio) {
              newCrop.width = newCrop.height * ratio;
          } else {
              newCrop.height = newCrop.width / ratio;
          }
      }
      
      newCrop.x = (canvas.width - newCrop.width) / 2;
      newCrop.y = (canvas.height - newCrop.height) / 2;

      setCrop(newCrop);
    };
  }, [imageUrl, aspectRatio]); // Re-run when aspect ratio changes to reset crop

  useEffect(() => {
    draw();
  }, [crop, draw]);

  const getHandleAt = useCallback((x: number, y: number) => {
    const handleSize = 12;
    // Corners
    if (Math.abs(x - crop.x) < handleSize && Math.abs(y - crop.y) < handleSize) return 'tl';
    if (Math.abs(x - (crop.x + crop.width)) < handleSize && Math.abs(y - crop.y) < handleSize) return 'tr';
    if (Math.abs(x - crop.x) < handleSize && Math.abs(y - (crop.y + crop.height)) < handleSize) return 'bl';
    if (Math.abs(x - (crop.x + crop.width)) < handleSize && Math.abs(y - (crop.y + crop.height)) < handleSize) return 'br';
    // Midpoints
    if (Math.abs(x - (crop.x + crop.width / 2)) < handleSize && Math.abs(y - crop.y) < handleSize) return 't';
    if (Math.abs(x - (crop.x + crop.width)) < handleSize && Math.abs(y - (crop.y + crop.height / 2)) < handleSize) return 'r';
    if (Math.abs(x - (crop.x + crop.width / 2)) < handleSize && Math.abs(y - (crop.y + crop.height)) < handleSize) return 'b';
    if (Math.abs(x - crop.x) < handleSize && Math.abs(y - (crop.y + crop.height / 2)) < handleSize) return 'l';
    // Area
    if (x > crop.x && x < crop.x + crop.width && y > crop.y && y < crop.y + crop.height) return 'move';
    return false;
  }, [crop]);

  const handleDragStart = useCallback((clientX: number, clientY: number) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    const handle = getHandleAt(x, y);
    if (handle) {
      setDragging(handle);
      setDragStart({ x, y });
    }
  }, [getHandleAt]);
  
  const handleDragMove = useCallback((clientX: number, clientY: number) => {
    if (!dragging) return;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    const dx = x - dragStart.x;
    const dy = y - dragStart.y;
    
    setCrop(prev => {
        let newCrop = { ...prev };
        
        const applyAspectRatio = (c: typeof prev, dragHandle: string | boolean) => {
            if (aspectRatio === 'free') return c;
            const [w, h] = aspectRatio.split(':').map(Number);
            const ratio = w / h;

            if (typeof dragHandle !== 'string') return c;

            if (dragHandle.includes('t') || dragHandle.includes('b')) {
                const newWidth = c.height * ratio;
                if (dragHandle.includes('l')) {
                    c.x += c.width - newWidth;
                }
                c.width = newWidth;
            } else if (dragHandle.includes('l') || dragHandle.includes('r')) {
                 const newHeight = c.width / ratio;
                 if (dragHandle.includes('t')) {
                    c.y += c.height - newHeight;
                }
                c.height = newHeight;
            }
            return c;
        };
        
        const originalCrop = { ...prev };
        
        switch (dragging) {
            case 'move': newCrop.x += dx; newCrop.y += dy; break;
            case 'tl': newCrop.x += dx; newCrop.y += dy; newCrop.width -= dx; newCrop.height -= dy; break;
            case 'tr': newCrop.y += dy; newCrop.width += dx; newCrop.height -= dy; break;
            case 'bl': newCrop.x += dx; newCrop.width -= dx; newCrop.height += dy; break;
            case 'br': newCrop.width += dx; newCrop.height += dy; break;
            case 't': newCrop.y += dy; newCrop.height -= dy; break;
            case 'r': newCrop.width += dx; break;
            case 'b': newCrop.height += dy; break;
            case 'l': newCrop.x += dx; newCrop.width -= dx; break;
        }

        newCrop = applyAspectRatio(newCrop, dragging);

        // Boundary checks
        if (newCrop.x < 0) { 
            newCrop.width += newCrop.x;
            newCrop.x = 0;
            newCrop = applyAspectRatio(newCrop, dragging);
        }
        if (newCrop.y < 0) { 
            newCrop.height += newCrop.y;
            newCrop.y = 0;
            newCrop = applyAspectRatio(newCrop, dragging);
        }
        if (newCrop.x + newCrop.width > canvasRef.current!.width) { 
            newCrop.width = canvasRef.current!.width - newCrop.x;
            newCrop = applyAspectRatio(newCrop, dragging);
        }
        if (newCrop.y + newCrop.height > canvasRef.current!.height) { 
            newCrop.height = canvasRef.current!.height - newCrop.y;
            newCrop = applyAspectRatio(newCrop, dragging);
        }
        
        if (newCrop.width < 20 || newCrop.height < 20) {
            return originalCrop;
        }
        
        return newCrop;
    });
    setDragStart({ x, y });
  }, [dragging, dragStart.x, dragStart.y, aspectRatio]);
  
  const handleDragEnd = useCallback(() => {
    setDragging(false);
  }, []);
  
  // MOUSE Events
  const onMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => handleDragStart(e.clientX, e.clientY);
  const onMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const handle = getHandleAt(x, y);

    if (canvasRef.current) {
        if (handle === 'tl' || handle === 'br') canvasRef.current.style.cursor = 'nwse-resize';
        else if (handle === 'tr' || handle === 'bl') canvasRef.current.style.cursor = 'nesw-resize';
        else if (handle === 't' || handle === 'b') canvasRef.current.style.cursor = 'ns-resize';
        else if (handle === 'l' || handle === 'r') canvasRef.current.style.cursor = 'ew-resize';
        else if (handle === 'move') canvasRef.current.style.cursor = 'move';
        else canvasRef.current.style.cursor = 'default';
    }

    handleDragMove(e.clientX, e.clientY);
  };

  // TOUCH Events
  const onTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    handleDragStart(e.touches[0].clientX, e.touches[0].clientY);
  };
  const onTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    handleDragMove(e.touches[0].clientX, e.touches[0].clientY);
  };

  const handleApplyCrop = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const scale = imageRef.current.naturalWidth / canvas.width;
    const tempCanvas = document.createElement('canvas');
    const sourceX = crop.x * scale;
    const sourceY = crop.y * scale;
    const sourceWidth = crop.width * scale;
    const sourceHeight = crop.height * scale;
    tempCanvas.width = sourceWidth;
    tempCanvas.height = sourceHeight;
    const tempCtx = tempCanvas.getContext('2d');
    if (!tempCtx) return;
    
    tempCtx.drawImage(
      imageRef.current,
      sourceX, sourceY,
      sourceWidth, sourceHeight,
      0, 0,
      sourceWidth, sourceHeight
    );
    
    onCropComplete(tempCanvas.toDataURL('image/jpeg', 0.9).split(',')[1]);
  };

  const handleAspectRatioChange = (newAspect: AspectRatio) => {
    setAspectRatio(newAspect);
  };

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex justify-center items-center p-4" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
        className="bg-gray-800 rounded-2xl border border-gray-700 shadow-xl w-full max-w-4xl p-6 flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-xl font-bold text-white mb-4 flex-shrink-0">Potong Gambar</h2>
        <div className="flex justify-center items-center mb-4 w-full h-[60vh]">
          <canvas 
            ref={canvasRef} 
            onMouseDown={onMouseDown} 
            onMouseMove={onMouseMove} 
            onMouseUp={handleDragEnd} 
            onMouseLeave={handleDragEnd}
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={handleDragEnd}
            style={{ touchAction: 'none' }} // Prevent default touch behaviors like scrolling
          />
        </div>
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 flex-shrink-0">
          <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-semibold text-gray-300">Aspek Rasio:</span>
              {(['free', '1:1', '9:16', '16:9', '4:3', '3:4'] as AspectRatio[]).map(ar => (
                <button key={ar} onClick={() => handleAspectRatioChange(ar)} className={`px-3 py-1 text-sm rounded-md ${aspectRatio === ar ? 'bg-indigo-600 text-white' : 'bg-gray-700 hover:bg-gray-600'}`}>
                    {ar === 'free' ? 'Bebas' : ar}
                </button>
              ))}
          </div>
          <div className="flex gap-3">
            <button onClick={onClose} className="px-4 py-2 rounded-lg bg-gray-600 text-white font-semibold hover:bg-gray-500 transition">Batal</button>
            <button onClick={handleApplyCrop} className="px-4 py-2 rounded-lg bg-indigo-600 text-white font-bold hover:bg-indigo-500 transition">Terapkan Potongan</button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default ImageCropModal;