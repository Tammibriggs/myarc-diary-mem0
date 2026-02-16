'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import {
  Home,
  Book,
  Zap,
  User,
  Search,
  Trash2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTheme } from '@/context/ThemeContext';
import { useSession } from 'next-auth/react';

// Component Imports
import { HomeView } from '@/components/dashboard/HomeView';
import { EntriesView } from '@/components/dashboard/EntriesView';
import { ShortsView } from '@/components/dashboard/ShortsView';
import { ProfileView } from '@/components/dashboard/ProfileView';

export default function Dashboard() {
  const { data: session, status } = useSession();
  const { currentTheme, setTheme, colors } = useTheme();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [activeView, setActiveViewState] = useState<'home' | 'entries' | 'shorts' | 'profile'>('home');
  // @ts-ignore
  const [currentFocus, setCurrentFocus] = useState(session?.user?.currentFocus || 'Creative Flow');
  const [selectedTag, setSelectedTag] = useState('All');
  const [expandedShort, setExpandedShort] = useState<'realizations' | 'goals' | null>(null);
  const [entryToDelete, setEntryToDelete] = useState<any>(null);

  // New function to update state and URL
  const setActiveView = (view: 'home' | 'entries' | 'shorts' | 'profile') => {
    setActiveViewState(view);
    const params = new URLSearchParams(searchParams.toString());
    params.set('view', view);
    router.push(`?${params.toString()}`, { scroll: false });
  };

  // Session Sync
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth');
      return;
    }

    if (status === 'authenticated') {
      // @ts-ignore
      const hasTheme = !!session?.user?.themePreference;

      if (hasTheme) {
        // Sync theme from DB
        // @ts-ignore
        setTheme(session.user.themePreference);
      }
    }

    const view = searchParams.get('view') as any;
    if (view && ['home', 'entries', 'shorts', 'profile'].includes(view)) {
      setActiveViewState(view);
    }
  }, [searchParams, status, session, router, setTheme]);

  // Update currentFocus state when session updates
  useEffect(() => {
    // @ts-ignore
    if (session?.user?.currentFocus) {
      // @ts-ignore
      setCurrentFocus(session.user.currentFocus);
    }
  }, [session]);

  // Mock Data
  const recentEntries = [
    {
      id: 1,
      title: "Morning Thoughts",
      date: "Oct 26",
      time: "08:15 AM",
      tags: ["Clarity"],
      preview: "Today I felt a sudden surge of energy after reading the new project specs...",
      gradient: "from-purple-500/10 to-blue-500/10"
    },
    {
      id: 2,
      title: "The CEO Vision",
      date: "Oct 25",
      time: "11:30 PM",
      tags: ["Focus", "Career"],
      preview: "I need to stop worrying about the small stuff and focus on the big arc...",
      gradient: "from-green-500/10 to-emerald-500/10"
    },
    {
      id: 3,
      title: "Handling Chaos",
      date: "Oct 20",
      time: "02:45 PM",
      tags: ["Resilience"],
      preview: "Everything went wrong today, but I managed to stay calm and...",
      gradient: "from-orange-500/10 to-red-500/10"
    },
  ];

  const allTags = ['All', ...new Set(recentEntries.flatMap(e => e.tags))];
  const filteredEntries = selectedTag === 'All'
    ? [...recentEntries, ...recentEntries]
    : [...recentEntries, ...recentEntries].filter(e => e.tags.includes(selectedTag));

  return (
    <div
      className="min-h-screen bg-[#F3F4F6] text-[#171717] relative overflow-hidden font-sans selection:bg-primary/20"
    >

      {/* Background Ambience */}
      <div className="fixed top-[-10%] left-[-10%] w-[500px] h-[500px] bg-primary/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="fixed bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-secondary/20 rounded-full blur-[120px] pointer-events-none" />

      {/* Top Bar */}
      <header className="fixed top-0 w-full z-40 bg-white/50 backdrop-blur-md px-6 h-16 flex items-center justify-between border-b border-black/5">
        <div className="flex items-center space-x-3 cursor-pointer group" onClick={() => setActiveView('home')}>
          <img
            src="/logo.png"
            alt="MyArc Logo"
            className="w-9 h-9 p-1.5 rounded-xl object-contain transition-transform group-hover:scale-110 shadow-lg"
            style={{ backgroundColor: colors.logoBg, boxShadow: `0 10px 15px -3px ${colors.primary}33` }}
          />
          <h1 className="text-2xl font-bold tracking-tight bg-linear-to-r from-primary to-secondary bg-clip-text text-transparent">
            MyArc
          </h1>
        </div>
        <div className="flex items-center space-x-3">
          <Button variant="ghost" size="icon" className="rounded-full">
            <Search className="w-5 h-5 text-muted-foreground" />
          </Button>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveView('profile')}
              className="text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-full bg-linear-to-r from-primary/10 to-secondary/10 border border-primary/20 text-primary hover:from-primary/20 transition-all hidden md:block"
            >
              Upgrade
            </button>
            <button
              onClick={() => setActiveView('profile')}
              className="w-10 h-10 bg-linear-to-br from-primary to-secondary rounded-xl border border-black/5 flex items-center justify-center text-white transition-transform hover:scale-110 active:scale-95 shadow-lg shadow-primary/20"
            >
              <User className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="pt-24 pb-28 px-4 md:px-6 max-w-5xl mx-auto min-h-screen">
        <AnimatePresence mode="wait">

          {/* HOME VIEW */}
          {activeView === 'home' && (
            <HomeView
              currentFocus={currentFocus}
              recentEntries={recentEntries}
              setActiveView={setActiveView}
              setEntryToDelete={setEntryToDelete}
            />
          )}

          {/* ENTRIES VIEW */}
          {activeView === 'entries' && (
            <EntriesView
              allTags={allTags}
              selectedTag={selectedTag}
              setSelectedTag={setSelectedTag}
              filteredEntries={filteredEntries}
              setEntryToDelete={setEntryToDelete}
            />
          )}

          {/* SHORTS VIEW */}
          {activeView === 'shorts' && (
            <ShortsView
              expandedShort={expandedShort}
              setExpandedShort={setExpandedShort}
            />
          )}

          {/* PROFILE VIEW */}
          {activeView === 'profile' && (
            <ProfileView
              currentFocus={currentFocus}
              setCurrentFocus={setCurrentFocus}
              currentTheme={currentTheme}
              setTheme={setTheme}
            />
          )}

        </AnimatePresence>
      </main>

      {/* Floating Bottom Nav */}
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50">
        <div className="flex items-center bg-white/90 backdrop-blur-2xl border border-white/50 shadow-2xl rounded-full px-3 py-3 gap-1">
          {[
            { id: 'home', icon: Home, label: 'Home' },
            { id: 'entries', icon: Book, label: 'Entries' },
            { id: 'shorts', icon: Zap, label: 'Shorts' },
            { id: 'profile', icon: User, label: 'Profile' },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveView(item.id as any)}
              className={cn(
                "flex flex-col items-center justify-center w-20 h-16 rounded-[28px] transition-all duration-500",
                activeView === item.id
                  ? "bg-[#171717] text-white shadow-xl scale-110"
                  : "text-[#171717]/40 hover:bg-black/5 hover:text-[#171717]"
              )}
            >
              <item.icon className={cn("w-6 h-6 mb-1 transition-transform", activeView === item.id && "scale-110")} />
              <span className="text-[10px] font-extrabold uppercase tracking-tighter">{item.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* DELETE CONFIRMATION MODAL */}
      <AnimatePresence>
        {entryToDelete && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/40 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="w-full max-w-sm bg-white rounded-[40px] p-8 shadow-2xl overflow-hidden relative"
            >
              <div className={cn("absolute inset-0 bg-linear-to-br opacity-5", entryToDelete.gradient)} />

              <div className="relative z-10 text-center space-y-6">
                <div className="w-20 h-20 bg-red-50 rounded-3xl flex items-center justify-center mx-auto mb-4">
                  <Trash2 className="w-10 h-10 text-red-500" />
                </div>

                <div className="space-y-2">
                  <h3 className="text-2xl font-bold">Delete Entry?</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    Are you sure you want to delete <span className="text-[#171717] font-semibold">"{entryToDelete.title}"</span>? This action cannot be undone.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-4">
                  <Button
                    variant="ghost"
                    onClick={() => setEntryToDelete(null)}
                    className="h-14 rounded-2xl font-bold text-muted-foreground hover:bg-black/5"
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => {
                      // In a real app, you would call your delete API here
                      console.log("Deleted entry:", entryToDelete.id);
                      setEntryToDelete(null);
                    }}
                    className="h-14 rounded-2xl font-bold shadow-lg shadow-red-500/20"
                  >
                    Delete
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
