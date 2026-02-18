import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import Entry from "@/models/Entry";
import Short from "@/models/Short";
import User from "@/models/User";
import dbConnect from "@/lib/mongodb";
import { GoogleGenAI } from "@google/genai";
import { decrypt } from "@/lib/encryption";

const apiKey = process.env.GEMINI_API_KEY;
const genAI = apiKey ? new GoogleGenAI({ apiKey }) : null;

function stripHtml(html: string): string {
    return html.replace(/<[^>]*>/g, '').replace(/&[^;]+;/g, ' ').trim();
}

export async function GET() {
    const session = await getServerSession();
    if (!session || !session.user?.email) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        await dbConnect();
        const user = await User.findOne({ email: session.user.email });
        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        // 1. Fetch Last Entry
        const lastEntry = await Entry.findOne({ userId: user._id }).sort({ date: -1 });

        // 2. Fetch Active Goals (Shorts)
        const activeGoals = await Short.find({
            userId: user._id,
            type: 'goal',
            status: 'active'
        }).select('content').limit(3).lean();

        const goals = activeGoals.map((g: any) => g.content);

        // If no history, default prompt
        if (!lastEntry && goals.length === 0) {
            return NextResponse.json({ prompt: "What's on your mind today?" });
        }

        let context = "";

        if (lastEntry) {
            const rawContent = lastEntry.isEncrypted
                ? decrypt(lastEntry.content)
                : lastEntry.content;

            context += `LAST ENTRY (${new Date(lastEntry.date).toLocaleDateString()}):
"${lastEntry.title} - ${stripHtml(rawContent).slice(0, 500)}..."\n\n`;
        }

        if (goals.length > 0) {
            context += `ACTIVE GOALS:\n${goals.map((g: string) => `- ${g}`).join('\n')}\n\n`;
        }

        // 3. Generate Prompt with Gemini
        if (!genAI) {
            return NextResponse.json({ prompt: "What's on your mind today?" });
        }

        const systemPrompt = `You are a thoughtful journaling companion.
Based on the user's recent context, generate a single, specific, and engaging question to help them reflect today.

CONTEXT:
${context}

TASK:
- Write ONE question only.
- Length: Under 20 words.
- Tone: Curious, gentle, specific.
- Example: "How is the [Goal] progressing?", "You mentioned [Topic] — any updates?", "How did [Event] go?"

OUTPUT: Just the question text.`;

        const result = await genAI.models.generateContent({
            model: "gemini-2.0-flash",
            contents: [{ parts: [{ text: systemPrompt }] }],
        });

        const promptText = result.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";
        const cleanPrompt = promptText.replace(/^"|"$/g, '');

        return NextResponse.json({ prompt: cleanPrompt || "What's on your mind today?" });

    } catch (error) {
        console.error("Prompt Generation Error:", error);
        return NextResponse.json({ prompt: "What's on your mind today?" });
    }
}
