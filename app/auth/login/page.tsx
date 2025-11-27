'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { LoginForm } from '@/components/auth/login-form';
import { EmailConfirmationModal } from '@/components/auth/email-confirmation-modal';
import { useAuth } from '@/hooks/use-auth';

export default function LoginPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [showEmailConfirmationModal, setShowEmailConfirmationModal] = useState(false);
  const [pendingEmail, setPendingEmail] = useState('');

  useEffect(() => {
    if (!loading && user) {
      // User is already logged in, redirect to dashboard
      const redirectUrl = sessionStorage.getItem('redirectUrl') || '/';
      sessionStorage.removeItem('redirectUrl');
      router.push(redirectUrl);
    }
  }, [user, loading, router]);

  // Check for email confirmation pending state from registration
  useEffect(() => {
    const emailConfirmationPending = sessionStorage.getItem('emailConfirmationPending');
    const email = sessionStorage.getItem('pendingEmail');
    
    if (emailConfirmationPending === 'true' && email) {
      setPendingEmail(email);
      setShowEmailConfirmationModal(true);
      // Clear the sessionStorage after reading
      sessionStorage.removeItem('emailConfirmationPending');
      sessionStorage.removeItem('pendingEmail');
    }
  }, []);

  const handleCloseModal = () => {
    setShowEmailConfirmationModal(false);
    setPendingEmail('');
  };

  // Don't render login form if user is already authenticated
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
    <>
      <div className="min-h-dynamic-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <LoginForm />
        </div>
      </div>
      
      <EmailConfirmationModal 
        open={showEmailConfirmationModal}
        onClose={handleCloseModal}
        email={pendingEmail}
      />
    </>
  );
}



