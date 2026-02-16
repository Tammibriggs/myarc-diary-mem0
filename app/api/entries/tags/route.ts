import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import dbConnect from "@/lib/mongodb";
import Entry from "@/models/Entry";
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
        const tags = await Entry.distinct('tags', { userId: user._id });
        return NextResponse.json(tags);
    } catch (error) {
        return NextResponse.json({ error: "Failed to fetch tags" }, { status: 500 });
    }
}
