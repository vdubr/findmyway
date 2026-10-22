// Styl MUI Dialogu, který se na mobilu chová jako bottom sheet (ovládání v dosahu palce)
// a na větších obrazovkách zůstává klasickým dialogem uprostřed.
export const bottomSheetDialogSx = {
  '& .MuiDialog-container': { alignItems: { xs: 'flex-end', sm: 'center' } },
  '& .MuiDialog-paper': {
    m: { xs: 0, sm: 4 },
    width: { xs: '100%', sm: undefined },
    maxWidth: { xs: '100%', sm: 600 },
    maxHeight: { xs: '92dvh', sm: 'calc(100% - 64px)' },
    borderRadius: { xs: '24px 24px 0 0', sm: '24px' },
  },
} as const;
