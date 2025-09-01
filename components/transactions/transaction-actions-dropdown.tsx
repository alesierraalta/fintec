'use client';

import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Edit, Trash2, MoreVertical } from 'lucide-react';
import type { Transaction } from '@/types/domain';

interface TransactionActionsDropdownProps {
  transaction: Transaction;
  onEdit: (transaction: Transaction) => void;
  onDelete: (transaction: Transaction) => void;
}

export function TransactionActionsDropdown({ 
  transaction, 
  onEdit, 
  onDelete 
}: TransactionActionsDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLButtonElement>(null);

  const calculatePosition = () => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setPosition({
        top: rect.bottom + window.scrollY,
        left: rect.right - 192 + window.scrollX, // 192px = w-48
      });
    }
  };

  const handleToggle = () => {
    if (!isOpen) {
      calculatePosition();
    }
    setIsOpen(!isOpen);
  };

  const handleEdit = () => {
    onEdit(transaction);
    setIsOpen(false);
  };

  const handleDelete = () => {
    onDelete(transaction);
    setIsOpen(false);
  };

  // Close on click outside
  useEffect(() => {
    if (isOpen) {
      const handleClickOutside = (event: MouseEvent) => {
        if (triggerRef.current && !triggerRef.current.contains(event.target as Node)) {
          // Check if click is not on the dropdown
          const dropdown = document.getElementById(`dropdown-${transaction.id}`);
          if (dropdown && !dropdown.contains(event.target as Node)) {
            setIsOpen(false);
          }
        }
      };

      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen, transaction.id]);

  // Close on scroll
  useEffect(() => {
    if (isOpen) {
      const handleScroll = () => {
        calculatePosition();
      };

      window.addEventListener('scroll', handleScroll);
      window.addEventListener('resize', handleScroll);
      
      return () => {
        window.removeEventListener('scroll', handleScroll);
        window.removeEventListener('resize', handleScroll);
      };
    }
  }, [isOpen]);

  return (
    <>
      <button 
        ref={triggerRef}
        onClick={handleToggle}
        className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
        aria-label="Acciones de transacción"
        aria-expanded={isOpen}
        aria-haspopup="menu"
      >
        <MoreVertical className="h-4 w-4" />
      </button>
      
      {isOpen && typeof document !== 'undefined' && createPortal(
        <div
          id={`dropdown-${transaction.id}`}
          className="fixed w-48 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-[10000]"
          style={{
            top: `${position.top}px`,
            left: `${position.left}px`,
          }}
          role="menu"
          aria-orientation="vertical"
          aria-labelledby="options-menu"
        >
          <button
            onClick={handleEdit}
            className="flex items-center w-full px-4 py-3 text-sm text-gray-300 hover:bg-gray-700 rounded-t-lg transition-colors"
            role="menuitem"
          >
            <Edit className="h-4 w-4 mr-3" />
            Editar
          </button>
          <button
            onClick={handleDelete}
            className="flex items-center w-full px-4 py-3 text-sm text-red-400 hover:bg-red-500/10 rounded-b-lg transition-colors"
            role="menuitem"
          >
            <Trash2 className="h-4 w-4 mr-3" />
            Eliminar
          </button>
        </div>,
        document.body
      )}
    </>
  );
}
