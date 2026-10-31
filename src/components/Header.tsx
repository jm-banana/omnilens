import React from 'react';
import { Sparkles, Layers, Camera, BookOpen, BrainCheck, CheckCircle2, Award, Zap, Cloud, LogIn, LogOut, User as UserIcon } from 'lucide-react';
import { User } from 'firebase/auth';

interface HeaderProps {
  activeTab: 'scanner' | 'decks' | 'study' | 'quiz';
  setActiveTab: (tab: 'scanner' | 'decks' | 'study' | 'quiz') => void;
  totalCards: number;
  dueCards: number;
  avgAccuracy: number;
  isAiConnected: boolean;
  user: User | null;
  firestoreConnected: boolean;
  onSignIn: () => void;
  onSignOut: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  totalCards,
  dueCards,
  avgAccuracy,
  isAiConnected,
  user,
  firestoreConnected,
  onSignIn,
  onSignOut,
}) => {
  return (
    <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-md sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20">
          {/* Logo & Brand Identity */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setActiveTab('decks')}
              className="flex items-center gap-3 text-left focus:outline-none group"
              aria-label="OmniLens AI Home"
            >
              <div className="relative flex items-center justify-center w-11 h-11 rounded-xl bg-gradient-to-tr from-emerald-600 via-teal-500 to-cyan-400 p-[2px] shadow-lg shadow-emerald-500/20 group-hover:shadow-emerald-500/30 transition-shadow">
                <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center relative overflow-hidden">
                  {/* Subtle aperture rings */}
                  <div className="absolute inset-0 border border-emerald-500/30 rounded-full scale-75 animate-pulse" />
                  <div className="w-4 h-4 rounded-full bg-emerald-400/20 flex items-center justify-center">
                    <div className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399]" />
                  </div>
                  <Sparkles className="w-4 h-4 text-emerald-400 absolute top-1 right-1 opacity-80" />
                </div>
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-lg sm:text-xl tracking-tight text-white flex items-center gap-1.5">
                    OmniLens <span className="text-emerald-400 font-black">AI</span>
                  </span>
                  <span className="hidden md:inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                    Vision 3.8
                  </span>
                </div>
                <p className="text-xs text-slate-400 hidden sm:block">
                  Camera Knowledge Synthesizer & Verified Flashcards
                </p>
              </div>
            </button>
          </div>

          {/* Quick Stats Pill */}
          <div className="hidden lg:flex items-center gap-4 bg-slate-950/60 border border-slate-800/80 rounded-full px-4 py-1.5">
            <div className="flex items-center gap-1.5 text-xs text-slate-300">
              <Layers className="w-3.5 h-3.5 text-slate-400" />
              <span>Cards:</span>
              <span className="font-bold text-white">{totalCards}</span>
            </div>
            <div className="h-3 w-px bg-slate-800" />
            <div className="flex items-center gap-1.5 text-xs text-amber-300">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span>Due:</span>
              <span className="font-bold text-amber-400">{dueCards}</span>
            </div>
            <div className="h-3 w-px bg-slate-800" />
            <div className="flex items-center gap-1.5 text-xs text-emerald-300">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Fidelity:</span>
              <span className="font-bold text-emerald-400">{avgAccuracy}%</span>
            </div>
          </div>

          {/* Navigation Controls */}
          <nav className="flex items-center gap-1 sm:gap-2">
            <button
              onClick={() => setActiveTab('scanner')}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'scanner'
                  ? 'bg-emerald-500 text-slate-950 font-bold shadow-md shadow-emerald-500/20'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Camera className="w-4 h-4" />
              <span className="hidden sm:inline">AI Camera</span>
            </button>

            <button
              onClick={() => setActiveTab('decks')}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'decks'
                  ? 'bg-emerald-500 text-slate-950 font-bold shadow-md shadow-emerald-500/20'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>Decks</span>
            </button>

            <button
              onClick={() => setActiveTab('study')}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'study'
                  ? 'bg-emerald-500 text-slate-950 font-bold shadow-md shadow-emerald-500/20'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              <span>Study</span>
              {dueCards > 0 && (
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping ml-0.5" />
              )}
            </button>

            <button
              onClick={() => setActiveTab('quiz')}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'quiz'
                  ? 'bg-emerald-500 text-slate-950 font-bold shadow-md shadow-emerald-500/20'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Award className="w-4 h-4" />
              <span>Quiz</span>
            </button>

            {/* Cloud Status & Firebase Auth */}
            <div className="h-4 w-px bg-slate-800 mx-1 hidden sm:block" />

            <div className="flex items-center gap-2">
              {firestoreConnected && (
                <div
                  title="Firebase Firestore Cloud Sync Active"
                  className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-blue-500/10 text-blue-300 border border-blue-500/20"
                >
                  <Cloud className="w-3.5 h-3.5 text-blue-400" />
                  <span>Cloud DB</span>
                </div>
              )}

              {user ? (
                <div className="flex items-center gap-2">
                  <div
                    title={user.email || user.displayName || 'Signed in'}
                    className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-slate-800 text-slate-200 text-xs font-medium border border-slate-700"
                  >
                    {user.photoURL ? (
                      <img src={user.photoURL} alt="Avatar" className="w-4 h-4 rounded-full" />
                    ) : (
                      <UserIcon className="w-3.5 h-3.5 text-emerald-400" />
                    )}
                    <span className="hidden sm:inline max-w-[100px] truncate">
                      {user.displayName?.split(' ')[0] || user.email?.split('@')[0]}
                    </span>
                  </div>
                  <button
                    onClick={onSignOut}
                    title="Sign Out"
                    className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-slate-800 transition-colors"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={onSignIn}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
                >
                  <LogIn className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="hidden sm:inline">Google Sign In</span>
                </button>
              )}
            </div>
          </nav>
        </div>
      </div>
    </header>
  );
};
