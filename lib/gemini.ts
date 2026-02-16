import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.GEMINI_API_KEY;
const genAI = apiKey ? new GoogleGenAI({ apiKey }) : null;

export async function analyzeEntry(content: string) {
  if (!genAI) {
    console.warn("Gemini API Key not set");
    return null;
  }

  const prompt = `
    You are an AI assistant for a journaling app called "MyArc".
    Analyze the following journal entry and extract:
    1. "Shorts": Distinct actionable items, realizations, or goals.
    2. "Daily Arc": A single, small, suggested action to build momentum for today based on this entry.
    3. "Sentiment": The overall emotional tone (Positive, Neutral, Negative).
    4. "Tags": 3-5 relevant keywords.

    Return the result as a JSON object with this structure:
    {
      "shorts": [{ "type": "action" | "realization" | "goal", "content": "..." }],
      "dailyArc": { "suggestedAction": "..." },
      "sentiment": "...",
      "tags": ["..."]
    }

    Entry:
    "${content}"
  `;

  try {
    const result = await genAI.models.generateContent({
      model: "gemini-1.5-flash",
      contents: [{ parts: [{ text: prompt }] }]
    });

    // Handling the response structure might vary, adapting to common pattern
    const responseText = result.candidates?.[0]?.content?.parts?.[0]?.text || "";

    // Clean up potential markdown code blocks
    const cleanText = responseText.replace(/```json\n?|\n?```/g, "").trim();

    if (!cleanText) return null;

    return JSON.parse(cleanText);
  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    return null;
  }
}
