// iOS-style drum roll picker component
import { Box, Typography } from '@mui/material';
import { useRef, useEffect, useState } from 'react';

interface DrumRollPickerProps {
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  label?: string;
  itemHeight?: number;
  visibleItems?: number;
}

export default function DrumRollPicker({
  value,
  onChange,
  min,
  max,
  label,
  itemHeight = 50,
  visibleItems = 5,
}: DrumRollPickerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startY, setStartY] = useState(0);
  const [scrollTop, setScrollTop] = useState(0);

  const items = Array.from({ length: max - min + 1 }, (_, i) => min + i);
  const centerIndex = Math.floor(visibleItems / 2);

  // Scroll to current value on mount and value change
  useEffect(() => {
    if (containerRef.current) {
      const targetIndex = value - min;
      const targetScroll = targetIndex * itemHeight;
      containerRef.current.scrollTop = targetScroll;
    }
  }, [value, min, itemHeight]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const scrollTop = e.currentTarget.scrollTop;
    const index = Math.round(scrollTop / itemHeight);
    const newValue = min + index;
    
    if (newValue !== value && newValue >= min && newValue <= max) {
      onChange(newValue);
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setStartY(e.clientY);
    setScrollTop(containerRef.current?.scrollTop || 0);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !containerRef.current) return;
    
    const deltaY = e.clientY - startY;
    containerRef.current.scrollTop = scrollTop - deltaY;
  };

  const handleMouseUp = () => {
    if (!isDragging) return;
    setIsDragging(false);
    
    // Snap to nearest value
    if (containerRef.current) {
      const scrollTop = containerRef.current.scrollTop;
      const index = Math.round(scrollTop / itemHeight);
      containerRef.current.scrollTop = index * itemHeight;
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    setIsDragging(true);
    setStartY(e.touches[0].clientY);
    setScrollTop(containerRef.current?.scrollTop || 0);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || !containerRef.current) return;
    
    const deltaY = e.touches[0].clientY - startY;
    containerRef.current.scrollTop = scrollTop - deltaY;
  };

  const handleTouchEnd = () => {
    if (!isDragging) return;
    setIsDragging(false);
    
    // Snap to nearest value
    if (containerRef.current) {
      const scrollTop = containerRef.current.scrollTop;
      const index = Math.round(scrollTop / itemHeight);
      containerRef.current.scrollTop = index * itemHeight;
    }
  };

  return (
    <Box sx={{ textAlign: 'center', userSelect: 'none' }}>
      {label && (
        <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
          {label}
        </Typography>
      )}
      
      <Box
        sx={{
          position: 'relative',
          height: itemHeight * visibleItems,
          overflow: 'hidden',
          borderRadius: 2,
          bgcolor: 'background.paper',
          border: '1px solid',
          borderColor: 'divider',
        }}
      >
        {/* Selection indicator */}
        <Box
          sx={{
            position: 'absolute',
            top: itemHeight * centerIndex,
            left: 0,
            right: 0,
            height: itemHeight,
            border: '2px solid',
            borderColor: 'primary.main',
            borderRadius: 1,
            pointerEvents: 'none',
            zIndex: 1,
            bgcolor: 'primary.light',
            opacity: 0.1,
          }}
        />

        {/* Scrollable container */}
        <Box
          ref={containerRef}
          onScroll={handleScroll}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          sx={{
            height: '100%',
            overflowY: 'scroll',
            scrollbarWidth: 'none',
            '&::-webkit-scrollbar': { display: 'none' },
            cursor: isDragging ? 'grabbing' : 'grab',
            scrollBehavior: isDragging ? 'auto' : 'smooth',
          }}
        >
          {/* Padding top */}
          <Box sx={{ height: itemHeight * centerIndex }} />
          
          {/* Items */}
          {items.map((item) => {
            const isSelected = item === value;
            return (
              <Box
                key={item}
                sx={{
                  height: itemHeight,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.2s',
                  opacity: isSelected ? 1 : 0.3,
                  transform: isSelected ? 'scale(1.2)' : 'scale(1)',
                  fontWeight: isSelected ? 700 : 400,
                }}
              >
                <Typography
                  variant="h6"
                  sx={{
                    fontSize: isSelected ? '1.5rem' : '1rem',
                    color: isSelected ? 'primary.main' : 'text.secondary',
                  }}
                >
                  {String(item).padStart(2, '0')}
                </Typography>
              </Box>
            );
          })}
          
          {/* Padding bottom */}
          <Box sx={{ height: itemHeight * centerIndex }} />
        </Box>
      </Box>
    </Box>
  );
}
