import {
  dragAndDrop,
  type DNDPlugin,
  type ParentRecord,
  type NodeRecord,
  type DragState,
  animations,
  sort,
} from '@formkit/drag-and-drop';
import { motion } from 'framer-motion';
import React from 'react';

// Types for financial app drag and drop
export interface DraggableTransaction {
  id: string;
  type: 'INCOME' | 'EXPENSE' | 'TRANSFER_OUT';
  amount: number;
  description: string;
  categoryId: string;
  accountId: string;
  date: string;
  tags?: string[];
}

export interface DraggableCategory {
  id: string;
  name: string;
  type: 'INCOME' | 'EXPENSE' | 'TRANSFER_OUT';
  color: string;
  icon: string;
  parentId?: string;
  children?: DraggableCategory[];
}

export interface DraggableAccount {
  id: string;
  name: string;
  type: 'CHECKING' | 'SAVINGS' | 'CREDIT' | 'CASH' | 'INVESTMENT';
  balance: number;
  color?: string;
  icon?: string;
}

export interface DragDropConfig<T = any> {
  group?: string;
  sort?: boolean;
  // multiDrag?: boolean;
  animations?: boolean;
  disabled?: boolean;
  threshold?: {
    horizontal?: number;
    vertical?: number;
  };
  dragHandle?: string;
  dragImage?: {
    xOffset?: number;
    yOffset?: number;
  };
  onDragStart?: (data: DragState<T>) => void;
  onDragEnd?: (data: DragState<T>) => void;
  onDrop?: (data: any) => void;
  onSort?: (data: { parent: ParentRecord<T>; previousValues: T[] }) => void;
  plugins?: DNDPlugin[];
}

// Default configuration for financial app
export const defaultDragDropConfig: DragDropConfig = {
  sort: true,
  // multiDrag: false,
  animations: true,
  disabled: false,
  threshold: {
    horizontal: 5,
    vertical: 5,
  },
  dragImage: {
    xOffset: 15,
    yOffset: 15,
  },
  plugins: [animations()],
};

// Transaction-specific drag and drop
export const createTransactionDragDrop = (
  parentElement: HTMLElement,
  config: Partial<DragDropConfig<DraggableTransaction>> = {}
) => {
  const finalConfig: DragDropConfig<DraggableTransaction> = {
    ...defaultDragDropConfig,
    ...config,
    plugins: [
      animations({
        duration: 300,
      }),
      // sort(),
      // ...(config.multiDrag ? [multiDrag(), selections()] : []),
      ...(config.plugins || []),
    ],
  };

  return dragAndDrop({
    parent: parentElement,
    getValues: (parent) => {
      return Array.from(parent.children).map((child, index) => {
        const element = child as HTMLElement;
        return {
          id: element.dataset.transactionId || `transaction-${index}`,
          type: element.dataset.transactionType as 'INCOME' | 'EXPENSE' | 'TRANSFER_OUT',
          amount: parseFloat(element.dataset.amount || '0'),
          description: element.dataset.description || '',
          categoryId: element.dataset.categoryId || '',
          accountId: element.dataset.accountId || '',
          date: element.dataset.date || '',
          tags: element.dataset.tags ? JSON.parse(element.dataset.tags) : [],
        };
      });
    },
    setValues: (parent: any, values: any) => {
      // Reorder DOM elements based on new values order
      if (Array.isArray(values) && parent && typeof parent.querySelector === 'function') {
        values.forEach((transaction: any, index: number) => {
          const element = parent.querySelector(`[data-transaction-id="${transaction.id}"]`) as HTMLElement;
          if (element) {
            parent.appendChild(element);
          }
        });
      }
    },
    // config: finalConfig,
  });
};

// Category hierarchy drag and drop
export const createCategoryDragDrop = (
  parentElement: HTMLElement,
  config: Partial<DragDropConfig<DraggableCategory>> = {}
) => {
  const finalConfig: DragDropConfig<DraggableCategory> = {
    ...defaultDragDropConfig,
    ...config,
    plugins: [
      animations({
        duration: 250,
        // easing: 'ease-out',
      }),
      // sort(),
      ...(config.plugins || []),
    ],
  };

  return dragAndDrop({
    parent: parentElement,
    getValues: (parent) => {
      return Array.from(parent.children).map((child, index) => {
        const element = child as HTMLElement;
        return {
          id: element.dataset.categoryId || `category-${index}`,
          name: element.dataset.name || '',
          type: element.dataset.type as 'INCOME' | 'EXPENSE' | 'TRANSFER_OUT',
          color: element.dataset.color || '#000000',
          icon: element.dataset.icon || '',
          parentId: element.dataset.parentId,
        };
      });
    },
    setValues: (parent: any, values: any) => {
      if (Array.isArray(values) && parent && typeof parent.querySelector === 'function') {
        values.forEach((category: any) => {
          const element = parent.querySelector(`[data-category-id="${category.id}"]`) as HTMLElement;
          if (element) {
            parent.appendChild(element);
          }
        });
      }
    },
    // config: finalConfig,
  });
};

