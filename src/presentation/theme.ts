// Acoustic Ember tokens, taken from DESIGN.md.
export const colors = {
  canvas: '#0F1115',
  surface: '#161920',
  surfaceElevated: '#1F2430',
  stroke: '#2A303C',
  primary: '#F59E0B',
  primaryTint: 'rgba(245, 158, 11, 0.15)',
  onPrimary: '#0F1115',
  secondary: '#6366F1',
  secondaryTint: 'rgba(99, 102, 241, 0.18)',
  secondaryText: '#C0C1FF',
  tertiary: '#10B981',
  error: '#FFB4AB',
  textHigh: '#FFFFFF',
  textSupporting: '#94A3B8',
  textMuted: '#64748B',
  backdrop: 'rgba(0, 0, 0, 0.6)',
} as const;

// Keys match the export names of @expo-google-fonts so they can be registered as-is in useFonts.
export const fonts = {
  headlineBold: 'PlusJakartaSans_700Bold',
  headlineSemiBold: 'PlusJakartaSans_600SemiBold',
  body: 'Manrope_400Regular',
  labelMedium: 'Manrope_500Medium',
  labelSemiBold: 'Manrope_600SemiBold',
  labelBold: 'Manrope_700Bold',
} as const;

export const radii = { card: 24, sheet: 32, pill: 9999 } as const;

export const spacing = { xs: 6, sm: 8, md: 16, lg: 24, xl: 32 } as const;
