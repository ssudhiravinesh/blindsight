/**
 * Jev (TypeSafe AI System One) verification of LLM analyses.
 *
 * The LLM writes the human-facing parts (quotes, explanations, opt-outs); Jev
 * answers typed questions about them with calibrated probabilities:
 *   - is each reported clause actually in the document? (Noul)
 *   - how severe is each clause, and the document overall? (Score, tiers 0-3)
 * Docs: https://docs.typesafe.ai/cookbooks/verify_llm_outputs.md
 *
 * Pure apart from fetch, so the extension's tests can import it too.
 */
import type { Analysis, AnalysisClause } from "./analysis.ts";

export const JEV_API_URL = "https://api.typesafe.ai/v1/systemone";
// Pinned rather than "jev-latest": the thresholds below were chosen against this version.
export const DEFAULT_JEV_MODEL = "jev-1.14.0";
const JEV_TIMEOUT_MS = 20_000;

// ---------------------------------------------------------------------------
// Typed wire format
// ---------------------------------------------------------------------------

export interface ScoreQuestion {
  type: "score";
  instructions: string | Record<string, unknown>;
  criteria: string[];
}

export interface NoulQuestion {
  type: "noul";
  instructions: string | Record<string, unknown>;
  criteria?: { true: string; false: string };
}

export type JevQuestion = ScoreQuestion | NoulQuestion;

export interface ScoreAnswer {
  type: "score";
  score: number;
  confidence: number;
  probabilities: Record<string, number>;
}

export interface NoulAnswer {
  type: "noul";
  noul: number;
}

export type AnswerFor<Q extends JevQuestion> = Q extends ScoreQuestion ? ScoreAnswer : NoulAnswer;

export interface JevResult<Qs extends Record<string, JevQuestion>> {
  model: string;
  answers: { [K in keyof Qs]: AnswerFor<Qs[K]> };
}

const unit = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v) && v >= 0 && v <= 1;

/** Checks the response against the questions that were asked; never trusts the shape blindly. */
export function parseJevResponse<Qs extends Record<string, JevQuestion>>(questions: Qs, raw: unknown): JevResult<Qs> {
  if (!raw || typeof raw !== "object") throw new Error("Jev response is not an object");
  const { model, answers } = raw as { model?: unknown; answers?: Record<string, unknown> };
  if (!answers || typeof answers !== "object") throw new Error("Jev response has no answers");

  const out: Record<string, ScoreAnswer | NoulAnswer> = {};
  for (const [key, q] of Object.entries(questions)) {
    const a = answers[key] as Record<string, unknown> | undefined;
    if (!a || a.type !== q.type) throw new Error(`Jev answer "${key}" is missing or mistyped`);
    if (q.type === "noul") {
      if (!unit(a.noul)) throw new Error(`Jev answer "${key}" has an invalid probability`);
      out[key] = { type: "noul", noul: a.noul };
    } else {
      const max = q.criteria.length - 1;
      const score = a.score;
      if (typeof score !== "number" || !Number.isFinite(score) || score < 0 || score > max || !unit(a.confidence)) {
        throw new Error(`Jev answer "${key}" has an invalid score`);
      }
      const probabilities = a.probabilities && typeof a.probabilities === "object"
        ? a.probabilities as Record<string, number>
        : {};
      out[key] = { type: "score", score, confidence: a.confidence, probabilities };
    }
  }
  return {
    model: typeof model === "string" && model ? model.slice(0, 40) : "jev",
    answers: out as JevResult<Qs>["answers"],
  };
}

export async function systemOne<Qs extends Record<string, JevQuestion>>(
  apiKey: string,
  request: { state: unknown; questions: Qs; model?: string },
  fetchImpl: typeof fetch = fetch,
): Promise<JevResult<Qs>> {
  const res = await fetchImpl(JEV_API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      state: request.state,
      model: request.model ?? DEFAULT_JEV_MODEL,
      questions: request.questions,
    }),
    signal: AbortSignal.timeout(JEV_TIMEOUT_MS),
  });
  if (!res.ok) {
    await res.body?.cancel();
    throw new Error(`Jev HTTP ${res.status}`);
  }
  return parseJevResponse(request.questions, await res.json());
}

// ---------------------------------------------------------------------------
// ToS verification
// ---------------------------------------------------------------------------

