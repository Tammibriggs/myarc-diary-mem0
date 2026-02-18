'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { ChevronLeft, Save, X, Loader2, Sparkles, Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { decrypt } from "@/lib/encryption";
import axios from 'axios';

import { TiptapEditor } from '@/components/editor/TiptapEditor';

export default function NewEntryPage() {
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [tags, setTags] = useState<string[]>([]);
    const [tagInput, setTagInput] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState('');
    const [aiPrompt, setAiPrompt] = useState<string | null>(null);
    const router = useRouter();

    const today = new Date();
    const formattedDate = today.toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
    });

    // Fetch AI Prompt on mount
    useEffect(() => {
        const fetchPrompt = async () => {
            try {
                const { data } = await axios.get('/api/entries/prompt');
                if (data.prompt) {
                    setAiPrompt(data.prompt);
                }
            } catch (e) {
                console.log("Failed to fetch prompt", e);
            }
        };
        fetchPrompt();
    }, []);

    const addTag = (value: string) => {
        const tag = value.trim();
        if (tag && !tags.includes(tag)) {
            setTags([...tags, tag]);
        }
        setTagInput('');
    };

    const removeTag = (tagToRemove: string) => {
        setTags(tags.filter(t => t !== tagToRemove));
    };

    const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault();
            addTag(tagInput);
        } else if (e.key === 'Backspace' && !tagInput && tags.length > 0) {
            removeTag(tags[tags.length - 1]);
        }
    };

    const handleSave = async () => {
        if (!title.trim()) {
            setError('Please add a title');
            return;
        }
        if (!content.trim() || content === '<p></p>') {
            setError('Please write some content');
            return;
        }

        setError('');
        setIsSaving(true);
        try {
            await axios.post('/api/entries', {
                title: title.trim(),
                content,
                tags,
            });
            router.push('/?view=entries');
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to save entry');
        } finally {
            setIsSaving(false);
        }
    };


    return (
        <div className="min-h-screen bg-[#F3F4F6] text-[#171717] font-sans selection:bg-primary/20">
            {/* Background Ambience */}
            <div className="fixed top-[-10%] left-[-10%] w-[500px] h-[500px] bg-primary/10 rounded-full blur-[120px] pointer-events-none" />
            <div className="fixed bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-secondary/10 rounded-full blur-[120px] pointer-events-none" />

            {/* Header */}
            <header className="fixed top-0 w-full z-40 bg-white/50 backdrop-blur-md px-6 h-16 flex items-center justify-between border-b border-black/5">
                <div className="flex items-center space-x-4">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => router.back()}
                        className="rounded-full hover:bg-black/5"
                    >
                        <ChevronLeft className="w-6 h-6" />
                    </Button>
                    <div className="flex flex-col">
                        <span className="text-sm font-medium text-muted-foreground">{formattedDate}</span>
                    </div>
                </div>
                <div className="flex items-center space-x-3">
                    <Button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="rounded-full px-6 bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20 transition-all hover:scale-105 active:scale-95"
                    >
                        {isSaving ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                            <Save className="w-4 h-4 mr-2" />
                        )}
                        <span className="hidden sm:inline">{isSaving ? 'Saving...' : 'Save Entry'}</span>
                        <span className="sm:hidden">{isSaving ? '...' : 'Save'}</span>
                    </Button>
                </div>
            </header>

            {/* Editor Content */}
            <main className="pt-16 pb-0 px-0 md:pt-28 md:px-6 max-w-3xl mx-auto overflow-hidden">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white/80 backdrop-blur-xl md:rounded-[40px] md:shadow-2xl md:shadow-black/5 md:border md:border-white/50 p-6 md:p-12 min-h-[calc(100vh-4rem)] md:min-h-[80vh] flex flex-col"
                >
                    {/* Error message */}
                    {error && (
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="mb-4 px-4 py-3 bg-red-50 border border-red-100 rounded-2xl text-sm text-red-600 font-medium"
                        >
                            {error}
                        </motion.div>
                    )}

                    {/* AI Prompt */}
                    {aiPrompt && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            className="mb-6 relative group"
                        >
                            <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/10 to-purple-500/10 rounded-2xl blur-xl" />
                            <div className="relative bg-white/50 backdrop-blur-md border border-indigo-100 rounded-2xl p-4 flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
                                <div className="flex gap-3">
                                    <div className="p-2 bg-indigo-100 text-indigo-600 rounded-xl shrink-0">
                                        <Sparkles className="w-5 h-5" />
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-sm font-semibold text-indigo-900">Thought Starter</p>
                                        <p className="text-sm text-indigo-700 leading-relaxed max-w-xl">
                                            {aiPrompt}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => setAiPrompt(null)}
                                        className="text-indigo-400 hover:text-indigo-600 hover:bg-indigo-50"
                                    >
                                        Dismiss
                                    </Button>
                                    <Button
                                        size="sm"
                                        onClick={() => {
                                            setContent((prev) => prev ? `${prev}<p><strong>${aiPrompt}</strong></p><p></p>` : `<p><strong>${aiPrompt}</strong></p><p></p>`);
                                            setAiPrompt(null);
                                        }}
                                        className="bg-indigo-600 text-white hover:bg-indigo-700 border-none shadow-md shadow-indigo-200"
                                    >
                                        <Plus className="w-4 h-4 mr-1.5" />
                                        Use Idea
                                    </Button>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    <textarea
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        className="text-4xl md:text-5xl font-bold bg-transparent border-none outline-none resize-none placeholder:text-black/10 mb-4 h-fit overflow-hidden"
                        placeholder="Title your reflection..."
                        rows={1}
                        onInput={(e) => {
                            const target = e.target as HTMLTextAreaElement;
                            target.style.height = 'auto';
                            target.style.height = target.scrollHeight + 'px';
                        }}
                    />

                    {/* Tags chip input */}
                    <div className="flex flex-wrap items-center gap-2 mb-6 px-1">
                        {tags.map(tag => (
                            <span
                                key={tag}
                                className="inline-flex items-center gap-1 px-3 py-1.5 bg-primary/10 text-primary text-xs font-bold rounded-full border border-primary/20 group"
                            >
                                {tag}
                                <button
                                    onClick={() => removeTag(tag)}
                                    className="w-4 h-4 rounded-full flex items-center justify-center hover:bg-primary/20 transition-colors"
                                >
                                    <X className="w-3 h-3" />
                                </button>
                            </span>
                        ))}
                        <input
                            type="text"
                            value={tagInput}
                            onChange={(e) => setTagInput(e.target.value)}
                            onKeyDown={handleTagKeyDown}
                            onBlur={() => {
                                if (tagInput.trim()) addTag(tagInput);
                            }}
                            placeholder={tags.length === 0 ? "Add tags (press Enter)" : "Add more..."}
                            className="text-sm bg-transparent border-none outline-none placeholder:text-black/15 min-w-[120px] flex-1 py-1.5"
                        />
                    </div>

                    <TiptapEditor
                        content={content}
                        onChange={setContent}
                        placeholder="What's moving you today? Start typing..."
                    />
                </motion.div>
            </main>
        </div>
    );
}
