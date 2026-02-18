import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import Entry from "@/models/Entry";
import User from "@/models/User";
import Short from "@/models/Short";
import DailyArc from "@/models/DailyArc";
import { analyzeEntryWithContext, embedText, cosineSimilarity } from "@/lib/gemini";
import { syncToMemory } from "@/lib/mem0";
import dbConnect from "@/lib/mongodb";

import { encrypt, decrypt } from "@/lib/encryption";
import { extractS3KeysFromHtml, deleteMultipleFromS3 } from "@/lib/s3";
import PendingUpload from "@/models/PendingUpload";

function stripHtml(html: string): string {
    return html.replace(/<[^>]*>/g, '').replace(/&[^;]+;/g, ' ').trim();
}

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
    const search = searchParams.get('search')?.trim();
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '10', 10);
    const skip = (page - 1) * limit;

    try {
        // If there's a search query, use semantic (vector) search
        if (search) {
            let baseQuery: any = { userId: user._id };
            if (tag) baseQuery.tags = tag;

            // Embed the search query
            const queryEmbedding = await embedText(search);

            if (queryEmbedding) {
                // Fetch all entries with embeddings for this user
                const allEntries = await Entry.find(baseQuery)
                    .select('+embedding')
                    .sort({ date: -1 });

                // Score each entry by cosine similarity
                const scored = allEntries
                    .filter((e: any) => e.embedding && e.embedding.length > 0)
                    .map((entry: any) => ({
                        entry,
                        score: cosineSimilarity(queryEmbedding, entry.embedding),
                    }))
                    .filter((s: any) => s.score > 0.5) // Minimum relevance threshold
                    .sort((a: any, b: any) => b.score - a.score);

                // Also include regex matches for entries without embeddings
                const searchRegex = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
                const regexMatches = allEntries
                    .filter((e: any) => !e.embedding || e.embedding.length === 0)
                    .filter((e: any) => {
                        const obj = e.toObject();
                        return searchRegex.test(obj.title) || searchRegex.test(obj.preview || '') || (obj.tags || []).some((t: string) => searchRegex.test(t));
                    });

                // Merge: semantic results first, then regex matches (deduplicated)
                const semanticIds = new Set(scored.map((s: any) => s.entry._id.toString()));
                const combined = [
                    ...scored.map((s: any) => s.entry),
                    ...regexMatches.filter((e: any) => !semanticIds.has(e._id.toString())),
                ];

                const totalCount = combined.length;
                const paged = combined.slice(skip, skip + limit);

                const decryptedEntries = paged.map((entry: any) => {
                    const obj = entry.toObject();
                    delete obj.embedding; // Don't send embedding to client
                    const decryptedContent = decrypt(obj.content);
                    return {
                        ...obj,
                        content: decryptedContent,
                        preview: obj.preview || stripHtml(decryptedContent).slice(0, 200),
                    };
                });

                return NextResponse.json({
                    entries: decryptedEntries,
                    totalCount,
                    hasMore: skip + paged.length < totalCount,
                    page,
                });
            }

            // Fallback: if embedding fails, use regex search
            const searchRegex = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
            baseQuery.$or = [
                { title: searchRegex },
                { preview: searchRegex },
                { tags: searchRegex },
            ];

            const [entries, totalCount] = await Promise.all([
                Entry.find(baseQuery).sort({ date: -1 }).skip(skip).limit(limit),
                Entry.countDocuments(baseQuery),
            ]);

            const decryptedEntries = entries.map((entry: any) => {
                const obj = entry.toObject();
                const decryptedContent = decrypt(obj.content);
                return {
                    ...obj,
                    content: decryptedContent,
                    preview: obj.preview || stripHtml(decryptedContent).slice(0, 200),
                };
            });

            return NextResponse.json({
                entries: decryptedEntries,
                totalCount,
                hasMore: skip + entries.length < totalCount,
                page,
            });
        }

        // No search — standard paginated fetch
        let query: any = { userId: user._id };
        if (tag) {
            query.tags = tag;
        }

        const [entries, totalCount] = await Promise.all([
            Entry.find(query).sort({ date: -1 }).skip(skip).limit(limit),
            Entry.countDocuments(query),
        ]);

        // Decrypt content for client
        const decryptedEntries = entries.map((entry: any) => {
            const obj = entry.toObject();
            const decryptedContent = decrypt(obj.content);
            return {
                ...obj,
                content: decryptedContent,
                preview: obj.preview || stripHtml(decryptedContent).slice(0, 200),
            };
        });

        return NextResponse.json({
            entries: decryptedEntries,
            totalCount,
            hasMore: skip + entries.length < totalCount,
            page,
        });
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

    if (!title || !content) {
        return NextResponse.json({ error: "Title and content are required" }, { status: 400 });
    }

    // Generate a plain-text preview from the HTML content
    const preview = stripHtml(content).slice(0, 200);

    try {
        const newEntry = await Entry.create({
            userId: user._id,
            title,
            content: encrypt(content),
            preview,
            isEncrypted: true,
            tags: tags || [],
            date: new Date(),
        });

        // Trigger AI Pipeline
        try {
            // 1. Generate embedding for semantic search
            const plainText = `${title}. ${stripHtml(content)}`;
            const embedding = await embedText(plainText);
            if (embedding) {
                newEntry.embedding = embedding;
                await newEntry.save();
            }

            // 2. Find semantically similar past entries for context
            let similarEntries: { title: string; preview: string; content?: string }[] = [];
            if (embedding) {
                const pastEntries = await Entry.find({ userId: user._id, _id: { $ne: newEntry._id } })
                    .select('+embedding title preview content isEncrypted')
                    .sort({ date: -1 })
                    .limit(50);

                const scored = pastEntries
                    .filter((e: any) => e.embedding && e.embedding.length > 0)
                    .map((e: any) => ({
                        title: e.title,
                        preview: e.preview || '',
                        content: e.content,
                        isEncrypted: e.isEncrypted,
                        score: cosineSimilarity(embedding, e.embedding),
                    }))
                    .filter((s: any) => s.score > 0.65)
                    .sort((a: any, b: any) => b.score - a.score)
                    .slice(0, 10);

                similarEntries = scored.map((s: any) => {
                    const rawContent = s.content || '';
                    const decrypted = s.isEncrypted ? decrypt(rawContent) : rawContent;
                    return {
                        title: s.title,
                        preview: s.preview,
                        content: stripHtml(decrypted)
                    };
                });
            }

            // 3. Load existing habits to avoid duplicates
            const existingHabits = await Short.find({ userId: user._id, type: 'habit', status: 'active' })
                .select('content')
                .lean();
            const habitStrings = existingHabits.map((h: any) => h.content);

            // 4. Analyze entry with full context
            const analysis = await analyzeEntryWithContext(content, similarEntries, habitStrings);

            if (analysis) {
                // Update Entry with analysis results
                newEntry.sentiment = analysis.sentiment;
                newEntry.tags = [...new Set([...(tags || []), ...(analysis.tags || [])])];
                newEntry.aiAnalysis = analysis;
                await newEntry.save();

                // 5. Create Shorts from Analysis
                if (analysis.shorts && Array.isArray(analysis.shorts)) {
                    for (const short of analysis.shorts) {
                        if (short.type === 'habit' || short.type === 'goal') {
                            await Short.create({
                                userId: user._id,
                                type: short.type,
                                content: short.content,
                                source: 'ai',
                                sourceEntryId: newEntry._id,
                                milestones: short.type === 'goal' && short.milestones
                                    ? short.milestones.map((m: string) => ({ title: m, isCompleted: false }))
                                    : [],
                            });
                        }
                    }
                }

                // 6. Update Daily Arc
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

        } catch (aiError) {
            console.error("AI Pipeline Error:", aiError);
            // Don't fail the request if AI fails, just log it
        }

        // Return the created entry with decrypted content
        const responseEntry = newEntry.toObject();
        responseEntry.content = content;
        responseEntry.preview = preview;

        return NextResponse.json(responseEntry, { status: 201 });
    } catch (error) {
        console.log(error);
        return NextResponse.json({ error: "Failed to create entry" }, { status: 500 });
    } finally {
        // Clean up orphaned images: delete S3 objects for uploads not in the saved content
        try {
            const pendingUploads = await PendingUpload.find({ userId: user._id });
            if (pendingUploads.length > 0) {
                const savedKeys = extractS3KeysFromHtml(content);
                const orphanedKeys = pendingUploads
                    .map((p: any) => p.key)
                    .filter((key: string) => !savedKeys.includes(key));

                if (orphanedKeys.length > 0) {
                    await deleteMultipleFromS3(orphanedKeys);
                }

                // Clear all pending records for this user
                await PendingUpload.deleteMany({ userId: user._id });
            }
        } catch (e) {
            // Non-critical, ignore
        }
    }
}