/** Same scale as the LLM prompt's severity tiers, so scores map 1:1 onto grades. */
const SEVERITY_CRITERIA = [
  "Standard: ordinary, industry-normal terms with nothing a typical user would object to",
  "Notable: common practice worth knowing (e.g. first-party ads, arbitration with a 30+ day opt-out, notice before changes)",
  "Cautionary: beyond industry norms (e.g. data shared with third-party ad networks or brokers, broad sublicensing or AI training without opt-out, changes with little or no notice, obstructed cancellation)",
  "Critical: aggressive or exploitative (e.g. selling personal data, perpetual irrevocable ownership-like content rights, waiving statutory rights, no way to opt out or leave)",
];

/** Below this a reported clause is treated as hallucinated or injected and dropped. */
export const PRESENCE_DROP_BELOW = 0.1;
/** Jev's severity only replaces the LLM's when it is at least this confident. */
export const MIN_SEVERITY_CONFIDENCE = 0.5;

export function buildVerificationRequest(tosText: string, analysis: Analysis) {
  const questions: Record<string, JevQuestion> = {
    overall: {
      type: "score",
      instructions: "How harmful are these terms of service to an ordinary user, judged by the worst provisions they contain?",
      criteria: SEVERITY_CRITERIA,
    },
  };
  analysis.clauses.forEach((c, i) => {
    const finding = { type: c.type, quote: c.quote ?? null, explanation: c.explanation };
    questions[`clause_${i}_present`] = {
      type: "noul",
      instructions: { question: "Does terms_of_service actually contain the provision this finding describes?", finding },
      criteria: {
        true: "The document states this provision, in these or equivalent words",
        false: "The document does not say this, or says something materially different",
      },
    };
    questions[`clause_${i}_severity`] = {
      type: "score",
      instructions: { question: "How harmful to an ordinary user is the provision this finding describes?", finding },
      criteria: SEVERITY_CRITERIA,
    };
  });
  // The document goes in state, never in instructions, so it is only ever evaluated as data.
  return { state: { terms_of_service: tosText }, questions };
}

// Two independent models must roughly agree: Jev can move a grade by at most one tier,
// so neither a hallucinating LLM nor an injected document can swing a result end to end.
function calibrate(llm: number, answer: ScoreAnswer | undefined): number {
  if (!answer || answer.confidence < MIN_SEVERITY_CONFIDENCE) return llm;
  const jev = Math.round(answer.score);
  return Math.max(0, Math.min(3, Math.max(llm - 1, Math.min(llm + 1, jev))));
}

const round2 = (n: number) => Math.round(n * 100) / 100;

export function applyVerification(analysis: Analysis, result: JevResult<Record<string, JevQuestion>>): Analysis {
  const answers = result.answers as Record<string, ScoreAnswer | NoulAnswer | undefined>;
  const clauses: AnalysisClause[] = [];
  analysis.clauses.forEach((c, i) => {
    const present = answers[`clause_${i}_present`] as NoulAnswer | undefined;
    if (present && present.noul < PRESENCE_DROP_BELOW) return;
    const sev = answers[`clause_${i}_severity`] as ScoreAnswer | undefined;
    clauses.push({
      ...c,
      severity: calibrate(c.severity, sev),
      ...(sev ? { confidence: round2(sev.confidence) } : {}),
    });
  });

  const overallAnswer = answers.overall as ScoreAnswer | undefined;
  // The grade can never look safer than the worst finding that survived verification.
  const worstClause = clauses.reduce((m, c) => Math.max(m, c.severity), 0);
  const overallSeverity = Math.max(worstClause, calibrate(analysis.overallSeverity, overallAnswer));

  return {
    ...analysis,
    overallSeverity,
    clauses,
    verification: {
      model: result.model,
      confidence: overallAnswer ? round2(overallAnswer.confidence) : 0,
      droppedClauses: analysis.clauses.length - clauses.length,
    },
  };
}

/**
 * Verifies an analysis with Jev. Verification is an enhancement: any failure
 * returns the (already validated) LLM analysis unchanged.
 */
export async function verifyAnalysis(
  apiKey: string,
  tosText: string,
  analysis: Analysis,
  opts: { model?: string; fetchImpl?: typeof fetch } = {},
): Promise<Analysis> {
  try {
    const request = buildVerificationRequest(tosText, analysis);
    const result = await systemOne(apiKey, { ...request, model: opts.model }, opts.fetchImpl);
    return applyVerification(analysis, result);
  } catch (err) {
    console.error("Jev verification failed:", (err as Error).message);
    return analysis;
  }
}
