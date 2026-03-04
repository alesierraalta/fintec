'use client';

import { useEffect, useMemo, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { ResetPasswordForm } from '@/components/auth/reset-password-form';
import { useAuth } from '@/hooks/use-auth';

function ResetPasswordContent() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const tokens = useMemo(() => {
    if (typeof window === 'undefined') {
      return { accessToken: null, refreshToken: null };
    }

    const hashParams = new URLSearchParams(window.location.hash.substring(1));

    return {
      accessToken: hashParams.get('access_token'),
      refreshToken: hashParams.get('refresh_token'),
    };
  }, []);

  useEffect(() => {
    if (!loading && user) {
      // User is already logged in, redirect to dashboard
      router.push('/');
      return;
    }

    if (!loading && (!tokens.accessToken || !tokens.refreshToken)) {
      // No valid tokens, redirect to forgot password page
      router.push('/auth/forgot-password');
    }
  }, [loading, router, tokens.accessToken, tokens.refreshToken, user]);

  // Loading state
  if (loading || !tokens.accessToken || !tokens.refreshToken) {
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
          <ResetPasswordForm
            accessToken={tokens.accessToken}
            refreshToken={tokens.refreshToken}
          />
        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-dynamic-screen flex items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
        </div>
      }
    >
      <ResetPasswordContent />
    </Suspense>
  );
}
