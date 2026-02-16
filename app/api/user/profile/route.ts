import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import dbConnect from "@/lib/mongodb";
import User from "@/models/User";

export async function GET(req: Request) {
    const session = await getServerSession();
    if (!session || !session.user?.email) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();
    const user = await User.findOne({ email: session.user.email }).select('-privacyPin'); // Exclude hash
    if (!user) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json(user);
}

export async function PATCH(req: Request) {
    const session = await getServerSession();
    if (!session || !session.user?.email) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();
    const body = await req.json();
    const { name, themePreference, currentFocus, settings, isOnboarded } = body;

    try {
        const updatedUser = await User.findOneAndUpdate(
            { email: session.user.email },
            {
                $set: {
                    ...(name && { name }),
                    ...(themePreference && { themePreference }),
                    ...(currentFocus && { currentFocus }),
                    ...(settings && { settings }),
                    ...(typeof isOnboarded === 'boolean' && { isOnboarded }),
                }
            },
            { new: true }
        ).select('-privacyPin');

        return NextResponse.json(updatedUser);
    } catch (error) {
        return NextResponse.json({ error: "Failed to update profile" }, { status: 500 });
    }
}
