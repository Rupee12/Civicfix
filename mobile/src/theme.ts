export const colors = {
  background: '#F3F6FC',
  surface: '#FFFFFF',
  navy: '#0C1730',
  navyLight: '#18346E',
  blue: '#2457FF',
  blueDark: '#1439C9',
  blueTint: '#EDF2FF',
  muted: '#64728D',
  line: '#E4EAF5',
  teal: '#14B8A6',
  tealTint: '#E5FAF7',
  amber: '#F59E0B',
  amberTint: '#FFF5DF',
  danger: '#EF4444',
  dangerTint: '#FFF0F0',
} as const;

export const elevations = {
  card: {
    shadowColor: colors.navy,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.07,
    shadowRadius: 16,
    elevation: 2,
  },
} as const;
