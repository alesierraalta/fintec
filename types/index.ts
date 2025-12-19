// Re-export all domain types
export * from './domain';

// Re-export all rates types (exchange rates, crypto prices)
export * from './rates';

// Additional utility types
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type Nullable<T> = T | null;

export type ApiResponse<T> = {
  data: T;
  success: boolean;
  error?: string;
  timestamp: string;
};

export type AsyncResult<T, E = Error> = Promise<
  | { success: true; data: T }
  | { success: false; error: E }
>;

// Form validation types
export type ValidationError = {
  field: string;
  message: string;
};

export type FormState<T> = {
  data: T;
  errors: ValidationError[];
  isValid: boolean;
  isDirty: boolean;
  isSubmitting: boolean;
};

// UI component types
export type ButtonVariant = 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'ghost' | 'outline';
export type ButtonSize = 'sm' | 'md' | 'lg';

export type AlertType = 'info' | 'success' | 'warning' | 'error';

export type ModalSize = 'sm' | 'md' | 'lg' | 'xl';

// Chart types
export type ChartType = 'line' | 'bar' | 'pie' | 'area' | 'donut';

export interface ChartDataPoint {
  label: string;
  value: number;
  color?: string;
}

export interface TimeSeriesDataPoint {
  date: string;
  value: number;
  category?: string;
}
