'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { LoginForm } from '@/components/auth/login-form';
import { EmailConfirmationModal } from '@/components/auth/email-confirmation-modal';
import { MobileOnboarding } from '@/components/onboarding/mobile-onboarding';
import { useAuth } from '@/hooks/use-auth';
import { useIsNative } from '@/hooks/use-is-native';
import { useOnboarding } from '@/hooks/use-onboarding';

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
  const isNative = useIsNative();
  const {
    isLoading: isOnboardingLoading,
    isVisible: isOnboardingVisible,
    completeOnboarding,
    skipOnboarding,
  } = useOnboarding();
  const [hasMounted, setHasMounted] = useState(false);
  const [emailConfirmationState, setEmailConfirmationState] = useState(
    getInitialEmailConfirmationState
  );

  useEffect(() => {
    setHasMounted(true);
  }, []);

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

  if (loading) {
    return (
      <div className="min-h-dynamic-screen flex items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (user) {
    return null;
  }

  const holdLoginForOnboarding =
    hasMounted && isNative && (isOnboardingLoading || isOnboardingVisible);

  return (
    <>
      {!holdLoginForOnboarding && (
        <div className="min-h-dynamic-screen flex flex-col p-4">
          <div className="flex flex-grow items-center justify-center">
            <div className="w-full max-w-md">
              <LoginForm />
            </div>
          </div>
        </div>
      )}

      {hasMounted && isNative && !isOnboardingLoading && isOnboardingVisible && (
        <MobileOnboarding
          onComplete={completeOnboarding}
          onSkip={skipOnboarding}
        />
      )}

      <EmailConfirmationModal
        open={emailConfirmationState.show && !holdLoginForOnboarding}
        onClose={handleCloseModal}
        email={emailConfirmationState.email}
      />
    </>
  );
}
