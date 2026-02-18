import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import dbConnect from "@/lib/mongodb";
import User from "@/models/User";
import Short from "@/models/Short";

/**
 * GET /api/shorts/categories — List user's custom categories
 */
export async function GET() {
    const session = await getServerSession();
    if (!session || !session.user?.email) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();
    const user = await User.findOne({ email: session.user.email });
    if (!user) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json(user.shortsCategories || []);
}

/**
 * POST /api/shorts/categories — Add a custom category
 * Body: { name: string }
 */
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

    const { name } = await req.json();
    if (!name || typeof name !== 'string' || !name.trim()) {
        return NextResponse.json({ error: "Category name is required" }, { status: 400 });
    }

    const trimmed = name.trim();

    // Prevent duplicates and reserved names
    if (['habit', 'goal'].includes(trimmed.toLowerCase())) {
        return NextResponse.json({ error: "Cannot use reserved category name" }, { status: 400 });
    }

    const existing = user.shortsCategories || [];
    if (existing.includes(trimmed)) {
        return NextResponse.json({ error: "Category already exists" }, { status: 409 });
    }

    user.shortsCategories = [...existing, trimmed];
    await user.save();

    return NextResponse.json(user.shortsCategories, { status: 201 });
}

/**
 * DELETE /api/shorts/categories — Remove a custom category
 * Body: { name: string }
 */
export async function DELETE(req: Request) {
    const session = await getServerSession();
    if (!session || !session.user?.email) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();
    const user = await User.findOne({ email: session.user.email });
    if (!user) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const { name } = await req.json();
    if (!name) {
        return NextResponse.json({ error: "Category name is required" }, { status: 400 });
    }

    user.shortsCategories = (user.shortsCategories || []).filter((c: string) => c !== name);
    await user.save();

    // Cascade delete shorts of this category
    await Short.deleteMany({ userId: user._id, type: name });

    return NextResponse.json(user.shortsCategories);
}
