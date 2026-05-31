/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { loginWithGoogle, isPlaceholderConfig } from '../firebase';
import { Music, Sparkles, Check, Key, ShieldCheck, Flame, Zap, Compass, Star } from 'lucide-react';
import { motion } from 'motion/react';

interface LoginScreenProps {
  onLoginSuccess: (user: any) => void;
}

export default function LoginScreen({ onLoginSuccess }: LoginScreenProps) {
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [customName, setCustomName] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState('🤘');

  const avatars = ['🤘', '🎸', '⚡', '🔥', '🧙‍♂️', '🦁', '👑'];

  const handleSignIn = async () => {
    setIsLoggingIn(true);
    try {
      const user = await loginWithGoogle();
      
      // If we are in placeholder mode and a custom name was typed, override the display name
      if (isPlaceholderConfig && customName.trim()) {
        const enrichedUser = {
          ...user,
          displayName: `${selectedAvatar} ${customName.trim()}`,
        };
        onLoginSuccess(enrichedUser);
      } else {
        onLoginSuccess(user);
      }
    } catch (e) {
      console.error('Login action error:', e);
    } finally {
      setIsLoggingIn(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6 select-none font-sans relative overflow-hidden">
      {/* Background Ambient Cosmic Blurs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-slate-900 border border-slate-850 rounded-3xl p-8 shadow-2xl relative"
      >
        {/* Glowing badge at top */}
        <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-slate-950 border border-amber-450/35 px-4 py-1 rounded-full text-[10px] font-mono uppercase tracking-widest text-amber-500 shadow-md flex items-center gap-1.5 font-bold">
          <Sparkles className="w-3 h-3 animate-spin text-amber-400" />
          Acoustic Hearth Studio
        </div>

        {/* LOGO PARINGS */}
        <div className="text-center space-y-3 pt-4 mb-8">
          <div className="w-14 h-14 bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center mx-auto rounded-2xl shadow-lg shadow-amber-500/10">
            <Music className="w-8 h-8 text-slate-950 stroke-[3]" />
          </div>
          <div>
            <h1 className="text-2xl font-display font-black tracking-tight text-white leading-none">
              Guitar Quest
            </h1>
            <p className="text-[10px] font-mono tracking-widest text-slate-400 uppercase mt-1">
              Cozy Studio Suite
            </p>
          </div>
          <p className="text-xs text-slate-400 max-w-xs mx-auto leading-relaxed">
            Train chord mechanics, master key scale highlighted finger placement patterns, and complete progression milestone exams.
          </p>
        </div>

        <div className="space-y-6">
          {/* PROFILE / CUSTOM NAME SELECTION BLOCK (visible in Guest simulator mode to make it extra fun) */}
          {isPlaceholderConfig ? (
            <div className="bg-slate-950/70 border border-slate-850 rounded-2xl p-4.5 space-y-4">
              <div className="flex justify-between items-center pb-2 border-b border-slate-900">
                <span className="text-[10px] font-mono text-cyan-400 uppercase font-black">Cozy Offline Lounge</span>
                <span className="text-[9px] font-mono bg-slate-900 text-slate-400 px-2 py-0.5 rounded border border-slate-850">GUEST</span>
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-mono text-slate-400">STUDENT NOM DE PLUME/NICKNAME:</label>
                <input
                  type="text"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  placeholder="e.g. Shred Master, Acoustic Bard"
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2 text-xs font-mono text-white placeholder-slate-600 outline-none focus:border-amber-405"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-mono text-slate-400">CHOOSE AVATAR CHARM:</label>
                <div className="flex justify-between gap-1">
                  {avatars.map((av) => (
                    <button
                      key={av}
                      onClick={() => setSelectedAvatar(av)}
                      className={`text-lg p-2 rounded-lg transition-transform active:scale-90 ${selectedAvatar === av ? 'bg-amber-450/15 border border-amber-405/30 scale-105' : 'hover:bg-slate-900/60'}`}
                    >
                      {av}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-emerald-950/20 border border-emerald-500/20 rounded-2xl p-4 flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h4 className="text-xs font-bold text-slate-200">Production Cloud Storage Ready</h4>
                <p className="text-[11px] text-slate-400 leading-normal">
                  Your statistics, XP, progress, and badges are securely bound to your dedicated Google account profile details.
                </p>
              </div>
            </div>
          )}

          {/* CHIEF INTERACTION ACTION */}
          <button
            onClick={handleSignIn}
            disabled={isLoggingIn}
            className="w-full bg-amber-500 hover:bg-amber-450 disabled:opacity-50 text-slate-950 py-3.5 rounded-2xl font-mono text-xs font-black uppercase tracking-wider shadow-lg shadow-amber-500/10 cursor-pointer hover:scale-[1.01] active:scale-99 transition-all flex items-center justify-center gap-2"
          >
            <Key className="w-4 h-4 text-slate-950 stroke-[2.5]" />
            {isLoggingIn ? 'Establishing Safe Sync...' : isPlaceholderConfig ? 'Enter Acoustic Studio' : 'Sign In with Google Account'}
          </button>
        </div>

        {/* CLOUD PROVISIONING STATUS NOTICE */}
        <div className="mt-8 pt-4 border-t border-slate-850/60 text-center space-y-1.5">
          <div className="flex items-center justify-center gap-1.5 text-[10px] font-mono">
            <span className={`w-1.5 h-1.5 rounded-full ${isPlaceholderConfig ? 'bg-cyan-500 animate-pulse' : 'bg-emerald-500 animate-pulse'}`} />
            <span className="text-slate-400 uppercase tracking-widest font-bold">
              {isPlaceholderConfig ? 'LOCAL SANDBOX MODE' : 'LIVE FIRESTORE ENGINE'}
            </span>
          </div>
          {isPlaceholderConfig && (
            <p className="text-[9px] text-slate-500 italic max-w-xs mx-auto leading-normal font-sans">
              * The live Firestore project is setting up. Finish accepting database terms in your console to unlock production clouds automatically.
            </p>
          )}
        </div>
      </motion.div>
    </div>
  );
}