// Account reordering drag and drop
export const createAccountDragDrop = (
  parentElement: HTMLElement,
  config: Partial<DragDropConfig<DraggableAccount>> = {}
) => {
  const finalConfig: DragDropConfig<DraggableAccount> = {
    ...defaultDragDropConfig,
    ...config,
    plugins: [
      animations({
        duration: 200,
        // easing: 'ease-in-out',
      }),
      // sort(),
      ...(config.plugins || []),
    ],
  };

  return dragAndDrop({
    parent: parentElement,
    getValues: (parent) => {
      return Array.from(parent.children).map((child, index) => {
        const element = child as HTMLElement;
        return {
          id: element.dataset.accountId || `account-${index}`,
          name: element.dataset.name || '',
          type: element.dataset.type as 'CHECKING' | 'SAVINGS' | 'CREDIT' | 'CASH' | 'INVESTMENT',
          balance: parseFloat(element.dataset.balance || '0'),
          color: element.dataset.color,
          icon: element.dataset.icon,
        };
      });
    },
    setValues: (parent: any, values: any) => {
      if (Array.isArray(values) && parent && typeof parent.querySelector === 'function') {
        values.forEach((account: any) => {
          const element = parent.querySelector(`[data-account-id="${account.id}"]`) as HTMLElement;
          if (element) {
            parent.appendChild(element);
          }
        });
      }
    },
    // config: finalConfig,
  });
};

// File upload drag and drop
export const createFileUploadDragDrop = (
  parentElement: HTMLElement,
  onFileDrop: (files: File[]) => void,
  config: {
    acceptedTypes?: string[];
    maxFiles?: number;
    maxFileSize?: number; // in bytes
    multiple?: boolean;
  } = {}
) => {
  const {
    acceptedTypes = ['image/*', '.csv', '.xlsx', '.pdf'],
    maxFiles = 10,
    maxFileSize = 10 * 1024 * 1024, // 10MB
    multiple = true,
  } = config;

  let dragCounter = 0;

  const handleDragEnter = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter++;
    
    if (dragCounter === 1) {
      parentElement.classList.add('drag-over');
      parentElement.setAttribute('data-drag-active', 'true');
    }
  };

  const handleDragLeave = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter--;
    
    if (dragCounter === 0) {
      parentElement.classList.remove('drag-over');
      parentElement.removeAttribute('data-drag-active');
    }
  };

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    dragCounter = 0;
    parentElement.classList.remove('drag-over');
    parentElement.removeAttribute('data-drag-active');

    const files = Array.from(e.dataTransfer?.files || []);
    
    if (files.length === 0) return;

    // Validate files
    const validFiles: File[] = [];
    const errors: string[] = [];

    files.forEach((file) => {
      // Check file count
      if (!multiple && validFiles.length >= 1) {
        errors.push('Solo se permite un archivo');
        return;
      }
      
      if (validFiles.length >= maxFiles) {
        errors.push(`Máximo ${maxFiles} archivos permitidos`);
        return;
      }

      // Check file size
      if (file.size > maxFileSize) {
        errors.push(`${file.name} excede el tamaño máximo (${Math.round(maxFileSize / 1024 / 1024)}MB)`);
        return;
      }

      // Check file type
      const isValidType = acceptedTypes.some((type) => {
        if (type.startsWith('.')) {
          return file.name.toLowerCase().endsWith(type.toLowerCase());
        }
        return file.type.match(type.replace('*', '.*'));
      });

      if (!isValidType) {
        errors.push(`${file.name} no es un tipo de archivo válido`);
        return;
      }

      validFiles.push(file);
    });

    if (errors.length > 0) {
      console.warn('File validation errors:', errors);
      // You might want to show these errors to the user
    }

    if (validFiles.length > 0) {
      onFileDrop(validFiles);
    }
  };

  // Add event listeners
  parentElement.addEventListener('dragenter', handleDragEnter);
  parentElement.addEventListener('dragleave', handleDragLeave);
  parentElement.addEventListener('dragover', handleDragOver);
  parentElement.addEventListener('drop', handleDrop);

  // Return cleanup function
  return () => {
    parentElement.removeEventListener('dragenter', handleDragEnter);
    parentElement.removeEventListener('dragleave', handleDragLeave);
    parentElement.removeEventListener('dragover', handleDragOver);
    parentElement.removeEventListener('drop', handleDrop);
  };
};

