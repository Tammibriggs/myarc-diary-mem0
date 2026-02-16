import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import Entry from "@/models/Entry";
import User from "@/models/User";
import Short from "@/models/Short";
import DailyArc from "@/models/DailyArc";
import { analyzeEntry } from "@/lib/gemini";
import { syncToMemory } from "@/lib/mem0";

export async function GET(req: Request) {
    const session = await getServerSession();
    if (!session || !session.user?.email) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();
    const user = await User.findOne({ email: session.user.email });
    if (!user) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const { searchParams } = new URL(req.url);
    const tag = searchParams.get('tag');

    let query: any = { userId: user._id };
    if (tag) {
        query.tags = tag;
    }

    try {
        const entries = await Entry.find(query).sort({ date: -1 });
        return NextResponse.json(entries);
    } catch (error) {
        return NextResponse.json({ error: "Failed to fetch entries" }, { status: 500 });
    }
}

export async function POST(req: Request) {
    const session = await getServerSession();
    if (!session || !session.user?.email) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();
    const user = await User.findOne({ email: session.user.email });
    if (!user) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const body = await req.json();
    const { title, content, tags } = body;

    try {
        const newEntry = await Entry.create({
            userId: user._id,
            title,
            content,
            tags,
            date: new Date(),
        });

        // Trigger AI Pipeline
        try {
            // 1. Analyze Entry with Gemini
            const analysis = await analyzeEntry(content);

            if (analysis) {
                // Update Entry with analysis results
                newEntry.sentiment = analysis.sentiment;
                newEntry.tags = [...new Set([...tags, ...(analysis.tags || [])])];
                newEntry.aiAnalysis = analysis;
                await newEntry.save();

                // 2. Create Shorts from Analysis
                if (analysis.shorts && Array.isArray(analysis.shorts)) {
                    for (const short of analysis.shorts) {
                        await Short.create({
                            userId: user._id,
                            type: short.type,
                            content: short.content,
                            sourceEntryId: newEntry._id,
                        });
                    }
                }

                // 3. Update Daily Arc
                if (analysis.dailyArc) {
                    const startOfDay = new Date();
                    startOfDay.setHours(0, 0, 0, 0);

                    await DailyArc.findOneAndUpdate(
                        {
                            userId: user._id,
                            date: { $gte: startOfDay }
                        },
                        {
                            $setOnInsert: { userId: user._id, date: new Date() },
                            suggestedAction: analysis.dailyArc.suggestedAction,
                            $inc: { momentumScore: 10 }
                        },
                        { upsert: true, new: true }
                    );
                }
            }

            // 4. Sync to Mem0 (Long-term memory)
            await syncToMemory(user._id.toString(), content);

        } catch (aiError) {
            console.error("AI Pipeline Error:", aiError);
            // Don't fail the request if AI fails, just log it
        }

        return NextResponse.json(newEntry, { status: 201 });
    } catch (error) {
        return NextResponse.json({ error: "Failed to create entry" }, { status: 500 });
    }
}
