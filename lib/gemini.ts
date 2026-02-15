import { GoogleGenerativeAI } from "@google/generative-ai";

function getGenAI() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is required");
  return new GoogleGenerativeAI(apiKey);
}

export interface CandidateThread {
  threadId: string;
  title: string;
  aiSummary: string;
}

export interface GeminiMatchResult {
  action: "MATCH" | "CREATE";
  matchedThreadIds?: string[];
  newThreadTitle?: string;
  newThreadSummary?: string;
}

export async function matchIssueToThreads(
  issueText: string,
  candidates: CandidateThread[]
): Promise<GeminiMatchResult> {
  const genAI = getGenAI();
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
  const candidateList =
    candidates.length === 0
      ? "No existing threads."
      : candidates
          .map(
            (t) =>
              `- id: ${t.threadId}\n  title: ${t.title}\n  summary: ${t.aiSummary}`
          )
          .join("\n");

  const prompt = `You are a civic issue classifier. Given a new issue description and a list of existing discussion threads, decide whether the issue clearly belongs to an existing thread (same topic) or needs a new thread.

Issue text:
"""
${issueText}
"""

Existing threads:
${candidateList}

Rules:
- Reply with ONLY valid JSON, no markdown or extra text.
- If the issue clearly matches one existing thread's topic, use MATCH and set matchedThreadIds to an array of that thread's id (e.g. ["thread-id"]). Pick at most one best match.
- If unclear or no good match, use CREATE and provide newThreadTitle (short, clear) and newThreadSummary (1-2 sentences).
- When in doubt, prefer CREATE.

Response format:
{"action":"MATCH","matchedThreadIds":["id"]}
OR
{"action":"CREATE","newThreadTitle":"...","newThreadSummary":"..."}
`;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text()?.trim() ?? "";
    const json = text.replace(/^```json?\s*|\s*```$/g, "").trim();
    const parsed = JSON.parse(json) as GeminiMatchResult;
    if (parsed.action === "MATCH" && Array.isArray(parsed.matchedThreadIds) && parsed.matchedThreadIds.length > 0) {
      return parsed;
    }
    if (parsed.action === "CREATE" && parsed.newThreadTitle && parsed.newThreadSummary) {
      return parsed;
    }
  } catch {
    // fallback to CREATE
  }
  return {
    action: "CREATE",
    newThreadTitle: "New issue",
    newThreadSummary: issueText.slice(0, 200) || "No description provided.",
  };
}
