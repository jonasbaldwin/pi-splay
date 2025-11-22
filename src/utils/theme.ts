export type ThemePreference = 'light' | 'dark' | 'system';

const THEME_KEY = 'pi-splay-theme';
let systemPreferenceListener: ((e: MediaQueryListEvent) => void) | null = null;
let mediaQuery: MediaQueryList | null = null;

export function getThemePreference(): ThemePreference {
  try {
    const stored = localStorage.getItem(THEME_KEY);
    if (stored === 'light' || stored === 'dark' || stored === 'system') {
      return stored;
    }
  } catch (e) {
    // Ignore localStorage errors
  }
  return 'system'; // Default to system preference
}

function setupSystemPreferenceListener(): void {
  // Remove existing listener if any
  if (systemPreferenceListener && mediaQuery) {
    if (mediaQuery.removeEventListener) {
      mediaQuery.removeEventListener('change', systemPreferenceListener);
    } else if (mediaQuery.removeListener) {
      mediaQuery.removeListener(systemPreferenceListener);
    }
  }
  
  // Set up new listener
  mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  systemPreferenceListener = (e: MediaQueryListEvent) => {
    const currentPreference = getThemePreference();
    if (currentPreference === 'system') {
      if (e.matches) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
  };
  
  // Modern browsers
  if (mediaQuery.addEventListener) {
    mediaQuery.addEventListener('change', systemPreferenceListener);
  } else if (mediaQuery.addListener) {
    // Fallback for older browsers
    mediaQuery.addListener(systemPreferenceListener);
  }
}

export function setThemePreference(preference: ThemePreference): void {
  try {
    localStorage.setItem(THEME_KEY, preference);
    applyTheme(preference);
    
    // Update system preference listener
    if (preference === 'system') {
      setupSystemPreferenceListener();
    } else {
      // Remove listener if not using system preference
      if (systemPreferenceListener && mediaQuery) {
        if (mediaQuery.removeEventListener) {
          mediaQuery.removeEventListener('change', systemPreferenceListener);
        } else if (mediaQuery.removeListener) {
          mediaQuery.removeListener(systemPreferenceListener);
        }
      }
      systemPreferenceListener = null;
      mediaQuery = null;
    }
  } catch (e) {
    console.error('Failed to save theme preference:', e);
  }
}

export function applyTheme(preference: ThemePreference): void {
  const html = document.documentElement;
  
  if (preference === 'system') {
    // Use system preference
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (prefersDark) {
      html.classList.add('dark');
    } else {
      html.classList.remove('dark');
    }
  } else if (preference === 'dark') {
    html.classList.add('dark');
  } else {
    html.classList.remove('dark');
  }
}

export function initializeTheme(): void {
  const preference = getThemePreference();
  applyTheme(preference);
  
  // Listen for system preference changes when using 'system' mode
  if (preference === 'system') {
    setupSystemPreferenceListener();
  }
}

