'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, CheckCircle, AlertCircle, ArrowRight } from 'lucide-react';
import { WaitlistSchema, WaitlistFormType } from '@/lib/validations/schemas';
import { cn } from '@/lib/utils'; // Assuming utils exists, standard in shadcn/ui

interface WaitlistFormProps {
  onSuccess?: () => void;
  className?: string;
}

export function WaitlistForm({ onSuccess, className }: WaitlistFormProps) {
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<WaitlistFormType>({
    resolver: zodResolver(WaitlistSchema),
    defaultValues: {
      email: '',
      honeypot: '',
      referrer: typeof window !== 'undefined' ? document.referrer : '',
    },
  });

  const onSubmit = async (data: WaitlistFormType) => {
    setServerError(null);
    try {
      const response = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Something went wrong');
      }

      setIsSuccess(true);
      reset();
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      if (error instanceof Error) {
        setServerError(error.message);
      } else {
        setServerError('An unexpected error occurred');
      }
    }
  };

  if (isSuccess) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className={cn(
          'rounded-xl border border-green-500/20 bg-green-500/10 p-6 text-center',
          className
        )}
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 10 }}
          className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-500"
        >
          <CheckCircle className="h-8 w-8 text-white" />
        </motion.div>
        <h3 className="mb-2 text-xl font-bold text-foreground">
          ¡Estás en la lista!
        </h3>
        <p className="text-muted-foreground">
          Te notificaremos apenas tengamos novedades. Gracias por tu interés.
        </p>
        <button
          onClick={() => setIsSuccess(false)}
          className="mt-4 text-sm font-medium text-green-500 underline-offset-4 hover:text-green-600 hover:underline"
        >
          Registrar otro correo
        </button>
      </motion.div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className={cn('relative mx-auto w-full max-w-md', className)}
    >
      <div className="group relative">
        <div className="absolute -inset-0.5 rounded-xl bg-gradient-to-r from-primary to-blue-600 opacity-30 blur transition duration-1000 group-hover:opacity-100 group-hover:duration-200"></div>
        <div className="relative flex items-center rounded-xl bg-card p-1 shadow-2xl ring-1 ring-white/10">
          <input
            {...register('email')}
            type="email"
            placeholder="tu@email.com"
            disabled={isSubmitting}
            className="w-full border-none bg-transparent px-4 py-3 text-base text-foreground placeholder:text-muted-foreground focus:ring-0 sm:text-lg"
            aria-label="Email Address"
          />
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex min-w-[3rem] items-center justify-center rounded-lg bg-primary p-3 text-white transition-all duration-200 hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSubmitting ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <ArrowRight className="h-5 w-5" />
            )}
          </button>
        </div>
      </div>

      {/* Honeypot field - hidden */}
      <input
        {...register('honeypot')}
        type="text"
        className="hidden"
        tabIndex={-1}
        autoComplete="off"
      />

      <AnimatePresence>
        {(errors.email || serverError) && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute left-0 right-0 top-full mt-3 flex items-center justify-center rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm font-medium text-red-500"
          >
            <AlertCircle className="mr-2 h-4 w-4" />
            <span>{errors.email?.message || serverError}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <p className="mt-4 text-center text-xs text-muted-foreground">
        Más de <span className="font-semibold text-foreground">2,000+</span>{' '}
        personas ya están esperando.
      </p>
    </form>
  );
}
