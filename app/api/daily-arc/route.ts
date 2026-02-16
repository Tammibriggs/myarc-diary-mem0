import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import dbConnect from "@/lib/mongodb";
import DailyArc from "@/models/DailyArc";
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

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    try {
        const dailyArc = await DailyArc.findOne({
            userId: user._id,
            date: { $gte: startOfDay, $lte: endOfDay }
        });

        return NextResponse.json(dailyArc || { isNew: true });
    } catch (error) {
        return NextResponse.json({ error: "Failed to fetch daily arc" }, { status: 500 });
    }
}
