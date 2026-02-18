import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import Entry from "@/models/Entry";
import Short from "@/models/Short";
import User from "@/models/User";
import dbConnect from "@/lib/mongodb";
import { startOfWeek, endOfWeek, subWeeks, isSameWeek } from 'date-fns';

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
        const weeklyStats = [];
        const now = new Date();

        // Calculate stats for the last 7 weeks (including current week)
        for (let i = 6; i >= 0; i--) {
            // Get start and end of the week (Monday to Sunday)
            const weekStart = startOfWeek(subWeeks(now, i), { weekStartsOn: 1 });
            const weekEnd = endOfWeek(subWeeks(now, i), { weekStartsOn: 1 });

            // 1. Weekly Consistency (50%): Did user create an entry this week?
            const entriesCount = await Entry.countDocuments({
                userId: user._id,
                date: { $gte: weekStart, $lte: weekEnd }
            });
            const consistencyScore = entriesCount > 0 ? 50 : 0;

            // 2. Act Score (50%): 
            // - One goal completed (50%)
            // - OR Two milestones completed (25% each = 50%)

            // Find goals completed this week
            const completedGoalsCount = await Short.countDocuments({
                userId: user._id,
                type: 'goal',
                status: 'completed',
                updatedAt: { $gte: weekStart, $lte: weekEnd }
            });

            // Find milestones completed this week
            // We need to fetch goals that have at least one completed milestone
            // Then manually filter the milestones by date
            const goalsWithMilestones = await Short.find({
                userId: user._id,
                type: 'goal',
                "milestones.isCompleted": true
            }).select('milestones');

            let completedMilestonesCount = 0;
            goalsWithMilestones.forEach((goal: any) => {
                if (goal.milestones && Array.isArray(goal.milestones)) {
                    goal.milestones.forEach((m: any) => {
                        // Check if completed this week
                        if (m.isCompleted && m.completedAt) {
                            const mDate = new Date(m.completedAt);
                            if (mDate >= weekStart && mDate <= weekEnd) {
                                completedMilestonesCount++;
                            }
                        }
                    });
                }
            });

            // Calculate Act Score
            let actScore = 0;
            if (completedGoalsCount >= 1) {
                actScore = 50;
            } else if (completedMilestonesCount >= 2) {
                actScore = 50;
            } else if (completedMilestonesCount === 1) {
                actScore = 25;
            }

            // Total Score
            const totalScore = consistencyScore + actScore;

            // Discover Count: New insights (shorts) created this week
            const newShortsCount = await Short.countDocuments({
                userId: user._id,
                createdAt: { $gte: weekStart, $lte: weekEnd }
            });

            weeklyStats.push({
                weekLabel: `WK${7 - i}`, // WK1 (oldest) to WK7 (current)
                score: totalScore,
                reflect: entriesCount > 0 ? "100%" : "0%",
                discover: newShortsCount.toString(),
                act: actScore === 50 ? "100%" : (actScore === 25 ? "50%" : "0%"),
                desc: "Weekly Momentum"
            });
        }

        return NextResponse.json(weeklyStats);

    } catch (error) {
        console.error("Failed to calculate momentum:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
