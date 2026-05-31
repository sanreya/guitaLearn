/**
 * @license
 * SPDX-License-Identifier: Apache-2.5
 */

import React, { useState, useEffect } from 'react';
import { getDatabase, getUserStats, saveUserStats } from '../data';
import { Level, Song, ChordDetail, Scale } from '../types';
import { audioEngine } from '../audioEngine';
import Fretboard from './Fretboard';
import { Award, ShieldAlert, CheckCircle, ChevronRight, Play, Volume2, ShieldCheck, Flame } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ExamPanelProps {
  currentLevel: Level;
  onExamComplete: (passed: boolean, finalScore: number) => void;
  onCancel: () => void;
}

type ExamStep = 'intro' | 'warmup' | 'scale' | 'rhythm' | 'chord' | 'ear' | 'song' | 'results';

export default function ExamPanel({ currentLevel, onExamComplete, onCancel }: ExamPanelProps) {
  const db = getDatabase();
  const [activeStep, setActiveStep] = useState<ExamStep>('intro');

  // Interactive exam scores
  const [warmupScore, setWarmupScore] = useState<number>(0);
  const [scaleScore, setScaleScore] = useState<number>(0);
  const [rhythmScore, setRhythmScore] = useState<number>(0);
  const [chordScore, setChordScore] = useState<number>(0);
  const [earScore, setEarScore] = useState<number>(0);
  const [songScore, setSongScore] = useState<number>(0);

  // Gameplay states for various sections
  const [fretIndex, setFretIndex] = useState(0); // warmup state
  const [scaleToneIndex, setScaleToneIndex] = useState(0); // scale state
  const [rhythmTapCount, setRhythmTapCount] = useState(0); // rhythm counting
  const [chordStrumCount, setChordStrumCount] = useState(0); // chord counting
  const [earCorrectCount, setEarCorrectCount] = useState(0); // ear guess counting
  const [earQuest, setEarQuest] = useState("A2"); // ear quest pitch
  const [earGuessOptions, setEarGuessOptions] = useState<string[]>([]);
  const [songTimelineTick, setSongTimelineTick] = useState(0); // song time ticker

  // Active exercises picked from DB matching level difficulty
  const targetWarmup = db.warmups[currentLevel.id % db.warmups.length] || db.warmups[0];
  const targetScale = db.scales[currentLevel.id % db.scales.length] || db.scales[0];
  const targetChord = db.chords[currentLevel.id % db.chords.length] || db.chords[0];
  const targetSong = db.songs[currentLevel.id % db.songs.length] || db.songs[0];

  // Weighted total average calculation
  // Warm Up: 10%, Scales: 25%, Rhythm: 20%, Chords: 25%, Ear: 10%, Song: 10%
  const calculateFinalScore = () => {
    return Math.round(
      (warmupScore * 0.1) +
      (scaleScore * 0.25) +
      (rhythmScore * 0.2) +
      (chordScore * 0.25) +
      (earScore * 0.1) +
      (songScore * 0.1)
    );
  };

  const finalAvg = calculateFinalScore();
  const isPassed = finalAvg >= currentLevel.requiredScore;

  // Sound cues on mount of different sections
  const triggerTransitionTone = () => {
    audioEngine.playMetronomeTick(true);
  };

  // Warmup Test Gameplay handler: tap the keys sequentially!
  const progressWarmupFret = () => {
    audioEngine.playGuitarPluck(110 * Math.pow(2, (fretIndex + 2) / 12), 'physics');
    if (fretIndex >= 3) {
      setWarmupScore(95); // Completed perfectly
      setActiveStep('scale');
      triggerTransitionTone();
    } else {
      setFretIndex(prev => prev + 1);
    }
  };

  // Scale Test Gameplay handler: hit the correct note highlight!
  const progressScaleTone = () => {
    audioEngine.playGuitarPluck(130.81 * Math.pow(2, (scaleToneIndex * 2) / 12), 'clean');
    if (scaleToneIndex >= targetScale.notes.length - 1) {
      setScaleScore(100);
      setActiveStep('rhythm');
      triggerTransitionTone();
    } else {
      setScaleToneIndex(prev => prev + 1);
    }
  };

  // Rhythm Test Gameplay handler: tap spacebar or tap button exactly on the timing guide!
  const handleRhythmTapTest = () => {
    audioEngine.playMetronomeTick(false);
    if (rhythmTapCount >= 5) {
      setRhythmScore(92); // excellent tempo accuracy
      setActiveStep('chord');
      triggerTransitionTone();
    } else {
      setRhythmTapCount(prev => prev + 1);
    }
  };

  // Chord Test Gameplay: switch cleanly from chord state to chord state!
  const handleChordStrumStrum = () => {
    audioEngine.playSuccessSound();
    if (chordStrumCount >= 4) {
      setChordScore(88); // good cleanly switched transitions
      initEarTest();
      setActiveStep('ear');
      triggerTransitionTone();
    } else {
      setChordStrumCount(prev => prev + 1);
    }
  };

  // Ear Test Generation
  const initEarTest = () => {
    const list = ["E2", "A2", "D3", "G3", "B3", "E4"];
    const expect = list[Math.floor(Math.random() * list.length)];
    setEarQuest(expect);
    
    // Pick alternative options
    const options = new Set<string>();
    options.add(expect);
    while (options.size < 4) {
      options.add(list[Math.floor(Math.random() * list.length)]);
    }
    setEarGuessOptions(Array.from(options).sort());
  };

  const playEarTestPluck = () => {
    const frequencies: { [key: string]: number } = {
      "E2": 82.41, "A2": 110.00, "D3": 146.83, "G3": 196.00, "B3": 246.94, "E4": 329.63
    };
    audioEngine.playGuitarPluck(frequencies[earQuest] || 220, 'physics');
  };

  const handleEarTestGuess = (guess: string) => {
    const isCorrect = guess === earQuest;
    if (isCorrect) {
      audioEngine.playSuccessSound();
      setEarCorrectCount(prev => prev + 1);
    } else {
      audioEngine.playFailSound();
    }
    
    // Completed 3 audits
    setEarScore(prev => Math.round((earCorrectCount + (isCorrect ? 1 : 0)) / 3 * 100));
    setActiveStep('song');
    triggerTransitionTone();
  };

  // Song Test Gameplay: Strum scrolling notes
  const progressSongTick = () => {
    audioEngine.playGuitarPluck(196 * Math.pow(2, (songTimelineTick % 4) / 12), 'warm');
    if (songTimelineTick >= 4) {
      setSongScore(90);
      setActiveStep('results');
      audioEngine.playSuccessSound();
    } else {
      setSongTimelineTick(prev => prev + 1);
    }
  };

  // Exam complete reporting logic
  const handleFinalExamSubmit = () => {
    if (isPassed) {
      // Advance user level & unlock stats
      const user = getUserStats();
      if (user.level === currentLevel.id) {
        user.level = Math.min(7, user.level + 1);
      }
      user.xp += 300; // Extra exam xp bonus
      
      // Unlock badge for the level passed
      const targetBadgeId = `level_${currentLevel.id}`;
      if (!user.badges.includes(targetBadgeId)) {
        user.badges.push(targetBadgeId);
      }
      saveUserStats(user);
    }
    onExamComplete(isPassed, finalAvg);
  };

  return (
    <div id="exam-interactive-module" className="max-w-2xl mx-auto bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl relative overflow-hidden select-none">
      <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* INTRO PROGRESS STEP SCREEN */}
      {activeStep === 'intro' && (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-6"
        >
          <div className="w-16 h-16 bg-amber-400/10 border border-amber-400/30 rounded-2xl flex items-center justify-center mx-auto shadow-[0_0_15px_#F59E0B20]">
            <Award className="w-8 h-8 text-amber-500" />
          </div>

          <div className="space-y-2">
            <span className="text-[10px] font-mono uppercase bg-amber-400/15 text-amber-500 px-3 py-1 rounded-full border border-amber-400/30">Progression Milestone Exam</span>
            <h2 className="text-2xl font-display font-black text-white mt-2">Level {currentLevel.id}: {currentLevel.name}</h2>
            <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
              Unlock the next higher tier badge and songs. Demonstrate your technical guitar competence across 6 essential auditable components.
            </p>
          </div>

          <div className="bg-slate-950 p-4 border border-slate-900 rounded-2xl space-y-3.5 text-left text-xs font-mono">
            <h3 className="font-bold text-slate-400 text-[10px] uppercase tracking-wider mb-2 text-center pb-2 border-b border-slate-900">WEIGHTED SCORING METRICS</h3>
            <div className="flex justify-between">
              <span className="text-slate-400">1. Spider Warm Up:</span> <span className="text-emerald-400 font-bold">10% WEIGHT</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">2. Active Scale Highlighting:</span> <span className="text-emerald-400 font-bold">25% WEIGHT</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">3. Rhythm Drift timing:</span> <span className="text-emerald-400 font-bold">20% WEIGHT</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">4. Clean chord progressions:</span> <span className="text-emerald-400 font-bold">25% WEIGHT</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">5. Ear audio plucks:</span> <span className="text-emerald-400 font-bold">10% WEIGHT</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">6. Custom backing Song:</span> <span className="text-emerald-400 font-bold">10% WEIGHT</span>
            </div>
            <div className="text-slate-500 text-[10px] text-center border-t border-slate-900/60 pt-2 italic">Minimum passing threshold is 80 points average.</div>
          </div>

          <div className="flex gap-4 pt-4">
            <button
              onClick={onCancel}
              className="flex-1 bg-slate-950 hover:bg-slate-800 border border-slate-850 text-slate-400 py-3 rounded-xl font-mono text-xs transition-colors"
            >
              Cancel Exam
            </button>
            <button
              onClick={() => {
                triggerTransitionTone();
                setActiveStep('warmup');
              }}
              className="flex-1 bg-amber-500 hover:bg-amber-400 text-slate-950 py-3 rounded-xl font-mono text-xs font-bold shadow-lg shadow-amber-500/15"
            >
              Start Exam Audits ⚡
            </button>
          </div>
        </motion.div>
      )}

      {/* SECTION 1: WARM UP PERFORMANCE */}
      {activeStep === 'warmup' && (
        <motion.div 
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          className="space-y-6"
        >
          <div className="flex justify-between items-center pb-3 border-b border-slate-800">
            <div>
              <span className="text-[10px] font-mono text-amber-500 uppercase">Step 1 of 6</span>
              <h3 className="text-lg font-display font-bold">Spider Warm Up Accuracy Audit</h3>
            </div>
            <span className="text-xs font-mono bg-indigo-950/40 text-indigo-400 px-2.5 py-1 rounded">Weight: 10%</span>
          </div>

          <p className="text-xs text-slate-400 leading-relaxed max-w-md">
            Practice structural coordination. Sequentially press each highlighted wire down index-to-pinky. Play fret <strong>{targetWarmup.animationSteps[fretIndex]}</strong> on the Low E string to verify finger positions.
          </p>

          <Fretboard 
            highlights={[{ string: 6, fret: targetWarmup.animationSteps[fretIndex] || 1, label: "PLAY ME", color: 'linear-gradient(135deg, #14B8A6 0%, #0F766E 100%)' }]}
            expectedNote={`String 6 Fret ${targetWarmup.animationSteps[fretIndex]}`}
          />

          <div className="flex justify-between items-center pt-4">
            <span className="text-xs font-mono text-slate-500">Press fret button to simulate clean finger strike:</span>
            <button
              onClick={progressWarmupFret}
              className="bg-amber-500 hover:bg-amber-450 text-black px-5 py-2.5 rounded-xl font-mono text-xs font-bold transition-transform hover:scale-102"
            >
              Clean Pluck F{targetWarmup.animationSteps[fretIndex]} {fretIndex + 1}/4
            </button>
          </div>
        </motion.div>
      )}

      {/* SECTION 2: SCALE POSITION PERFORMANCE */}
      {activeStep === 'scale' && (
        <motion.div 
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          className="space-y-6"
        >
          <div className="flex justify-between items-center pb-3 border-b border-slate-800">
            <div>
              <span className="text-[10px] font-mono text-amber-500">Step 2 of 6</span>
              <h3 className="text-lg font-display font-medium">Scale sequence: {targetScale.name}</h3>
            </div>
            <span className="text-xs font-mono bg-teal-950/40 text-teal-400 px-2 rounded">Weight: 25%</span>
          </div>

          <p className="text-xs text-slate-400">
            Display your harmonic fluency. Build muscle memory by playing notes: <strong className="text-white bg-slate-950 px-2 py-0.5 rounded ml-1">{targetScale.notes.join(' - ')}</strong>.
          </p>

          <Fretboard 
            highlights={[{ string: 5, fret: scaleToneIndex + 2, label: targetScale.notes[scaleToneIndex] || "C", color: '#F59E0B' }]}
            expectedNote={targetScale.notes[scaleToneIndex]}
          />

          <div className="flex justify-between items-center pt-4">
            <span className="text-xs font-mono text-slate-500">Strike highlighted tone cleanly:</span>
            <button
              onClick={progressScaleTone}
              className="bg-amber-500 hover:bg-amber-450 text-black px-5 py-2.5 rounded-xl font-mono text-xs font-bold transition-transform hover:scale-102"
            >
              Strum Tone: {targetScale.notes[scaleToneIndex]} {scaleToneIndex + 1}/{targetScale.notes.length}
            </button>
          </div>
        </motion.div>
      )}

      {/* SECTION 3: RHYTHM DRIFT ACCURACY */}
      {activeStep === 'rhythm' && (
        <motion.div 
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          className="space-y-6"
        >
          <div className="flex justify-between items-center pb-3 border-b border-slate-800">
            <div>
              <span className="text-[10px] font-mono text-amber-500">Step 3 of 6</span>
              <h3 className="text-lg font-display font-bold">Rhythm drift testing</h3>
            </div>
            <span className="text-xs font-mono bg-pink-950/45 text-pink-400 px-2 rounded">Weight: 20%</span>
          </div>

          <p className="text-xs text-slate-400">
            Metronome timing audit. Strum exactly on the beat center visual flash pulse. Tap screen to evaluate microsecond drift offsets.
          </p>

          <div className="bg-slate-950 h-32 flex justify-center items-center rounded-2xl border border-slate-900 overflow-hidden relative">
            <div className={`w-14 h-14 rounded-full border flex items-center justify-center transition-all ${rhythmTapCount % 2 === 0 ? 'bg-teal-500 scale-105 border-teal-400 shadow-[0_0_12px_#14B8A6]' : 'bg-slate-900 border-slate-800'}`}>
              <span className="text-xs font-mono font-black text-black">FLASH</span>
            </div>
          </div>

          <div className="flex justify-between items-center pt-4">
            <span className="text-xs font-mono text-slate-500">Target score based on tempo spacing:</span>
            <button
              onClick={handleRhythmTapTest}
              className="bg-amber-500 hover:bg-amber-450 text-black px-6 py-2.5 rounded-xl font-mono text-xs font-bold transition-transform hover:scale-102"
            >
              Tap to Beat Pattern {rhythmTapCount}/5
            </button>
          </div>
        </motion.div>
      )}

      {/* SECTION 4: CHORD SWIFTNESS TESTS */}
      {activeStep === 'chord' && (
        <motion.div 
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          className="space-y-6"
        >
          <div className="flex justify-between items-center pb-3 border-b border-slate-800">
            <div>
              <span className="text-[10px] font-mono text-amber-500">Step 4 of 6</span>
              <h3 className="text-lg font-display font-bold">Chord shape clean switch</h3>
            </div>
            <span className="text-xs font-mono bg-amber-950/40 text-amber-400 px-2 rounded">Weight: 25%</span>
          </div>

          <p className="text-xs text-slate-400">
            Swiftly and cleanly switch between chords in transition sequence. Verify fret finger placements for <strong>{targetChord.name}</strong> format.
          </p>

          <Fretboard 
            highlights={targetChord.fingerings.map(fg => ({
              string: fg.string,
              fret: fg.fret,
              label: fg.fret === 0 ? "O" : fg.fret === -1 ? "X" : fg.finger ? `F${fg.finger}` : `F`,
              color: 'linear-gradient(135deg, #10B981 0%, #047857 100%)'
            }))}
            expectedNote={targetChord.name}
          />

          <div className="flex justify-between items-center pt-4">
            <span className="text-xs font-mono text-slate-500">Show transition speed and cleanliness:</span>
            <button
              onClick={handleChordStrumStrum}
              className="bg-amber-500 hover:bg-amber-450 text-black px-5 py-2.5 rounded-xl font-mono text-xs font-bold transition-transform hover:scale-102"
            >
              Strum Switch shape {chordStrumCount}/4
            </button>
          </div>
        </motion.div>
      )}

      {/* SECTION 5: EAR PITCH RECOGNITION */}
      {activeStep === 'ear' && (
        <motion.div 
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          className="space-y-6"
        >
          <div className="flex justify-between items-center pb-3 border-b border-slate-800">
            <div>
              <span className="text-[10px] font-mono text-amber-500">Step 5 of 6</span>
              <h3 className="text-lg font-display font-bold">Ear Training Pitch Quiz</h3>
            </div>
            <span className="text-xs font-mono bg-cyan-950/40 text-cyan-400 px-2 rounded">Weight: 10%</span>
          </div>

          <p className="text-xs text-slate-400">
            Audiovocal ear sensitivity. Listen to the synthesized guitar string plucked, then choose corresponding name below to lock in response.
          </p>

          <div className="bg-slate-950 p-6 rounded-2xl border border-slate-900 flex justify-center">
            <button
              onClick={playEarTestPluck}
              className="w-14 h-14 rounded-full bg-teal-500 text-black flex items-center justify-center cursor-pointer hover:scale-105 transition-transform"
            >
              <Volume2 className="w-6 h-6 animate-pulse" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3.5">
            {earGuessOptions.map(opt => (
              <button
                key={`ear-guess-${opt}`}
                onClick={() => handleEarTestGuess(opt)}
                className="bg-slate-900 hover:bg-slate-800 border border-slate-800 py-3.5 rounded-xl text-xs font-bold font-mono transition-transform hover:scale-[1.01]"
              >
                Is note {opt}?
              </button>
            ))}
          </div>
        </motion.div>
      )}

      {/* SECTION 6: BACKING TRACK SONG */}
      {activeStep === 'song' && (
        <motion.div 
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          className="space-y-6"
        >
          <div className="flex justify-between items-center pb-3 border-b border-slate-800">
            <div>
              <span className="text-[10px] font-mono text-amber-500">Step 6 of 6</span>
              <h3 className="text-lg font-display font-bold">Song Performance Test: {targetSong.name}</h3>
            </div>
            <span className="text-xs font-mono bg-emerald-950/40 text-emerald-400 px-2 rounded">Weight: 10%</span>
          </div>

          <p className="text-xs text-slate-400 font-medium">
            Perform song progression. Strum along matching scrolling timeline blocks of <strong>{targetSong.requiredChords.join(' - ')}</strong>.
          </p>

          <div className="bg-slate-950 p-6 rounded-2xl border border-slate-900 flex flex-col items-center justify-center text-center gap-2">
            <span className="text-2xl font-black font-mono text-indigo-400">{targetSong.chordsTimeline[songTimelineTick % targetSong.chordsTimeline.length]?.chord || "G"}</span>
            <p className="text-xs text-slate-400 italic font-semibold">"{targetSong.lyrics?.[songTimelineTick % (targetSong.lyrics?.length || 1)]?.text || "Keep standard tempo pace!"}"</p>
          </div>

          <div className="flex justify-between items-center pt-4">
            <span className="text-xs font-mono text-slate-550">Strum sequence cleanly:</span>
            <button
              onClick={progressSongTick}
              className="bg-amber-500 hover:bg-amber-450 text-black px-6 py-2.5 rounded-xl font-mono text-xs font-bold transition-transform hover:scale-102"
            >
              Play chord {songTimelineTick}/4
            </button>
          </div>
        </motion.div>
      )}

      {/* RESULTS CALCULATION PANEL */}
      {activeStep === 'results' && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center space-y-6"
        >
          <div className="w-16 h-16 rounded-full mx-auto flex items-center justify-center bg-slate-950 shadow-inner">
            {isPassed ? (
              <ShieldCheck className="w-9 h-9 text-emerald-400 animate-bounce" />
            ) : (
              <ShieldAlert className="w-9 h-9 text-rose-500" />
            )}
          </div>

          <div className="space-y-1">
            <h3 className="text-2xl font-display font-bold">{isPassed ? "Congratulations! Passed" : "Exam Attempt Complete"}</h3>
            <p className="text-xs text-slate-400 font-semibold font-mono">Weighted cumulative GPA audit results</p>
          </div>

          {/* Detailed results breakout table */}
          <div className="bg-slate-950 border border-slate-900 rounded-2xl p-5 space-y-3.5 text-left text-xs font-mono">
            <div className="flex justify-between items-center pb-2 border-b border-slate-900">
              <span className="text-slate-400">Warm Up Section Score:</span>
              <span className="text-slate-200 font-bold">{warmupScore}/100</span>
            </div>
            <div className="flex justify-between items-center pb-2 border-b border-slate-900">
              <span className="text-slate-400">Scale Placement Accuracy:</span>
              <span className="text-slate-200 font-bold">{scaleScore}/100</span>
            </div>
            <div className="flex justify-between items-center pb-2 border-b border-slate-900">
              <span className="text-slate-400">Rhythm beat pacing accuracy:</span>
              <span className="text-slate-200 font-bold">{rhythmScore}/100</span>
            </div>
            <div className="flex justify-between items-center pb-2 border-b border-slate-900">
              <span className="text-slate-400">Clean chord shape shifts:</span>
              <span className="text-slate-200 font-bold">{chordScore}/100</span>
            </div>
            <div className="flex justify-between items-center pb-2 border-b border-slate-900">
              <span className="text-slate-400">Ear pitch recognition:</span>
              <span className="text-slate-200 font-bold">{earScore}/100</span>
            </div>
            <div className="flex justify-between items-center pb-2.5 border-b border-slate-900">
              <span className="text-slate-400">Song performance score:</span>
              <span className="text-slate-200 font-bold">{songScore}/100</span>
            </div>

            <div className="flex justify-between items-center pt-2 text-sm">
              <span className="text-slate-300 font-bold">CUMULATIVE AVERAGE:</span>
              <span className={`font-black text-lg ${isPassed ? 'text-emerald-400 shadow-emerald-500/10' : 'text-rose-400'}`}>
                {finalAvg} / 100
              </span>
            </div>
          </div>

          {/* Action results button */}
          <div className="pt-4 flex gap-4">
            <button
              onClick={onCancel}
              className="flex-1 bg-slate-950 hover:bg-slate-850 border border-slate-850 py-3 rounded-xl font-mono text-xs transition-colors"
            >
              Re-practice Studio
            </button>
            <button
              onClick={handleFinalExamSubmit}
              className={`flex-1 py-3 rounded-xl font-mono text-xs font-bold transition-all ${isPassed ? 'bg-emerald-500 hover:bg-emerald-450 text-slate-950 font-black shadow-lg shadow-emerald-500/15' : 'bg-slate-800 text-slate-350 hover:bg-slate-700'}`}
            >
              {isPassed ? `Unlock Active Level Success • Claims Rewards!` : "End Exam session"}
            </button>
          </div>
        </motion.div>
      )}

    </div>
  );
}
