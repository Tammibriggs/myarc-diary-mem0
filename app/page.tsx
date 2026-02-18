'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import {
  Home,
  Book,
  Zap,
  User,
  Trash2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTheme } from '@/context/ThemeContext';
import { useSession } from 'next-auth/react';
import axios from 'axios';

// Component Imports
import { HomeView } from '@/components/dashboard/HomeView';
import { EntriesView } from '@/components/dashboard/EntriesView';
import { ShortsView } from '@/components/dashboard/ShortsView';
import { ProfileView } from '@/components/dashboard/ProfileView';

export default function Dashboard() {
  const { data: session, status, update } = useSession();
  const { currentTheme, setTheme, colors } = useTheme();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [activeView, setActiveViewState] = useState<'home' | 'entries' | 'shorts' | 'profile'>('home');
  // @ts-ignore
  const [currentFocus, setCurrentFocus] = useState(session?.user?.currentFocus || 'Creative Flow');
  const [selectedTag, setSelectedTag] = useState('All');
  const [expandedShort, setExpandedShort] = useState<'habit' | 'goal' | null>(null);
  const [entryToDelete, setEntryToDelete] = useState<any>(null);
  const [isConcealed, setIsConcealed] = useState(false);

  // Entries state
  const [entries, setEntries] = useState<any[]>([]);
  const [allTags, setAllTags] = useState<string[]>(['All']);
  const [entriesPage, setEntriesPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingEntries, setIsLoadingEntries] = useState(false);
  const [totalEntries, setTotalEntries] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');

  // New function to update state and URL
  const setActiveView = (view: 'home' | 'entries' | 'shorts' | 'profile') => {
    setActiveViewState(view);
    const params = new URLSearchParams(searchParams.toString());
    params.set('view', view);
    router.push(`?${params.toString()}`, { scroll: false });
  };

  // Fetch entries
  const fetchEntries = useCallback(async (page: number, tag: string, search: string, append: boolean = false) => {
    if (isLoadingEntries) return;
    setIsLoadingEntries(true);
    try {
      const params: any = { page, limit: 10 };
      if (tag && tag !== 'All') params.tag = tag;
      if (search) params.search = search;
      const { data } = await axios.get('/api/entries', { params });
      setEntries(prev => append ? [...prev, ...data.entries] : data.entries);
      setTotalEntries(data.totalCount);
      setHasMore(data.hasMore);
      setEntriesPage(data.page);
    } catch (error) {
      console.error('Failed to fetch entries:', error);
    } finally {
      setIsLoadingEntries(false);
    }
  }, [isLoadingEntries]);

  // Fetch tags
  const fetchTags = useCallback(async () => {
    try {
      const { data } = await axios.get('/api/entries/tags');
      setAllTags(['All', ...data]);
    } catch (error) {
      console.error('Failed to fetch tags:', error);
    }
  }, []);

  // Load more entries (for infinite scroll)
  const loadMoreEntries = useCallback(() => {
    if (!isLoadingEntries && hasMore) {
      fetchEntries(entriesPage + 1, selectedTag, searchQuery, true);
    }
  }, [isLoadingEntries, hasMore, entriesPage, selectedTag, searchQuery, fetchEntries]);

  // Fetch entries and tags on mount
  useEffect(() => {
    if (status === 'authenticated') {
      fetchEntries(1, selectedTag, searchQuery);
      fetchTags();
    }
  }, [status]); // eslint-disable-line react-hooks/exhaustive-deps

  // Refetch when tag filter changes
  useEffect(() => {
    if (status === 'authenticated') {
      setEntriesPage(1);
      setHasMore(true);
      fetchEntries(1, selectedTag, searchQuery);
    }
  }, [selectedTag]); // eslint-disable-line react-hooks/exhaustive-deps

  // Refetch when search query changes (debounced in EntriesView)
  useEffect(() => {
    if (status === 'authenticated') {
      setEntriesPage(1);
      setHasMore(true);
      fetchEntries(1, selectedTag, searchQuery);
    }
  }, [searchQuery]); // eslint-disable-line react-hooks/exhaustive-deps

  // Filter entries client-side (tags already applied server-side, but kept for consistency)
  const filteredEntries = selectedTag === 'All'
    ? entries
    : entries.filter(e => e.tags?.includes(selectedTag));

  // Session Sync
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth');
      return;
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

  // Sync privacy settings
  useEffect(() => {
    // @ts-ignore
    if (session?.user?.settings?.privacy?.enableConcealedMode) {
      setIsConcealed(true);
    }
  }, [session]);

  const toggleConcealed = async () => {
    const newState = !isConcealed;
    setIsConcealed(newState);
    try {
      await axios.patch('/api/user/profile', {
        privacy: { enableConcealedMode: newState }
      });
      // Update NextAuth session
      await update({ enableConcealedMode: newState });
    } catch (e) {
      console.error("Failed to save privacy setting", e);
    }
  };

  // Delete entry handler
  const handleDeleteEntry = async () => {
    if (!entryToDelete) return;
    try {
      await axios.delete(`/api/entries/${entryToDelete._id}`);
      setEntries(prev => prev.filter(e => e._id !== entryToDelete._id));
      setTotalEntries(prev => prev - 1);
      setEntryToDelete(null);
    } catch (error) {
      console.error("Failed to delete entry:", error);
      setEntryToDelete(null);
    }
  };

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
              recentEntries={entries.slice(0, 3)}
              setActiveView={setActiveView}
              setEntryToDelete={setEntryToDelete}
              isConcealed={isConcealed}
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
              isConcealed={isConcealed}
              onToggleConcealed={toggleConcealed}
              isLoading={isLoadingEntries}
              hasMore={hasMore}
              onLoadMore={loadMoreEntries}
              totalCount={totalEntries}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
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
      <div className="fixed bottom-6 sm:bottom-8 left-1/2 -translate-x-1/2 z-50 w-[90%] sm:w-auto max-w-fit">
        <div className="flex items-center bg-white/90 backdrop-blur-2xl border border-white/50 shadow-2xl rounded-[32px] sm:rounded-full px-2 py-2 sm:px-3 sm:py-3 gap-1 ring-1 ring-black/5">
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
                "flex flex-col items-center justify-center h-14 sm:h-16 rounded-[24px] sm:rounded-[28px] transition-all duration-500 relative overflow-hidden flex-1 sm:flex-none w-16 sm:w-20",
                activeView === item.id
                  ? "bg-[#171717] text-white shadow-xl scale-105 sm:scale-110"
                  : "text-[#171717]/40 hover:bg-black/5 hover:text-[#171717]"
              )}
            >
              <item.icon className={cn("w-5 h-5 sm:w-6 sm:h-6 mb-1 transition-transform", activeView === item.id && "scale-110")} />
              <span className="text-[9px] sm:text-[10px] font-extrabold uppercase tracking-tighter">{item.label}</span>
              {activeView === item.id && (
                <motion.div
                  layoutId="nav-bg"
                  className="absolute inset-0 bg-[#171717] -z-10"
                />
              )}
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
                    onClick={handleDeleteEntry}
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
