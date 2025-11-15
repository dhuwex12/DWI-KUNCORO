import React, { useRef, useEffect, useState, useImperativeHandle, forwardRef, useCallback } from 'react';

export type Tool = 'brush' | 'eraser' | 'refine' | 'erase';
export type EditorMode = 'mask' | 'refine';

export interface EditorState {
  tool: Tool;
  brushSize: number;
}

interface ImageEditorProps {
  imageUrl: string;
  originalImageUrlForRestore?: string;
  editorState: EditorState;
  mode: EditorMode;
}

interface Transform {
  scale: number;
  offsetX: number;
  offsetY: number;
}

const MIN_SCALE = 0.2;
const MAX_SCALE = 5;

const ImageEditor = forwardRef((props: ImageEditorProps, ref) => {
  const { imageUrl, originalImageUrlForRestore, editorState, mode } = props;

  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement>(new Image());
  const originalImageRef = useRef<HTMLImageElement | null>(null);

  const [isDrawing, setIsDrawing] = useState(false);
  const [transform, setTransform] = useState<Transform>({ scale: 1, offsetX: 0, offsetY: 0 });
  
  const history = useRef<ImageData[]>([]);
  const historyIndex = useRef(-1);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d', { willReadFrequently: true });
    if (!ctx || !canvas) return;

    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.restore();

    ctx.save();
    ctx.translate(transform.offsetX, transform.offsetY);
    ctx.scale(transform.scale, transform.scale);
    ctx.drawImage(imageRef.current, 0, 0);
    ctx.restore();
  }, [transform]);

  useEffect(() => {
    const image = imageRef.current;
    image.crossOrigin = "Anonymous";
    image.src = imageUrl;
    image.onload = () => {
        const canvas = canvasRef.current;
        if (!canvas || !containerRef.current) return;
        
        const { clientWidth: containerWidth, clientHeight: containerHeight } = containerRef.current;
        
        const scaleX = containerWidth / image.width;
        const scaleY = containerHeight / image.height;
        const initialScale = Math.min(scaleX, scaleY, 1);
        
        const initialOffsetX = (containerWidth - image.width * initialScale) / 2;
        const initialOffsetY = (containerHeight - image.height * initialScale) / 2;
        
        setTransform({ scale: initialScale, offsetX: initialOffsetX, offsetY: initialOffsetY });

        // Initialize history
        history.current = [];
        historyIndex.current = -1;
        
        const tempCtx = canvas.getContext('2d');
        if (tempCtx) {
            // Push initial empty state for mask mode, or image state for refine
            if (mode === 'mask') {
                tempCtx.clearRect(0, 0, canvas.width, canvas.height);
            }
            saveToHistory(tempCtx.getImageData(0,0, canvas.width, canvas.height));
        }

    };

    if (mode === 'refine' && originalImageUrlForRestore) {
        const originalImage = new Image();
        originalImage.crossOrigin = "Anonymous";
        originalImage.src = originalImageUrlForRestore;
        originalImage.onload = () => {
            originalImageRef.current = originalImage;
        };
    } else {
        originalImageRef.current = null;
    }
  }, [imageUrl, originalImageUrlForRestore, mode]);
  
  useEffect(draw, [draw]);
  
  const saveToHistory = (imageData: ImageData) => {
    // If we have undone, and then draw again, we want to remove the 'future' history
    if (historyIndex.current < history.current.length - 1) {
      history.current = history.current.slice(0, historyIndex.current + 1);
    }
    history.current.push(imageData);
    historyIndex.current++;
  };

  const undo = () => {
    if (historyIndex.current > 0) {
      historyIndex.current--;
      const imageData = history.current[historyIndex.current];
      const ctx = canvasRef.current?.getContext('2d');
      if (ctx) {
        ctx.putImageData(imageData, 0, 0);
      }
    }
  };

  const redo = () => {
    if (historyIndex.current < history.current.length - 1) {
      historyIndex.current++;
      const imageData = history.current[historyIndex.current];
      const ctx = canvasRef.current?.getContext('2d');
      if (ctx) {
        ctx.putImageData(imageData, 0, 0);
      }
    }
  };
  
  const getCanvasCoordinates = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    return {
        x: (clientX - rect.left - transform.offsetX) / transform.scale,
        y: (clientY - rect.top - transform.offsetY) / transform.scale
    };
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    setIsDrawing(true);
    const ctx = canvasRef.current?.getContext('2d', { willReadFrequently: true });
    if (!ctx || !canvasRef.current) return;
    
    // Save state before drawing
    saveToHistory(ctx.getImageData(0, 0, canvasRef.current.width, canvasRef.current.height));
    
    const { x, y } = getCanvasCoordinates(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
  };
  
  const stopDrawing = () => {
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) ctx.closePath();
    setIsDrawing(false);
  };

  const drawOnCanvas = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx) return;
    
    const { x, y } = getCanvasCoordinates(e);

    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.translate(transform.offsetX, transform.offsetY);
    ctx.scale(transform.scale, transform.scale);
    
    ctx.lineWidth = editorState.brushSize / transform.scale;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    if (mode === 'mask') {
        ctx.globalCompositeOperation = 'source-over';
        ctx.strokeStyle = editorState.tool === 'brush' ? '#00FF00' : '#FF0000'; // Green for keep, Red for remove
    } else if (mode === 'refine') {
        if (editorState.tool === 'erase') {
             ctx.globalCompositeOperation = 'destination-out';
        } else if (editorState.tool === 'refine' && originalImageRef.current) {
            // Restore logic
            ctx.globalCompositeOperation = 'source-over';
            ctx.save();
            ctx.beginPath();
            ctx.arc(x, y, (editorState.brushSize / transform.scale) / 2, 0, Math.PI * 2);
            ctx.clip();
            ctx.drawImage(originalImageRef.current, 0, 0);
            ctx.restore();
            ctx.restore(); // Restore main context
            return; // Skip line drawing for restore
        }
    }
    
    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.restore();
  };

  const handleZoom = (delta: number, pivotX: number, pivotY: number) => {
    setTransform(prev => {
        const newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, prev.scale + delta));
        const mouseX = (pivotX - prev.offsetX) / prev.scale;
        const mouseY = (pivotY - prev.offsetY) / prev.scale;
        const newOffsetX = pivotX - mouseX * newScale;
        const newOffsetY = pivotY - mouseY * newScale;
        return { scale: newScale, offsetX: newOffsetX, offsetY: newOffsetY };
    });
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY * -0.001;
    handleZoom(delta, e.clientX, e.clientY);
  };
  
  useImperativeHandle(ref, () => ({
    getImageData: async (): Promise<string | null> => {
        const canvas = canvasRef.current;
        if (!canvas || !imageRef.current || imageRef.current.width === 0) return null;
        
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = imageRef.current.width;
        tempCanvas.height = imageRef.current.height;
        const tempCtx = tempCanvas.getContext('2d');
        if (!tempCtx) return null;

        // If in mask mode, the canvas is what we want.
        // If in refine mode, the result is already on the main image, but we apply the erase mask.
        if (mode === 'refine') {
            tempCtx.drawImage(imageRef.current, 0, 0);
            tempCtx.globalCompositeOperation = 'destination-out';
        }
        
        // We draw the overlay canvas (which contains mask/erase strokes) on top
        tempCtx.drawImage(canvas, 
            transform.offsetX, transform.offsetY, 
            transform.scale * imageRef.current.width, transform.scale * imageRef.current.height,
            0, 0,
            imageRef.current.width, imageRef.current.height
        );
        
        return tempCanvas.toDataURL('image/png');
    },
    undo,
    redo,
    zoomIn: () => handleZoom(0.2, (containerRef.current?.clientWidth || 0) / 2, (containerRef.current?.clientHeight || 0) / 2),
    zoomOut: () => handleZoom(-0.2, (containerRef.current?.clientWidth || 0) / 2, (containerRef.current?.clientHeight || 0) / 2),
  }));

  return (
    <div 
        ref={containerRef}
        className="w-full aspect-square bg-gray-900 checkerboard-bg rounded-lg overflow-hidden relative touch-none cursor-grab"
        onWheel={handleWheel}
        onMouseDown={startDrawing}
        onMouseUp={stopDrawing}
        onMouseLeave={stopDrawing}
        onMouseMove={drawOnCanvas}
        onTouchStart={startDrawing}
        onTouchEnd={stopDrawing}
        onTouchMove={drawOnCanvas}
    >
      <canvas
        ref={canvasRef}
        width={containerRef.current?.clientWidth}
        height={containerRef.current?.clientHeight}
        className="absolute top-0 left-0"
      />
    </div>
  );
});

export default ImageEditor;
