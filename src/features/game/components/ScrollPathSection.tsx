import { Box } from '@mui/material';
import { useEffect, useRef } from 'react';

// Serpentinova cesta — zleva doprava a zpet
const RIBBON_PATH = [
  'M 50,50',
  'C 50,150 350,150 350,250',
  'C 350,350 50,350 50,450',
  'C 50,550 350,550 350,650',
  'C 350,750 50,750 50,850',
  'C 50,950 350,950 350,1050',
  'C 350,1150 50,1150 50,1200',
].join(' ');

export default function ScrollPathSection() {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const pathRef = useRef<SVGPathElement>(null);
  const dotRef = useRef<SVGCircleElement>(null);
  const trailRef = useRef<SVGPathElement>(null);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const updatePosition = () => {
      const el = scrollContainerRef.current;
      const path = pathRef.current;
      const dot = dotRef.current;
      const trail = trailRef.current;
      if (!el || !path || !dot || !trail) return;

      const rect = el.getBoundingClientRect();
      const windowH = window.innerHeight;
      // Kolik z kontejneru uz proslo viewportem
      const scrolled = -rect.top;
      const scrollable = rect.height - windowH;
      if (scrollable <= 0) return;

      const progress = Math.max(0, Math.min(1, scrolled / scrollable));
      const totalLength = path.getTotalLength();
      const currentLength = progress * totalLength;
      const point = path.getPointAtLength(currentLength);

      dot.setAttribute('cx', String(point.x));
      dot.setAttribute('cy', String(point.y));
      trail.style.strokeDasharray = `${currentLength} ${totalLength}`;
    };

    const handleScroll = () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(updatePosition);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    // Inicializace pri prvnim renderovani
    updatePosition();

    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <Box
      ref={scrollContainerRef}
      sx={{
        height: '600vh',
        position: 'relative',
      }}
    >
      <Box
        sx={{
          position: 'sticky',
          top: {
            xs: 'calc(56px + env(safe-area-inset-top))',
            sm: 'calc(64px + env(safe-area-inset-top))',
          },
          height: {
            xs: 'calc(100vh - 56px - env(safe-area-inset-top))',
            sm: 'calc(100vh - 64px - env(safe-area-inset-top))',
          },
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
        }}
      >
        <svg
          viewBox="0 0 400 1250"
          preserveAspectRatio="xMidYMid meet"
          style={{
            width: '100%',
            height: '100%',
            maxWidth: 500,
          }}
        >
          {/* Stezka — podkladova (svetla) */}
          <path
            ref={pathRef}
            d={RIBBON_PATH}
            fill="none"
            stroke="#B7E4C7"
            strokeWidth={22}
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Stezka — projeta cast (vyrazna zelena) */}
          <path
            ref={trailRef}
            d={RIBBON_PATH}
            fill="none"
            stroke="#2D6A4F"
            strokeWidth={22}
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{
              strokeDasharray: '0 99999',
            }}
          />

          {/* Tecka na stezce */}
          <circle
            ref={dotRef}
            cx={50}
            cy={50}
            r={16}
            fill="#E9C46A"
            stroke="#1B4332"
            strokeWidth={3}
            style={{ willChange: 'transform' }}
          />
        </svg>
      </Box>
    </Box>
  );
}
