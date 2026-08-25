'use client';

import type { UserRosterEntry } from '@/lib/admin-stats/types';

function formatDate(value: string | null) {
  if (!value) return '-';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '-' : date.toLocaleDateString('es-ES');
}

export function UserRoster({ users }: { users: UserRosterEntry[] }) {
  return (
    <section
      className="glass-card rounded-3xl p-6"
      aria-labelledby="user-roster-heading"
    >
      <h2 id="user-roster-heading" className="text-lg font-semibold">
        Usuarios
      </h2>
      {users.length === 0 ? (
        <p className="mt-4 rounded-xl bg-muted/30 p-4 text-sm">
          No hay usuarios para mostrar.
        </p>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-border/30 text-muted-foreground">
                <th className="px-3 py-3 font-medium" scope="col">
                  Nombre
                </th>
                <th className="px-3 py-3 font-medium" scope="col">
                  Correo
                </th>
                <th className="px-3 py-3 font-medium" scope="col">
                  Creado
                </th>
                <th className="px-3 py-3 font-medium" scope="col">
                  Última actividad
                </th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr
                  key={user.id}
                  className="border-b border-border/20 last:border-0"
                >
                  <td className="px-3 py-3">
                    <span>{user.name ?? '-'}</span>
                    {user.isAdmin && (
                      <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                        admin
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-3">{user.email ?? '-'}</td>
                  <td className="px-3 py-3">{formatDate(user.createdAt)}</td>
                  <td className="px-3 py-3">
                    {formatDate(user.lastActivityAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
