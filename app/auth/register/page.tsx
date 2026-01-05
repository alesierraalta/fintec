'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { RegisterForm } from '@/components/auth/register-form';
import { useAuth } from '@/hooks/use-auth';

export default function RegisterPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      // User is already logged in, redirect to dashboard
      router.push('/');
    }
  }, [user, loading, router]);

  // Don't render register form if user is already authenticated
  if (loading) {
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
    <div className="flex flex-col min-h-screen p-4">
      <div className="flex-grow flex items-center justify-center">
        <div className="w-full max-w-md">
          <RegisterForm />
        </div>
      </div>
    </div>
  );
}
