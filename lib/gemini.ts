// lib/gemini.ts
import { GoogleGenAI } from "@google/genai";

function getGenAI() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is required");
  return new GoogleGenAI({ apiKey });
}

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface CandidateThread {
  threadId: string;
  title: string;
  aiSummary: string;
}

/**
 * Gemini returns one of these shapes:
 *
 * MATCH  – the issue fits one or more existing threads.
 *   matchedThreadIds  – the thread IDs (1+) the issue belongs to.
 *   updatedSummaries  – optional per-thread summary refinements. Only
 *                       present when the new issue adds meaningful new
 *                       information to an existing thread.
 *
 * CREATE – no existing thread is a good fit; create a brand-new one
 *          (the issue may ALSO match existing threads).
 *   newThreadTitle    – short, clear AI-generated title.
 *   newThreadSummary  – 1-2 sentence summary of the new thread.
 *   alsoMatchedThreadIds – optional additional existing threads the
 *                          issue also relates to.
 */
export interface ThreadSummaryUpdate {
  threadId: string;
  updatedTitle?: string;
  updatedSummary: string;
}

export interface GeminiMatchResult {
  action: "MATCH" | "CREATE";
  /* MATCH fields */
  matchedThreadIds?: string[];
  updatedSummaries?: ThreadSummaryUpdate[];
  /* CREATE fields */
  newThreadTitle?: string;
  newThreadSummary?: string;
  alsoMatchedThreadIds?: string[];
}

/* ------------------------------------------------------------------ */
/*  matchIssueToThreads                                               */
/* ------------------------------------------------------------------ */

export async function matchIssueToThreads(
  issueText: string,
  candidates: CandidateThread[]
): Promise<GeminiMatchResult> {
  const ai = getGenAI();

  const candidateList =
    candidates.length === 0
      ? "No existing threads."
      : candidates
          .map(
            (t) =>
              `- id: "${t.threadId}"\n  title: "${t.title}"\n  summary: "${t.aiSummary}"`
          )
          .join("\n");

  const prompt = `You are a civic issue classifier for a municipal ward-based platform. Residents submit civic issues (potholes, noise, broken lights, etc.) and you cluster them into topic Threads.

NEW ISSUE:
"""
${issueText}
"""

EXISTING THREADS:
${candidateList}

YOUR TASK — follow these rules strictly:

1. Determine which existing thread(s) the new issue belongs to.
   - An issue may belong to MORE THAN ONE thread if it clearly touches multiple topics (e.g. "The pothole on Main St is also blocking the broken streetlight" relates to both a potholes thread and a streetlights thread).
   - Only match when the issue clearly and genuinely relates to a thread's topic. Do NOT force matches.

2. If the issue does NOT fit ANY existing thread, create a new one.
   - Provide a short, descriptive title and a 1-2 sentence summary.
   - The issue may ALSO partially match existing threads — if so, include them in "alsoMatchedThreadIds".

3. For every matched thread, evaluate whether the new issue adds meaningful new information (new location, new detail, new dimension). If yes, provide an updated summary that incorporates the new information while preserving the existing context. You may also provide an updatedTitle if the scope of the thread has meaningfully expanded.
   - Keep summaries concise (2-3 sentences max).
   - Do NOT change the summary if the issue is just a duplicate report of the same problem with no new detail.

RESPOND WITH ONLY VALID JSON (no markdown, no explanation).

If matching existing thread(s):
{
  "action": "MATCH",
  "matchedThreadIds": ["id1", "id2"],
  "updatedSummaries": [
    { "threadId": "id1", "updatedSummary": "..." },
    { "threadId": "id2", "updatedTitle": "...", "updatedSummary": "..." }
  ]
}
(omit updatedSummaries or individual entries if no refinement needed)

If creating a new thread:
{
  "action": "CREATE",
  "newThreadTitle": "...",
  "newThreadSummary": "...",
  "alsoMatchedThreadIds": ["id1"]
}
(omit alsoMatchedThreadIds if the issue only belongs to the new thread)
`;

  try {
    const resp = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      },
    });

    const text = (resp.text ?? "").trim();
    const parsed = JSON.parse(text) as GeminiMatchResult;

    // Validate MATCH
    if (
      parsed.action === "MATCH" &&
      Array.isArray(parsed.matchedThreadIds) &&
      parsed.matchedThreadIds.length > 0
    ) {
      // Filter to only IDs that exist in candidates
      const validIds = new Set(candidates.map((c) => c.threadId));
      parsed.matchedThreadIds = parsed.matchedThreadIds.filter((id) =>
        validIds.has(id)
      );
      if (parsed.updatedSummaries) {
        parsed.updatedSummaries = parsed.updatedSummaries.filter((u) =>
          validIds.has(u.threadId)
        );
      }
      if (parsed.matchedThreadIds.length > 0) return parsed;
    }

    // Validate CREATE
    if (
      parsed.action === "CREATE" &&
      typeof parsed.newThreadTitle === "string" &&
      typeof parsed.newThreadSummary === "string" &&
      parsed.newThreadTitle.length > 0 &&
      parsed.newThreadSummary.length > 0
    ) {
      // Filter alsoMatchedThreadIds to valid candidates
      if (parsed.alsoMatchedThreadIds) {
        const validIds = new Set(candidates.map((c) => c.threadId));
        parsed.alsoMatchedThreadIds = parsed.alsoMatchedThreadIds.filter(
          (id) => validIds.has(id)
        );
      }
      return parsed;
    }
  } catch {
    // fall through to fallback
  }

  // Fallback: always safe to create
  return {
    action: "CREATE",
    newThreadTitle: "New civic issue",
    newThreadSummary: issueText.slice(0, 200) || "No description provided.",
  };
}
