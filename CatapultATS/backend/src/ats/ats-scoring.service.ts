import { Injectable } from '@nestjs/common';

export interface AtsBreakdown {
  matchedRequirements: string[];
  missingRequirements: string[];
  matchedNiceToHave: string[];
  missingNiceToHave: string[];
  disqualifiedReason?: string;
  resumeTextAvailable: boolean;
}

export interface AtsResult {
  score: number; // 0-100
  disqualified: boolean;
  breakdown: AtsBreakdown;
}

// Common English filler words that would otherwise pollute keyword
// matching (e.g. "experience with" matching on "with" against almost any
// resume). Not exhaustive — just enough to keep the signal meaningful.
const STOPWORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'of', 'to', 'in', 'on', 'for', 'with', 'is',
  'are', 'be', 'as', 'at', 'by', 'from', 'this', 'that', 'you', 'your',
  'our', 'we', 'will', 'have', 'has', 'can', 'must', 'should', 'able',
  'strong', 'good', 'excellent', 'plus', 'etc', 'years', 'year', 'experience',
]);

function extractKeywords(line: string): string[] {
  return line
    .toLowerCase()
    .replace(/[^a-z0-9+.#\s]/g, ' ') // keep things like "c++", "node.js", "c#"
    .split(/\s+/)
    .map((w) => w.trim())
    .filter((w) => w.length > 2 && !STOPWORDS.has(w));
}

@Injectable()
export class AtsScoringService {
  // requirements are weighted more heavily than niceToHave — missing a
  // "nice to have" shouldn't sink a score the way missing a hard
  // requirement should.
  private readonly REQUIREMENTS_WEIGHT = 0.75;
  private readonly NICE_TO_HAVE_WEIGHT = 0.25;

  score(params: {
    resumeText: string | null;
    requirements: string[];
    niceToHave: string[];
    screeningAnswers: { question: string; answer: string; disqualifyingAnswer: string | null }[];
  }): AtsResult {
    const { resumeText, requirements, niceToHave, screeningAnswers } = params;

    // A disqualifying screening answer overrides everything else — no point
    // scoring resume text if the candidate has already ruled themselves out
    // on a hard requirement like work authorization.
    const disqualifyingAnswer = screeningAnswers.find(
      (a) => a.disqualifyingAnswer && a.answer.trim().toLowerCase() === a.disqualifyingAnswer.trim().toLowerCase(),
    );
    if (disqualifyingAnswer) {
      return {
        score: 0,
        disqualified: true,
        breakdown: {
          matchedRequirements: [],
          missingRequirements: requirements,
          matchedNiceToHave: [],
          missingNiceToHave: niceToHave,
          disqualifiedReason: `Screening answer disqualified: "${disqualifyingAnswer.question}" → "${disqualifyingAnswer.answer}"`,
          resumeTextAvailable: !!resumeText,
        },
      };
    }

    if (!resumeText || !resumeText.trim()) {
      // No requirements to check against, or no extractable text — don't
      // penalize the candidate for a parsing limitation (e.g. a scanned/
      // image-only PDF, or a legacy .doc file). Score comes back null-ish
      // via the caller checking resumeTextAvailable, not a hard zero.
      return {
        score: requirements.length === 0 ? 100 : 0,
        disqualified: false,
        breakdown: {
          matchedRequirements: [],
          missingRequirements: requirements,
          matchedNiceToHave: [],
          missingNiceToHave: niceToHave,
          resumeTextAvailable: false,
        },
      };
    }

    const resumeWords = new Set(extractKeywords(resumeText));

    const matchLine = (line: string) => {
      const keywords = extractKeywords(line);
      if (keywords.length === 0) return true; // nothing meaningful to check — don't penalize
      const matchedCount = keywords.filter((k) => resumeWords.has(k)).length;
      return matchedCount / keywords.length >= 0.5; // majority of a line's keywords present
    };

    const matchedRequirements = requirements.filter(matchLine);
    const missingRequirements = requirements.filter((r) => !matchedRequirements.includes(r));
    const matchedNiceToHave = niceToHave.filter(matchLine);
    const missingNiceToHave = niceToHave.filter((n) => !matchedNiceToHave.includes(n));

    const reqScore = requirements.length ? matchedRequirements.length / requirements.length : 1;
    const niceScore = niceToHave.length ? matchedNiceToHave.length / niceToHave.length : 1;

    const combined = requirements.length || niceToHave.length
      ? reqScore * this.REQUIREMENTS_WEIGHT + niceScore * this.NICE_TO_HAVE_WEIGHT
      : 1; // nothing to score against — don't fail the candidate for a bare-bones posting

    return {
      score: Math.round(combined * 100),
      disqualified: false,
      breakdown: {
        matchedRequirements,
        missingRequirements,
        matchedNiceToHave,
        missingNiceToHave,
        resumeTextAvailable: true,
      },
    };
  }
}
