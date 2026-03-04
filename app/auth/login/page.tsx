'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { LoginForm } from '@/components/auth/login-form';
import { EmailConfirmationModal } from '@/components/auth/email-confirmation-modal';
import { useAuth } from '@/hooks/use-auth';

function getInitialEmailConfirmationState() {
  if (typeof window === 'undefined') {
    return { show: false, email: '' };
  }

  const emailConfirmationPending = sessionStorage.getItem(
    'emailConfirmationPending'
  );
  const email = sessionStorage.getItem('pendingEmail');

  if (emailConfirmationPending === 'true' && email) {
    return { show: true, email };
  }

  return { show: false, email: '' };
}

export default function LoginPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [emailConfirmationState, setEmailConfirmationState] = useState(
    getInitialEmailConfirmationState
  );

  useEffect(() => {
    if (!loading && user) {
      // User is already logged in, redirect to dashboard
      const redirectUrl = sessionStorage.getItem('redirectUrl') || '/';
      sessionStorage.removeItem('redirectUrl');
      router.push(redirectUrl);
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (emailConfirmationState.show) {
      sessionStorage.removeItem('emailConfirmationPending');
      sessionStorage.removeItem('pendingEmail');
    }
  }, [emailConfirmationState.show]);

  const handleCloseModal = () => {
    setEmailConfirmationState({ show: false, email: '' });
  };

  // Don't render login form if user is already authenticated
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
    <>
      <div className="min-h-dynamic-screen flex flex-col p-4">
        <div className="flex flex-grow items-center justify-center">
          <div className="w-full max-w-md">
            <LoginForm />
          </div>
        </div>
      </div>

      <EmailConfirmationModal
        open={emailConfirmationState.show}
        onClose={handleCloseModal}
        email={emailConfirmationState.email}
      />
    </>
  );
}
