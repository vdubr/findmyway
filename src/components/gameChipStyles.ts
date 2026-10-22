// Styly štítků s údaji o hře (karta i detail hry).
// Plné štítky s tmavým textem – každý význam má vlastní barvu, aby se „od tebe“ a „trasa“ nepletly.

const chipSx = (bg: string, fg: string) => ({
  bgcolor: bg,
  color: fg,
  '& .MuiChip-icon': { color: fg },
});

export const difficultyChipSx = chipSx('warning.light', 'warning.dark');
export const awayChipSx = chipSx('info.light', 'info.dark');
export const routeChipSx = chipSx('#E4F3E8', 'text.primary');
export const tagChipSx = chipSx('#FFE3D3', '#8A3A12');
