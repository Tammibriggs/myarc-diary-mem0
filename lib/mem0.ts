import { Memory } from "mem0ai";

const apiKey = process.env.MEM0_API_KEY;

// Initialize Mem0 Client
// Note: This initialization might need adjustment based on Mem0's specific Node.js SDK
// For now, we'll assume a standard client structure.
const memory = apiKey ? new Memory({ apiKey }) : null;

export async function syncToMemory(userId: string, content: string) {
    if (!memory) {
        console.warn("Mem0 API Key not set");
        return;
    }

    try {
        await memory.add(content, { user_id: userId });
    } catch (error) {
        console.error("Mem0 Sync Error:", error);
    }
}

export async function searchMemory(userId: string, query: string) {
    if (!memory) {
        return [];
    }
    try {
        return await memory.search(query, { user_id: userId });
    } catch (error) {
        console.error("Mem0 Search Error:", error);
        return [];
    }
}
