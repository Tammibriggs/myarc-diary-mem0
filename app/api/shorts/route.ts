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

    try {
        // Fetch shorts that are NOT completed, sorted by creation date
        const shorts = await Short.find({ userId: user._id, isCompleted: false }).sort({ createdAt: -1 });
        return NextResponse.json(shorts);
    } catch (error) {
        return NextResponse.json({ error: "Failed to fetch shorts" }, { status: 500 });
    }
}
