/**
 * /dashboard/admin/users - Gestión de usuarios (ADMIN).
 * ---------------------------------------------------------------------------
 * Listado de usuarios con cambio de rol (promover / degradar admin) y borrado
 * de cuentas sin reservas. Toda mutación queda registrada automáticamente por
 * el AuditInterceptor global.
 */

'use client';

import * as React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api, ApiError } from '@/lib/api';
import { getStoredUser } from '@/lib/auth';
import { Role, UserDto } from '@/lib/types';

export default function AdminUsersPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = React.useState('');
  const [actionError, setActionError] = React.useState<string | null>(null);

  // El propio admin no puede tocar su cuenta: lo usamos para deshabilitar
  // las acciones sobre su propia fila.
  const currentUserId = React.useMemo(() => getStoredUser()?.id ?? null, []);

  const usersQuery = useQuery({
    queryKey: ['admin-users'],
    queryFn: () => api<UserDto[]>('/users'),
  });

  const roleMutation = useMutation({
    mutationFn: (vars: { id: string; role: Role }) =>
      api<UserDto>(`/users/${vars.id}/role`, { method: 'PATCH', body: { role: vars.role } }),
    onSuccess: () => {
      setActionError(null);
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    },
    onError: (e) =>
      setActionError(e instanceof ApiError ? e.message : 'No pudimos cambiar el rol.'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api<{ id: string }>(`/users/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      setActionError(null);
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    },
    onError: (e) =>
      setActionError(e instanceof ApiError ? e.message : 'No pudimos eliminar el usuario.'),
  });

  const confirmAndDelete = (user: UserDto) => {
    const ok = window.confirm(
      `¿Eliminar la cuenta de "${user.name}" (${user.email})?\n\n` +
        '⚠️ Esta acción NO se puede deshacer. Sólo se permite si el usuario no ' +
        'tiene reservas asociadas.',
    );
    if (ok) deleteMutation.mutate(user.id);
  };

  // Filtrado en cliente por nombre/email (búsqueda inmediata sin refetch).
  const filtered = (usersQuery.data ?? []).filter((u) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle>Usuarios</CardTitle>
          <CardDescription>
            Gestión de roles y cuentas. No podés modificar ni eliminar tu propia cuenta.
          </CardDescription>
        </div>
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nombre o email…"
          className="max-w-xs"
        />
      </CardHeader>
      <CardContent>
        {usersQuery.isLoading && <p className="text-sm text-zinc-500">Cargando...</p>}
        {usersQuery.data && filtered.length === 0 && (
          <p className="text-sm text-zinc-500">No hay usuarios que coincidan.</p>
        )}

        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px] text-sm">
            <thead className="border-b border-zinc-200 text-left text-xs uppercase text-zinc-500">
              <tr>
                <th className="py-2 pr-4">Usuario</th>
                <th className="py-2 pr-4">Rol</th>
                <th className="py-2 pr-4">Email verificado</th>
                <th className="py-2 pr-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {filtered.map((u) => {
                const isSelf = u.id === currentUserId;
                const nextRole: Role = u.role === 'ADMIN' ? 'USER' : 'ADMIN';
                const roleBusy = roleMutation.isPending && roleMutation.variables?.id === u.id;
                const deleteBusy = deleteMutation.isPending && deleteMutation.variables === u.id;
                return (
                  <tr key={u.id}>
                    <td className="py-2 pr-4">
                      <div className="font-medium">
                        {u.name}
                        {isSelf && (
                          <span className="ml-2 text-xs font-normal text-zinc-400">(vos)</span>
                        )}
                      </div>
                      <div className="text-xs text-zinc-500">{u.email}</div>
                    </td>
                    <td className="py-2 pr-4">
                      {u.role === 'ADMIN' ? (
                        <span className="inline-flex items-center rounded-full bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-700">
                          Admin
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600">
                          Usuario
                        </span>
                      )}
                    </td>
                    <td className="py-2 pr-4">
                      {u.isEmailVerified ? (
                        <span className="text-brand-700">Sí</span>
                      ) : (
                        <span className="text-amber-600">Pendiente</span>
                      )}
                    </td>
                    <td className="py-2 pr-4 text-right">
                      <div className="flex flex-wrap justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={isSelf}
                          loading={roleBusy}
                          onClick={() => roleMutation.mutate({ id: u.id, role: nextRole })}
                        >
                          {u.role === 'ADMIN' ? 'Hacer usuario' : 'Hacer admin'}
                        </Button>
                        <Button
                          size="sm"
                          variant="danger"
                          disabled={isSelf}
                          loading={deleteBusy}
                          onClick={() => confirmAndDelete(u)}
                        >
                          Eliminar
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {actionError && (
          <div className="mt-3 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
            {actionError}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
