import hotkeys from 'hotkeys-js';
import { useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAppStore } from '@/lib/store';

// Define available shortcuts
export interface Shortcut {
  key: string;
  description: string;
  action: () => void;
  category: 'navigation' | 'actions' | 'ui' | 'forms';
  scope?: string;
}

// Keyboard shortcut definitions
export const createShortcuts = (router: any, store: any): Shortcut[] => [
  // Navigation shortcuts
  {
    key: 'ctrl+h,cmd+h',
    description: 'Go to Dashboard',
    action: () => router.push('/'),
    category: 'navigation',
  },
  {
    key: 'ctrl+t,cmd+t',
    description: 'Go to Transactions',
    action: () => router.push('/transactions'),
    category: 'navigation',
  },
  {
    key: 'ctrl+a,cmd+a',
    description: 'Go to Accounts',
    action: () => router.push('/accounts'),
    category: 'navigation',
  },
  {
    key: 'ctrl+b,cmd+b',
    description: 'Go to Budgets',
    action: () => router.push('/budgets'),
    category: 'navigation',
  },
  {
    key: 'ctrl+g,cmd+g',
    description: 'Go to Goals',
    action: () => router.push('/goals'),
    category: 'navigation',
  },
  {
    key: 'ctrl+r,cmd+r',
    description: 'Go to Reports',
    action: () => router.push('/reports'),
    category: 'navigation',
  },
  {
    key: 'ctrl+comma,cmd+comma',
    description: 'Go to Settings',
    action: () => router.push('/settings'),
    category: 'navigation',
  },

  // Action shortcuts
  {
    key: 'ctrl+n,cmd+n',
    description: 'New Transaction',
    action: () => router.push('/transactions/add'),
    category: 'actions',
  },
  {
    key: 'ctrl+shift+a,cmd+shift+a',
    description: 'New Account',
    action: () => store.openModal('account-form'),
    category: 'actions',
  },
  {
    key: 'ctrl+shift+b,cmd+shift+b',
    description: 'New Budget',
    action: () => store.openModal('budget-form'),
    category: 'actions',
  },
  {
    key: 'ctrl+shift+g,cmd+shift+g',
    description: 'New Goal',
    action: () => store.openModal('goal-form'),
    category: 'actions',
  },
  {
    key: 'ctrl+shift+c,cmd+shift+c',
    description: 'New Category',
    action: () => store.openModal('category-form'),
    category: 'actions',
  },

  // UI shortcuts
  {
    key: 'ctrl+\\,cmd+\\',
    description: 'Toggle Sidebar',
    action: () => store.toggleSidebar(),
    category: 'ui',
  },
  {
    key: 'ctrl+k,cmd+k',
    description: 'Search',
    action: () => store.openModal('search'),
    category: 'ui',
  },
  {
    key: 'ctrl+shift+n,cmd+shift+n',
    description: 'Toggle Notifications',
    action: () => store.openModal('notifications'),
    category: 'ui',
  },
  {
    key: 'ctrl+shift+h,cmd+shift+h',
    description: 'Show Keyboard Shortcuts',
    action: () => store.openModal('shortcuts'),
    category: 'ui',
  },
  {
    key: 'ctrl+shift+t,cmd+shift+t',
    description: 'Toggle Tutorial',
    action: () => store.toggleTutorialOverlay(),
    category: 'ui',
  },

  // Form shortcuts (context-dependent)
  {
    key: 'ctrl+s,cmd+s',
    description: 'Save Form',
    action: () => {
      // This will be handled by individual forms
      const saveButton = document.querySelector('button[type="submit"]') as HTMLButtonElement;
      if (saveButton && !saveButton.disabled) {
        saveButton.click();
      }
    },
    category: 'forms',
    scope: 'form',
  },
  {
    key: 'escape',
    description: 'Cancel/Close',
    action: () => {
      const { activeModal, closeModal } = store;
      if (activeModal) {
        closeModal();
      } else {
        router.back();
      }
    },
    category: 'forms',
  },

  // Quick actions
  {
    key: 'ctrl+1,cmd+1',
    description: 'Quick Income',
    action: () => store.openModal('quick-income'),
    category: 'actions',
  },
  {
    key: 'ctrl+2,cmd+2',
    description: 'Quick Expense',
    action: () => store.openModal('quick-expense'),
    category: 'actions',
  },
  {
    key: 'ctrl+3,cmd+3',
    description: 'Quick Transfer',
    action: () => router.push('/transfers'),
    category: 'actions',
  },
];

