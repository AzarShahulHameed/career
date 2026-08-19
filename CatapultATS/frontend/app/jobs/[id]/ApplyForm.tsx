'use client';

import { useState, FormEvent } from 'react';
import { ApiError, ScreeningQuestion } from '@/lib/api';
import { PhoneField } from '@/components/PhoneField';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';

export function ApplyForm({ jobId, screeningQuestions = [] }: { jobId: string; screeningQuestions?: ScreeningQuestion[] }) {
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    // Required screening questions block submission client-side too, not
    // just on the backend — no reason to make someone wait for a resume
    // upload just to find out they skipped a required question.
    const missing = screeningQuestions.filter((q) => q.required && !(answers[q.id] ?? '').trim());
    if (missing.length > 0) {
      setError(`Please answer: ${missing.map((q) => q.question).join('; ')}`);
      return;
    }

    setSubmitting(true);

    const form = e.currentTarget;
    const formData = new FormData(form);
    formData.set('jobId', jobId);
    formData.set(
      'screeningAnswers',
      JSON.stringify(screeningQuestions.map((q) => ({ questionId: q.id, answer: answers[q.id] ?? '' })).filter((a) => a.answer)),
    );

    // Optional text fields still arrive as '' when left blank — strip them
    // so the backend treats "not provided" as absent, not an empty string
    // that fails URL validation on linkedinUrl/portfolioUrl.
    for (const key of ['phone', 'nationality', 'currentLocation', 'currentRole', 'yearsExperience', 'linkedinUrl', 'portfolioUrl', 'coverLetterText']) {
      if (formData.get(key) === '') formData.delete(key);
    }

    try {
      const res = await fetch(`${API_URL}/applications`, { method: 'POST', body: formData });
      if (!res.ok) {
        const body = await res.json().catch(() => ({ message: 'Something went wrong' }));
        throw new ApiError(res.status, body.message ?? 'Something went wrong');
      }
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not submit your application. Try again.');
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="border border-status-hired/30 bg-status-hired/5 p-6">
        <p className="font-medium text-status-hired">Application received.</p>
        <p className="text-sm text-ink/70 mt-1">
          Check your email for confirmation — we&apos;ll update you at every stage from here.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <Field label="Full name" name="candidateName" required />
        <Field label="Email" name="email" type="email" required />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <PhoneField />
        <Field label="Nationality" name="nationality" optional />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <Field label="Current location" name="currentLocation" optional />
        <Field label="Current role" name="currentRole" optional />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <Field label="Years of experience" name="yearsExperience" placeholder="e.g. 3-5 years" optional />
        <div>
          <label className="block text-sm font-medium mb-1.5">How did you find this role?</label>
          <select
            name="source"
            required
            className="w-full border border-line rounded-xl px-3.5 py-2.5 text-sm bg-white focus:border-accent focus:ring-2 focus:ring-accent/20 outline-none transition-shadow"
            defaultValue="website"
          >
            <option value="website">Company website</option>
            <option value="linkedin">LinkedIn</option>
            <option value="naukri">Naukri</option>
            <option value="referral">Referral</option>
            <option value="other">Other</option>
          </select>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <Field label="LinkedIn URL" name="linkedinUrl" type="url" placeholder="https://linkedin.com/in/..." optional />
        <Field label="Portfolio URL" name="portfolioUrl" type="url" placeholder="https://..." optional />
      </div>

      {screeningQuestions.length > 0 && (
        <div className="flex flex-col gap-5 border-t border-line pt-5">
          {screeningQuestions.map((q) => (
            <ScreeningQuestionField
              key={q.id}
              question={q}
              value={answers[q.id] ?? ''}
              onChange={(v) => setAnswers((prev) => ({ ...prev, [q.id]: v }))}
            />
          ))}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium mb-1.5">Resume (PDF or Word, max 5MB)</label>
        <input
          type="file"
          name="resume"
          required
          accept=".pdf,.doc,.docx"
          className="w-full text-sm file:mr-3 file:border-0 file:bg-accentSoft file:text-accent file:px-3 file:py-2 file:text-sm file:font-medium"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1.5">Cover letter file (optional)</label>
        <input
          type="file"
          name="coverLetter"
          accept=".pdf,.doc,.docx"
          className="w-full text-sm file:mr-3 file:border-0 file:bg-accentSoft file:text-accent file:px-3 file:py-2 file:text-sm file:font-medium"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1.5">Or paste a short cover note (optional)</label>
        <textarea
          name="coverLetterText"
          rows={4}
          className="w-full border border-line rounded-xl px-3.5 py-2.5 text-sm focus:border-accent focus:ring-2 focus:ring-accent/20 outline-none transition-shadow"
        />
      </div>

      {error && (
        <p role="alert" className="text-sm text-status-rejected">{error}</p>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="self-start bg-beacon-gradient text-white rounded-xl px-5 py-2.5 text-sm font-medium hover:opacity-90 shadow-sm shadow-accent/25 transition-opacity disabled:opacity-50"
      >
        {submitting ? 'Submitting…' : 'Submit application'}
      </button>
    </form>
  );
}

function Field({
  label, name, type = 'text', required = false, placeholder, optional = false,
}: { label: string; name: string; type?: string; required?: boolean; placeholder?: string; optional?: boolean }) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1.5">
        {label} {optional && <span className="text-ink/40 font-normal">(optional)</span>}
      </label>
      <input
        type={type}
        name={name}
        required={required}
        placeholder={placeholder}
        className="w-full border border-line rounded-xl px-3.5 py-2.5 text-sm focus:border-accent focus:ring-2 focus:ring-accent/20 outline-none transition-shadow"
      />
    </div>
  );
}

function ScreeningQuestionField({
  question, value, onChange,
}: { question: ScreeningQuestion; value: string; onChange: (v: string) => void }) {
  const label = (
    <label className="block text-sm font-medium mb-1.5">
      {question.question} {!question.required && <span className="text-ink/40 font-normal">(optional)</span>}
    </label>
  );

  if (question.type === 'YES_NO') {
    return (
      <div>
        {label}
        <div className="flex gap-4">
          {['Yes', 'No'].map((opt) => (
            <label key={opt} className="flex items-center gap-1.5 text-sm">
              <input
                type="radio"
                name={`screening-${question.id}`}
                checked={value === opt}
                onChange={() => onChange(opt)}
              />
              {opt}
            </label>
          ))}
        </div>
      </div>
    );
  }

  if (question.type === 'MULTIPLE_CHOICE') {
    return (
      <div>
        {label}
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full border border-line rounded-xl px-3.5 py-2.5 text-sm bg-white focus:border-accent focus:ring-2 focus:ring-accent/20 outline-none transition-shadow"
        >
          <option value="">Select…</option>
          {question.options.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
      </div>
    );
  }

  return (
    <div>
      {label}
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={2}
        className="w-full border border-line rounded-xl px-3.5 py-2.5 text-sm focus:border-accent focus:ring-2 focus:ring-accent/20 outline-none transition-shadow"
      />
    </div>
  );
}
