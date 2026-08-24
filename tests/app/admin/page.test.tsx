import React from 'react';
import { render, screen } from '@testing-library/react';
import AdminPage from '@/app/admin/page';
import { getAdminAccess } from '@/lib/admin/guard';
import { redirect } from 'next/navigation';

jest.mock('@/lib/admin/guard', () => ({ getAdminAccess: jest.fn() }));
jest.mock('next/navigation', () => ({ redirect: jest.fn() }));
jest.mock('@/components/admin/admin-stats-dashboard', () => ({ AdminStatsDashboard: () => <div data-testid="admin-dashboard">Dashboard</div> }));
jest.mock('@/components/admin/admin-access-denied', () => ({ AdminAccessDenied: () => <div>Acceso denegado</div> }));

describe('Admin page', () => {
  const access = getAdminAccess as jest.MockedFunction<typeof getAdminAccess>;
  beforeEach(() => jest.clearAllMocks());
  it('redirects authentication failures', async () => {
    access.mockRejectedValue({ statusCode: 401 });
    render(await AdminPage());
    expect(redirect).toHaveBeenCalledWith('/auth/login');
  });
  it('shows denied state for authenticated non-admins', async () => {
    access.mockResolvedValue({ userId: 'user', isAdmin: false });
    render(await AdminPage());
    expect(screen.getByText('Acceso denegado')).toBeInTheDocument();
  });
  it('renders the dashboard for administrators', async () => {
    access.mockResolvedValue({ userId: 'admin', isAdmin: true });
    render(await AdminPage());
    expect(screen.getByTestId('admin-dashboard')).toBeInTheDocument();
  });
});
