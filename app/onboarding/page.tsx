'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTheme } from '@/context/ThemeContext';
import { Book, User, Plus, Search, Zap, ArrowRight, Check, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSession } from 'next-auth/react';
import axios from 'axios';

export default function OnboardingPage() {
    const { data: session, update: updateSession } = useSession();
    const [step, setStep] = useState(1);
    const [name, setName] = useState('');
    const [focus, setFocus] = useState('Creative Flow');
    const [isSaving, setIsSaving] = useState(false);
    const { colors } = useTheme();
    const router = useRouter();
    const searchParams = useSearchParams();
    const callbackUrl = searchParams.get('callbackUrl') || '/';

    const handleNext = async () => {
        if (step === 3) {
            setIsSaving(true);
            try {
                // Save onboarding data to profile
                await axios.patch('/api/user/profile', {
                    name,
                    currentFocus: focus,
                    isOnboarded: true,
                });
                // Update session to reflect changes locally if needed
                await updateSession();
                router.push(callbackUrl);
            } catch (error) {
                console.error('Failed to save onboarding data', error);
                setIsSaving(false);
            }
        } else {
            setStep(step + 1);
        }
    };

    return (
        <div className="min-h-screen w-full flex flex-col items-center justify-center bg-background p-6 relative overflow-hidden">
            {/* Progress Bar */}
            <div className="absolute top-10 left-1/2 transform -translate-x-1/2 w-32 h-1 bg-secondary/20 rounded-full overflow-hidden">
                <motion.div
                    className="h-full bg-secondary"
                    initial={{ width: 0 }}
                    animate={{ width: `${(step / 3) * 100}%` }}
                    transition={{ duration: 0.5 }}
                />
            </div>

            <AnimatePresence mode="wait">
                {step === 1 && (
                    <motion.div
                        key="step1"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="w-full max-w-md text-center space-y-6"
                    >
                        <div className="w-20 h-20 bg-primary/10 rounded-3xl flex items-center justify-center mx-auto mb-6">
                            <img
                                src="/logo.png"
                                alt="MyArc Logo"
                                className="w-16 h-16 p-2.5 rounded-[24px] object-contain shadow-2xl"
                                style={{ backgroundColor: colors.logoBg, boxShadow: `0 25px 50px -12px ${colors.primary}4D` }}
                            />
                        </div>
                        <h1 className="text-3xl font-bold tracking-tight">How should we call you?</h1>
                        <p className="text-muted-foreground">MyArc is your personal space for reflection.</p>
                        <Input
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Your Name"
                            className="text-lg h-12 text-center"
                            autoFocus
                        />
                        <Button onClick={handleNext} disabled={!name} className="w-full h-12 text-lg">
                            Continue <ArrowRight className="ml-2 w-4 h-4" />
                        </Button>
                    </motion.div>
                )}

                {step === 2 && (
                    <motion.div
                        key="step2"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="w-full max-w-md text-center space-y-6"
                    >
                        <h1 className="text-3xl font-bold tracking-tight">What&apos;s your main focus right now?</h1>
                        <p className="text-muted-foreground">This helps us tailor your daily prompts.</p>
                        <div className="grid grid-cols-1 gap-3">
                            {[
                                { id: 'Career Growth', icon: Zap, color: 'text-primary', desc: 'Performance & skill acquisition' },
                                { id: 'Mental Clarity', icon: Book, color: 'text-secondary', desc: 'Emotional EQ & stress management' },
                                { id: 'Connections', icon: User, color: 'text-purple-500', desc: 'Healthy boundaries & communication' },
                                { id: 'Fitness & Health', icon: Plus, color: 'text-red-500', desc: 'Discipline & physical energy' },
                            ].map((item) => (
                                <button
                                    key={item.id}
                                    onClick={() => setFocus(item.id)}
                                    className={cn(
                                        "p-5 rounded-2xl border text-left transition-all group flex items-start gap-4",
                                        focus === item.id
                                            ? 'border-primary bg-primary/5 ring-1 ring-primary shadow-lg shadow-primary/5 scale-[1.02]'
                                            : 'border-black/5 hover:border-primary/50 hover:bg-muted/50'
                                    )}
                                >
                                    <div className={cn(
                                        "p-2.5 rounded-xl transition-colors",
                                        focus === item.id ? "bg-primary text-white" : "bg-black/5 " + item.color
                                    )}>
                                        <item.icon className="w-5 h-5" />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="font-bold text-sm">{item.id}</span>
                                        <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-tight">{item.desc}</span>
                                    </div>
                                </button>
                            ))}
                        </div>
                        <Button onClick={handleNext} disabled={!focus} className="w-full h-12 text-lg mt-4">
                            Next <ArrowRight className="ml-2 w-4 h-4" />
                        </Button>
                    </motion.div>
                )}

                {step === 3 && (
                    <motion.div
                        key="step3"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="w-full max-w-md text-center space-y-6"
                    >
                        <div className="w-20 h-20 bg-secondary/20 rounded-full flex items-center justify-center mx-auto mb-6">
                            <Check className="w-10 h-10 text-secondary" />
                        </div>
                        <h1 className="text-3xl font-bold tracking-tight">You&apos;re all set, {name}.</h1>
                        <p className="text-muted-foreground">Your journey to clearer thinking starts now.</p>

                        <Card className="bg-card/50 border-border/50 backdrop-blur-sm mt-8">
                            <CardContent className="p-6">
                                <p className="text-sm font-medium text-muted-foreground mb-2">YOUR FIRST PROMPT</p>
                                <p className="text-lg italic">"Based on your focus on <span className="text-primary font-semibold">{focus}</span>, what is one small win you want to achieve this week?"</p>
                            </CardContent>
                        </Card>

                        <Button
                            onClick={handleNext}
                            disabled={isSaving}
                            className="w-full h-12 text-lg bg-secondary text-secondary-foreground hover:bg-secondary/90 transition-all active:scale-[0.98]"
                        >
                            {isSaving ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                "Open My Diary"
                            )}
                        </Button>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
