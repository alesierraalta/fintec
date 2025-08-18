import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

// Types
interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
}

interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  timestamp: number;
  read: boolean;
}

interface AppSettings {
  theme: 'light' | 'dark' | 'system';
  language: 'en' | 'es';
  currency: string;
  dateFormat: 'DD/MM/YYYY' | 'MM/DD/YYYY' | 'YYYY-MM-DD';
  numberFormat: 'US' | 'EU';
  timezone: string;
  notifications: {
    push: boolean;
    email: boolean;
    budgetAlerts: boolean;
    goalReminders: boolean;
    transactionAlerts: boolean;
  };
}

interface AppState {
  // Authentication
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  // UI State
  sidebarOpen: boolean;
  isMobile: boolean;
  activeModal: string | null;
  
  // Notifications
  notifications: Notification[];
  unreadCount: number;

  // Settings
  settings: AppSettings;

  // Currency & Exchange Rates
  selectedCurrency: string;
  exchangeRates: Record<string, number>;
  lastRateUpdate: number | null;

  // Quick Actions
  quickActionsVisible: boolean;
  recentTransactions: any[];
  
  // Tutorial/Onboarding
  tutorialCompleted: boolean;
  currentTutorialStep: number;
  showTutorialOverlay: boolean;
}

interface AppActions {
  // Authentication
  setUser: (user: User | null) => void;
  setAuthenticated: (authenticated: boolean) => void;
  setLoading: (loading: boolean) => void;
  logout: () => void;

  // UI Actions
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  setIsMobile: (mobile: boolean) => void;
  openModal: (modalId: string) => void;
  closeModal: () => void;

  // Notifications
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp'>) => void;
  markNotificationAsRead: (id: string) => void;
  markAllNotificationsAsRead: () => void;
  removeNotification: (id: string) => void;
  clearAllNotifications: () => void;

  // Settings
  updateSettings: (settings: Partial<AppSettings>) => void;
  resetSettings: () => void;

  // Currency & Exchange Rates
  setSelectedCurrency: (currency: string) => void;
  updateExchangeRates: (rates: Record<string, number>) => void;

  // Quick Actions
  toggleQuickActions: () => void;
  updateRecentTransactions: (transactions: any[]) => void;

  // Tutorial/Onboarding
  setTutorialCompleted: (completed: boolean) => void;
  setCurrentTutorialStep: (step: number) => void;
  toggleTutorialOverlay: () => void;
  nextTutorialStep: () => void;
  previousTutorialStep: () => void;
}

// Default settings
const defaultSettings: AppSettings = {
  theme: 'system',
  language: 'es',
  currency: 'USD',
  dateFormat: 'DD/MM/YYYY',
  numberFormat: 'EU',
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  notifications: {
    push: true,
    email: true,
    budgetAlerts: true,
    goalReminders: true,
    transactionAlerts: true,
  },
};

