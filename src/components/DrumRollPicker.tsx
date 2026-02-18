// iOS-style "drum roll" picker komponenta
import { Box, Typography, useTheme } from '@mui/material';
import { useEffect, useRef, useState } from 'react';

interface DrumRollPickerProps {
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
  label?: string;
  suffix?: string;
}

export default function DrumRollPicker({
  value,
  min,
  max,
  onChange,
  label,
  suffix = '',
}: DrumRollPickerProps) {
  const theme = useTheme();
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startY, setStartY] = useState(0);
  const [scrollOffset, setScrollOffset] = useState(0);

  const ITEM_HEIGHT = 48; // Výška jedné položky v px
  const VISIBLE_ITEMS = 5; // Kolik položek je vidět najednou

  // Generujeme pole všech možných hodnot
  const values = Array.from({ length: max - min + 1 }, (_, i) => min + i);

  // Aktuální index vybrané hodnoty
  const currentIndex = values.indexOf(value);

  // Výpočet scroll pozice pro daný index
  const getScrollForIndex = (index: number) => {
    return index * ITEM_HEIGHT;
  };

  // Scroll na aktuální hodnotu při změně z vnějšku
  // biome-ignore lint/correctness/useExhaustiveDependencies: getScrollForIndex je čistá funkce bez závislostí
  useEffect(() => {
    if (!isDragging && containerRef.current) {
      const targetScroll = getScrollForIndex(currentIndex);
      containerRef.current.scrollTop = targetScroll;
    }
  }, [isDragging, currentIndex]);

  const handleScroll = () => {
    if (!containerRef.current || isDragging) return;

    const scrollTop = containerRef.current.scrollTop;
    setScrollOffset(scrollTop);

    // Snap k nejbližší hodnotě
    const index = Math.round(scrollTop / ITEM_HEIGHT);
    const clampedIndex = Math.max(0, Math.min(index, values.length - 1));

    if (values[clampedIndex] !== value) {
      onChange(values[clampedIndex]);
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setStartY(e.clientY);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !containerRef.current) return;

    const deltaY = e.clientY - startY;
    const newScroll = scrollOffset - deltaY;
    containerRef.current.scrollTop = newScroll;
    setStartY(e.clientY);
    setScrollOffset(newScroll);
  };

  const handleMouseUp = () => {
    if (!isDragging) return;
    setIsDragging(false);

    // Snap k nejbližší hodnotě po puštění
    if (containerRef.current) {
      const scrollTop = containerRef.current.scrollTop;
      const index = Math.round(scrollTop / ITEM_HEIGHT);
      const clampedIndex = Math.max(0, Math.min(index, values.length - 1));
      const targetScroll = getScrollForIndex(clampedIndex);

      containerRef.current.scrollTo({
        top: targetScroll,
        behavior: 'smooth',
      });

      setScrollOffset(targetScroll);
      onChange(values[clampedIndex]);
    }
  };

  // Touch events pro mobilní zařízení
  const handleTouchStart = (e: React.TouchEvent) => {
    setIsDragging(true);
    setStartY(e.touches[0].clientY);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || !containerRef.current) return;

    const deltaY = e.touches[0].clientY - startY;
    const newScroll = scrollOffset - deltaY;
    containerRef.current.scrollTop = newScroll;
    setStartY(e.touches[0].clientY);
    setScrollOffset(newScroll);
  };

  const handleTouchEnd = () => {
    handleMouseUp();
  };

  return (
    <Box sx={{ textAlign: 'center' }}>
      {label && (
        <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
          {label}
        </Typography>
      )}

      <Box
        sx={{
          position: 'relative',
          height: ITEM_HEIGHT * VISIBLE_ITEMS,
          overflow: 'hidden',
          borderRadius: 2,
          bgcolor: 'background.paper',
          border: `1px solid ${theme.palette.divider}`,
        }}
      >
        {/* Highlight box pro vybranou hodnotu */}
        <Box
          sx={{
            position: 'absolute',
            top: ITEM_HEIGHT * Math.floor(VISIBLE_ITEMS / 2),
            left: 0,
            right: 0,
            height: ITEM_HEIGHT,
            bgcolor: theme.palette.primary.main,
            opacity: 0.15,
            pointerEvents: 'none',
            zIndex: 1,
            borderRadius: 1,
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
            overflowX: 'hidden',
            scrollbarWidth: 'none', // Firefox
            '&::-webkit-scrollbar': {
              display: 'none', // Chrome, Safari
            },
            cursor: isDragging ? 'grabbing' : 'grab',
            userSelect: 'none',
          }}
        >
          {/* Padding na začátku */}
          <Box sx={{ height: ITEM_HEIGHT * Math.floor(VISIBLE_ITEMS / 2) }} />

          {/* Všechny hodnoty */}
          {values.map((val, index) => {
            const distance = Math.abs(index - currentIndex);
            const opacity = Math.max(0.3, 1 - distance * 0.25);
            const scale = Math.max(0.8, 1 - distance * 0.1);

            return (
              <Box
                key={val}
                sx={{
                  height: ITEM_HEIGHT,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity,
                  transform: `scale(${scale})`,
                  transition: isDragging ? 'none' : 'all 0.2s ease',
                }}
              >
                <Typography
                  variant="h5"
                  sx={{
                    fontWeight: val === value ? 600 : 400,
                    color: val === value ? 'primary.main' : 'text.primary',
                  }}
                >
                  {val.toString().padStart(2, '0')}
                  {suffix}
                </Typography>
              </Box>
            );
          })}

          {/* Padding na konci */}
          <Box sx={{ height: ITEM_HEIGHT * Math.floor(VISIBLE_ITEMS / 2) }} />
        </Box>
      </Box>
    </Box>
  );
}
