export type ThemeId = 'editorial-dark' | 'light-minimal' | 'bold-trattoria'

export interface ThemeOption {
  id: ThemeId
  label: string
  description: string
}

export const THEMES: ThemeOption[] = [
  {
    id: 'editorial-dark',
    label: 'Editorial Dark',
    description: 'Warm off-white, near-black ink and antique gold — the classic PBB look.',
  },
  {
    id: 'light-minimal',
    label: 'Light Minimal',
    description: 'Bright, airy whites with a restrained muted-gold accent. Clean and modern.',
  },
  {
    id: 'bold-trattoria',
    label: 'Bold Trattoria',
    description: 'Warm cream, deep cocoa and tomato red. Appetite-driven, trattoria energy.',
  },
]
