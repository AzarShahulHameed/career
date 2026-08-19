'use client';

import { useEffect, useState, useCallback } from 'react';
import { api, AuditLogEntry } from '@/lib/api';
import { ensureFreshToken } from '@/lib/auth';
import { SkeletonTable } from '@/components/Skeleton';

interface Paginated { items: AuditLogEntry[]; total: number; page: number; totalPages: number; }

const ENTITY_TYPES = ['JobPosting', 'User', 'Settings'];

// Colors are purely visual grouping by action family (create/update vs
// delete vs everything else) — not tied to any status semantics elsewhere.
function actionColor(action: string): string {
  if (action.endsWith('.deleted')) return 'text-status-rejected bg-status-rejected/10';
  if (action.endsWith('.created')) return 'text-status-hired bg-status-hired/10';
  return 'text-accent bg-accentSoft/60';
}

export default function AuditLogPage() {
  const [data, setData] = useState<Paginated | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [entityType, setEntityType] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const token = await ensureFreshToken();
    if (!token) { window.location.href = '/login'; return; }
    const qs = new URLSearchParams({ page: String(page), pageSize: '30' });
    if (entityType) qs.set('entityType', entityType);
    const result = await api.get<Paginated>(`/audit-log?${qs}`, token);
    setData(result);
    setLoading(false);
  }, [page, entityType]);

  useEffect(() => { load(); }, [load]);

  return (
    <div>
      <div className="flex items-baseline justify-between mb-6 pb-4 border-b border-line">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Audit log</h1>
          <p className="text-sm text-ink/50 mt-1">
            {data ? `${data.total} recorded action${data.total === 1 ? '' : 's'}` : 'Loading…'}
          </p>
        </div>
        <select
          value={entityType}
          onChange={(e) => { setEntityType(e.target.value); setPage(1); }}
          className="border border-line px-3 py-1.5 text-xs font-mono uppercase tracking-wide bg-white"
        >
          <option value="">All types</option>
          {ENTITY_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>

      {loading && <SkeletonTable rows={10} />}

      {!loading && data && data.items.length === 0 && (
        <div className="border border-dashed border-line py-16 text-center text-sm text-ink/40">
          Nothing recorded yet.
        </div>
      )}

      {!loading && data && data.items.length > 0 && (
        <table className="w-full text-sm glass-panel rounded-2xl overflow-hidden">
          <thead>
            <tr className="bg-lineSoft/60 border-b border-line text-left">
              <th className="font-mono text-[11px] uppercase tracking-wide text-ink/50 font-medium px-4 py-2.5">When</th>
              <th className="font-mono text-[11px] uppercase tracking-wide text-ink/50 font-medium px-4 py-2.5">Who</th>
              <th className="font-mono text-[11px] uppercase tracking-wide text-ink/50 font-medium px-4 py-2.5">Action</th>
              <th className="font-mono text-[11px] uppercase tracking-wide text-ink/50 font-medium px-4 py-2.5">Details</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((entry, i) => (
              <tr key={entry.id} className={['border-b border-lineSoft last:border-b-0', i % 2 === 1 ? 'bg-lineSoft/20' : ''].join(' ')}>
                <td className="px-4 py-3 text-ink/50 whitespace-nowrap">
                  {new Date(entry.createdAt).toLocaleString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                </td>
                <td className="px-4 py-3 font-medium whitespace-nowrap">{entry.actor.name}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs font-mono px-2 py-0.5 rounded-md ${actionColor(entry.action)}`}>{entry.action}</span>
                </td>
                <td className="px-4 py-3 text-ink/70">{entry.description}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {data && data.totalPages > 1 && (
        <div className="flex items-center gap-3 mt-4 text-sm">
          <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="text-accent disabled:text-ink/30">
            &larr; Prev
          </button>
          <span className="text-ink/50 font-mono text-xs">Page {data.page} of {data.totalPages}</span>
          <button disabled={page >= data.totalPages} onClick={() => setPage((p) => p + 1)} className="text-accent disabled:text-ink/30">
            Next &rarr;
          </button>
        </div>
      )}
    </div>
  );
}