// Main store
export const useAppStore = create<AppState & AppActions>()(
  devtools(
    persist(
      immer((set, get) => ({
        // Initial State
        user: null,
        isAuthenticated: false,
        isLoading: false,
        sidebarOpen: false,
        isMobile: false,
        activeModal: null,
        notifications: [],
        unreadCount: 0,
        settings: defaultSettings,
        selectedCurrency: 'USD',
        exchangeRates: {},
        lastRateUpdate: null,
        quickActionsVisible: true,
        recentTransactions: [],
        tutorialCompleted: false,
        currentTutorialStep: 0,
        showTutorialOverlay: false,

        // Authentication Actions
        setUser: (user) =>
          set((state) => {
            state.user = user;
            state.isAuthenticated = !!user;
          }),

        setAuthenticated: (authenticated) =>
          set((state) => {
            state.isAuthenticated = authenticated;
            if (!authenticated) {
              state.user = null;
            }
          }),

        setLoading: (loading) =>
          set((state) => {
            state.isLoading = loading;
          }),

        logout: () =>
          set((state) => {
            state.user = null;
            state.isAuthenticated = false;
            state.notifications = [];
            state.unreadCount = 0;
            state.recentTransactions = [];
            // Keep settings and tutorial state
          }),

        // UI Actions
        toggleSidebar: () =>
          set((state) => {
            state.sidebarOpen = !state.sidebarOpen;
          }),

        setSidebarOpen: (open) =>
          set((state) => {
            state.sidebarOpen = open;
          }),

        setIsMobile: (mobile) =>
          set((state) => {
            state.isMobile = mobile;
            if (mobile) {
              state.sidebarOpen = false;
            }
          }),

        openModal: (modalId) =>
          set((state) => {
            state.activeModal = modalId;
          }),

        closeModal: () =>
          set((state) => {
            state.activeModal = null;
          }),

        // Notification Actions
        addNotification: (notification) =>
          set((state) => {
            const newNotification: Notification = {
              ...notification,
              id: crypto.randomUUID(),
              timestamp: Date.now(),
              read: false,
            };
            state.notifications.unshift(newNotification);
            state.unreadCount += 1;
            
            // Keep only last 50 notifications
            if (state.notifications.length > 50) {
              state.notifications = state.notifications.slice(0, 50);
            }
          }),

        markNotificationAsRead: (id) =>
          set((state) => {
            const notification = state.notifications.find((n) => n.id === id);
            if (notification && !notification.read) {
              notification.read = true;
              state.unreadCount = Math.max(0, state.unreadCount - 1);
            }
          }),

        markAllNotificationsAsRead: () =>
          set((state) => {
            state.notifications.forEach((notification) => {
              notification.read = true;
            });
            state.unreadCount = 0;
          }),

        removeNotification: (id) =>
          set((state) => {
            const index = state.notifications.findIndex((n) => n.id === id);
            if (index !== -1) {
              const notification = state.notifications[index];
              if (!notification.read) {
                state.unreadCount = Math.max(0, state.unreadCount - 1);
              }
              state.notifications.splice(index, 1);
            }
          }),

        clearAllNotifications: () =>
          set((state) => {
            state.notifications = [];
            state.unreadCount = 0;
          }),

        // Settings Actions
        updateSettings: (newSettings) =>
          set((state) => {
            state.settings = { ...state.settings, ...newSettings };
          }),

        resetSettings: () =>
          set((state) => {
            state.settings = defaultSettings;
          }),

        // Currency Actions
        setSelectedCurrency: (currency) =>
          set((state) => {
            state.selectedCurrency = currency;
            state.settings.currency = currency;
          }),

        updateExchangeRates: (rates) =>
          set((state) => {
            state.exchangeRates = rates;
            state.lastRateUpdate = Date.now();
          }),

        // Quick Actions
        toggleQuickActions: () =>
          set((state) => {
            state.quickActionsVisible = !state.quickActionsVisible;
          }),

        updateRecentTransactions: (transactions) =>
          set((state) => {
            state.recentTransactions = transactions.slice(0, 10); // Keep only last 10
          }),

        // Tutorial Actions
        setTutorialCompleted: (completed) =>
          set((state) => {
            state.tutorialCompleted = completed;
            if (completed) {
              state.showTutorialOverlay = false;
            }
          }),

        setCurrentTutorialStep: (step) =>
          set((state) => {
            state.currentTutorialStep = step;
          }),

        toggleTutorialOverlay: () =>
          set((state) => {
            state.showTutorialOverlay = !state.showTutorialOverlay;
          }),

        nextTutorialStep: () =>
          set((state) => {
            state.currentTutorialStep += 1;
          }),

        previousTutorialStep: () =>
          set((state) => {
            if (state.currentTutorialStep > 0) {
              state.currentTutorialStep -= 1;
            }
          }),
      })),
      {
        name: 'fintek-app-store',
        partialize: (state) => ({
          user: state.user,
          isAuthenticated: state.isAuthenticated,
          settings: state.settings,
          selectedCurrency: state.selectedCurrency,
          tutorialCompleted: state.tutorialCompleted,
          currentTutorialStep: state.currentTutorialStep,
          quickActionsVisible: state.quickActionsVisible,
        }),
      }
    ),
    {
      name: 'fintek-app-store',
    }
  )
);

// Selectors (for better performance)
export const useAuth = () => useAppStore((state) => ({
  user: state.user,
  isAuthenticated: state.isAuthenticated,
  isLoading: state.isLoading,
  setUser: state.setUser,
  setAuthenticated: state.setAuthenticated,
  setLoading: state.setLoading,
  logout: state.logout,
}));

export const useUI = () => useAppStore((state) => ({
  sidebarOpen: state.sidebarOpen,
  isMobile: state.isMobile,
  activeModal: state.activeModal,
  toggleSidebar: state.toggleSidebar,
  setSidebarOpen: state.setSidebarOpen,
  setIsMobile: state.setIsMobile,
  openModal: state.openModal,
  closeModal: state.closeModal,
}));

export const useNotifications = () => useAppStore((state) => ({
  notifications: state.notifications,
  unreadCount: state.unreadCount,
  addNotification: state.addNotification,
  markNotificationAsRead: state.markNotificationAsRead,
  markAllNotificationsAsRead: state.markAllNotificationsAsRead,
  removeNotification: state.removeNotification,
  clearAllNotifications: state.clearAllNotifications,
}));

export const useSettings = () => useAppStore((state) => ({
  settings: state.settings,
  updateSettings: state.updateSettings,
  resetSettings: state.resetSettings,
}));

export const useCurrency = () => useAppStore((state) => ({
  selectedCurrency: state.selectedCurrency,
  exchangeRates: state.exchangeRates,
  lastRateUpdate: state.lastRateUpdate,
  setSelectedCurrency: state.setSelectedCurrency,
  updateExchangeRates: state.updateExchangeRates,
}));

export const useTutorial = () => useAppStore((state) => ({
  tutorialCompleted: state.tutorialCompleted,
  currentTutorialStep: state.currentTutorialStep,
  showTutorialOverlay: state.showTutorialOverlay,
  setTutorialCompleted: state.setTutorialCompleted,
  setCurrentTutorialStep: state.setCurrentTutorialStep,
  toggleTutorialOverlay: state.toggleTutorialOverlay,
  nextTutorialStep: state.nextTutorialStep,
  previousTutorialStep: state.previousTutorialStep,
}));

// Utility hooks
export const useIsAuthenticated = () => useAppStore((state) => state.isAuthenticated);
export const useCurrentUser = () => useAppStore((state) => state.user);
export const useTheme = () => useAppStore((state) => state.settings.theme);
export const useLanguage = () => useAppStore((state) => state.settings.language);
