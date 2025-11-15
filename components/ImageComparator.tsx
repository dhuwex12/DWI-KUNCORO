
import React, { useState, useRef, useCallback, useEffect } from 'react';

interface ImageComparatorProps {
  beforeImageUrl: string;
  afterImageUrl: string;
}

const ImageComparator: React.FC<ImageComparatorProps> = ({ beforeImageUrl, afterImageUrl }) => {
  const [sliderPosition, setSliderPosition] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMove = useCallback((clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    const percent = (x / rect.width) * 100;
    setSliderPosition(percent);
  }, []);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    handleMove(e.clientX);
  };
  
  const handleTouchStart = (e: React.TouchEvent) => {
    setIsDragging(true);
    handleMove(e.touches[0].clientX);
  };

  const handleUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (isDragging) handleMove(e.clientX);
  }, [isDragging, handleMove]);
  
  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (isDragging) handleMove(e.touches[0].clientX);
  }, [isDragging, handleMove]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft') {
      setSliderPosition(p => Math.max(0, p - 2));
    } else if (e.key === 'ArrowRight') {
      setSliderPosition(p => Math.min(100, p + 2));
    }
  };

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleUp);
    window.addEventListener('touchmove', handleTouchMove);
    window.addEventListener('touchend', handleUp);
    
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleUp);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleUp);
    };
  }, [handleMouseMove, handleUp, handleTouchMove]);

  return (
    <div
      ref={containerRef}
      className="relative w-full aspect-square bg-gray-900 rounded-lg overflow-hidden select-none cursor-ew-resize group/comparator focus:outline-none focus:ring-2 focus:ring-indigo-500"
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="slider"
      aria-valuenow={Math.round(sliderPosition)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label="Perbandingan gambar sebelum dan sesudah"
    >
      <img
        src={afterImageUrl}
        alt="Sesudah"
        className="absolute inset-0 w-full h-full object-contain pointer-events-none"
        draggable="false"
      />
      <div
        className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none"
        style={{ clipPath: `inset(0 ${100 - sliderPosition}% 0 0)` }}
        aria-hidden="true"
      >
        <img
          src={beforeImageUrl}
          alt="Sebelum"
          className="absolute inset-0 w-full h-full object-contain pointer-events-none"
          draggable="false"
        />
      </div>
      <div
        className="absolute top-0 bottom-0 w-1 bg-white/50 pointer-events-none transition-colors duration-300 group-hover/comparator:bg-white"
        style={{ left: `${sliderPosition}%`, transform: 'translateX(-50%)' }}
        aria-hidden="true"
      >
        <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 bg-white rounded-full h-8 w-8 flex items-center justify-center shadow-lg cursor-ew-resize transition-transform duration-300 group-hover/comparator:scale-110">
            <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M8 9l4-4 4 4m0 6l-4 4-4-4"></path></svg>
        </div>
      </div>
    </div>
  );
};

export default ImageComparator;
