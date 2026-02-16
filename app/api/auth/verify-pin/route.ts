import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import dbConnect from "@/lib/mongodb";
import User from "@/models/User";
import bcrypt from 'bcryptjs';

export async function POST(req: Request) {
    const session = await getServerSession();
    if (!session || !session.user?.email) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { pin } = await req.json();

    if (!pin || pin.length !== 4) {
        return NextResponse.json({ error: "Invalid PIN format" }, { status: 400 });
    }

    await dbConnect();
    const user = await User.findOne({ email: session.user.email });

    if (!user || !user.privacyPin) {
        return NextResponse.json({ error: "PIN not set for this user" }, { status: 400 });
    }

    const isMatch = await bcrypt.compare(pin, user.privacyPin);

    if (isMatch) {
        return NextResponse.json({ success: true });
    } else {
        return NextResponse.json({ error: "Incorrect PIN" }, { status: 401 });
    }
}
