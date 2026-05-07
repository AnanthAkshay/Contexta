import { useEffect } from 'react';
 
export function useColorScheme(): 'light' {
  useEffect(() => {
    // Lock the document color-scheme so the browser never flashes dark styles.
    document.documentElement.style.colorScheme = 'light';
 
    // Also ensure a white background is painted immediately on load.
    document.documentElement.style.backgroundColor = '#ffffff';
  }, []);
 
  return 'light';
}