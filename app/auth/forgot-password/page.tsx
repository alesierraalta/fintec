'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ForgotPasswordForm } from '@/components/auth/forgot-password-form';
import { useAuth } from '@/hooks/use-auth';

export default function ForgotPasswordPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      // User is already logged in, redirect to dashboard
      router.push('/');
    }
  }, [user, loading, router]);

  // Don't render forgot password form if user is already authenticated
  if (loading) {
    return (
      <div className="min-h-dynamic-screen flex items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (user) {
    return null; // Will redirect
  }

  return (
    <div className="min-h-dynamic-screen flex flex-col p-4">
      <div className="flex flex-grow items-center justify-center">
        <div className="w-full max-w-md">
          <ForgotPasswordForm />
        </div>
      </div>
    </div>
  );
}
