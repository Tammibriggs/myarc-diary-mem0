import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { User, Zap, Search, Plus, Book, ArrowUpRight, ChevronRight, X, LogOut, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState, useEffect } from 'react';
import { ThemeType } from '@/context/ThemeContext';
import { useSession, signOut } from 'next-auth/react';
import axios from 'axios';

interface ProfileViewProps {
    currentFocus: string;
    setCurrentFocus: (focus: string) => void;
    currentTheme: ThemeType;
    setTheme: (theme: ThemeType) => void;
}

export function ProfileView({
    currentFocus,
    setCurrentFocus,
    currentTheme,
    setTheme,
}: ProfileViewProps) {
    const { data: session, update } = useSession();
    const [activeOverlay, setActiveOverlay] = useState<'email' | 'notifications' | 'privacy' | null>(null);
    const [stats, setStats] = useState({ reflections: 0, goalsAchieved: 0 });
    const [pin, setPin] = useState('');
    const [confirmPin, setConfirmPin] = useState('');
    const [pinError, setPinError] = useState('');
    const [isPinSaved, setIsPinSaved] = useState(false);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const [entriesRes, shortsRes] = await Promise.all([
                    axios.get('/api/entries'),
                    axios.get('/api/shorts')
                ]);
                const reflections = entriesRes.data.totalCount || 0;
                const goalsAchieved = Array.isArray(shortsRes.data) ? shortsRes.data.filter((s: any) => s.type === 'goal' && s.status === 'completed').length : 0;
                setStats({ reflections, goalsAchieved });
            } catch (error) {
                console.error("Failed to fetch stats", error);
            }
        };
        fetchStats();
    }, []);

    const focusLenses = [
        { id: 'Career Growth', icon: Zap, color: 'text-primary' },
        { id: 'Mental Clarity', icon: Book, color: 'text-secondary' },
        { id: 'Connections', icon: User, color: 'text-purple-500' },
        { id: 'Fitness & Health', icon: Plus, color: 'text-red-500' },
        { id: 'Creative Flow', icon: Search, color: 'text-orange-500' },
    ];

    const userName = session?.user?.name || 'User';
    const userEmail = session?.user?.email || '';
    const userImage = session?.user?.image;

    const handleSetTheme = async (theme: {
        id: string;
        label: string;
        colors: string[];
        accent: string;
    }) => {
        setTheme(theme.id as ThemeType);
        try {
            await axios.patch('/api/user/profile', { themePreference: theme.id });
        } catch (e) {
            console.error("Failed to save theme", e);
        }
    }

    const handleSavePin = async () => {
        if (pin.length < 4) {
            setPinError("PIN must be at least 4 digits");
            return;
        }
        if (pin !== confirmPin) {
            setPinError("PINs do not match");
            return;
        }

        try {
            await axios.post('/api/user/pin/set', { pin });
            setIsPinSaved(true);
            setPin('');
            setConfirmPin('');
            setPinError('');
            // Update NextAuth session so PrivacyGuard knows a PIN is set
            await update({ privacyPinSet: true });
            setTimeout(() => {
                setActiveOverlay(null);
                setIsPinSaved(false);
            }, 2000);
        } catch (e) {
            setPinError("Failed to save PIN");
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col h-full space-y-12 pb-20"
        >
            <div className="flex flex-col md:flex-row gap-8 items-center md:items-start text-center md:text-left">
                <div className="w-32 h-32 rounded-[40px] bg-linear-to-br from-primary to-secondary p-1 shadow-2xl shadow-primary/20">
                    <div className="w-full h-full bg-white rounded-[38px] flex items-center justify-center overflow-hidden">
                        {userImage ? (
                            <img src={userImage} alt={userName} className="w-full h-full object-cover" />
                        ) : (
                            <User className="w-16 h-16 text-primary/30" />
                        )}
                    </div>
                </div>
                <div className="space-y-2">
                    <h2 className="text-5xl font-black tracking-tighter">{userName}</h2>
                    <div className="flex flex-wrap gap-2 justify-center md:justify-start">
                        <span className="px-3 py-1 bg-primary/10 text-primary rounded-full text-[10px] font-bold tracking-widest uppercase italic border border-primary/20">Deep Thinker</span>
                        <span className="px-3 py-1 bg-secondary/10 text-secondary rounded-full text-[10px] font-bold tracking-widest uppercase border border-secondary/20">Pro Member</span>
                    </div>
                    <p className="text-muted-foreground text-lg italic mt-4 max-w-sm">&quot;On an arc towards professional and personal mastery.&quot;</p>
                </div>
                <div className="md:ml-auto flex items-center gap-6">
                    <div className="text-right">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-[#171717]/40 mb-1">Arc Points</p>
                        <p className="text-4xl font-black text-primary">12,450</p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {[
                    { label: "Total Reflections", value: stats.reflections.toString(), color: "text-primary" },
                    { label: "Goals Achieved", value: stats.goalsAchieved.toString(), color: "text-purple-500" },
                ].map((stat, i) => (
                    <div key={i} className="p-8 rounded-[32px] bg-white border border-white/50 shadow-xl shadow-black/5 hover:-translate-y-1 transition-transform">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-4">{stat.label}</p>
                        <p className={cn("text-5xl font-black", stat.color)}>{stat.value}</p>
                    </div>
                ))}
            </div>

            <Card className="rounded-[40px] border-white/50 shadow-2xl overflow-hidden bg-white">
                <div className="bg-primary p-10 text-white relative">
                    <Zap className="absolute top-8 right-8 w-24 h-24 opacity-20" />
                    <h3 className="text-3xl font-bold mb-2">My Plan</h3>
                    <p className="text-primary-foreground/80 mb-8 max-w-md">You are currently on the **Pro Plan**. You have unlimited access to AI insights and long-term memory features.</p>
                    <div className="flex flex-wrap gap-4">
                        <Button className="bg-white text-primary hover:bg-white/90 font-bold rounded-full px-8 h-12">Manage Subscription</Button>
                        <Button variant="ghost" className="text-white hover:bg-white/10 font-bold rounded-full px-8 h-12 underline underline-offset-4 decoration-white/30">View tiers</Button>
                    </div>
                </div>
            </Card>

            <div className="space-y-8">
                <div className="flex items-center justify-between px-2">
                    <h3 className="text-xl font-bold">Current Focus</h3>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-primary">AI Analysis Lens</span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    {focusLenses.map((lens) => (
                        <button
                            key={lens.id}
                            onClick={() => setCurrentFocus(lens.id)}
                            className={cn(
                                "flex flex-col items-center justify-center p-6 rounded-[32px] border transition-all duration-300 group",
                                currentFocus === lens.id
                                    ? "bg-white border-primary shadow-xl shadow-primary/5 scale-105"
                                    : "bg-white/40 border-black/5 hover:bg-white hover:border-black/10"
                            )}
                        >
                            <div className={cn(
                                "mb-3 p-3 rounded-2xl transition-all",
                                currentFocus === lens.id ? "bg-primary text-white" : "bg-black/5 " + lens.color
                            )}>
                                <lens.icon className="w-6 h-6" />
                            </div>
                            <span className={cn(
                                "text-[10px] font-bold uppercase tracking-tighter text-center",
                                currentFocus === lens.id ? "text-primary" : "text-muted-foreground"
                            )}>{lens.id}</span>
                        </button>
                    ))}
                </div>
            </div>

            <div className="space-y-8">
                <div className="flex items-center justify-between px-2">
                    <h3 className="text-xl font-bold">Themes</h3>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-[#171717]/40">Vibe Selection</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    {[
                        { id: 'electric', label: 'Electric Garden', colors: ['#8b5cf6', '#84cc16'], accent: 'from-primary to-secondary' },
                        { id: 'midnight', label: 'Midnight Arc', colors: ['#2563eb', '#22d3ee'], accent: 'from-blue-600 to-cyan-400' },
                        { id: 'solar', label: 'Solar Wind', colors: ['#f97316', '#facc15'], accent: 'from-orange-500 to-yellow-500' },
                        { id: 'boreal', label: 'Boreal Focus', colors: ['#059669', '#2dd4bf'], accent: 'from-emerald-600 to-teal-500' },
                    ].map((theme) => (
                        <button
                            key={theme.id}
                            onClick={() => handleSetTheme(theme)}
                            className={cn(
                                "relative overflow-hidden p-6 rounded-[32px] border transition-all text-left group",
                                currentTheme === theme.id
                                    ? "bg-white border-primary shadow-xl ring-1 ring-primary/20"
                                    : "bg-white/40 border-black/5 hover:bg-white hover:border-black/10"
                            )}
                        >
                            <div className={cn("absolute top-0 right-0 w-16 h-16 opacity-5 bg-linear-to-bl rounded-bl-full", theme.accent)} />
                            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-4">{theme.id}</p>
                            <div className="flex gap-1.5 mb-2">
                                <div className="w-6 h-6 rounded-full" style={{ backgroundColor: theme.colors[0] }} />
                                <div className="w-6 h-6 rounded-full opacity-50" style={{ backgroundColor: theme.colors[1] }} />
                            </div>
                            <span className="text-xs font-bold capitalize">{theme.label}</span>
                        </button>
                    ))}
                </div>
            </div>

            <div className="space-y-6">
                <h3 className="text-xl font-bold px-2">Account Settings</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[
                        { label: "Email Address", value: userEmail, type: 'email' },
                        { label: "Notifications", value: "Manage preferences", type: 'notifications' },
                        { label: "Privacy & Security", value: "Manage PIN & Access", type: 'privacy' },
                    ].map((item, i) => (
                        <button
                            key={i}
                            onClick={() => setActiveOverlay(item.type as any)}
                            className="flex items-center justify-between p-6 rounded-[32px] bg-white/60 border border-white/50 hover:bg-white transition-colors group"
                        >
                            <div className="text-left">
                                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">{item.label}</p>
                                <p className="font-semibold">{item.value}</p>
                            </div>
                            <ChevronRight className="w-5 h-5 opacity-20 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                        </button>
                    ))}
                </div>
            </div>

            <div className="pt-8 flex justify-center">
                <Button
                    variant="ghost"
                    onClick={() => signOut({ callbackUrl: '/auth' })}
                    className="text-red-500 hover:text-red-600 font-bold text-lg hover:bg-red-50 px-12 rounded-full h-16 active:scale-95 transition-all"
                >
                    <LogOut className="w-5 h-5 mr-3" />
                    Sign Out
                </Button>
            </div>

            {/* Settings Overlay */}
            <AnimatePresence>
                {activeOverlay && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-55 flex items-center justify-center p-6 bg-black/20 backdrop-blur-sm"
                        onClick={() => setActiveOverlay(null)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            onClick={(e) => e.stopPropagation()}
                            className="w-full max-w-lg bg-white rounded-[40px] shadow-2xl border border-white/50 p-10 relative overflow-hidden"
                        >
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setActiveOverlay(null)}
                                className="absolute top-6 right-6 rounded-full hover:bg-black/5"
                            >
                                <X className="w-6 h-6" />
                            </Button>

                            {activeOverlay === 'email' ? (
                                <div className="space-y-8">
                                    <div className="space-y-2">
                                        <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mb-2">
                                            <User className="w-8 h-8" />
                                        </div>
                                        <h2 className="text-3xl font-bold">Email Address</h2>
                                        <p className="text-muted-foreground">Manage how you access your Arc results.</p>
                                    </div>
                                    <div className="space-y-4">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground px-1">Current Email</label>
                                            <Input defaultValue={userEmail} disabled className="h-14 rounded-2xl bg-black/5" />
                                        </div>
                                        <p className="text-xs text-muted-foreground text-center">Contact support to change your primary account email.</p>
                                    </div>
                                </div>
                            ) : activeOverlay === 'notifications' ? (
                                <div className="space-y-8">
                                    <div className="space-y-2">
                                        <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mb-2">
                                            <Zap className="w-8 h-8" />
                                        </div>
                                        <h2 className="text-3xl font-bold">Notifications</h2>
                                        <p className="text-muted-foreground">Control when MyArc nudges you.</p>
                                    </div>
                                    <div className="space-y-4">
                                        {[
                                            { title: "Growth Insights", desc: "Detected patterns and realizations", checked: true },
                                            { title: "Momentum Reminders", desc: "Gentle nudges to keep your arc going", checked: true },
                                            { title: "Weekly Reports", desc: "Deep dive into your progress", checked: false },
                                        ].map((pref, i) => (
                                            <div key={i} className="flex items-center justify-between p-5 rounded-3xl bg-black/5">
                                                <div>
                                                    <p className="font-bold text-sm">{pref.title}</p>
                                                    <p className="text-[10px] text-muted-foreground font-medium">{pref.desc}</p>
                                                </div>
                                                <div className={cn(
                                                    "w-12 h-6 rounded-full transition-colors relative cursor-pointer",
                                                    pref.checked ? "bg-primary" : "bg-black/10"
                                                )}>
                                                    <div className={cn(
                                                        "absolute top-1 w-4 h-4 rounded-full bg-white transition-all",
                                                        pref.checked ? "right-1" : "left-1"
                                                    )} />
                                                </div>
                                            </div>
                                        ))}
                                        <Button className="w-full h-14 rounded-2xl text-lg font-bold mt-4">Save Preferences</Button>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-8">
                                    <div className="space-y-2">
                                        <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-600 mb-2">
                                            <ShieldCheck className="w-8 h-8" />
                                        </div>
                                        <h2 className="text-3xl font-bold">Privacy & Security</h2>
                                        <p className="text-muted-foreground">Secure your journal with a personal PIN.</p>
                                    </div>

                                    {isPinSaved ? (
                                        <div className="p-6 bg-emerald-50 rounded-2xl text-center">
                                            <ShieldCheck className="w-12 h-12 text-emerald-500 mx-auto mb-2" />
                                            <h3 className="text-xl font-bold text-emerald-800">PIN Saved!</h3>
                                            <p className="text-emerald-600">Your journal is now protected.</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-4">
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground px-1">New PIN</label>
                                                <Input
                                                    type="password"
                                                    placeholder="Enter 4-digit PIN"
                                                    className="h-14 rounded-2xl bg-black/5 text-center text-2xl tracking-[12px] font-bold placeholder:tracking-normal placeholder:text-sm"
                                                    maxLength={4}
                                                    value={pin}
                                                    onChange={(e) => setPin(e.target.value.replace(/[^0-9]/g, ''))}
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground px-1">Confirm PIN</label>
                                                <Input
                                                    type="password"
                                                    placeholder="Confirm 4-digit PIN"
                                                    className="h-14 rounded-2xl bg-black/5 text-center text-2xl tracking-[12px] font-bold placeholder:tracking-normal placeholder:text-sm"
                                                    maxLength={4}
                                                    value={confirmPin}
                                                    onChange={(e) => setConfirmPin(e.target.value.replace(/[^0-9]/g, ''))}
                                                />
                                            </div>
                                            {pinError && <p className="text-red-500 text-sm font-bold text-center bg-red-50 p-2 rounded-lg">{pinError}</p>}
                                            <Button
                                                className="w-full h-14 rounded-2xl text-lg font-bold mt-4 bg-emerald-600 hover:bg-emerald-700 text-white"
                                                onClick={handleSavePin}
                                            >
                                                Save Privacy PIN
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </motion.div >
                    </motion.div >
                )}
            </AnimatePresence >
        </motion.div >
    );
}