// Custom hook for managing keyboard shortcuts
export const useKeyboardShortcuts = () => {
  const router = useRouter();
  const store = useAppStore();

  useEffect(() => {
    // Create shortcuts with current router and store
    const shortcuts = createShortcuts(router, store);

    // Register all shortcuts
    shortcuts.forEach((shortcut) => {
      hotkeys(shortcut.key, { scope: shortcut.scope || 'all' }, (event) => {
        event.preventDefault();
        shortcut.action();
      });
    });

    // Set default scope
    hotkeys.setScope('all');

    // Cleanup on unmount
    return () => {
      shortcuts.forEach((shortcut) => {
        hotkeys.unbind(shortcut.key, shortcut.scope || 'all');
      });
    };
  }, [router, store]);

  // Function to change scope (useful for forms)
  const setScope = useCallback((scope: string) => {
    hotkeys.setScope(scope);
  }, []);

  // Function to get all shortcuts for help modal
  const getShortcuts = useCallback(() => {
    return createShortcuts(router, store);
  }, [router, store]);

  return {
    setScope,
    getShortcuts,
  };
};

// Form-specific shortcut hook
export const useFormShortcuts = (onSave?: () => void, onCancel?: () => void) => {
  useEffect(() => {
    // Set form scope
    hotkeys.setScope('form');

    // Custom form shortcuts
    if (onSave) {
      hotkeys('ctrl+s,cmd+s', 'form', (event) => {
        event.preventDefault();
        onSave();
      });
    }

    if (onCancel) {
      hotkeys('escape', 'form', (event) => {
        event.preventDefault();
        onCancel();
      });
    }

    // Return to all scope on cleanup
    return () => {
      hotkeys.setScope('all');
      if (onSave) {
        hotkeys.unbind('ctrl+s,cmd+s', 'form');
      }
      if (onCancel) {
        hotkeys.unbind('escape', 'form');
      }
    };
  }, [onSave, onCancel]);
};

// Search shortcut hook
export const useSearchShortcuts = (onSearch: (query: string) => void) => {
  useEffect(() => {
    hotkeys('ctrl+f,cmd+f', (event) => {
      event.preventDefault();
      const searchInput = document.querySelector('input[type="search"]') as HTMLInputElement;
      if (searchInput) {
        searchInput.focus();
      }
    });

    hotkeys('ctrl+shift+f,cmd+shift+f', (event) => {
      event.preventDefault();
      // Advanced search
      useAppStore.getState().openModal('advanced-search');
    });

    return () => {
      hotkeys.unbind('ctrl+f,cmd+f');
      hotkeys.unbind('ctrl+shift+f,cmd+shift+f');
    };
  }, [onSearch]);
};

// Table navigation shortcuts
export const useTableShortcuts = (
  onNext?: () => void,
  onPrevious?: () => void,
  onFirst?: () => void,
  onLast?: () => void
) => {
  useEffect(() => {
    if (onNext) {
      hotkeys('ctrl+right,cmd+right', (event) => {
        event.preventDefault();
        onNext();
      });
    }

    if (onPrevious) {
      hotkeys('ctrl+left,cmd+left', (event) => {
        event.preventDefault();
        onPrevious();
      });
    }

    if (onFirst) {
      hotkeys('ctrl+home,cmd+home', (event) => {
        event.preventDefault();
        onFirst();
      });
    }

    if (onLast) {
      hotkeys('ctrl+end,cmd+end', (event) => {
        event.preventDefault();
        onLast();
      });
    }

    return () => {
      hotkeys.unbind('ctrl+right,cmd+right');
      hotkeys.unbind('ctrl+left,cmd+left');
      hotkeys.unbind('ctrl+home,cmd+home');
      hotkeys.unbind('ctrl+end,cmd+end');
    };
  }, [onNext, onPrevious, onFirst, onLast]);
};

// Utility functions
export const getShortcutDisplay = (key: string): string => {
  const isMac = typeof navigator !== 'undefined' && navigator.platform.toUpperCase().indexOf('MAC') >= 0;
  
  return key
    .split(',')[isMac ? 1 : 0] || key.split(',')[0]
    .replace('ctrl', isMac ? '⌘' : 'Ctrl')
    .replace('cmd', '⌘')
    .replace('shift', isMac ? '⇧' : 'Shift')
    .replace('alt', isMac ? '⌥' : 'Alt')
    .replace('meta', '⌘')
    .replace('+', isMac ? '' : '+');
};

export const formatShortcutKey = (key: string): string => {
  const parts = key.split('+');
  return parts
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' + ');
};

// Shortcut categories for help display
export const shortcutCategories = {
  navigation: 'Navigation',
  actions: 'Actions',
  ui: 'User Interface',
  forms: 'Forms',
} as const;

// Default hotkeys configuration
export const hotkeyConfig = {
  keyup: false,
  keydown: true,
  splitKey: '+',
  scope: 'all',
};

// Initialize hotkeys with configuration
hotkeys.filter = (event) => {
  const target = event.target as HTMLElement;
  const tagName = target.tagName;
  
  // Allow shortcuts in input fields for specific keys
  if (tagName === 'INPUT' || tagName === 'TEXTAREA' || target.isContentEditable) {
    const allowedKeys = ['escape', 'ctrl+s', 'cmd+s', 'ctrl+z', 'cmd+z'];
    const pressedKey = hotkeys.getPressedKeyCodes().join('+');
    return allowedKeys.some(key => pressedKey.includes(key));
  }
  
  return true;
};

export default hotkeys;
