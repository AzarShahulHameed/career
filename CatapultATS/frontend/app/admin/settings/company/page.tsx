'use client';

import { useEffect, useState, useCallback, FormEvent } from 'react';
import { api, Settings, ApiError } from '@/lib/api';
import { ensureFreshToken } from '@/lib/auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';

export default function CompanySettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [atsEnabled, setAtsEnabled] = useState(false);
  const [atsThreshold, setAtsThreshold] = useState(50);
  const [savingAts, setSavingAts] = useState(false);
  const [atsSaved, setAtsSaved] = useState(false);

  const load = useCallback(async () => {
    const token = await ensureFreshToken();
    if (!token) { window.location.href = '/login'; return; }
    const result = await api.get<Settings>('/settings', token);
    setSettings(result);
    setAtsEnabled(result.atsEnabled);
    setAtsThreshold(result.atsPassThreshold);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleSave(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    setSaving(true);
    const fd = new FormData(e.currentTarget);
    try {
      const token = await ensureFreshToken();
      if (!token) { window.location.href = '/login'; return; }
      await api.patch('/settings', {
        companyName: fd.get('companyName'),
        senderEmail: fd.get('senderEmail') || undefined,
      }, token);
      setSaved(true);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not save settings.');
    } finally {
      setSaving(false);
    }
  }

  async function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingLogo(true);
    setError(null);
    try {
      const token = await ensureFreshToken();
      if (!token) { window.location.href = '/login'; return; }
      const fd = new FormData();
      fd.set('logo', file);
      const res = await fetch(`${API_URL}/settings/logo`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({ message: 'Upload failed' }));
        throw new ApiError(res.status, body.message ?? 'Upload failed');
      }
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not upload logo.');
    } finally {
      setUploadingLogo(false);
    }
  }

  async function handleSaveAts() {
    setError(null);
    setAtsSaved(false);
    setSavingAts(true);
    try {
      const token = await ensureFreshToken();
      if (!token) { window.location.href = '/login'; return; }
      await api.patch('/settings', { atsEnabled, atsPassThreshold: atsThreshold }, token);
      setAtsSaved(true);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not save ATS settings.');
    } finally {
      setSavingAts(false);
    }
  }

  if (!settings) return <p className="text-sm text-ink/40">Loading…</p>;

  return (
    <div>
      <div className="mb-6 pb-4 border-b border-line">
        <h1 className="text-xl font-semibold tracking-tight">Company profile</h1>
        <p className="text-sm text-ink/50 mt-1">This name and logo appear on candidate-facing emails and the careers site.</p>
      </div>

      <div className="glass-panel rounded-2xl p-6 mb-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-ink/50 mb-4">Logo</h2>
        <div className="flex items-center gap-5">
          <div className="h-16 w-40 border border-line flex items-center justify-center bg-lineSoft/30 shrink-0 overflow-hidden p-2">
            {settings.logoUrl
              ? <img src={settings.logoUrl} alt="Company logo" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
              : <span className="text-ink/30 text-xs font-mono">None</span>}
          </div>
          <div>
            <label className="text-sm font-medium bg-white border border-line px-4 py-2 cursor-pointer hover:border-accent inline-block">
              {uploadingLogo ? 'Uploading…' : 'Upload logo'}
              <input type="file" accept="image/*" onChange={handleLogoChange} disabled={uploadingLogo} className="hidden" />
            </label>
            <p className="text-xs text-ink/40 mt-1.5">PNG or JPG, under 2MB.</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSave} className="glass-panel rounded-2xl p-6 flex flex-col gap-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-ink/50">Details</h2>
        <div>
          <label className="block text-sm font-medium mb-1.5">Company name</label>
          <input name="companyName" defaultValue={settings.companyName} required
                 className="w-full sm:w-80 border border-line rounded-xl px-3.5 py-2.5 text-sm focus:border-accent focus:ring-2 focus:ring-accent/20 outline-none transition-shadow" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5">Sender email (for status notifications)</label>
          <input name="senderEmail" type="email" defaultValue={settings.senderEmail ?? ''} placeholder="careers@yourcompany.com"
                 className="w-full sm:w-80 border border-line rounded-xl px-3.5 py-2.5 text-sm focus:border-accent focus:ring-2 focus:ring-accent/20 outline-none transition-shadow" />
          <p className="text-xs text-ink/40 mt-1.5">Must be on a domain verified in your Resend account, or emails won&apos;t send.</p>
        </div>

        {error && <p role="alert" className="text-sm text-status-rejected">{error}</p>}
        {saved && <p className="text-sm text-status-hired">Saved.</p>}

        <button type="submit" disabled={saving}
                className="self-start text-sm font-medium bg-beacon-gradient text-white rounded-xl px-4 py-2 hover:opacity-90 shadow-sm shadow-accent/25 transition-opacity disabled:opacity-50">
          {saving ? 'Saving…' : 'Save changes'}
        </button>
      </form>

      <div className="glass-panel rounded-2xl p-6 mt-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-ink/50 mb-1">ATS auto-screening</h2>
        <p className="text-sm text-ink/50 mb-4">
          Automatically score every applicant against each job&apos;s requirements and screening questions. Anyone
          below the threshold (or who fails a disqualifying screening question) is moved straight to &ldquo;Not
          selected&rdquo; — a reviewer can still bring them back manually from the application detail page.
        </p>

        <label className="flex items-center gap-2 text-sm mb-4">
          <input type="checkbox" checked={atsEnabled} onChange={(e) => setAtsEnabled(e.target.checked)} />
          Enable ATS auto-screening
        </label>

        <div className="flex items-center gap-3 mb-4">
          <label className="text-sm font-medium">Pass threshold</label>
          <input
            type="number" min={0} max={100} value={atsThreshold}
            onChange={(e) => setAtsThreshold(Number(e.target.value))}
            disabled={!atsEnabled}
            className="w-20 border border-line rounded-lg px-2.5 py-1.5 text-sm disabled:opacity-40 focus:border-accent focus:ring-2 focus:ring-accent/20 outline-none"
          />
          <span className="text-sm text-ink/50">% requirement match required to pass</span>
        </div>

        {atsSaved && <p className="text-sm text-status-hired mb-3">Saved.</p>}
        <button type="button" onClick={handleSaveAts} disabled={savingAts}
                className="self-start text-sm font-medium bg-beacon-gradient text-white rounded-xl px-4 py-2 hover:opacity-90 shadow-sm shadow-accent/25 transition-opacity disabled:opacity-50">
          {savingAts ? 'Saving…' : 'Save ATS settings'}
        </button>
      </div>
    </div>
  );
}
