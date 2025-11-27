'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ResetPasswordForm } from '@/components/auth/reset-password-form';
import { useAuth } from '@/hooks/use-auth';

function ResetPasswordContent() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && user) {
      // User is already logged in, redirect to dashboard
      router.push('/');
      return;
    }

    // Extract tokens from URL hash (Supabase sends them in the hash)
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const access_token = hashParams.get('access_token');
    const refresh_token = hashParams.get('refresh_token');
    
    if (access_token && refresh_token) {
      setAccessToken(access_token);
      setRefreshToken(refresh_token);
    } else {
      // No valid tokens, redirect to forgot password page
      router.push('/auth/forgot-password');
    }
  }, [user, loading, router]);

  // Loading state
  if (loading || !accessToken || !refreshToken) {
    return (
      <div className="min-h-dynamic-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (user) {
    return null; // Will redirect
  }

  return (
    <div className="min-h-dynamic-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <ResetPasswordForm 
          accessToken={accessToken}
          refreshToken={refreshToken}
        />
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-dynamic-screen flex items-center justify-center"><div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>}>
      <ResetPasswordContent />
    </Suspense>
  );
}