// Custom drag handle component for React
/*
export const DragHandle = ({ className = '', ...props }) => (
  <div
    className={`drag-handle cursor-move p-1 rounded hover:bg-gray-100 transition-colors ${className}`}
    {...props}
  >
    <svg
      className="w-4 h-4 text-gray-400"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M4 8h16M4 16h16"
      />
    </svg>
  </div>
);
*/

// Drag preview component for better visual feedback
export const createDragPreview = (element: HTMLElement, data: any) => {
  const preview = element.cloneNode(true) as HTMLElement;
  
  // Style the preview
  preview.style.position = 'fixed';
  preview.style.top = '-1000px';
  preview.style.left = '-1000px';
  preview.style.pointerEvents = 'none';
  preview.style.zIndex = '9999';
  preview.style.opacity = '0.8';
  preview.style.transform = 'rotate(5deg)';
  preview.style.boxShadow = '0 10px 25px rgba(0, 0, 0, 0.2)';
  preview.style.borderRadius = '8px';
  preview.style.maxWidth = '300px';
  
  // Add a badge showing item count for multi-drag
  if (data.selectedCount && data.selectedCount > 1) {
    const badge = document.createElement('div');
    badge.textContent = data.selectedCount.toString();
    badge.style.position = 'absolute';
    badge.style.top = '-8px';
    badge.style.right = '-8px';
    badge.style.backgroundColor = '#3b82f6';
    badge.style.color = 'white';
    badge.style.borderRadius = '50%';
    badge.style.width = '24px';
    badge.style.height = '24px';
    badge.style.display = 'flex';
    badge.style.alignItems = 'center';
    badge.style.justifyContent = 'center';
    badge.style.fontSize = '12px';
    badge.style.fontWeight = 'bold';
    preview.appendChild(badge);
  }
  
  document.body.appendChild(preview);
  
  return preview;
};

// Utility functions for drag and drop states
export const addDragListeners = (element: HTMLElement, callbacks: {
  onDragStart?: (e: DragEvent) => void;
  onDragEnd?: (e: DragEvent) => void;
  onDragEnter?: (e: DragEvent) => void;
  onDragLeave?: (e: DragEvent) => void;
  onDragOver?: (e: DragEvent) => void;
  onDrop?: (e: DragEvent) => void;
}) => {
  Object.entries(callbacks).forEach(([event, handler]) => {
    if (handler) {
      const eventName = event.replace('on', '').toLowerCase();
      element.addEventListener(eventName, handler as EventListener);
    }
  });
};

// CSS classes for drag states (to be used with Tailwind)
export const dragClasses = {
  draggable: 'cursor-move transition-transform hover:scale-105',
  dragging: 'opacity-50 scale-95 rotate-2 z-50',
  dragOver: 'bg-blue-50 border-blue-300 border-dashed',
  dropZone: 'border-2 border-dashed border-gray-300 rounded-lg p-4 transition-colors hover:border-gray-400',
  dropZoneActive: 'border-blue-500 bg-blue-50',
  sortable: 'transition-transform duration-200',
  ghost: 'opacity-30',
  chosen: 'shadow-lg',
};

// Accessibility helpers for drag and drop
export const addDragAccessibility = (element: HTMLElement, label: string) => {
  element.setAttribute('draggable', 'true');
  element.setAttribute('role', 'button');
  element.setAttribute('aria-label', `Arrastratable: ${label}`);
  element.setAttribute('tabindex', '0');
  
  // Add keyboard support
  element.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      // Trigger drag start programmatically
      const dragEvent = new DragEvent('dragstart', {
        bubbles: true,
        cancelable: true,
      });
      element.dispatchEvent(dragEvent);
    }
  });
};

export default {
  createTransactionDragDrop,
  createCategoryDragDrop,
  createAccountDragDrop,
  createFileUploadDragDrop,
  // DragHandle,
  createDragPreview,
  addDragListeners,
  addDragAccessibility,
  dragClasses,
};
