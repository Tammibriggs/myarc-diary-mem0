import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import dbConnect from "@/lib/mongodb";
import Short from "@/models/Short";
import User from "@/models/User";

export async function PUT(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await getServerSession();
    if (!session || !session.user?.email) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();
    const user = await User.findOne({ email: session.user.email });
    if (!user) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const { id } = await params;
    const body = await req.json();
    const { content, milestones, status } = body;

    try {
        const short = await Short.findOne({ _id: id, userId: user._id });
        if (!short) {
            return NextResponse.json({ error: 'Short not found' }, { status: 404 });
        }

        if (content !== undefined) short.content = content;
        if (status !== undefined) short.status = status;
        if (milestones !== undefined) {
            short.milestones = milestones.map((m: any) => {
                const existing = short.milestones.id(m._id);
                const isNowCompleted = m.isCompleted || false;

                let completedAt = existing?.completedAt;
                if (isNowCompleted && !existing?.isCompleted) {
                    completedAt = new Date(); // Just completed
                } else if (!isNowCompleted) {
                    completedAt = undefined; // Unchecked
                }

                return {
                    title: m.title,
                    isCompleted: isNowCompleted,
                    completedAt: completedAt,
                    _id: m._id, // Preserve existing IDs
                };
            });
        }

        await short.save();
        return NextResponse.json(short);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to update short' }, { status: 500 });
    }
}

export async function DELETE(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await getServerSession();
    if (!session || !session.user?.email) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();
    const user = await User.findOne({ email: session.user.email });
    if (!user) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const { id } = await params;

    try {
        const short = await Short.findOneAndDelete({ _id: id, userId: user._id });
        if (!short) {
            return NextResponse.json({ error: 'Short not found' }, { status: 404 });
        }

        return NextResponse.json({ message: 'Short deleted' });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to delete short' }, { status: 500 });
    }
}
