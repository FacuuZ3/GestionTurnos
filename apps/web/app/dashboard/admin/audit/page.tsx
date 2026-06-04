/**
 * /dashboard/admin/audit
 * ---------------------------------------------------------------------------
 * Vista de auditoría: cada acción de mutación realizada por un admin queda
 * registrada con quién, qué, cuándo, sobre qué recurso, e IP.
 *
 * Útil para investigar problemas, auditar uso y cumplir requisitos
 * académicos / regulatorios de trazabilidad.
 */

'use client';

import * as React from 'react';
import { useQuery } from '@tanstack/react-query';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { api } from '@/lib/api';

interface AuditLog {
  id: string;
  actorId: string;
  actorEmail: string;
  action: string;
  resource: string;
  resourceId: string | null;
  metadata: Record<string, unknown> | null;
  ip: string | null;
  createdAt: string;
}

interface AuditResponse {
  items: AuditLog[];
  total: number;
}

const ACTION_COLORS: Record<string, string> = {
  POST: 'bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300',
  PATCH: 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300',
  DELETE: 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300',
};

export default function AdminAuditPage() {
  const auditQuery = useQuery({
    queryKey: ['admin-audit'],
    queryFn: () => api<AuditResponse>('/audit-logs', { query: { limit: 100 } }),
    refetchOnWindowFocus: false,
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Auditoría</CardTitle>
        <CardDescription>
          Acciones de mutación registradas (últimas 100). Cada modificación de
          admin queda persistida con quién, qué, sobre qué recurso y cuándo.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {auditQuery.isLoading && (
          <div className="space-y-1">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="h-14 animate-pulse rounded-md bg-zinc-100 dark:bg-zinc-800"
              />
            ))}
          </div>
        )}

        {auditQuery.data && auditQuery.data.items.length === 0 && (
          <p className="rounded-xl border border-dashed border-zinc-300 px-4 py-12 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
            Todavía no hay acciones registradas.
          </p>
        )}

        {auditQuery.data && auditQuery.data.items.length > 0 && (
          <ul className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
            {auditQuery.data.items.map((log) => (
              <li
                key={log.id}
                className="grid grid-cols-12 items-center gap-3 py-3 text-sm"
              >
                <div className="col-span-2">
                  <span
                    className={
                      'inline-flex items-center rounded-full px-2 py-0.5 font-mono text-[10px] font-medium uppercase tracking-wider ' +
                      (ACTION_COLORS[log.action] ??
                        'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300')
                    }
                  >
                    {log.action}
                  </span>
                </div>

                <div className="col-span-3">
                  <p className="font-medium text-zinc-900 dark:text-zinc-100">
                    {log.resource}
                  </p>
                  {log.resourceId && (
                    <p className="font-mono text-[10px] text-zinc-400 dark:text-zinc-500">
                      {log.resourceId.slice(0, 8)}…
                    </p>
                  )}
                </div>

                <div className="col-span-4">
                  <p className="text-zinc-700 dark:text-zinc-300">
                    {log.actorEmail}
                  </p>
                  {log.ip && (
                    <p className="font-mono text-[10px] text-zinc-400 dark:text-zinc-500">
                      {log.ip}
                    </p>
                  )}
                </div>

                <div className="col-span-3 text-right">
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    {formatDistanceToNow(new Date(log.createdAt), {
                      locale: es,
                      addSuffix: true,
                    })}
                  </p>
                  <p className="font-mono text-[10px] text-zinc-400 dark:text-zinc-500">
                    {new Date(log.createdAt).toLocaleString('es-AR')}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}

        {auditQuery.data && (
          <p className="mt-4 text-center text-xs text-zinc-500 dark:text-zinc-400">
            Mostrando {auditQuery.data.items.length} de {auditQuery.data.total} registros.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
