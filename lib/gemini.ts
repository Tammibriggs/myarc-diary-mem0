import { GoogleGenAI } from "@google/genai";
import { sanitizeForAI } from "./sanitize";

const apiKey = process.env.GEMINI_API_KEY;
const genAI = apiKey ? new GoogleGenAI({ apiKey }) : null;

interface SimilarEntry {
  title: string;
  preview: string;
  content?: string;
}

/**
 * Context-aware entry analysis.
 * Passes semantically similar past entries and existing habits to Gemini
 * so it can detect recurring intents (goals) and behavioral patterns (habits).
 */
export async function analyzeEntryWithContext(
  content: string,
  similarEntries: SimilarEntry[],
  existingHabits: string[]
) {
  if (!genAI) {
    console.warn("Gemini API Key not set");
    return null;
  }

  const sanitizedContent = sanitizeForAI(content);

  const similarContext = similarEntries.length > 0
    ? similarEntries.map((e, i) => `${i + 1}. "${sanitizeForAI(e.title)}" — ${sanitizeForAI(e.content || e.preview)}`).join('\n')
    : 'None found.';

  const habitsContext = existingHabits.length > 0
    ? existingHabits.map((h, i) => `${i + 1}. ${h}`).join('\n')
    : 'None tracked yet.';

  const prompt = `You are the AI engine for MyArc, a reflection-first journaling app.

CONTEXT — Semantically related past journal entries:
${similarContext}

CONTEXT — User's currently tracked habits:
${habitsContext}

TASK: Analyze the new journal entry below and extract structured data.

HABIT DETECTION (type: "habit"):
- Identify recurring behavioral patterns based on the principles of the books: Atomic Habits / Tiny Habits.
- Focus on: triggers, anchors, routines, and small compounding behaviors.
- Look ACROSS the related past entries above and the new entry to spot patterns.
- Only extract NEW habits not already in the tracked habits list above.
- If no recurring pattern exists across multiple entries, do not add any habit items to the shorts array.
- Habits should be phrased as observations, e.g. "You tend to drink coffee every morning"

GOAL DETECTION (type: "goal"):
- If the related past entries above show a REPEATED intent or desire (the user keeps returning to the same topic/wish), generate a Goal.
- Each goal must include 2-4 milestone suggestions.
- Only suggest goals for genuinely recurring themes across multiple entries — not one-off mentions.
- If no repeated intent is detected, do NOT create a goal.

Also extract:
- "dailyArc": A single small suggested action to build momentum today.
- "sentiment": Overall emotional tone (Positive, Neutral, Negative).
- "tags": 3-5 relevant keywords.

Return ONLY valid JSON with this structure:
{
  "shorts": [
    { "type": "habit", "content": "..." },
    { "type": "goal", "content": "...", "milestones": ["milestone 1", "milestone 2"] }
  ],
  "dailyArc": { "suggestedAction": "..." },
  "sentiment": "...",
  "tags": ["..."]
}

New Entry:
"${sanitizedContent}"`;

  const responseSchema = {
    type: "OBJECT",
    properties: {
      shorts: {
        type: "ARRAY",
        items: {
          type: "OBJECT",
          properties: {
            type: { type: "STRING", enum: ["habit", "goal"] },
            content: { type: "STRING" },
            milestones: { type: "ARRAY", items: { type: "STRING" } }
          },
          required: ["type", "content"]
        }
      },
      dailyArc: {
        type: "OBJECT",
        properties: {
          suggestedAction: { type: "STRING" }
        },
        required: ["suggestedAction"]
      },
      sentiment: { type: "STRING", enum: ["Positive", "Neutral", "Negative"] },
      tags: { type: "ARRAY", items: { type: "STRING" } }
    },
    required: ["shorts", "dailyArc", "sentiment", "tags"]
  };

  try {
    const result = await genAI.models.generateContent({
      model: "gemini-2.0-flash",
      contents: [{ parts: [{ text: prompt }] }],
      config: {
        responseMimeType: "application/json",
        responseSchema: responseSchema
      }
    });

    const responseText = result.candidates?.[0]?.content?.parts?.[0]?.text || "";
    const cleanText = responseText.replace(/```json\n?|\n?```/g, "").trim();

    if (!cleanText) return null;

    return JSON.parse(cleanText);
  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    return null;
  }
}

/**
 * Legacy single-entry analysis (fallback if context fetch fails).
 */
export async function analyzeEntry(content: string) {
  return analyzeEntryWithContext(content, [], []);
}

/**
 * Generate an embedding vector for the given text using Gemini's embedding model.
 * Returns a number array, or null if the API key is not set or the call fails.
 */
export async function embedText(text: string): Promise<number[] | null> {
  if (!genAI) {
    console.warn("Gemini API Key not set — skipping embedding");
    return null;
  }

  try {
    // Truncate to ~8000 chars to stay within model limits
    const truncated = text.slice(0, 8000);

    const result = await genAI.models.embedContent({
      model: "gemini-embedding-001",
      contents: truncated,
      config: {
        outputDimensionality: 512
      }
    });

    return result.embeddings?.[0]?.values || null;
  } catch (error) {
    console.error("Embedding Error:", error);
    return null;
  }
}

/**
 * Compute cosine similarity between two vectors.
 * Returns a value between -1 and 1, where 1 means identical direction.
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;

  let dot = 0;
  let magA = 0;
  let magB = 0;

  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }

  const magnitude = Math.sqrt(magA) * Math.sqrt(magB);
  return magnitude === 0 ? 0 : dot / magnitude;
}
