'use client';

import { useState } from 'react';
import { Modal } from '@/components/ui/modal';
import { CheckCircle, Mail } from 'lucide-react';
import { motion } from 'framer-motion';

interface EmailConfirmationModalProps {
  open: boolean;
  onClose: () => void;
  email: string;
  onResend?: () => Promise<void>;
}

export function EmailConfirmationModal({
  open,
  onClose,
  email,
  onResend,
}: EmailConfirmationModalProps) {
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);

  const handleResend = async () => {
    if (!onResend) return;
    setResending(true);
    await onResend();
    setResending(false);
    setResent(true);
    setTimeout(() => setResent(false), 3000);
  };

  return (
    <Modal open={open} onClose={onClose} size="md">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="py-4 text-center"
      >
        <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-success/10">
          <CheckCircle className="h-8 w-8 text-success" />
        </div>
        <h2 className="mb-2 text-2xl font-bold text-foreground">
          ¡Registro Exitoso!
        </h2>

        <div className="space-y-4">
          <p className="text-muted-foreground">
            Hemos enviado un correo de confirmación a{' '}
            <strong className="text-foreground">{email}</strong>
          </p>
          <div className="rounded-lg border border-primary/20 bg-primary/10 p-4">
            <p className="mb-2 text-sm font-medium text-primary">
              📧 Pasos siguientes:
            </p>
            <ol className="list-inside list-decimal space-y-1 text-left text-sm text-primary">
              <li>Revisa tu bandeja de entrada</li>
              <li>Haz clic en el enlace de confirmación</li>
              <li>Regresa aquí e inicia sesión</li>
            </ol>
          </div>
          <p className="text-xs text-muted-foreground">
            ¿No recibiste el correo? Revisa tu carpeta de spam.
          </p>
          {onResend && (
            <button
              onClick={handleResend}
              disabled={resending || resent}
              className="flex w-full items-center justify-center space-x-2 rounded-lg border border-primary/30 px-4 py-2 text-primary transition-colors hover:bg-primary/5 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Mail className="h-4 w-4" />
              <span>
                {resent
                  ? '¡Correo reenviado!'
                  : 'Reenviar correo de verificación'}
              </span>
            </button>
          )}
          <button
            onClick={onClose}
            className="w-full rounded-lg bg-gradient-to-r from-primary to-blue-500 px-4 py-3 font-medium text-white transition-all duration-200 hover:shadow-xl hover:shadow-primary/20"
          >
            Entendido
          </button>
        </div>
      </motion.div>
    </Modal>
  );
}
