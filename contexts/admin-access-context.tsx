'use client';

import { createContext, useContext, type ReactNode } from 'react';

const AdminAccessContext = createContext(false);
export function AdminAccessProvider({
  isAdmin,
  children,
}: {
  isAdmin: boolean;
  children: ReactNode;
}) {
  return (
    <AdminAccessContext.Provider value={isAdmin}>
      {children}
    </AdminAccessContext.Provider>
  );
}
export function useAdminAccess(): boolean {
  return useContext(AdminAccessContext);
}
