'use client';

import { ScreeningQuestion, ScreeningQuestionType } from '@/lib/api';

// The shape the job form works with locally — same fields as
// ScreeningQuestion, but options as a single comma-separated string while
// editing (simpler than a nested array-of-arrays input) and no `archived`,
// since the form never needs to touch that directly.
export interface DraftQuestion {
  id?: string;
  question: string;
  type: ScreeningQuestionType;
  optionsText: string;
  required: boolean;
  disqualifyingAnswer: string;
}

export function draftFromQuestion(q: ScreeningQuestion): DraftQuestion {
  return {
    id: q.id,
    question: q.question,
    type: q.type,
    optionsText: q.options.join(', '),
    required: q.required,
    disqualifyingAnswer: q.disqualifyingAnswer ?? '',
  };
}

export function emptyDraftQuestion(): DraftQuestion {
  return { question: '', type: 'TEXT', optionsText: '', required: true, disqualifyingAnswer: '' };
}

export function ScreeningQuestionsField({
  items, setItems,
}: { items: DraftQuestion[]; setItems: (items: DraftQuestion[]) => void }) {
  function update(i: number, patch: Partial<DraftQuestion>) {
    setItems(items.map((item, idx) => (idx === i ? { ...item, ...patch } : item)));
  }
  function add() {
    setItems([...items, emptyDraftQuestion()]);
  }
  function remove(i: number) {
    setItems(items.filter((_, idx) => idx !== i));
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <label className="block text-sm font-medium">
          Screening questions <span className="text-ink/40 font-normal">(optional)</span>
        </label>
      </div>
      <p className="text-xs text-ink/40 mb-3">
        Asked on the apply form for this role. Set a disqualifying answer (e.g. a &ldquo;Yes/No&rdquo; question where
        &ldquo;No&rdquo; should rule someone out) to have the ATS engine auto-screen on it.
      </p>

      <div className="flex flex-col gap-3">
        {items.map((q, i) => (
          <div key={i} className="border border-line rounded-xl p-3.5 flex flex-col gap-2.5 bg-white/50">
            <div className="flex gap-2">
              <input
                value={q.question}
                onChange={(e) => update(i, { question: e.target.value })}
                placeholder="e.g. Are you authorized to work in the UAE?"
                className="flex-1 border border-line rounded-lg px-3 py-2 text-sm focus:border-accent focus:ring-2 focus:ring-accent/20 outline-none transition-shadow"
              />
              <button type="button" onClick={() => remove(i)} className="px-2.5 text-status-rejected border border-line rounded-lg hover:border-status-rejected">×</button>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <select
                value={q.type}
                onChange={(e) => update(i, { type: e.target.value as ScreeningQuestionType, disqualifyingAnswer: '' })}
                className="border border-line rounded-lg px-2.5 py-1.5 text-xs font-mono uppercase tracking-wide bg-white"
              >
                <option value="TEXT">Free text</option>
                <option value="YES_NO">Yes / No</option>
                <option value="MULTIPLE_CHOICE">Multiple choice</option>
              </select>

              <label className="flex items-center gap-1.5 text-xs text-ink/60">
                <input type="checkbox" checked={q.required} onChange={(e) => update(i, { required: e.target.checked })} />
                Required
              </label>
            </div>

            {q.type === 'MULTIPLE_CHOICE' && (
              <input
                value={q.optionsText}
                onChange={(e) => update(i, { optionsText: e.target.value })}
                placeholder="Options, comma-separated — e.g. 0-2 years, 3-5 years, 5+ years"
                className="border border-line rounded-lg px-3 py-2 text-sm focus:border-accent focus:ring-2 focus:ring-accent/20 outline-none transition-shadow"
              />
            )}

            {q.type === 'YES_NO' && (
              <div className="flex items-center gap-2 text-xs">
                <span className="text-ink/50">Disqualify if answer is</span>
                <select
                  value={q.disqualifyingAnswer}
                  onChange={(e) => update(i, { disqualifyingAnswer: e.target.value })}
                  className="border border-line rounded-lg px-2 py-1 bg-white"
                >
                  <option value="">— never (informational only) —</option>
                  <option value="Yes">Yes</option>
                  <option value="No">No</option>
                </select>
              </div>
            )}

            {q.type === 'MULTIPLE_CHOICE' && q.optionsText.trim() && (
              <div className="flex items-center gap-2 text-xs">
                <span className="text-ink/50">Disqualify if answer is</span>
                <select
                  value={q.disqualifyingAnswer}
                  onChange={(e) => update(i, { disqualifyingAnswer: e.target.value })}
                  className="border border-line rounded-lg px-2 py-1 bg-white"
                >
                  <option value="">— never (informational only) —</option>
                  {q.optionsText.split(',').map((o) => o.trim()).filter(Boolean).map((o) => (
                    <option key={o} value={o}>{o}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
        ))}
      </div>

      <button type="button" onClick={add} className="text-xs text-accent hover:underline mt-2">+ Add question</button>
    </div>
  );
}
