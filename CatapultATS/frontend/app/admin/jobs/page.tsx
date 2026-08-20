'use client';

import { useEffect, useState, useCallback, FormEvent } from 'react';
import { api, Job, Company, ApiError } from '@/lib/api';
import { ensureFreshToken } from '@/lib/auth';
import { ScreeningQuestionsField, DraftQuestion, draftFromQuestion } from '@/components/ScreeningQuestionsField';

const WEBSITE_URL = process.env.NEXT_PUBLIC_WEBSITE_URL || '';

export default function AdminJobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingJob, setEditingJob] = useState<Job | null>(null);
  const [prefillJob, setPrefillJob] = useState<Job | null>(null); // drives form field defaults for both edit AND clone
  const [showNewCompany, setShowNewCompany] = useState(false);
  const [newCompanyName, setNewCompanyName] = useState('');
  const [creatingCompany, setCreatingCompany] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Array fields (responsibilities/requirements/niceToHave) need their own
  // state — a plain <form> can't collect a variable-length list of inputs
  // through FormData the way it can a single named field.
  const [responsibilities, setResponsibilities] = useState<string[]>(['']);
  const [requirements, setRequirements] = useState<string[]>(['']);
  const [niceToHave, setNiceToHave] = useState<string[]>(['']);
  const [isFeatured, setIsFeatured] = useState(false);
  const [screeningQuestions, setScreeningQuestions] = useState<DraftQuestion[]>([]);

  const load = useCallback(async () => {
    const token = await ensureFreshToken();
    if (!token) { window.location.href = '/login'; return; }
    const [jobList, companyList] = await Promise.all([
      api.get<Job[]>('/jobs/admin/all', token),
      api.get<Company[]>('/companies', token),
    ]);
    setJobs(jobList);
    setCompanies(companyList);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleCreateCompany() {
    const name = newCompanyName.trim();
    if (!name) return;
    setCreatingCompany(true);
    const token = await ensureFreshToken();
    if (!token) { window.location.href = '/login'; return; }
    await api.post('/companies', { name }, token);
    setNewCompanyName('');
    setShowNewCompany(false);
    setCreatingCompany(false);
    await load();
  }

  function resetArrayFields() {
    setResponsibilities(['']);
    setRequirements(['']);
    setNiceToHave(['']);
    setIsFeatured(false);
    setScreeningQuestions([]);
  }

  function openCreate() {
    setEditingJob(null);
    setPrefillJob(null);
    resetArrayFields();
    setError(null);
    setShowForm(true);
  }

  function openEdit(job: Job) {
    setEditingJob(job);
    setPrefillJob(job);
    setResponsibilities(job.responsibilities.length ? job.responsibilities : ['']);
    setRequirements(job.requirements.length ? job.requirements : ['']);
    setNiceToHave(job.niceToHave.length ? job.niceToHave : ['']);
    setIsFeatured(job.isFeatured);
    setScreeningQuestions((job.screeningQuestions ?? []).filter((q) => !q.archived).map(draftFromQuestion));
    setError(null);
    setShowForm(true);
  }

  // Clone: prefill every field from an existing posting, but as a NEW job
  // (editingJob stays null, so submit does a POST, not a PATCH) — including
  // dropping each screening question's id, so they're created fresh
  // against the new job instead of accidentally referencing the source
  // job's question rows. Deadline and featured status intentionally reset,
  // since those are usually specific to the original posting.
  function openClone(job: Job) {
    setEditingJob(null);
    setPrefillJob({ ...job, deadline: null });
    setResponsibilities(job.responsibilities.length ? job.responsibilities : ['']);
    setRequirements(job.requirements.length ? job.requirements : ['']);
    setNiceToHave(job.niceToHave.length ? job.niceToHave : ['']);
    setIsFeatured(false);
    setScreeningQuestions(
      (job.screeningQuestions ?? []).filter((q) => !q.archived).map((q) => ({ ...draftFromQuestion(q), id: undefined })),
    );
    setError(null);
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditingJob(null);
    setPrefillJob(null);
    resetArrayFields();
  }

  async function handleCreate(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const fd = new FormData(e.currentTarget);
    try {
      const token = await ensureFreshToken();
      if (!token) { window.location.href = '/login'; return; }
      const deadlineValue = fd.get('deadline') as string;
      const payload = {
        title: fd.get('title'),
        department: fd.get('department'),
        location: fd.get('location'),
        employmentType: fd.get('employmentType'),
        region: fd.get('region'),
        description: fd.get('description'),
        companyId: fd.get('companyId'),
        responsibilities: responsibilities.map((r) => r.trim()).filter(Boolean),
        requirements: requirements.map((r) => r.trim()).filter(Boolean),
        niceToHave: niceToHave.map((r) => r.trim()).filter(Boolean),
        salaryRange: (fd.get('salaryRange') as string) || undefined,
        deadline: deadlineValue || undefined,
        isFeatured,
        screeningQuestions: screeningQuestions
          .filter((q) => q.question.trim())
          .map((q, i) => ({
            id: q.id,
            question: q.question.trim(),
            type: q.type,
            options: q.type === 'MULTIPLE_CHOICE'
              ? q.optionsText.split(',').map((o) => o.trim()).filter(Boolean)
              : [],
            required: q.required,
            order: i,
            disqualifyingAnswer: q.disqualifyingAnswer || undefined,
          })),
      };
      if (editingJob) {
        await api.patch(`/jobs/${editingJob.id}`, payload, token);
      } else {
        await api.post('/jobs', payload, token);
      }
      closeForm();
      (e.target as HTMLFormElement).reset();
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : `Could not ${editingJob ? 'update' : 'create'} job posting.`);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleClose(id: string) {
    const token = await ensureFreshToken();
    if (!token) { window.location.href = '/login'; return; }
    await api.patch(`/jobs/${id}/close`, {}, token);
    await load();
  }

  // Two-step delete: try a plain delete first. If the job has applications
  // attached, the backend blocks it with a 409 and tells us how many —
  // surface that as a confirm() before retrying with force=true, so
  // deleting a job never silently wipes out real candidate data without
  // the admin explicitly seeing the count first.
  async function handleDelete(job: Job) {
    const token = await ensureFreshToken();
    if (!token) { window.location.href = '/login'; return; }
    try {
      await api.delete(`/jobs/${job.id}`, token);
      await load();
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        const applicantCount = job._count?.applications ?? 0;
        const confirmed = window.confirm(
          `"${job.title}" has ${applicantCount} application(s) attached. Deleting it will permanently remove ` +
          `those applications too — this can't be undone. Delete anyway?`,
        );
        if (!confirmed) return;
        await api.delete(`/jobs/${job.id}?force=true`, token);
        await load();
        return;
      }
      alert(err instanceof ApiError ? err.message : 'Could not delete this job posting.');
    }
  }

  const [copiedId, setCopiedId] = useState<string | null>(null);

  function copyApplyLink(job: Job, region: 'uae' | 'india') {
    if (!WEBSITE_URL) {
      alert('NEXT_PUBLIC_WEBSITE_URL is not set — add it in Vercel env vars to enable this.');
      return;
    }
    const url = `${WEBSITE_URL}/${region}/careers?job=${job.id}`;
    navigator.clipboard.writeText(url);
    setCopiedId(`${job.id}-${region}`);
    setTimeout(() => setCopiedId(null), 1500);
  }

  return (
    <div>
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Job postings</h1>
          <p className="text-sm text-ink/50 mt-1">
            Point your website careers page and LinkedIn/Naukri &ldquo;external apply&rdquo; URL at <code className="font-mono text-xs bg-accentSoft px-1 py-0.5">/jobs/[id]</code>.
          </p>
        </div>
        <button
          type="button"
          onClick={() => (showForm ? closeForm() : openCreate())}
          className="bg-beacon-gradient text-white rounded-xl px-4 py-2 text-sm font-medium hover:opacity-90 shadow-sm shadow-accent/25 transition-opacity"
        >
          {showForm ? 'Cancel' : 'New posting'}
        </button>
      </header>

      {showForm && (
        <form onSubmit={handleCreate} className="glass-panel rounded-2xl p-5 mb-8 flex flex-col gap-4">
          {editingJob && (
            <p className="text-sm text-accent bg-accentSoft/50 border border-accent/20 px-3 py-2 rounded-lg">
              Editing &ldquo;{editingJob.title}&rdquo;
            </p>
          )}
          {!editingJob && prefillJob && (
            <p className="text-sm text-accent bg-accentSoft/50 border border-accent/20 px-3 py-2 rounded-lg">
              Cloned from &ldquo;{prefillJob.title}&rdquo; — review and publish as a new posting.
            </p>
          )}
          {companies.length === 0 && (
            <p className="text-sm text-status-review bg-status-review/5 border border-status-review/20 px-3 py-2">
              No hiring entities yet — add one below before you can publish a posting.
            </p>
          )}

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-sm font-medium">Hiring entity</label>
              <button type="button" onClick={() => setShowNewCompany((s) => !s)} className="text-xs text-accent hover:underline">
                {showNewCompany ? 'Cancel' : '+ Add new entity'}
              </button>
            </div>
            {showNewCompany ? (
              <div className="flex gap-2">
                <input
                  value={newCompanyName}
                  onChange={(e) => setNewCompanyName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleCreateCompany(); } }}
                  placeholder="e.g. Catapult Auditing LLC" required
                  className="flex-1 border border-line rounded-xl px-3.5 py-2.5 text-sm focus:border-accent focus:ring-2 focus:ring-accent/20 outline-none transition-shadow" />
                <button type="button" onClick={handleCreateCompany} disabled={creatingCompany}
                        className="bg-beacon-gradient text-white rounded-xl px-3 py-2 text-sm font-medium hover:opacity-90 shadow-sm shadow-accent/25 transition-opacity disabled:opacity-50">
                  {creatingCompany ? 'Adding…' : 'Add'}
                </button>
              </div>
            ) : (
              <select name="companyId" required defaultValue={prefillJob?.companyId ?? ''}
                      className="w-full sm:w-80 border border-line rounded-xl px-3.5 py-2.5 text-sm focus:border-accent focus:ring-2 focus:ring-accent/20 outline-none transition-shadow">
                <option value="" disabled>Select entity…</option>
                {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            )}
            <p className="text-xs text-ink/40 mt-1.5">This name appears on the posting and in candidate emails — not your org name.</p>
          </div>

          <div className="grid sm:grid-cols-3 gap-4">
            <Input label="Title" name="title" required defaultValue={prefillJob?.title} />
            <Input label="Department" name="department" required defaultValue={prefillJob?.department} />
            <Input label="Location" name="location" required defaultValue={prefillJob?.location} />
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1.5">Employment type</label>
              <select name="employmentType" defaultValue={prefillJob?.employmentType ?? 'FULL_TIME'}
                      className="w-full border border-line rounded-xl px-3.5 py-2.5 text-sm focus:border-accent focus:ring-2 focus:ring-accent/20 outline-none transition-shadow">
                <option value="FULL_TIME">Full time</option>
                <option value="PART_TIME">Part time</option>
                <option value="CONTRACT">Contract</option>
                <option value="INTERN">Intern</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Region</label>
              <select name="region" defaultValue={prefillJob?.region ?? 'BOTH'}
                      className="w-full border border-line rounded-xl px-3.5 py-2.5 text-sm focus:border-accent focus:ring-2 focus:ring-accent/20 outline-none transition-shadow">
                <option value="BOTH">Both (UAE + India)</option>
                <option value="UAE">UAE only</option>
                <option value="INDIA">India only</option>
              </select>
              <p className="text-xs text-ink/40 mt-1.5">Controls which regional careers page shows this posting.</p>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Description</label>
            <textarea name="description" required rows={4} defaultValue={prefillJob?.description}
                      className="w-full border border-line rounded-xl px-3.5 py-2.5 text-sm focus:border-accent focus:ring-2 focus:ring-accent/20 outline-none transition-shadow" />
          </div>

          <ArrayField label="Responsibilities" items={responsibilities} setItems={setResponsibilities} />
          <ArrayField label="Requirements" items={requirements} setItems={setRequirements} />
          <ArrayField label="Nice to have" items={niceToHave} setItems={setNiceToHave} />

          <ScreeningQuestionsField items={screeningQuestions} setItems={setScreeningQuestions} />

          <div className="grid sm:grid-cols-2 gap-4">
            <Input label="Salary range (optional)" name="salaryRange" placeholder="e.g. AED 15,000 – 22,000/month" defaultValue={prefillJob?.salaryRange ?? undefined} />
            <div>
              <label className="block text-sm font-medium mb-1.5">Application deadline (optional)</label>
              <input type="date" name="deadline" defaultValue={prefillJob?.deadline ? prefillJob.deadline.slice(0, 10) : undefined} className="w-full border border-line rounded-xl px-3.5 py-2.5 text-sm focus:border-accent focus:ring-2 focus:ring-accent/20 outline-none transition-shadow" />
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={isFeatured} onChange={(e) => setIsFeatured(e.target.checked)} />
            Featured (shown first on the careers page)
          </label>

          {error && <p role="alert" className="text-sm text-status-rejected">{error}</p>}
          <button type="submit" disabled={submitting || companies.length === 0}
                  className="self-start bg-beacon-gradient text-white rounded-xl px-4 py-2 text-sm font-medium hover:opacity-90 shadow-sm shadow-accent/25 transition-opacity disabled:opacity-50">
            {submitting ? (editingJob ? 'Saving…' : 'Publishing…') : (editingJob ? 'Save changes' : 'Publish posting')}
          </button>
        </form>
      )}

      <table className="w-full text-sm glass-panel rounded-2xl overflow-hidden">
        <thead>
          <tr className="bg-lineSoft/60 border-b border-line text-left">
            <th className="font-mono text-[11px] uppercase tracking-wide text-ink/50 font-medium px-4 py-2.5">Title</th>
            <th className="font-mono text-[11px] uppercase tracking-wide text-ink/50 font-medium px-4 py-2.5">Entity</th>
            <th className="font-mono text-[11px] uppercase tracking-wide text-ink/50 font-medium px-4 py-2.5">Department</th>
            <th className="font-mono text-[11px] uppercase tracking-wide text-ink/50 font-medium px-4 py-2.5">Location</th>
            <th className="font-mono text-[11px] uppercase tracking-wide text-ink/50 font-medium px-4 py-2.5">Region</th>
            <th className="font-mono text-[11px] uppercase tracking-wide text-ink/50 font-medium px-4 py-2.5">Applicants</th>
            <th className="font-mono text-[11px] uppercase tracking-wide text-ink/50 font-medium px-4 py-2.5">Status</th>
            <th className="px-4 py-2.5" />
          </tr>
        </thead>
        <tbody>
          {jobs.map((job, i) => (
            <tr key={job.id} className={['border-b border-lineSoft last:border-b-0', i % 2 === 1 ? 'bg-lineSoft/20' : ''].join(' ')}>
              <td className="px-4 py-3 font-medium">
                {job.title}
                {job.isFeatured && <span className="ml-2 text-[10px] font-mono uppercase text-status-review">★ Featured</span>}
              </td>
              <td className="px-4 py-3 text-ink/60">{job.company?.name ?? '—'}</td>
              <td className="px-4 py-3 text-ink/60">{job.department}</td>
              <td className="px-4 py-3 text-ink/60">{job.location}</td>
              <td className="px-4 py-3 text-ink/60 text-xs font-mono uppercase">{job.region}</td>
              <td className="px-4 py-3 text-ink/60">{job._count?.applications ?? 0}</td>
              <td className="px-4 py-3">
                {job.isActive
                  ? <span className="text-xs font-mono uppercase text-status-hired">Open</span>
                  : <span className="text-xs font-mono uppercase text-ink/40">Closed</span>}
              </td>
              <td className="px-4 py-3 text-right">
                <div className="flex items-center justify-end gap-3">
                  {job.isActive && job.region !== 'INDIA' && (
                    <button type="button" onClick={() => copyApplyLink(job, 'uae')} className="text-xs text-accent hover:underline">
                      {copiedId === `${job.id}-uae` ? 'Copied!' : 'Copy UAE link'}
                    </button>
                  )}
                  {job.isActive && job.region !== 'UAE' && (
                    <button type="button" onClick={() => copyApplyLink(job, 'india')} className="text-xs text-accent hover:underline">
                      {copiedId === `${job.id}-india` ? 'Copied!' : 'Copy India link'}
                    </button>
                  )}
                  {job.isActive && (
                    <button type="button" onClick={() => handleClose(job.id)} className="text-sm text-status-rejected hover:underline">
                      Close
                    </button>
                  )}
                  <button type="button" onClick={() => openEdit(job)} className="text-sm text-accent hover:underline">
                    Edit
                  </button>
                  <button type="button" onClick={() => openClone(job)} className="text-sm text-accent hover:underline">
                    Clone
                  </button>
                  <button type="button" onClick={() => handleDelete(job)} className="text-sm text-status-rejected hover:underline">
                    Delete
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Input({ label, name, required, placeholder, defaultValue }: { label: string; name: string; required?: boolean; placeholder?: string; defaultValue?: string }) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1.5">{label}</label>
      <input name={name} required={required} placeholder={placeholder} defaultValue={defaultValue}
             className="w-full border border-line rounded-xl px-3.5 py-2.5 text-sm focus:border-accent focus:ring-2 focus:ring-accent/20 outline-none transition-shadow" />
    </div>
  );
}

// Strips common bullet/numbering markers ("- ", "• ", "1. ", "a) " etc.) off
// a pasted line so re-splitting doesn't leave the original bullet glyph
// baked into the text alongside our own list rendering.
function stripBulletPrefix(line: string): string {
  return line
    .replace(/^[\s]*[-*•▪◦‣·]\s+/, '')
    .replace(/^[\s]*\d+[.)]\s+/, '')
    .replace(/^[\s]*[a-zA-Z][.)]\s+/, '')
    .trim();
}

function ArrayField({
  label, items, setItems,
}: { label: string; items: string[]; setItems: (items: string[]) => void }) {
  function update(i: number, value: string) {
    setItems(items.map((item, idx) => (idx === i ? value : item)));
  }
  function add() {
    setItems([...items, '']);
  }
  function remove(i: number) {
    setItems(items.length > 1 ? items.filter((_, idx) => idx !== i) : ['']);
  }

  // Pasting several points at once (copied from a doc, JD, email, etc.) is
  // the common case — split on line breaks and drop each line into its own
  // bullet automatically, instead of dumping the whole block into one box.
  function handlePaste(i: number, e: React.ClipboardEvent<HTMLInputElement>) {
    const text = e.clipboardData.getData('text');
    const lines = text.split(/\r?\n/).map(stripBulletPrefix).filter(Boolean);
    if (lines.length <= 1) return; // single line — let the browser paste normally

    e.preventDefault();
    const newItems = [...items];
    newItems[i] = lines[0];
    newItems.splice(i + 1, 0, ...lines.slice(1));
    setItems(newItems);
  }

  return (
    <div>
      <label className="block text-sm font-medium mb-1.5">{label} <span className="text-ink/40 font-normal">(optional)</span></label>
      {items.map((item, i) => (
        <div key={i} className="flex gap-2 mb-2 items-center">
          <span className="text-ink/30 select-none">•</span>
          <input
            value={item}
            onChange={(e) => update(i, e.target.value)}
            onPaste={(e) => handlePaste(i, e)}
            placeholder={`Add ${label.toLowerCase()} item, or paste a whole list…`}
            className="flex-1 border border-line rounded-xl px-3.5 py-2.5 text-sm focus:border-accent focus:ring-2 focus:ring-accent/20 outline-none transition-shadow"
          />
          {items.length > 1 && (
            <button type="button" onClick={() => remove(i)} className="px-2.5 text-status-rejected border border-line hover:border-status-rejected">×</button>
          )}
        </div>
      ))}
      <button type="button" onClick={add} className="text-xs text-accent hover:underline">+ Add item</button>
    </div>
  );
}
