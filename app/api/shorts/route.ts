import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import dbConnect from "@/lib/mongodb";
import Short from "@/models/Short";
import User from "@/models/User";

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
    const type = searchParams.get('type'); // 'habit' | 'goal'

    try {
        const query: any = { userId: user._id, status: { $ne: 'archived' } };
        if (type && (type === 'habit' || type === 'goal')) {
            query.type = type;
        }

        const shorts = await Short.find(query).sort({ createdAt: -1 });
        return NextResponse.json(shorts);
    } catch (error) {
        return NextResponse.json({ error: "Failed to fetch shorts" }, { status: 500 });
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
    const { type, content, milestones } = body;

    if (!type || !content) {
        return NextResponse.json({ error: "Type and content are required" }, { status: 400 });
    }

    try {
        const newShort = await Short.create({
            userId: user._id,
            type,
            content,
            source: 'user',
            milestones: type === 'goal' && milestones
                ? milestones.map((m: string) => ({ title: m, isCompleted: false }))
                : [],
        });

        return NextResponse.json(newShort, { status: 201 });
    } catch (error) {
        return NextResponse.json({ error: "Failed to create short" }, { status: 500 });
    }
}
