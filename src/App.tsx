/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { getDatabase, getUserStats, saveUserStats } from './data';
import { Level, UserStats } from './types';
import PracticePanel from './components/PracticePanel';
import ExamPanel from './components/ExamPanel';
import AdminPanel from './components/AdminPanel';
import LoginScreen from './components/LoginScreen';
import { subscribeToAuth, logoutUser, fetchUserStatsFromDb, saveUserStatsToDb } from './firebase';
import { 
  Flame, Award, Trophy, Music, Zap, Sliders, Sparkles, BookOpen, Clock, 
  Send, RotateCcw, Check, Play, Star, ListCollapse, Volume2, ShieldCheck, ChevronRight, LogOut
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function App() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [db, setDb] = useState(getDatabase());
  const [stats, setStats] = useState<UserStats>(getUserStats());

  // Subscribe to auth states from Firebase / Simulator
  useEffect(() => {
    const unsubscribe = subscribeToAuth(async (user) => {
      setAuthLoading(true);
      if (user) {
        localStorage.setItem("gq_active_uid", user.uid);
        
        try {
          const cloudStats = await fetchUserStatsFromDb(user.uid);
          if (cloudStats) {
            localStorage.setItem(`gq_stats_user_${user.uid}`, JSON.stringify(cloudStats));
          } else {
            const preStats = getUserStats(); 
            await saveUserStatsToDb(user.uid, preStats);
          }
        } catch (e) {
          console.warn("Could not retrieve cloud stats successfully on signin:", e);
        }

        setCurrentUser(user);
        setStats(getUserStats());
      } else {
        localStorage.removeItem("gq_active_uid");
        setCurrentUser(null);
      }
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);
  const [activeView, setActiveView] = useState<'dashboard' | 'practice' | 'exam' | 'admin'>('dashboard');

  // AI tips and chord recommendation states
  const [aiTips, setAiTips] = useState<{ category: string, title: string, detail: string }[]>([]);
  const [isLoadingTips, setIsLoadingTips] = useState(false);
  const [aiTipsSource, setAiTipsSource] = useState('simulator');

  // Dynamic AI Song composer input
  const [customSongTitle, setCustomSongTitle] = useState('');
  const [aiSongResult, setAiSongResult] = useState<{ title: string, chordSequence: string, tabSnippet: string, coachingPointers: string } | null>(null);
  const [isGeneratingSong, setIsGeneratingSong] = useState(false);

  const currentLevel: Level = db.levels.find(l => l.id === stats.level) || db.levels[0];

  // Reload local state DB helper
  const handleDatabaseUpdate = () => {
    setDb(getDatabase());
  };

  // Triggers whenever user dashboard mounts or levels change - Queries server-side Gemini tips!
  const fetchGuitarTips = async (userStats: UserStats, level: Level) => {
    setIsLoadingTips(true);
    try {
      const response = await fetch("/api/gemini/tips", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          levelName: level.name,
          completedSessions: userStats.completedSessions,
          streak: userStats.streak,
          skills: userStats.skills
        }),
      });
      const data = await response.json();
      if (data.tips) {
        setAiTips(data.tips);
        setAiTipsSource(data.source);
      }
    } catch (e) {
      console.warn("Failed fetching AI suggestions", e);
    } finally {
      setIsLoadingTips(false);
    }
  };

  useEffect(() => {
    fetchGuitarTips(stats, currentLevel);
  }, [stats.level]);

  // Request custom backing track song via backend Gemini
  const handleComposeSong = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customSongTitle.trim()) return;
    
    setIsGeneratingSong(true);
    try {
      const response = await fetch("/api/gemini/generate-song", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: customSongTitle,
          difficulty: currentLevel.name,
          availableChords: db.chords.map(c => c.id).slice(0, 3)
        })
      });
      const data = await response.json();
      if (data.riff) {
        setAiSongResult(data.riff);
      }
    } catch (e) {
      console.warn("Failed generating custom song riff", e);
    } finally {
      setIsGeneratingSong(false);
    }
  };

  // Reset progress helper
  const handleResetProgress = () => {
    if (window.confirm("Restore default starting student status? All streak, level progression milestones, and achievements will clear.")) {
      const startStats: UserStats = {
        level: 1,
        xp: 120,
        streak: 3,
        lastPracticeDate: new Date().toISOString().split('T')[0],
        completedSessions: 0,
        badges: ["first_chord"],
        skills: {
          scales: 15,
          rhythm: 20,
          chords: 10,
          ear: 5,
          songs: 0
        }
      };
      saveUserStats(startStats);
      setStats(startStats);
      fetchGuitarTips(startStats, db.levels[0]);
    }
  };

  // Level Badge style helpers
  const getBadgeColorClasses = (badgeColorId: string) => {
    switch (badgeColorId) {
      case 'bronze': return 'bg-amber-800/10 border-amber-800/40 text-amber-600';
      case 'silver': return 'bg-slate-400/10 border-slate-400/40 text-slate-350';
      case 'gold': return 'bg-yellow-500/15 border-yellow-500/40 text-yellow-500 shadow-[0_0_8px_rgba(234,179,8,0.15)]';
      case 'neon': return 'bg-cyan-500/15 border-cyan-500/45 text-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.2)]';
      case 'legendary': return 'bg-gradient-to-r from-purple-500/20 to-pink-500/20 border-pink-500/40 text-pink-400 shadow-[0_0_12px_rgba(236,72,153,0.25)]';
      default: return 'bg-slate-800 border-slate-700 text-slate-300';
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-t-amber-400 border-r-transparent border-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!currentUser) {
    return <LoginScreen onLoginSuccess={(u) => {
      localStorage.setItem("gq_active_uid", u.uid);
      setCurrentUser(u);
      setStats(getUserStats());
    }} />;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans select-none selection:bg-amber-400 selection:text-black">
      
      {/* Dynamic top bar navigation */}
      <header className="border-b border-slate-900 bg-slate-900/60 backdrop-blur-md sticky top-0 z-50 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-500/10">
            <Music className="w-5.5 h-5.5 text-slate-950 stroke-[2.5px]" />
          </div>
          <div>
            <h1 className="text-lg font-display font-black tracking-tight text-white">Guitar Quest</h1>
            <p className="text-[10px] font-mono tracking-widest text-slate-450 uppercase mt-0.5">Cozy Studio Suite</p>
          </div>
        </div>

        <nav className="flex items-center gap-4">
          {/* User Profile ID Tag */}
          <div className="hidden sm:flex items-center gap-2 bg-slate-955 px-3 py-1.5 rounded-lg border border-slate-800">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-mono font-black text-slate-300 max-w-[120px] truncate">
              {currentUser.displayName || currentUser.email?.split('@')[0]}
            </span>
          </div>

          <button 
            onClick={() => setActiveView('dashboard')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-mono font-bold uppercase tracking-wider transition-colors cursor-pointer ${activeView === 'dashboard' ? 'bg-amber-400/10 text-amber-500 border border-amber-400/20' : 'text-slate-400 hover:text-white hover:bg-slate-905'}`}
          >
            Studio Dashboard
          </button>
          
          <button 
            onClick={() => setActiveView('admin')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-mono font-bold uppercase tracking-wider transition-colors cursor-pointer ${activeView === 'admin' ? 'bg-amber-400/10 text-amber-500 border border-amber-400/20' : 'text-slate-400 hover:text-white hover:bg-slate-905'}`}
          >
            <Sliders className="w-3.5 h-3.5 divide-stone-100 inline mr-1" /> DB Admin
          </button>

          <button
            onClick={() => logoutUser()}
            title="Sign Out"
            className="p-1.5 rounded-lg text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 transition-all cursor-pointer flex items-center justify-center"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </nav>
      </header>

      {/* Main Container workspace */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 md:p-8">
        <AnimatePresence mode="wait">
          
          {/* PRIMARY STUDIO DASHBOARD VIEW */}
          {activeView === 'dashboard' && (
            <motion.div 
              key="dashboard"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-8"
            >
              {/* Header profile hud banner */}
              <div className="bg-slate-900 border border-indigo-950/20 rounded-3xl p-6 md:p-8 shadow-xl relative overflow-hidden flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div className="absolute top-0 right-0 w-80 h-80 bg-radial from-amber-500/5 to-transparent blur-3xl pointer-events-none" />
                
                {/* Profile detail */}
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400 bg-slate-950 px-3 py-1 rounded-full border border-slate-800">
                      STUDENT ARCHITECTURE
                    </span>
                    <span className={`text-[10px] uppercase font-mono tracking-wider px-3 py-1 rounded-full border font-bold ${getBadgeColorClasses(currentLevel.badgeColorId)}`}>
                      🔥 Level Badge: {currentLevel.badge}
                    </span>
                  </div>

                  <h2 className="text-3xl font-display font-black tracking-tight text-white leading-none">
                    {currentLevel.name}
                  </h2>
                  
                  <p className="text-sm text-slate-400 max-w-xl leading-relaxed">
                    Goal: {currentLevel.goal}
                  </p>
                </div>

                {/* Main Session action launch button */}
                <div className="flex gap-4 w-full md:w-auto shrink-0">
                  <button
                    onClick={() => setActiveView('practice')}
                    className="flex-1 md:flex-none uppercase font-mono text-xs font-black tracking-wider bg-amber-500 hover:bg-amber-450 text-slate-950 px-6 py-4 rounded-2xl shadow-lg shadow-amber-500/10 cursor-pointer hover:scale-[1.02] active:scale-98 transition-all flex items-center justify-center gap-2"
                  >
                    <Play className="w-4 h-4 fill-black text-black" />
                    Start Practice Session
                  </button>
                  
                  <button
                    onClick={() => setActiveView('exam')}
                    className="flex-1 md:flex-none uppercase font-mono text-xs font-black tracking-wider border border-purple-500/40 bg-purple-950/20 hover:bg-purple-900/20 text-purple-400 px-6 py-4 rounded-2xl cursor-pointer hover:scale-[1.02] transition-colors flex items-center justify-center gap-2"
                  >
                    <Trophy className="w-4 h-4" />
                    Take Level Exam
                  </button>
                </div>
              </div>

              {/* Middle grid layout: Quest widgets vs AI suggestions panel */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8">
                
                {/* Left block Column 4 span: Streak, progression road and skills metrics */}
                <div className="lg:col-span-4 space-y-6 md:space-y-8">
                  
                  {/* Streak widget block */}
                  <div className="bg-slate-900 border border-slate-850 rounded-2xl p-5 shadow-lg relative overflow-hidden">
                    <div className="absolute -right-3 -bottom-3 text-amber-500/5 rotate-12">
                      <Flame className="w-24 h-24 stroke-[1.5px]" />
                    </div>

                    <div className="flex gap-4 items-center">
                      <div className="w-12 h-12 rounded-xl bg-orange-500/10 border border-orange-500/30 flex items-center justify-center text-orange-500 shadow-md">
                        <Flame className="w-6 h-6 animate-pulse" />
                      </div>
                      <div>
                        <div className="text-[10px] font-mono uppercase tracking-wider text-slate-405">DAILY PRACTICE STREAK</div>
                        <div className="text-2xl font-mono font-black text-white mt-0.5">{stats.streak} DAYS STRONG</div>
                      </div>
                    </div>
                  </div>

                  {/* Skills ratings visualization breakdown */}
                  <div className="bg-slate-900 border border-slate-850 rounded-2xl p-5 shadow-lg space-y-5">
                    <div className="flex justify-between items-center pb-2.5 border-b border-slate-800/60">
                      <h3 className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider">SKILLS MASTERY PROFILE</h3>
                      <span className="text-[9px] font-mono bg-slate-950 text-indigo-400 px-2 py-0.5 rounded border border-slate-800">EXP +{stats.xp} XP</span>
                    </div>

                    <div className="space-y-4">
                      {[
                        { label: 'Scales drills', metric: stats.skills.scales, color: 'bg-emerald-500' },
                        { label: 'Rhythm Training', metric: stats.skills.rhythm, color: 'bg-cyan-400' },
                        { label: 'Chord transitions', metric: stats.skills.chords, color: 'bg-amber-400' },
                        { label: 'Ear Audio recognition', metric: stats.skills.ear, color: 'bg-teal-400' },
                        { label: 'Unlocked Song Covers', metric: stats.skills.songs, color: 'bg-rose-500' }
                      ].map((skill, index) => (
                        <div key={`skill-bar-${index}`} className="space-y-1.5">
                          <div className="flex justify-between text-xs font-mono text-slate-350">
                            <span>{skill.label}</span>
                            <span className="text-slate-100 font-bold">{skill.metric}%</span>
                          </div>
                          
                          <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-900">
                            <motion.div 
                              initial={{ width: 0 }}
                              animate={{ width: `${skill.metric}%` }}
                              transition={{ duration: 0.8 }}
                              className={`${skill.color} h-full rounded-full`} 
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                </div>

                {/* Right block Column 8 span: AI coaching recommendations and custom song engine */}
                <div className="lg:col-span-8 space-y-6 md:space-y-8">
                  
                  {/* AI Tutor coach panel */}
                  <div className="bg-slate-900 border border-slate-850 rounded-2xl p-6 shadow-lg space-y-4 relative overflow-hidden">
                    <div className="flex justify-between items-center pb-3 border-b border-slate-850">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-cyan-400" />
                        <h3 className="text-sm font-mono font-bold text-slate-200 uppercase tracking-wider">AI Powered Guitar Coach</h3>
                      </div>
                      <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950/40 border border-cyan-900/40 rounded px-2.5 py-0.5 uppercase tracking-wide">
                        {aiTipsSource === 'gemini' ? "Live Gemini Model" : "Tutor Assistant"}
                      </span>
                    </div>

                    {isLoadingTips ? (
                      <div className="py-12 flex flex-col items-center justify-center gap-3">
                        <div className="w-6 h-6 border-2 border-t-amber-400 border-r-transparent border-transparent rounded-full animate-spin" />
                        <span className="text-xs font-mono text-slate-500">Coach is generating feedback...</span>
                      </div>
                    ) : aiTips.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {aiTips.map((tip, idx) => (
                          <div key={`tip-${idx}`} className="bg-slate-950/80 border border-slate-850 p-4 rounded-xl space-y-1.5 hover:border-slate-800 transition-colors">
                            <span className="text-[9px] font-mono text-amber-500 bg-amber-500/10 border border-amber-500/25 px-2 py-0.5 rounded font-extrabold tracking-widest uppercase">
                              {tip.category}
                            </span>
                            <h4 className="text-xs font-bold text-slate-200 pt-1 tracking-tight line-clamp-1">{tip.title}</h4>
                            <p className="text-[11px] text-slate-400 leading-relaxed font-sans">{tip.detail}</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-500 italic py-4">No recommendations available at this time.</p>
                    )}
                  </div>

                  {/* AI Song Generator Workspace Custom Pluck Sheet */}
                  <div className="bg-slate-900 border border-slate-850 rounded-2xl p-6 shadow-lg space-y-5">
                    <div className="flex gap-2 items-center pb-2.5 border-b border-slate-800/60">
                      <BookOpen className="w-4 h-4 text-amber-400" />
                      <h3 className="text-sm font-mono font-bold text-slate-205 uppercase tracking-wider">Custom Sheet Riff Playwright</h3>
                    </div>

                    <p className="text-xs text-slate-400 leading-relaxed">
                      Wants to study a specific thematic genre or practice riff? Use our server proxy to generate tailored customized tab sheets on the fly.
                    </p>

                    <form onSubmit={handleComposeSong} className="flex gap-3">
                      <input 
                        type="text"
                        value={customSongTitle}
                        onChange={(e) => setCustomSongTitle(e.target.value)}
                        className="flex-1 bg-slate-950 border border-slate-800/80 rounded-xl px-4 py-2.5 text-xs text-white uppercase font-mono placeholder-slate-550 focus:border-amber-400 outline-none"
                        placeholder="e.g. Cedar Woods, Hearthside Strum, Raindrop Pluck..."
                        disabled={isGeneratingSong}
                      />
                      <button
                        type="submit"
                        className="bg-amber-500 hover:bg-amber-450 text-slate-950 px-5 py-2.5 rounded-xl font-mono text-xs font-bold shadow-md shadow-amber-500/10 transition-colors disabled:opacity-50 cursor-pointer"
                        disabled={isGeneratingSong || !customSongTitle.trim()}
                      >
                        {isGeneratingSong ? "Composing..." : "Generate Tab 🪄"}
                      </button>
                    </form>

                    {aiSongResult && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="bg-slate-950/80 border border-slate-850 rounded-xl p-4 space-y-3.5"
                      >
                        <div className="flex justify-between text-xs font-mono text-teal-400">
                          <span>🎯 TITLE: {aiSongResult.title}</span>
                          <span>progression: {aiSongResult.chordSequence}</span>
                        </div>

                        <pre className="text-[10px] font-mono leading-tight bg-slate-900 p-3.5 rounded border border-slate-850/60 overflow-x-auto select-text text-amber-450/90 whitespace-pre">
                          {aiSongResult.tabSnippet}
                        </pre>

                        <div className="text-[11px] text-slate-400 font-sans italic leading-relaxed">
                          🧑‍🏫 <strong>Advisor:</strong> {aiSongResult.coachingPointers}
                        </div>
                      </motion.div>
                    )}
                  </div>

                </div>

              </div>

              {/* Bottom: Achievements and RPG Unlockable badges */}
              <div className="bg-slate-900 border border-slate-850 rounded-2xl p-6 shadow-lg space-y-4">
                <div className="flex justify-between items-center pb-2.5 border-b border-indigo-950/10">
                  <h3 className="text-xs font-mono font-bold text-slate-400 uppercase tracking-widest">AWARDS & ACHIVEMENT SLOTS ({stats.badges.length})</h3>
                  
                  <button 
                    onClick={handleResetProgress}
                    className="text-[10px] uppercase font-mono text-rose-400 hover:text-rose-350 bg-slate-950 px-3 py-1 rounded border border-slate-850"
                  >
                    Reset Progress
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                  {db.badges.map((badge) => {
                    const isUnlocked = stats.badges.includes(badge.id);
                    return (
                      <div 
                        key={badge.id}
                        className={`p-3.5 rounded-xl border flex flex-col items-center text-center gap-2 transition-all ${isUnlocked ? 'bg-slate-950 border-cyan-400/35 text-white' : 'bg-slate-950/40 border-slate-900/60 text-slate-600'}`}
                      >
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isUnlocked ? 'bg-cyan-500/10 text-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.15)] animate-bounce' : 'bg-slate-900 text-slate-500'}`}>
                          <Award className="w-5.5 h-5.5" />
                        </div>
                        <div>
                          <h4 className="text-xs font-display font-bold leading-tight truncate max-w-[100px]">{badge.name}</h4>
                          <span className="text-[8px] font-mono uppercase tracking-wider text-slate-500 font-semibold">{badge.rarity}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

            </motion.div>
          )}

          {/* ACTIVE ROUTINE PRACTICE SCREEN */}
          {activeView === 'practice' && (
            <motion.div 
              key="practice"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
            >
              <PracticePanel 
                onSessionComplete={(xpGained) => {
                  const updated = getUserStats(); // reload fresh stats
                  setStats(updated);
                  setActiveView('dashboard');
                }}
                onCancel={() => setActiveView('dashboard')}
              />
            </motion.div>
          )}

          {/* INTERACTIVE PROMOTION EXAM TESTER */}
          {activeView === 'exam' && (
            <motion.div 
              key="exam"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
            >
              <ExamPanel 
                currentLevel={currentLevel}
                onExamComplete={(passed, finalScore) => {
                  const updated = getUserStats();
                  setStats(updated);
                  setActiveView('dashboard');
                }}
                onCancel={() => setActiveView('dashboard')}
              />
            </motion.div>
          )}

          {/* DATABASE CONFIGURATION ADMIN AREA */}
          {activeView === 'admin' && (
            <motion.div 
              key="admin"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
            >
              <AdminPanel 
                onDatabaseUpdate={handleDatabaseUpdate}
              />
            </motion.div>
          )}

        </AnimatePresence>
      </main>

      {/* Aesthetic studio credit note footer */}
      <footer className="border-t border-slate-900 py-6 px-6 text-center text-[10px] font-mono text-slate-450 uppercase tracking-widest mt-12">
        Guitar Quest © 2026 • Studio Grade Audio Evaluator Engine
      </footer>

    </div>
  );
}
