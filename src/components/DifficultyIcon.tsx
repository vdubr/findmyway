// Ikona obtiznosti – 5 sloupcu (sloupcovy graf), vyplnene podle hodnoty 1-5
import { SvgIcon } from '@mui/material';
import type { SVGProps } from 'react';

export default function DifficultyIcon({
  value,
  ...props
}: SVGProps<SVGSVGElement> & { value: number }) {
  const bars = [
    { x: 1, height: 5, y: 15 },
    { x: 5, height: 8, y: 12 },
    { x: 9, height: 11, y: 9 },
    { x: 13, height: 14, y: 6 },
    { x: 17, height: 17, y: 3 },
  ];
  return (
    <SvgIcon viewBox="0 0 20 20" fontSize="small" {...(props as object)}>
      {bars.map((bar, i) => (
        <rect
          key={i}
          x={bar.x}
          y={bar.y}
          width={3}
          height={bar.height}
          rx={0.5}
          opacity={i < value ? 1 : 0.2}
        />
      ))}
    </SvgIcon>
  );
}
