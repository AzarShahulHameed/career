'use client';

import { useEffect, useState, useCallback, useMemo, Suspense } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';
import { ensureFreshToken } from '@/lib/auth';
import { Application, ApplicationStatus, Job } from '@/lib/api';
import { StatusBadge } from '@/components/StatusBadge';
import { SkeletonTable } from '@/components/Skeleton';
import { exportApplicationsCsv, exportApplicationsXlsx } from '@/lib/export';

const STATUS_FILTERS: { label: string; value: ApplicationStatus | 'ALL' }[] = [
  { label: 'All', value: 'ALL' },
  { label: 'Submitted', value: 'SUBMITTED' },
  { label: 'Under review', value: 'UNDER_REVIEW' },
  { label: 'Shortlisted', value: 'SHORTLISTED' },
  { label: 'Interview', value: 'INTERVIEW_SCHEDULED' },
  { label: 'Offered', value: 'OFFERED' },
  { label: 'Hired', value: 'HIRED' },
  { label: 'Not selected', value: 'REJECTED' },
];

const SOURCE_FILTERS = ['linkedin', 'naukri', 'website'];

interface Paginated { items: Application[]; total: number; page: number; totalPages: number; }

// Filter/page state lives in the URL query string (not just React state) so
// that browser back/forward restores exactly where you were — including
// which page of results you'd scrolled to — instead of always resetting to
// page 1 on return from an application detail page.
function AdminApplicationsList() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [data, setData] = useState<Paginated | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [exporting, setExporting] = useState(false);

  const statusFilter = (searchParams.get('status') as ApplicationStatus | null) ?? 'ALL';
  const department = searchParams.get('department') ?? '';
  const location = searchParams.get('location') ?? '';
  const employmentType = searchParams.get('employmentType') ?? '';
  const jobId = searchParams.get('jobId') ?? '';
  const companyId = searchParams.get('companyId') ?? '';
  const source = searchParams.get('source') ?? '';
  const page = Number(searchParams.get('page') ?? '1');

  const [loading, setLoading] = useState(true);

  // Distinct filter values derived from actual job postings — no separate endpoint needed.
  const departments = Array.from(new Set(jobs.map((j) => j.department))).sort();
  const locations = Array.from(new Set(jobs.map((j) => j.location))).sort();
  const roles = useMemo(
    () => Array.from(new Map(jobs.map((j) => [j.id, j.title])).entries()).sort((a, b) => a[1].localeCompare(b[1])),
    [jobs],
  );
  const companies = useMemo(
    () =>
      Array.from(
        new Map(jobs.filter((j) => j.company).map((j) => [j.company!.id, j.company!.name])).entries(),
      ).sort((a, b) => a[1].localeCompare(b[1])),
    [jobs],
  );

  function updateParams(patch: Record<string, string | number | null>) {
    const next = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(patch)) {
      if (value === null || value === '') next.delete(key);
      else next.set(key, String(value));
    }
    router.replace(`${pathname}?${next.toString()}`, { scroll: false });
  }

  // Persist the list's current URL (page + every filter) any time it
  // changes, so the detail page's "back" link can return to exactly this
  // view — reliable even across a refresh or a directly-opened detail link,
  // which router.back() alone can't guarantee.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    sessionStorage.setItem('admin-applications-return-url', `${pathname}?${searchParams.toString()}`);
  }, [pathname, searchParams]);

  function setFilter(key: string, value: string) {
    updateParams({ [key]: value || null, page: 1 });
  }

  function buildQuery(forExport = false) {
    const qs = new URLSearchParams({
      page: forExport ? '1' : String(page),
      pageSize: forExport ? '2000' : '20',
    });
    if (statusFilter !== 'ALL') qs.set('status', statusFilter);
    if (department) qs.set('department', department);
    if (location) qs.set('location', location);
    if (employmentType) qs.set('employmentType', employmentType);
    if (jobId) qs.set('jobId', jobId);
    if (companyId) qs.set('companyId', companyId);
    if (source) qs.set('source', source);
    return qs;
  }

  const load = useCallback(async () => {
    setLoading(true);
    const token = await ensureFreshToken();
    if (!token) { window.location.href = '/login'; return; }

    const [jobList, qs] = [
      jobs.length ? jobs : await api.get<Job[]>('/jobs/admin/all', token),
      buildQuery(),
    ];
    if (!jobs.length) setJobs(jobList);

    const result = await api.get<Paginated>(`/applications?${qs}`, token);
    setData(result);
    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, department, location, employmentType, jobId, companyId, source, page]);

  useEffect(() => { load(); }, [load]);

  async function handleExport(format: 'csv' | 'xlsx') {
    setExporting(true);
    try {
      const token = await ensureFreshToken();
      if (!token) return;
      const qs = buildQuery(true);
      const result = await api.get<Paginated>(`/applications?${qs}`, token);
      if (format === 'csv') exportApplicationsCsv(result.items);
      else exportApplicationsXlsx(result.items);
    } finally {
      setExporting(false);
    }
  }

  const hasFilters = department || location || employmentType || jobId || companyId || source;

  return (
    <div>
      <div className="flex items-baseline justify-between mb-6 pb-4 border-b border-line">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Applications</h1>
          <p className="text-sm text-ink/50 mt-1">
            {data ? `${data.total} total record${data.total === 1 ? '' : 's'}` : 'Loading…'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleExport('csv')}
            disabled={exporting}
            className="text-xs font-mono uppercase tracking-wide px-3 py-2 border border-line rounded-lg hover:bg-lineSoft/50 disabled:opacity-50"
          >
            Export CSV
          </button>
          <button
            onClick={() => handleExport('xlsx')}
            disabled={exporting}
            className="text-xs font-mono uppercase tracking-wide px-3 py-2 border border-line rounded-lg hover:bg-lineSoft/50 disabled:opacity-50"
          >
            Export Excel
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <select value={jobId} onChange={(e) => setFilter('jobId', e.target.value)}
                className="border border-line px-3 py-1.5 text-xs font-mono uppercase tracking-wide bg-white">
          <option value="">All roles</option>
          {roles.map(([id, title]) => <option key={id} value={id}>{title}</option>)}
        </select>
        <select value={companyId} onChange={(e) => setFilter('companyId', e.target.value)}
                className="border border-line px-3 py-1.5 text-xs font-mono uppercase tracking-wide bg-white">
          <option value="">All companies</option>
          {companies.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
        </select>
        <select value={source} onChange={(e) => setFilter('source', e.target.value)}
                className="border border-line px-3 py-1.5 text-xs font-mono uppercase tracking-wide bg-white">
          <option value="">All sources</option>
          {SOURCE_FILTERS.map((s) => <option key={s} value={s} className="capitalize">{s}</option>)}
        </select>
        <select value={department} onChange={(e) => setFilter('department', e.target.value)}
                className="border border-line px-3 py-1.5 text-xs font-mono uppercase tracking-wide bg-white">
          <option value="">All departments</option>
          {departments.map((d) => <option key={d} value={d}>{d}</option>)}
        </select>
        <select value={location} onChange={(e) => setFilter('location', e.target.value)}
                className="border border-line px-3 py-1.5 text-xs font-mono uppercase tracking-wide bg-white">
          <option value="">All locations</option>
          {locations.map((l) => <option key={l} value={l}>{l}</option>)}
        </select>
        <select value={employmentType} onChange={(e) => setFilter('employmentType', e.target.value)}
                className="border border-line px-3 py-1.5 text-xs font-mono uppercase tracking-wide bg-white">
          <option value="">All types</option>
          <option value="FULL_TIME">Full time</option>
          <option value="PART_TIME">Part time</option>
          <option value="CONTRACT">Contract</option>
          <option value="INTERN">Intern</option>
        </select>
        {hasFilters && (
          <button
            onClick={() => updateParams({ department: null, location: null, employmentType: null, jobId: null, companyId: null, source: null, page: 1 })}
            className="text-xs text-accent hover:underline ml-1"
          >
            Clear filters
          </button>
        )}
      </div>

      <div className="flex items-center gap-1 mb-4 border-b border-line">
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter('status', f.value === 'ALL' ? '' : f.value)}
            className={[
              'text-xs font-mono uppercase tracking-wide px-3 py-2.5 border-b-2 -mb-px transition-colors',
              statusFilter === f.value
                ? 'border-accent text-accent font-medium'
                : 'border-transparent text-ink/50 hover:text-ink',
            ].join(' ')}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading && <SkeletonTable rows={8} />}

      {!loading && data && data.items.length === 0 && (
        <div className="border border-dashed border-line py-16 text-center text-sm text-ink/40">
          No applications match this filter.
        </div>
      )}

      {!loading && data && data.items.length > 0 && (
        <table className="w-full text-sm glass-panel rounded-2xl overflow-hidden">
          <thead>
            <tr className="bg-lineSoft/60 border-b border-line text-left">
              <th className="font-mono text-[11px] uppercase tracking-wide text-ink/50 font-medium px-4 py-2.5">Candidate</th>
              <th className="font-mono text-[11px] uppercase tracking-wide text-ink/50 font-medium px-4 py-2.5">Role</th>
              <th className="font-mono text-[11px] uppercase tracking-wide text-ink/50 font-medium px-4 py-2.5">Company</th>
              <th className="font-mono text-[11px] uppercase tracking-wide text-ink/50 font-medium px-4 py-2.5">Source</th>
              <th className="font-mono text-[11px] uppercase tracking-wide text-ink/50 font-medium px-4 py-2.5">Applied</th>
              <th className="font-mono text-[11px] uppercase tracking-wide text-ink/50 font-medium px-4 py-2.5">ATS score</th>
              <th className="font-mono text-[11px] uppercase tracking-wide text-ink/50 font-medium px-4 py-2.5">Status</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((app, i) => (
              <tr
                key={app.id}
                onClick={() => { router.push(`/admin/applications/${app.id}`); }}
                className={[
                  'border-b border-lineSoft last:border-b-0 cursor-pointer hover:bg-accentSoft/30 transition-colors',
                  i % 2 === 1 ? 'bg-lineSoft/20' : '',
                ].join(' ')}
              >
                <td className="px-4 py-3 font-medium">{app.candidateName}</td>
                <td className="px-4 py-3 text-ink/70">{app.job.title}</td>
                <td className="px-4 py-3 text-ink/50">{app.job.company?.name ?? '—'}</td>
                <td className="px-4 py-3 text-ink/50 capitalize">{app.source}</td>
                <td className="px-4 py-3 text-ink/50">{new Date(app.createdAt).toLocaleDateString()}</td>
                <td className="px-4 py-3">
                  {app.atsScore !== null && app.atsScore !== undefined ? (
                    <span className={[
                      'text-xs font-mono font-semibold px-2 py-0.5 rounded-md',
                      app.atsScore >= 70 ? 'bg-status-hired/10 text-status-hired'
                        : app.atsScore >= 40 ? 'bg-status-review/10 text-status-review'
                        : 'bg-status-rejected/10 text-status-rejected',
                    ].join(' ')}>
                      {app.atsScore}%{app.atsAutoRejected ? ' · auto' : ''}
                    </span>
                  ) : <span className="text-ink/30 text-xs">—</span>}
                </td>
                <td className="px-4 py-3"><StatusBadge status={app.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {data && data.totalPages > 1 && (
        <div className="flex items-center gap-3 mt-4 text-sm">
          <button disabled={page <= 1} onClick={() => updateParams({ page: page - 1 })} className="text-accent disabled:text-ink/30">
            &larr; Prev
          </button>
          <span className="text-ink/50 font-mono text-xs">Page {data.page} of {data.totalPages}</span>
          <button disabled={page >= data.totalPages} onClick={() => updateParams({ page: page + 1 })} className="text-accent disabled:text-ink/30">
            Next &rarr;
          </button>
        </div>
      )}
    </div>
  );
}

export default function AdminApplicationsPage() {
  return (
    <Suspense fallback={<SkeletonTable rows={8} />}>
      <AdminApplicationsList />
    </Suspense>
  );
}
