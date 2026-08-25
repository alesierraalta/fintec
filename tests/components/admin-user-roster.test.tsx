import { render, screen } from '@testing-library/react';
import { UserRoster } from '@/components/admin/user-roster';
import type { UserRosterEntry } from '@/lib/admin-stats/types';

const users: UserRosterEntry[] = [
  {
    id: 'u1',
    name: 'Admin User',
    email: 'admin@example.com',
    createdAt: '2025-01-04T10:00:00.000Z',
    lastActivityAt: '2025-01-31T12:00:00.000Z',
    isAdmin: true,
  },
  {
    id: 'u2',
    name: null,
    email: null,
    createdAt: null,
    lastActivityAt: null,
    isAdmin: false,
  },
];

describe('UserRoster', () => {
  it('renders the table columns, values, and admin badge', () => {
    render(<UserRoster users={users} />);

    expect(
      screen.getByRole('columnheader', { name: 'Nombre' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('columnheader', { name: 'Correo' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('columnheader', { name: 'Creado' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('columnheader', { name: 'Última actividad' })
    ).toBeInTheDocument();
    expect(screen.getByText('Admin User')).toBeInTheDocument();
    expect(screen.getByText('admin@example.com')).toBeInTheDocument();
    expect(screen.getByText('admin')).toBeInTheDocument();
    expect(screen.getAllByText('-')).toHaveLength(4);
  });

  it('renders an explicit empty state instead of an empty table', () => {
    render(<UserRoster users={[]} />);

    expect(
      screen.getByText('No hay usuarios para mostrar.')
    ).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    expect(screen.queryByText('admin')).not.toBeInTheDocument();
  });
});
