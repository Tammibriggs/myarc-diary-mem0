import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Plus, Check, Sparkles, User, Trash2, X, Loader2,
    Target, Zap, LayoutGrid, PenLine, Maximize2, Minimize2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

interface ShortsViewProps {
    expandedShort: 'habit' | 'goal' | null;
    setExpandedShort: (view: 'habit' | 'goal' | null) => void;
}

type ShortType = string;

interface Milestone {
    _id?: string;
    title: string;
    isCompleted: boolean;
}

interface ShortItem {
    _id: string;
    type: ShortType;
    content: string;
    source: 'ai' | 'user';
    status: 'active' | 'completed' | 'archived';
    milestones: Milestone[];
    createdAt: string;
}

export function ShortsView({ expandedShort, setExpandedShort }: ShortsViewProps) {
    const [shorts, setShorts] = useState<ShortItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [leftCategory, setLeftCategory] = useState<ShortType>('habit');
    const [rightCategory, setRightCategory] = useState<ShortType>('goal');

    // FAB + modal
    const [showFabMenu, setShowFabMenu] = useState(false);
    const [fabAction, setFabAction] = useState<'content' | 'category' | null>(null);

    // Create content state
    const [createTargetType, setCreateTargetType] = useState<ShortType>('habit');
    const [newContent, setNewContent] = useState('');
    const [newMilestones, setNewMilestones] = useState<string[]>([]);
    const [milestoneInput, setMilestoneInput] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Editing state
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editContent, setEditContent] = useState('');

    // Custom categories state
    const [customCategories, setCustomCategories] = useState<string[]>([]);
    const [newCategoryName, setNewCategoryName] = useState('');

    // Add milestone to existing goal
    const [addingMilestoneToId, setAddingMilestoneToId] = useState<string | null>(null);
    const [newMilestoneText, setNewMilestoneText] = useState('');

    // Delete confirmation
    const [itemToDelete, setItemToDelete] = useState<{ id: string; type: 'short' | 'category'; name?: string } | null>(null);

    const fetchShorts = useCallback(async () => {
        try {
            setIsLoading(true);
            const [shortsRes, catsRes] = await Promise.all([
                axios.get('/api/shorts'),
                axios.get('/api/shorts/categories'),
            ]);
            setShorts(shortsRes.data);
            setCustomCategories(catsRes.data);
        } catch (error) {
            console.error('Failed to fetch shorts:', error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchShorts();
    }, [fetchShorts]);

    const getItemsForCategory = (category: ShortType) =>
        shorts.filter(s => s.type === category);

    const allCategories: { key: ShortType; label: string; icon: typeof Zap }[] = [
        { key: 'habit', label: 'Habits', icon: Zap },
        { key: 'goal', label: 'Goals', icon: Target },
        ...customCategories.map(c => ({ key: c, label: c, icon: LayoutGrid })),
    ];

    const handleCreate = async () => {
        if (!newContent.trim()) return;
        setIsSubmitting(true);

        try {
            const { data } = await axios.post('/api/shorts', {
                type: createTargetType,
                content: newContent.trim(),
                milestones: createTargetType === 'goal' ? newMilestones : undefined,
            });
            setShorts(prev => [data, ...prev]);
            closeFab();
        } catch (error) {
            console.error('Failed to create short:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const confirmDelete = async () => {
        if (!itemToDelete) return;

        try {
            if (itemToDelete.type === 'short') {
                await axios.delete(`/api/shorts/${itemToDelete.id}`);
                setShorts(prev => prev.filter(s => s._id !== itemToDelete.id));
            } else if (itemToDelete.type === 'category') {
                await axios.delete('/api/shorts/categories', { data: { name: itemToDelete.id } });
                setCustomCategories(prev => prev.filter(c => c !== itemToDelete.id));
                // Optimistically remove shorts of this category from view
                setShorts(prev => prev.filter(s => s.type !== itemToDelete.id)); // Fix: use .type instead of comparing s._id to category name
            }
        } catch (error) {
            console.error('Failed to delete item:', error);
        } finally {
            setItemToDelete(null);
        }
    };

    const handleDelete = (id: string) => {
        setItemToDelete({ id, type: 'short' });
    };

    const startEditing = (id: string, content: string) => {
        setEditContent(content);
        // Use setTimeout to ensure editContent is set before editingId triggers re-render
        setTimeout(() => setEditingId(id), 0);
    };

    const handleUpdateContent = async (id: string) => {
        if (!editContent.trim()) return;
        try {
            const { data } = await axios.put(`/api/shorts/${id}`, { content: editContent.trim() });
            setShorts(prev => prev.map(s => s._id === id ? data : s));
            setEditingId(null);
            setEditContent('');
        } catch (error) {
            console.error('Failed to update short:', error);
        }
    };

    const handleToggleMilestone = async (shortId: string, milestoneIndex: number) => {
        const short = shorts.find(s => s._id === shortId);
        if (!short) return;

        const updated = short.milestones.map((m, i) =>
            i === milestoneIndex ? { ...m, isCompleted: !m.isCompleted } : m
        );

        try {
            const { data } = await axios.put(`/api/shorts/${shortId}`, { milestones: updated });
            setShorts(prev => prev.map(s => s._id === shortId ? data : s));
        } catch (error) {
            console.error('Failed to update milestone:', error);
        }
    };

    const handleAddMilestoneToGoal = async (goalId: string) => {
        if (!newMilestoneText.trim()) return;
        const goal = shorts.find(s => s._id === goalId);
        if (!goal) return;

        const updated = [...goal.milestones, { title: newMilestoneText.trim(), isCompleted: false }];

        try {
            const { data } = await axios.put(`/api/shorts/${goalId}`, { milestones: updated });
            setShorts(prev => prev.map(s => s._id === goalId ? data : s));
            setNewMilestoneText('');
            setAddingMilestoneToId(null);
        } catch (error) {
            console.error('Failed to add milestone:', error);
        }
    };

    const handleStatusChange = async (id: string, status: string) => {
        try {
            const { data } = await axios.put(`/api/shorts/${id}`, { status });
            setShorts(prev => prev.map(s => s._id === id ? data : s));
        } catch (error) {
            console.error('Failed to update status:', error);
        }
    };

    const addMilestone = () => {
        if (milestoneInput.trim()) {
            setNewMilestones(prev => [...prev, milestoneInput.trim()]);
            setMilestoneInput('');
        }
    };

    const closeFab = () => {
        setShowFabMenu(false);
        setFabAction(null);
        setNewContent('');
        setNewMilestones([]);
        setMilestoneInput('');
        setNewCategoryName('');
    };

    const handleAddCategory = async () => {
        if (!newCategoryName.trim()) return;
        try {
            const { data } = await axios.post('/api/shorts/categories', { name: newCategoryName.trim() });
            setCustomCategories(data);
            closeFab();
        } catch (error) {
            console.error('Failed to add category:', error);
        }
    };

    const handleDeleteCategory = (name: string) => {
        setItemToDelete({ id: name, type: 'category', name });
    };

    // ─── Category Toggle ─────────────────────────────────────────────
    const renderCategoryToggle = (activeCategory: ShortType, setCategory: (c: ShortType) => void) => (
        <div className="flex gap-1 bg-black/5 rounded-full p-1 flex-wrap">
            {allCategories.map(cat => {
                const Icon = cat.icon;
                return (
                    <button
                        key={cat.key}
                        onClick={() => setCategory(cat.key as ShortType)}
                        className={cn(
                            "px-4 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1",
                            activeCategory === cat.key
                                ? "bg-white text-primary shadow-sm"
                                : "text-muted-foreground hover:text-foreground"
                        )}
                    >
                        <Icon className="w-3 h-3" />
                        {cat.label}
                        {/* Delete custom categories */}
                        {cat.key !== 'habit' && cat.key !== 'goal' && (
                            <button
                                onClick={(e) => { e.stopPropagation(); handleDeleteCategory(cat.key); }}
                                className="ml-1 text-red-400 hover:text-red-600"
                            >
                                <X className="w-3 h-3" />
                            </button>
                        )}
                    </button>
                );
            })}
        </div>
    );

    // ─── Habit Card ──────────────────────────────────────────────────
    const renderHabitCard = (habit: ShortItem, i: number) => (
        <motion.div
            key={habit._id}
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ delay: i * 0.05 }}
            className="relative group"
        >
            {editingId === habit._id ? (
                <div className="flex gap-2">
                    <Input
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleUpdateContent(habit._id)}
                        className="rounded-xl"
                        autoFocus
                    />
                    <Button size="sm" onClick={() => handleUpdateContent(habit._id)} className="rounded-xl">
                        <Check className="w-4 h-4" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditingId(null)} className="rounded-xl">
                        <X className="w-4 h-4" />
                    </Button>
                </div>
            ) : (
                <>
                    <div className="absolute -left-6 top-1 text-primary/20 text-6xl font-serif italic pointer-events-none">&quot;</div>
                    <p
                        className="text-xl md:text-2xl font-medium leading-tight text-[#171717]/80 hover:text-primary transition-colors cursor-pointer"
                        onClick={() => startEditing(habit._id, habit.content)}
                    >
                        {habit.content}
                    </p>
                    <div className="mt-4 flex items-center gap-3 text-xs font-bold text-primary/40 uppercase tracking-widest">
                        <span className={cn(
                            "inline-flex items-center gap-1 px-2 py-0.5 rounded-full",
                            habit.source === 'ai' ? "bg-violet-50 text-violet-500" : "bg-blue-50 text-blue-500"
                        )}>
                            {habit.source === 'ai' ? <Sparkles className="w-3 h-3" /> : <User className="w-3 h-3" />}
                            {habit.source === 'ai' ? 'AI Detected' : 'You'}
                        </span>
                        <button
                            onClick={() => handleDelete(habit._id)}
                            className="opacity-0 group-hover:opacity-100 transition-opacity text-red-400 hover:text-red-600"
                        >
                            <Trash2 className="w-3.5 h-3.5" />
                        </button>
                    </div>
                </>
            )}
        </motion.div>
    );

    // ─── Goal Card ───────────────────────────────────────────────────
    const renderGoalCard = (goal: ShortItem, i: number) => {
        const completedMilestones = goal.milestones.filter(m => m.isCompleted).length;
        const totalMilestones = goal.milestones.length;
        const progress = totalMilestones > 0 ? Math.round((completedMilestones / totalMilestones) * 100) : 0;

        return (
            <motion.div
                key={goal._id}
                initial={{ x: 20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ delay: i * 0.05 }}
                className="p-6 rounded-[32px] bg-white border border-secondary/20 shadow-xl shadow-secondary/5 group/goal"
            >
                {/* Header */}
                <div className="flex justify-between items-start mb-4">
                    {editingId === goal._id ? (
                        <div className="flex gap-2 flex-1 mr-2">
                            <Input
                                value={editContent}
                                onChange={(e) => setEditContent(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleUpdateContent(goal._id)}
                                className="rounded-xl"
                                autoFocus
                            />
                            <Button size="sm" onClick={() => handleUpdateContent(goal._id)} className="rounded-xl">
                                <Check className="w-4 h-4" />
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => setEditingId(null)} className="rounded-xl">
                                <X className="w-4 h-4" />
                            </Button>
                        </div>
                    ) : (
                        <h3
                            className="text-xl md:text-2xl font-bold cursor-pointer hover:text-secondary transition-colors"
                            onClick={() => startEditing(goal._id, goal.content)}
                        >
                            {goal.content}
                        </h3>
                    )}
                    <div className="flex items-center gap-2 shrink-0">
                        <span className={cn(
                            "text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full",
                            goal.source === 'ai' ? "bg-violet-50 text-violet-500" : "bg-blue-50 text-blue-500"
                        )}>
                            {goal.source === 'ai' ? '✦ AI' : '✎ You'}
                        </span>
                        <select
                            value={goal.status}
                            onChange={(e) => handleStatusChange(goal._id, e.target.value)}
                            className="text-[10px] font-bold uppercase tracking-widest bg-secondary/10 text-secondary px-2 py-1 rounded-full border-none outline-none cursor-pointer"
                        >
                            <option value="active">Active</option>
                            <option value="completed">Completed</option>
                            <option value="archived">Archived</option>
                        </select>
                    </div>
                </div>

                {/* Progress bar (always show if milestones exist) */}
                {totalMilestones > 0 && (
                    <div className="space-y-2 mb-4">
                        <div className="flex justify-between text-xs font-bold text-muted-foreground uppercase tracking-tighter">
                            <span>Progress</span>
                            <span>{completedMilestones}/{totalMilestones} — {progress}%</span>
                        </div>
                        <div className="h-3 bg-secondary/10 rounded-full overflow-hidden">
                            <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${progress}%` }}
                                className="h-full bg-secondary shadow-[0_0_15px_rgba(132,204,22,0.3)]"
                            />
                        </div>
                    </div>
                )}

                {/* Milestones */}
                <div className="space-y-2">
                    {goal.milestones.map((milestone, mi) => (
                        <button
                            key={milestone._id || mi}
                            onClick={() => handleToggleMilestone(goal._id, mi)}
                            className="flex items-center gap-3 w-full text-left group/m"
                        >
                            <div className={cn(
                                "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all shrink-0",
                                milestone.isCompleted
                                    ? "bg-secondary border-secondary text-white"
                                    : "border-secondary/30 group-hover/m:border-secondary/60"
                            )}>
                                {milestone.isCompleted && <Check className="w-3 h-3" />}
                            </div>
                            <span className={cn(
                                "text-sm transition-all",
                                milestone.isCompleted && "line-through text-muted-foreground"
                            )}>
                                {milestone.title}
                            </span>
                        </button>
                    ))}

                    {/* Add milestone inline */}
                    {addingMilestoneToId === goal._id ? (
                        <div className="flex items-center gap-2 pl-8">
                            <Input
                                value={newMilestoneText}
                                onChange={(e) => setNewMilestoneText(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleAddMilestoneToGoal(goal._id);
                                    if (e.key === 'Escape') { setAddingMilestoneToId(null); setNewMilestoneText(''); }
                                }}
                                placeholder="New milestone..."
                                className="rounded-xl text-sm h-8 flex-1"
                                autoFocus
                            />
                            <Button size="sm" variant="ghost" onClick={() => handleAddMilestoneToGoal(goal._id)} className="rounded-xl h-8 px-2">
                                <Check className="w-4 h-4" />
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => { setAddingMilestoneToId(null); setNewMilestoneText(''); }} className="rounded-xl h-8 px-2">
                                <X className="w-4 h-4" />
                            </Button>
                        </div>
                    ) : (
                        <button
                            onClick={() => { setAddingMilestoneToId(goal._id); setNewMilestoneText(''); }}
                            className="flex items-center gap-3 w-full text-left text-sm text-muted-foreground/50 hover:text-muted-foreground transition-colors pl-0"
                        >
                            <div className="w-5 h-5 rounded-full border-2 border-dashed border-secondary/20 flex items-center justify-center">
                                <Plus className="w-3 h-3" />
                            </div>
                            Add milestone
                        </button>
                    )}
                </div>

                {/* Delete */}
                <div className="mt-4 flex justify-end">
                    <button
                        onClick={() => handleDelete(goal._id)}
                        className="opacity-0 group-hover/goal:opacity-100 transition-opacity text-red-400 hover:text-red-600"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>
            </motion.div>
        );
    };

    // ─── Empty State ─────────────────────────────────────────────────
    const renderEmptyState = (type: ShortType) => (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center py-20 text-center"
        >
            <div className={cn(
                "w-16 h-16 rounded-full flex items-center justify-center mb-4",
                type === 'habit' ? "bg-primary/10" : type === 'goal' ? "bg-secondary/10" : "bg-black/5"
            )}>
                {type === 'habit' ? <Zap className="w-7 h-7 text-primary/40" /> :
                    type === 'goal' ? <Target className="w-7 h-7 text-secondary/40" /> :
                        <LayoutGrid className="w-7 h-7 text-muted-foreground/40" />}
            </div>
            <h3 className="text-lg font-bold text-foreground/40 mb-1">
                No {type === 'habit' ? 'habits' : type === 'goal' ? 'goals' : type} yet
            </h3>
            <p className="text-sm text-muted-foreground/60 max-w-xs">
                {type === 'habit'
                    ? "Write journal entries and the AI will detect your recurring behavioral patterns."
                    : type === 'goal'
                        ? "Set a goal manually or let the AI detect recurring intentions from your entries."
                        : `Add a new ${type} manually to start tracking.`
                }
            </p>
        </motion.div>
    );

    // ─── Pane ────────────────────────────────────────────────────────
    const renderPane = (
        side: 'left' | 'right',
        category: ShortType,
        setCategory: (c: ShortType) => void,
        expandKey: 'habit' | 'goal',
        collapseKey: 'habit' | 'goal'
    ) => {
        const items = getItemsForCategory(category);

        return (
            <div
                className={cn(
                    "overflow-y-auto relative bg-linear-to-br to-transparent border-r border-black/5 p-8 md:p-12 transition-all duration-500 ease-in-out",
                    side === 'left' ? "from-primary/5" : "from-secondary/5",
                    expandedShort === expandKey ? "flex-10 h-full" : expandedShort === collapseKey ? "flex-0 h-0 p-0 overflow-hidden" : "flex-1 h-full"
                )}
            >
                <div className="max-w-xl mx-auto space-y-8">
                    <div className="flex items-center justify-between flex-wrap gap-4">
                        {renderCategoryToggle(category, setCategory)}
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setExpandedShort(expandedShort === expandKey ? null : expandKey)}
                            className="rounded-full opacity-50 hover:opacity-100 transition-opacity md:hidden"
                        >
                            {expandedShort === expandKey ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
                        </Button>
                    </div>

                    {isLoading ? (
                        <div className="flex justify-center py-20">
                            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground/40" />
                        </div>
                    ) : items.length === 0 ? (
                        renderEmptyState(category)
                    ) : (
                        <div className={cn("space-y-8", category === 'goal' && "space-y-6")}>
                            <AnimatePresence mode="popLayout">
                                {items.map((item, i) =>
                                    category === 'goal'
                                        ? renderGoalCard(item, i)
                                        : renderHabitCard(item, i)
                                )}
                            </AnimatePresence>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    // ─── FAB Modal ───────────────────────────────────────────────────
    const renderFabModal = () => (
        <AnimatePresence>
            {showFabMenu && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
                    onClick={closeFab}
                >
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.9, opacity: 0, y: 20 }}
                        className="bg-white rounded-3xl shadow-2xl w-full max-w-md mx-4 overflow-hidden"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {!fabAction ? (
                            // Action selection
                            <div className="p-6 space-y-4">
                                <h2 className="text-lg font-bold">What would you like to do?</h2>
                                <button
                                    onClick={() => setFabAction('content')}
                                    className="w-full flex items-center gap-4 p-4 rounded-2xl hover:bg-primary/5 transition-colors text-left"
                                >
                                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                                        <PenLine className="w-5 h-5 text-primary" />
                                    </div>
                                    <div>
                                        <p className="font-bold">Add Content</p>
                                        <p className="text-sm text-muted-foreground">Create a new short in a category</p>
                                    </div>
                                </button>
                                <button
                                    onClick={() => setFabAction('category')}
                                    className="w-full flex items-center gap-4 p-4 rounded-2xl hover:bg-secondary/5 transition-colors text-left"
                                >
                                    <div className="w-12 h-12 rounded-full bg-secondary/10 flex items-center justify-center">
                                        <LayoutGrid className="w-5 h-5 text-secondary" />
                                    </div>
                                    <div>
                                        <p className="font-bold">Add a Category</p>
                                        <p className="text-sm text-muted-foreground">Create a new label to organize your shorts</p>
                                    </div>
                                </button>
                            </div>
                        ) : fabAction === 'content' ? (
                            // Create content form
                            <div className="p-6 space-y-5">
                                <div className="flex items-center justify-between">
                                    <h2 className="text-lg font-bold">New Short</h2>
                                    <Button variant="ghost" size="icon" onClick={closeFab} className="rounded-full">
                                        <X className="w-5 h-5" />
                                    </Button>
                                </div>

                                {/* Type selector */}
                                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
                                    {allCategories.map(cat => {
                                        const Icon = cat.icon;
                                        return (
                                            <button
                                                key={cat.key}
                                                onClick={() => setCreateTargetType(cat.key)}
                                                className={cn(
                                                    "px-4 py-2 rounded-2xl text-sm font-bold transition-all border-2 flex items-center gap-2 whitespace-nowrap",
                                                    createTargetType === cat.key
                                                        ? cat.key === 'habit' ? "border-primary bg-primary/5 text-primary"
                                                            : cat.key === 'goal' ? "border-secondary bg-secondary/5 text-secondary"
                                                                : "border-black/20 bg-black/5 text-foreground"
                                                        : "border-transparent bg-black/5 text-muted-foreground"
                                                )}
                                            >
                                                <Icon className="w-4 h-4" />
                                                {cat.label}
                                            </button>
                                        );
                                    })}
                                </div>

                                <Input
                                    value={newContent}
                                    onChange={(e) => setNewContent(e.target.value)}
                                    placeholder={
                                        createTargetType === 'goal' ? "What's your goal?" :
                                            createTargetType === 'habit' ? "What pattern have you noticed?" :
                                                `Add to ${createTargetType}...`
                                    }
                                    className="rounded-xl border-black/10"
                                    autoFocus
                                />

                                {/* Milestones for goals */}
                                {createTargetType === 'goal' && (
                                    <div className="space-y-2">
                                        <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Milestones</p>
                                        <div className="space-y-1.5">
                                            {newMilestones.map((m, i) => (
                                                <div key={i} className="flex items-center gap-2 text-sm text-foreground/80">
                                                    <div className="w-4 h-4 rounded-full border-2 border-secondary/30 shrink-0" />
                                                    <span className="flex-1">{m}</span>
                                                    <button onClick={() => setNewMilestones(prev => prev.filter((_, j) => j !== i))}>
                                                        <X className="w-3 h-3 text-muted-foreground" />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                        <div className="flex gap-2">
                                            <Input
                                                value={milestoneInput}
                                                onChange={(e) => setMilestoneInput(e.target.value)}
                                                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addMilestone())}
                                                placeholder="Add a milestone..."
                                                className="rounded-xl border-black/10 text-sm h-9"
                                            />
                                            <Button size="sm" variant="ghost" onClick={addMilestone} className="rounded-xl">
                                                <Plus className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </div>
                                )}

                                <div className="flex gap-2 justify-end pt-2">
                                    <Button variant="ghost" size="sm" onClick={closeFab} className="rounded-xl">
                                        Cancel
                                    </Button>
                                    <Button
                                        size="sm"
                                        onClick={handleCreate}
                                        disabled={isSubmitting || !newContent.trim()}
                                        className="rounded-xl"
                                    >
                                        {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save'}
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            // Create category form
                            <div className="p-6 space-y-5">
                                <div className="flex items-center justify-between">
                                    <h2 className="text-lg font-bold">New Category</h2>
                                    <Button variant="ghost" size="icon" onClick={closeFab} className="rounded-full">
                                        <X className="w-5 h-5" />
                                    </Button>
                                </div>

                                {customCategories.length > 0 && (
                                    <div className="space-y-1.5">
                                        <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Existing Custom</p>
                                        <div className="flex flex-wrap gap-2">
                                            {customCategories.map(c => (
                                                <span key={c} className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/5 text-sm">
                                                    {c}
                                                    <button onClick={() => handleDeleteCategory(c)}>
                                                        <X className="w-3 h-3 text-muted-foreground hover:text-red-500" />
                                                    </button>
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <Input
                                    value={newCategoryName}
                                    onChange={(e) => setNewCategoryName(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleAddCategory()}
                                    placeholder="Category name..."
                                    className="rounded-xl border-black/10"
                                    autoFocus
                                />

                                <div className="flex gap-2 justify-end pt-2">
                                    <Button variant="ghost" size="sm" onClick={closeFab} className="rounded-xl">
                                        Cancel
                                    </Button>
                                    <Button
                                        size="sm"
                                        onClick={handleAddCategory}
                                        disabled={!newCategoryName.trim()}
                                        className="rounded-xl"
                                    >
                                        Create
                                    </Button>
                                </div>
                            </div>
                        )}
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );

    return (
        <>
            <motion.div
                key="shorts"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="fixed inset-0 z-30 pt-16 h-full flex flex-col-reverse md:flex-row overflow-hidden bg-background"
            >
                {renderPane('left', leftCategory, setLeftCategory, 'habit', 'goal')}
                {renderPane('right', rightCategory, setRightCategory, 'goal', 'habit')}
            </motion.div>

            {/* Floating Action Button */}
            <motion.button
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.3, type: 'spring', stiffness: 200 }}
                onClick={() => setShowFabMenu(true)}
                className="fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full bg-primary text-white shadow-lg shadow-primary/30 flex items-center justify-center hover:bg-primary/90 transition-colors active:scale-95"
            >
                <Plus className="w-6 h-6" />
            </motion.button>

            {renderFabModal()}

            {/* Delete Confirmation Modal */}
            <AnimatePresence>
                {itemToDelete && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm"
                        onClick={() => setItemToDelete(null)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            className="bg-white rounded-3xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden p-6 text-center space-y-4"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-2">
                                <Trash2 className="w-6 h-6 text-red-500" />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-foreground">Delete {itemToDelete.type === 'category' ? 'Category' : 'Short'}?</h3>
                                <p className="text-sm text-muted-foreground mt-2">
                                    {itemToDelete.type === 'category'
                                        ? `Are you sure you want to delete "${itemToDelete.name}"? This will also delete all shorts in this category.`
                                        : "Are you sure you want to delete this content? This action cannot be undone."}
                                </p>
                            </div>
                            <div className="flex gap-3 pt-2">
                                <Button
                                    variant="ghost"
                                    onClick={() => setItemToDelete(null)}
                                    className="flex-1 rounded-xl"
                                >
                                    Cancel
                                </Button>
                                <Button
                                    variant="destructive"
                                    onClick={confirmDelete}
                                    className="flex-1 rounded-xl bg-red-500 hover:bg-red-600 text-white"
                                >
                                    Delete
                                </Button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}
