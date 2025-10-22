'use client';

import { Modal } from '@/components/ui/modal';
import { CheckCircle } from 'lucide-react';
import { motion } from 'framer-motion';

interface EmailConfirmationModalProps {
  open: boolean;
  onClose: () => void;
  email: string;
}

export function EmailConfirmationModal({ open, onClose, email }: EmailConfirmationModalProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      size="md"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center py-4"
      >
        <div className="inline-flex items-center justify-center w-16 h-16 bg-success/10 rounded-full mb-4">
          <CheckCircle className="h-8 w-8 text-success" />
        </div>
        <h2 className="text-2xl font-bold text-foreground mb-2">
          ¡Registro Exitoso!
        </h2>
        
        <div className="space-y-4">
          <p className="text-muted-foreground">
            Hemos enviado un correo de confirmación a <strong className="text-foreground">{email}</strong>
          </p>
          <div className="bg-primary/10 border border-primary/20 rounded-lg p-4">
            <p className="text-primary text-sm font-medium mb-2">
              📧 Pasos siguientes:
            </p>
            <ol className="text-left text-primary text-sm space-y-1 list-decimal list-inside">
              <li>Revisa tu bandeja de entrada</li>
              <li>Haz clic en el enlace de confirmación</li>
              <li>Regresa aquí e inicia sesión</li>
            </ol>
          </div>
          <p className="text-xs text-muted-foreground">
            ¿No recibiste el correo? Revisa tu carpeta de spam.
          </p>
          <button
            onClick={onClose}
            className="w-full bg-gradient-to-r from-primary to-blue-500 text-white font-medium py-3 px-4 rounded-lg transition-all duration-200 hover:shadow-xl hover:shadow-primary/20"
          >
            Entendido
          </button>
        </div>
      </motion.div>
    </Modal>
  );
}

