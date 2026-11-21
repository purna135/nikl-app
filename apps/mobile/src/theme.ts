import { useColorScheme } from 'react-native';
import { fontSize, palette, radius, space, touchTarget, type Palette } from '@nikl/tokens';

export { fontSize, radius, space, touchTarget };
export type { Palette };

/** The Nikl palette for the phone's current light/dark setting. */
export function useNiklTheme(): Palette {
  return useColorScheme() === 'dark' ? palette.dark : palette.light;
}
