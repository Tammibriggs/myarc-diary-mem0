import { MemoryClient } from "mem0ai";
import { sanitizeForAI } from "./sanitize";

const apiKey = process.env.MEM0_API_KEY;

// Initialize Mem0 Client
// Note: This initialization might need adjustment based on Mem0's specific Node.js SDK
// For now, we'll assume a standard client structure.
const memory = apiKey ? new MemoryClient({ apiKey }) : null;

export async function syncToMemory(userId: string, content: string) {
    if (!memory) {
        console.warn("Mem0 API Key not set");
        return;
    }

    try {
        const sanitizedContent = sanitizeForAI(content);
        await memory.add([{ role: "user", content: sanitizedContent }], {
            user_id: userId,
            custom_instructions: "Extract user preferences, goals, habits, completed milestones, and significant life events. Exclude casual greetings, fleeting thoughts, and generic formatting. Focus on recurring patterns and actionable data."
        });
    } catch (error) {
        console.error("Mem0 Sync Error:", error);
    }
}

export async function searchMemory(userId: string, query: string) {
    if (!memory) {
        return [];
    }
    try {
        const sanitizedQuery = sanitizeForAI(query);
        const result = await memory.search(sanitizedQuery, { user_id: userId });
        // Return just the memory strings
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return result.map((item: any) => item.memory);
    } catch (error) {
        console.error("Mem0 Search Error:", error);
        return [];
    }
}
