export const colors = {
  pearl: '#FBF9F5',
  frost: 'rgba(255,255,255,0.76)',
  crystal: 'rgba(255,255,255,0.46)',
  metal: '#25242A',
  ink: '#17161B',
  muted: '#6E6A72',
  champagne: '#B98A43',
  champagneSoft: '#E8D4AE',
  violet: '#7D64D8',
  cyan: '#4EAAB4',
  live: '#EE3C83',
  success: '#2E9C7E',
  warning: '#B67A2F',
  danger: '#C94D5F',
  void: '#0D0C12',
  line: 'rgba(77,66,54,0.12)'
} as const;

export const shadows = {
  pearl: {
    shadowColor: '#7B674C',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.13,
    shadowRadius: 24,
    elevation: 8
  },
  metal: {
    shadowColor: '#16131A',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 18,
    elevation: 10
  }
} as const;

export const radii = { small: 14, medium: 22, large: 32, pill: 999 } as const;
