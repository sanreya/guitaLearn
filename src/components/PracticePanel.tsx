/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { getDatabase, getUserStats, saveUserStats } from '../data';
import { SessionDuration, SessionRoutineItem, WarmupExercise, Scale, RhythmExercise, ChordDetail, Song } from '../types';
import { audioEngine, getNoteFromFrequency, autoCorrelate } from '../audioEngine';
import Fretboard from './Fretboard';
import { Play, Pause, RotateCcw, Volume2, Mic, VolumeX, Sparkles, CheckCircle2, ChevronRight, AlertCircle, HelpCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface PracticePanelProps {
  onSessionComplete: (xpGained: number) => void;
  onCancel: () => void;
}

export default function PracticePanel({ onSessionComplete, onCancel }: PracticePanelProps) {
  const db = getDatabase();
  const [duration, setDuration] = useState<SessionDuration>(30);
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [currentStepIdx, setCurrentStepIdx] = useState(0);

  // Timers
  const [totalSecondsLeft, setTotalSecondsLeft] = useState(0);
  const [stepSecondsLeft, setStepSecondsLeft] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  // Audio mic states
  const [micState, setMicState] = useState<'off' | 'on' | 'error'>('off');
  const [liveFreq, setLiveFreq] = useState<number | null>(null);
  const [liveNote, setLiveNote] = useState<string | null>(null);
  const [centsDeviation, setCentsDeviation] = useState<number>(0);
  const [isNotePerfect, setIsNotePerfect] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const micAnalyserRef = useRef<AnalyserNode | null>(null);
  const micIntervalRef = useRef<number | null>(null);

  // Active exercises states loaded from DB
  const [activeRoutine, setActiveRoutine] = useState<SessionRoutineItem[]>([]);
  const [warmupEx, setWarmupEx] = useState<WarmupExercise>(db.warmups[0]);
  const [scaleEx, setScaleEx] = useState<Scale>(db.scales[0]);
  const [rhythmEx, setRhythmEx] = useState<RhythmExercise>(db.rhythms[0]);
  const [chordEx, setChordEx] = useState<ChordDetail>(db.chords[0]);
  const [songEx, setSongEx] = useState<Song>(db.songs[0]);

  // Warmup animation state
  const [warmupStepIdx, setWarmupStepIdx] = useState(0);

  // Metronome state
  const [bpm, setBpm] = useState(100);
  const [isMetronomeOn, setIsMetronomeOn] = useState(false);
  const [metronomeBeat, setMetronomeBeat] = useState(1);
  const metronomeIntervalRef = useRef<number | null>(null);

  // Rhythm training states
  const [tapTimings, setTapTimings] = useState<number[]>([]);
  const [rhythmFeedback, setRhythmFeedback] = useState<string>("Tap SPACEBAR to the beat pattern!");
  const [rhythmRating, setRhythmRating] = useState<'Excellent Timing' | 'Rushing'| 'Late by 120ms' | 'Excellent' | 'Good' | ''>('');

  // Chord Focus transitions
  const [chordTransitionIdx, setChordTransitionIdx] = useState(0);
  const [chordSuccessHistory, setChordSuccessHistory] = useState<string[]>([]);
  const [chordTransitionSpeed, setChordTransitionSpeed] = useState<number>(85); // simulated transitioning speed score

  // Ear training states
  const [earQuestNote, setEarQuestNote] = useState<string>("E2");
  const [earOptions, setEarOptions] = useState<string[]>([]);
  const [earStreak, setEarStreak] = useState(0);
  const [earHistory, setEarHistory] = useState<{ note: string, passed: boolean }[]>([]);

  // Song scrolling states
  const [songTime, setSongTime] = useState(0);

  // Setup routine breakdown
  const generateRoutine = (selectedDur: SessionDuration): SessionRoutineItem[] => {
    if (selectedDur === 30) {
      return [
        { activity: 'Warm Up', duration: 5 * 60 },
        { activity: 'Scales', duration: 6 * 60 },
        { activity: 'Rhythm', duration: 5 * 60 },
        { activity: 'Chords', duration: 7 * 60 },
        { activity: 'Ear Training', duration: 3 * 60 },
        { activity: 'Song', duration: 4 * 60 }
      ];
    } else if (selectedDur === 45) {
      return [
        { activity: 'Warm Up', duration: 7 * 60 },
        { activity: 'Scales', duration: 8 * 60 },
        { activity: 'Rhythm', duration: 7 * 60 },
        { activity: 'Chords', duration: 10 * 60 },
        { activity: 'Ear Training', duration: 5 * 60 },
        { activity: 'Song', duration: 8 * 60 }
      ];
    } else {
      return [
        { activity: 'Warm Up', duration: 10 * 60 },
        { activity: 'Scales', duration: 12 * 60 },
        { activity: 'Rhythm', duration: 10 * 60 },
        { activity: 'Chords', duration: 13 * 60 },
        { activity: 'Ear Training', duration: 5 * 60 },
        { activity: 'Song', duration: 10 * 60 }
      ];
    }
  };

  // Start entire session
  const startPracticeSession = () => {
    const routine = generateRoutine(duration);
    setActiveRoutine(routine);
    
    // Pick active exercise items from active DB
    if (db.warmups.length) setWarmupEx(db.warmups[Math.floor(Math.random() * db.warmups.length)]);
    if (db.scales.length) setScaleEx(db.scales[Math.floor(Math.random() * db.scales.length)]);
    if (db.rhythms.length) setRhythmEx(db.rhythms[Math.floor(Math.random() * db.rhythms.length)]);
    if (db.chords.length) setChordEx(db.chords[Math.floor(Math.random() * db.chords.length)]);
    if (db.songs.length) setSongEx(db.songs[Math.floor(Math.random() * db.songs.length)]);

    setCurrentStepIdx(0);
    const firstStepSec = routine[0].duration;
    const totalSec = duration * 60;

    setTotalSecondsLeft(totalSec);
    setStepSecondsLeft(firstStepSec);
    setIsSessionActive(true);
    setIsPaused(false);
    audioEngine.playSuccessSound();

    // Init Ear Quest
    generateNewEarQuest();
  };

  // Main countdown driver
  useEffect(() => {
    let interval: any = null;
    if (isSessionActive && !isPaused) {
      interval = setInterval(() => {
        setTotalSecondsLeft((prevTotal) => {
          if (prevTotal <= 1) {
            handleSessionCompletedSuccessfully();
            clearInterval(interval);
            return 0;
          }
          return prevTotal - 1;
        });

        setStepSecondsLeft((prevStep) => {
          if (prevStep <= 1) {
            // Move to next step
            audioEngine.playMetronomeTick(true);
            setTimeout(() => audioEngine.playSuccessSound(), 200);
            
            setCurrentStepIdx((idx) => {
              const nextIdx = idx + 1;
              if (nextIdx < activeRoutine.length) {
                setStepSecondsLeft(activeRoutine[nextIdx].duration);
              } else {
                handleSessionCompletedSuccessfully();
              }
              return nextIdx;
            });
            return 0;
          }
          return prevStep - 1;
        });

        // Advance song time if on Song Step
        if (activeRoutine[currentStepIdx]?.activity === 'Song') {
          setSongTime((prev) => prev + 1);
        }
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isSessionActive, isPaused, currentStepIdx, activeRoutine]);

  // Warmup Finger Animation simulator
  useEffect(() => {
    let animInterval: any = null;
    if (isSessionActive && !isPaused && activeRoutine[currentStepIdx]?.activity === 'Warm Up') {
      animInterval = setInterval(() => {
        setWarmupStepIdx((prev) => (prev + 1) % warmupEx.animationSteps.length);
        // Play corresponding pluck sound for visual bounce
        const baseFreq = 82.41; // low E
        const offset = warmupEx.animationSteps[warmupStepIdx] || 1;
        audioEngine.playGuitarPluck(baseFreq * Math.pow(2, offset / 12), 'clean');
      }, 1400);
    }
    return () => clearInterval(animInterval);
  }, [isSessionActive, isPaused, currentStepIdx, warmupEx, warmupStepIdx]);

  // Metronome Clock timer
  useEffect(() => {
    if (isMetronomeOn && !isPaused) {
      const intervalMs = (60 / bpm) * 1000;
      metronomeIntervalRef.current = window.setInterval(() => {
        setMetronomeBeat((prev) => {
          const next = prev === 4 ? 1 : prev + 1;
          audioEngine.playMetronomeTick(next === 1);
          return next;
        });
      }, intervalMs);
    } else {
      if (metronomeIntervalRef.current) {
        clearInterval(metronomeIntervalRef.current);
      }
    }
    return () => {
      if (metronomeIntervalRef.current) clearInterval(metronomeIntervalRef.current);
    };
  }, [isMetronomeOn, bpm, isPaused]);

  // Microphone audio autocorrelation processing (Pitch Detection!)
  const toggleMicrophoneAnalysis = async () => {
    if (micState === 'on') {
      stopMicrophoneAnalysis();
      return;
    }

    try {
      const analyser = await audioEngine.startMicrophone();
      micAnalyserRef.current = analyser;
      setMicState('on');
      
      const bufferLength = analyser.fftSize;
      const dataArray = new Float32Array(bufferLength);
      const sampleRate = audioEngine.getAudioContext().sampleRate;

      micIntervalRef.current = window.setInterval(() => {
        if (!micAnalyserRef.current) return;
        micAnalyserRef.current.getFloatTimeDomainData(dataArray);

        // Run correlation
        const detectedFreq = autoCorrelate(dataArray, sampleRate);
        if (detectedFreq !== -1 && detectedFreq > 50 && detectedFreq < 1000) {
          setLiveFreq(Math.round(detectedFreq * 10) / 10);
          const { note, centsOff } = getNoteFromFrequency(detectedFreq);
          setLiveNote(note);
          setCentsDeviation(centsOff);

          // If close enough to EXPECTED note on scales practice
          if (activeRoutine[currentStepIdx]?.activity === 'Scales') {
            const expectNoteName = getExpectedScaleNote();
            // Compare base note name strings (e.g. "G" to "G3" / "G")
            if (note.includes(expectNoteName)) {
              setIsNotePerfect(true);
              setTimeout(() => setIsNotePerfect(false), 800);
            }
          }
        }
      }, 100);

    } catch (e) {
      setMicState('error');
    }
  };

  const stopMicrophoneAnalysis = () => {
    if (micIntervalRef.current) {
      clearInterval(micIntervalRef.current);
      micIntervalRef.current = null;
    }
    audioEngine.stopMicrophone();
    setMicState('off');
    setLiveFreq(null);
    setLiveNote(null);
  };

  useEffect(() => {
    return () => stopMicrophoneAnalysis();
  }, []);

  const getExpectedScaleNote = (): string => {
    return scaleEx.notes[metronomeBeat % scaleEx.notes.length] || "C";
  };

  // Keyboard tapping evaluation for Rhythm block
  const handleRhythmTap = () => {
    if (!isSessionActive || isPaused) return;
    
    audioEngine.playMetronomeTick(false);
    const now = Date.now();
    setTapTimings((prev) => {
      const updated = [...prev, now];
      if (updated.length >= 2) {
        const lastInterval = updated[updated.length - 1] - updated[updated.length - 2];
        const targetInterval = (60 / bpm) * 1000;
        const drift = Math.abs(lastInterval - targetInterval);

        if (drift < 65) {
          setRhythmRating('Excellent');
          setRhythmFeedback("Excellent timing! Keep the lock-step steady!");
        } else if (drift < 130) {
          setRhythmRating('Good');
          setRhythmFeedback("Good! Slightly drifting from metronome centers.");
        } else {
          setRhythmRating('Late by 120ms');
          setRhythmFeedback("Slight rush or delay. Breathe and anchor down.");
        }
      }
      return updated;
    });
  };

  // Key event listeners for space bar tapping
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && activeRoutine[currentStepIdx]?.activity === 'Rhythm') {
        e.preventDefault();
        handleRhythmTap();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSessionActive, isPaused, currentStepIdx, bpm]);

  // Ear training suite generators
  const generateNewEarQuest = () => {
    const fretNotes = ["E2", "A2", "D3", "G3", "B3", "E4", "C3", "G4", "F2", "D4"];
    const target = fretNotes[Math.floor(Math.random() * fretNotes.length)];
    setEarQuestNote(target);
    
    // Pick alternative options
    const list = new Set<string>();
    list.add(target);
    while (list.size < 4) {
      list.add(fretNotes[Math.floor(Math.random() * fretNotes.length)]);
    }
    setEarOptions(Array.from(list).sort());
  };

  const playEarGuitarPluck = () => {
    const nameMap: { [key: string]: number } = {
      "E2": 82.41, "F2": 87.31, "A2": 110.00, "C3": 130.81, "D3": 146.83, 
      "G3": 196.00, "B3": 246.94, "E4": 329.63, "G4": 392.00, "D4": 293.66
    };
    const hz = nameMap[earQuestNote] || 220;
    audioEngine.playGuitarPluck(hz, 'physics');
  };

  const handleEarGuess = (guess: string) => {
    const passed = guess === earQuestNote;
    if (passed) {
      audioEngine.playSuccessSound();
      setEarStreak(prev => prev + 1);
      setEarHistory(prev => [{ note: earQuestNote, passed: true }, ...prev].slice(0, 5));
    } else {
      audioEngine.playFailSound();
      setEarStreak(0);
      setEarHistory(prev => [{ note: earQuestNote, passed: false }, ...prev].slice(0, 5));
    }
    setTimeout(() => generateNewEarQuest(), 1000);
  };

  // Chord Focus transitions triggers
  const handleTransitionStrum = () => {
    audioEngine.playSuccessSound();
    setChordSuccessHistory(prev => [...prev, chordTransitionIdx === 0 ? "G" : chordTransitionIdx === 1 ? "C" : "D"]);
    setChordTransitionIdx((prev) => (prev + 1) % 3);
    setChordTransitionSpeed(speed => Math.min(100, speed + 2)); 
  };

  // Handle finalize routine
  const handleSessionCompletedSuccessfully = () => {
    stopMicrophoneAnalysis();
    setIsSessionActive(false);

    // Save streak & completed statistics back to storage database
    const user = getUserStats();
    user.streak += 1;
    user.xp += 180; // Practice rewards xp
    user.completedSessions += 1;
    user.skills.scales = Math.min(99, user.skills.scales + 1);
    user.skills.chords = Math.min(99, user.skills.chords + 1);
    user.skills.rhythm = Math.min(99, user.skills.rhythm + 1);
    
    saveUserStats(user);
    onSessionComplete(180);
  };

  // Human printable timer converter
  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const currentActivity = activeRoutine[currentStepIdx];
  const stepPercentage = currentActivity ? Math.round(((currentActivity.duration - stepSecondsLeft) / currentActivity.duration) * 100) : 0;
  const masterPercentage = Math.round(((duration * 60 - totalSecondsLeft) / (duration * 60)) * 100);

  return (
    <div id="practice-trainer-suite" className="w-full text-slate-100 select-none">
      
      {/* Before Session is Triggered Active: Options Choice Screen */}
      {!isSessionActive ? (
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-xl mx-auto bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />
          
          <div className="text-center space-y-4">
            <span className="text-[10px] bg-amber-400/15 border border-amber-400/30 text-amber-400 px-3 py-1 rounded-full font-mono uppercase tracking-wider font-semibold">Cozy Practice Hearth</span>
            
            <h2 className="text-3xl font-display font-semibold tracking-tight text-white mt-1">Ready for Practice?</h2>
            
            <p className="text-sm text-slate-400 max-w-sm mx-auto leading-relaxed">
              Every customized routine is dynamically generated. Select your desired time budget to commit to.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-4 my-8">
            {([30, 45, 60] as const).map((mins) => (
              <button
                key={mins}
                onClick={() => setDuration(mins)}
                className={`py-5 px-3 rounded-2xl border flex flex-col items-center justify-center gap-1.5 transition-all duration-150 cursor-pointer ${duration === mins ? 'bg-slate-800/80 border-amber-400/40 text-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.12)] scale-102' : 'bg-slate-950/60 border-slate-800/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800'}`}
              >
                <span className="text-2xl font-mono font-black">{mins}</span>
                <span className="text-[10px] uppercase font-mono tracking-wider text-slate-500">Mins</span>
              </button>
            ))}
          </div>

          <div className="space-y-4 border-t border-slate-800/60 pt-6">
            <h3 className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider text-center">Your Structured Routine Breakdown</h3>
            <div className="grid grid-cols-2 gap-3 text-xs font-mono bg-slate-950 p-4 rounded-xl border border-slate-900">
              <span className="text-slate-400">🔥 Full Warm-up:</span> <span className="text-amber-400 font-bold text-right">~{Math.round(duration * 0.16)} min</span>
              <span className="text-slate-400">📊 Scale Drills & Analysis:</span> <span className="text-amber-400 font-bold text-right">~{Math.round(duration * 0.2)} min</span>
              <span className="text-slate-400">🥁 Rhythm Metronome Training:</span> <span className="text-amber-400 font-bold text-right">~{Math.round(duration * 0.16)} min</span>
              <span className="text-slate-400">🎸 Daily Chord clean switch:</span> <span className="text-amber-400 font-bold text-right">~{Math.round(duration * 0.23)} min</span>
              <span className="text-slate-400">👂 Ear interval detection:</span> <span className="text-amber-400 font-bold text-right">~{Math.round(duration * 0.1)} min</span>
              <span className="text-slate-400">🎵 Real uncovered Song:</span> <span className="text-amber-400 font-bold text-right">~{Math.round(duration * 0.13)} min</span>
            </div>
          </div>

          <div className="flex gap-4 mt-8">
            <button
              onClick={onCancel}
              className="flex-1 bg-slate-950 hover:bg-slate-800 border border-slate-800 py-3.5 rounded-xl font-mono text-xs font-medium text-slate-350 transition-colors"
            >
              Back to Studio
            </button>
            <button
              onClick={startPracticeSession}
              className="flex-1 bg-amber-500 hover:bg-amber-450 text-slate-950 py-3.5 rounded-xl font-mono text-xs font-bold shadow-lg shadow-amber-500/10 transition-transform active:scale-98"
            >
              Start Session ⚡
            </button>
          </div>
        </motion.div>
      ) : (
        
        /* Immersive Running Practice Hud Screen */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Main activity details area */}
          <div className="lg:col-span-8 space-y-6">
            
            {/* Master HUD display progress bar */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
              <div className="flex justify-between items-center mb-4">
                <span className="text-xs font-mono font-bold bg-amber-400/10 border border-amber-400/30 text-amber-500 px-3 py-1 rounded">
                  ACTIV: {currentActivity?.activity.toUpperCase() || "WARM UP"}
                </span>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsPaused(!isPaused)}
                    className="p-1.5 bg-slate-850 hover:bg-slate-800 border border-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors"
                  >
                    {isPaused ? <Play className="w-4 h-4 fill-amber-500 stroke-amber-500" /> : <Pause className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={() => {
                      if (window.confirm("Abort current training routine? Points accumulated will be discarded.")) {
                        stopMicrophoneAnalysis();
                        setIsSessionActive(false);
                      }
                    }}
                    className="text-xs font-mono font-bold border border-rose-900/65 bg-rose-950/20 hover:bg-rose-900/40 text-rose-400 px-3 py-1.5 rounded-lg transition-all"
                  >
                    Abort Routine
                  </button>
                </div>
              </div>

              {/* Master timer counts */}
              <div className="grid grid-cols-2 gap-4 pb-4 border-b border-slate-800/60">
                <div>
                  <h4 className="text-[10px] font-mono uppercase tracking-wider text-slate-400">Total practice limit remaining</h4>
                  <div className="text-3xl font-mono font-black text-white mt-1 shadow-inner">{formatTime(totalSecondsLeft)}</div>
                </div>
                <div className="text-right">
                  <h4 className="text-[10px] font-mono uppercase tracking-wider text-slate-400">This module limit</h4>
                  <div className="text-3xl font-mono font-black text-amber-400 mt-1">{formatTime(stepSecondsLeft)}</div>
                </div>
              </div>

              {/* Multiple step tracker indicators */}
              <div className="pt-4 space-y-2">
                <div className="flex justify-between text-xs font-mono text-slate-400">
                  <span>Step {currentStepIdx + 1} of {activeRoutine.length} ({currentActivity?.activity})</span>
                  <span>{stepPercentage}% done</span>
                </div>
                <div className="w-full bg-slate-950 h-2.5 rounded-full overflow-hidden border border-slate-800">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${stepPercentage}%` }}
                    className="bg-amber-500 h-full rounded-full" 
                  />
                </div>
              </div>
            </div>

            {/* Individual active modules */}
            <AnimatePresence mode="wait">
              
              {/* WARM UP MODULE DETAILS */}
              {currentActivity?.activity === 'Warm Up' && (
                <motion.div
                  key="warm-up"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl"
                >
                  <div className="flex justify-between items-center mb-4 pb-3 border-b border-slate-800">
                    <div>
                      <h3 className="text-lg font-display font-medium text-slate-100">{warmupEx.name} guide</h3>
                      <p className="text-xs text-indigo-400 font-mono mt-1">Fret pattern: {warmupEx.fretPattern} • Fingers: {warmupEx.fingerPattern}</p>
                    </div>
                    <span className="text-xs font-mono font-extrabold bg-indigo-950 border border-indigo-900/60 px-3 py-1 rounded text-indigo-400">{warmupEx.difficulty}</span>
                  </div>

                  <p className="text-sm text-slate-300 leading-relaxed bg-slate-950/65 p-4 rounded-xl border border-slate-900/60 mb-6">
                    {warmupEx.instructions}
                  </p>

                  <div className="flex justify-between items-center mb-3">
                    <span className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider">Dynamic Finger Position Guide</span>
                    <span className="text-[10px] font-mono text-indigo-400 bg-indigo-950/40 rounded px-2 py-0.5">Auto-playing sequence</span>
                  </div>

                  {/* Fretboard highlighting single note in step */}
                  <Fretboard 
                    highlights={[{ string: 6, fret: warmupEx.animationSteps[warmupStepIdx], label: `F${warmupEx.animationSteps[warmupStepIdx]}`, color: 'linear-gradient(135deg, #A855F7 0%, #6B21A8 100%)' }]}
                    expectedNote={`Low E, Fret ${warmupEx.animationSteps[warmupStepIdx]}`}
                  />
                </motion.div>
              )}

              {/* SCALES TRAINING MODULE */}
              {currentActivity?.activity === 'Scales' && (
                <motion.div
                  key="scales"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6"
                >
                  <div className="flex justify-between items-center pb-3 border-b border-slate-800">
                    <div>
                      <h3 className="text-lg font-display font-medium text-slate-100">Scale module: {scaleEx.name}</h3>
                      <p className="text-xs font-mono text-cyan-400 mt-1">Expected Notes in sequence: {scaleEx.notes.join(' - ')}</p>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <button
                        onClick={toggleMicrophoneAnalysis}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-bold tracking-wider uppercase transition-colors pointer-events-auto cursor-pointer ${micState === 'on' ? 'bg-rose-500/15 border border-rose-500/40 text-rose-450 shadow-[0_0_8px_rgba(239,68,68,0.15)] animate-pulse' : 'bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-350'}`}
                      >
                        <Mic className="w-3.5 h-3.5" />
                        {micState === 'on' ? "Live MIC ON" : "CONNECT MIC"}
                      </button>
                    </div>
                  </div>

                  {/* Metronome controller */}
                  <div className="bg-slate-950 border border-slate-900/60 rounded-xl p-4 flex flex-col md:flex-row justify-between items-center gap-4">
                    <div className="flex items-center gap-4">
                      <button
                        onClick={() => setIsMetronomeOn(!isMetronomeOn)}
                        className={`w-10 h-10 rounded-full flex items-center justify-center cursor-pointer ${isMetronomeOn ? 'bg-amber-400 text-slate-950 font-bold shadow-[0_0_12px_rgba(245,158,11,0.3)]' : 'bg-slate-900 border border-slate-800 text-slate-400'}`}
                      >
                        <Volume2 className="w-5 h-5 animate-pulse" />
                      </button>
                      <div>
                        <div className="text-xs font-mono text-slate-400 uppercase tracking-wide">Metronome Pulse</div>
                        <div className="text-sm font-bold text-slate-200 mt-0.5">{isMetronomeOn ? "CLICKING TONES BEAT " + metronomeBeat : "SILENT IDLE"}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-xs font-mono text-slate-500">40 BPM</span>
                      <input 
                        type="range" 
                        min="40" 
                        max="240" 
                        value={bpm} 
                        onChange={(e) => setBpm(Number(e.target.value))}
                        className="w-40 accent-amber-400 bg-slate-900 rounded" 
                      />
                      <span className="text-xs font-mono text-slate-200 font-bold bg-slate-900 border border-slate-800 px-2.5 py-0.5 rounded">{bpm} BPM</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <h4 className="text-xs font-mono text-slate-400 uppercase tracking-wider">Scale Fretboard guide Map</h4>
                      <div className="text-[10px] font-mono text-cyan-400 bg-cyan-950/30 rounded px-2.5 py-0.5">Active note position highlighted in Amber</div>
                    </div>
                    
                    {/* Render Fretboard highlighting correct notes */}
                    <Fretboard 
                      highlights={scaleEx.fretHighlights.map((fh, i) => {
                        const [str, fr, note] = fh.split(',');
                        const isCurrentExpected = note === getExpectedScaleNote();
                        return {
                          string: Number(str),
                          fret: Number(fr),
                          label: note,
                          color: isCurrentExpected ? 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)' : 'linear-gradient(135deg, #22D3EE 0%, #0891B2 100%)'
                        };
                      })}
                      expectedNote={getExpectedScaleNote()}
                      playedNote={liveNote || undefined}
                      accuracy={liveFreq ? 95 : 0}
                    />
                  </div>

                  {micState === 'off' && (
                    <div className="text-xs text-amber-500 bg-amber-500/10 border border-amber-500/25 rounded-lg p-3 flex gap-2 items-start mt-4">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      <div>
                        <strong>Using Real Acoustic Guitar analysis?</strong> Connect your physical microphone in the panel above. The digital pitch correlation will actively audit notes played on your real string instrument!
                      </div>
                    </div>
                  )}
                </motion.div>
              )}

              {/* RHYTHM METRONOME DEVIATION EVALUATION */}
              {currentActivity?.activity === 'Rhythm' && (
                <motion.div
                  key="rhythm"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6"
                >
                  <div className="flex justify-between items-center pb-3 border-b border-slate-800">
                    <div>
                      <h3 className="text-lg font-display font-medium text-slate-100">Rhythm drill: {rhythmEx.name}</h3>
                      <p className="text-xs font-mono text-teal-400 mt-1">Level Group: {rhythmEx.level} • Pattern: {rhythmEx.pattern}</p>
                    </div>
                    <span className="text-xs font-mono font-extrabold bg-teal-950 border border-teal-900/60 px-3 py-1 rounded text-teal-450 uppercase">{rhythmEx.subdivision}s</span>
                  </div>

                  {/* Metronome Controller */}
                  <div className="bg-slate-950 border border-slate-900/60 rounded-xl p-4 flex flex-row justify-between items-center">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => setIsMetronomeOn(!isMetronomeOn)}
                        className={`w-9 h-9 rounded-full flex items-center justify-center cursor-pointer ${isMetronomeOn ? 'bg-amber-400 text-slate-950' : 'bg-slate-900 border border-slate-800 text-slate-400'}`}
                      >
                        <Volume2 className="w-4.5 h-4.5 animate-pulse" />
                      </button>
                      <span className="text-xs font-mono text-slate-400">Tempo: <strong className="text-white">{bpm} BPM</strong></span>
                    </div>

                    <div className="flex gap-1">
                      {[1, 2, 3, 4].map((bt) => (
                        <div 
                          key={`beat-tick-${bt}`}
                          className={`w-4 h-4 rounded-full border ${metronomeBeat === bt && isMetronomeOn ? 'bg-amber-400 border-amber-500 shadow-[0_0_8px_#F59E0B]' : 'bg-slate-900 border-slate-800'}`}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Keyboard Area Strum Tapper */}
                  <div 
                    onClick={handleRhythmTap}
                    className="cursor-pointer bg-slate-950 border border-slate-800 hover:border-teal-500/40 rounded-2xl p-10 flex flex-col items-center justify-center text-center gap-3 hover:bg-slate-900/50 transition-all select-none relative group"
                  >
                    <div className="absolute top-2.5 right-3 text-[9px] font-mono text-slate-500">CLICK SCREEN OR TAP SPACEBAR</div>
                    <div className="w-16 h-16 rounded-full bg-slate-900 group-hover:scale-105 border border-slate-800 group-hover:border-teal-400 flex items-center justify-center shadow-lg transition-transform">
                      <Volume2 className="w-6 h-6 text-teal-400 group-hover:text-amber-400" />
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-slate-200">Rhythmic Pluck Trigger</h4>
                      <p className="text-xs text-slate-450 mt-1 max-w-xs">{rhythmFeedback}</p>
                    </div>

                    {rhythmRating && (
                      <motion.span 
                        key={rhythmRating}
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className={`text-xs font-mono font-extrabold uppercase mt-1 px-3 py-1 rounded bg-slate-900 border ${rhythmRating.includes('Excellent') ? 'text-emerald-400 border-emerald-500/30' : 'text-amber-400 border-amber-500/30'}`}
                      >
                        Rating: {rhythmRating}
                      </motion.span>
                    )}
                  </div>
                </motion.div>
              )}

              {/* CHORD PRACTICE MODULE */}
              {currentActivity?.activity === 'Chords' && (
                <motion.div
                  key="chords"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6"
                >
                  <div className="flex justify-between items-center pb-3 border-b border-slate-800">
                    <div>
                      <h3 className="text-lg font-display font-medium text-slate-100">Chord Focus: {chordEx.name}</h3>
                      <p className="text-xs font-mono text-teal-400 mt-1">Difficulty: {chordEx.level} • Progression transitions: {chordEx.transitionSequence?.join(' -> ')}</p>
                    </div>
                    <span className="text-[11px] font-mono bg-teal-950 border border-teal-900/60 p-2 text-teal-400 font-bold rounded">CHORD OF THE DAY</span>
                  </div>

                  {/* Split visual columns: chord transition guide vs fretboard */}
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                    
                    <div className="md:col-span-4 bg-slate-950 border border-slate-900 rounded-xl p-4 space-y-4">
                      <div>
                        <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">Chord switch challenge</span>
                        <div className="flex gap-2 items-center mt-2.5">
                          {["G", "C", "D"].map((ch, idx) => (
                            <div 
                              key={`chord-switch-${ch}`}
                              className={`flex-1 text-center py-2 border rounded font-mono font-black text-sm transition-all duration-150 ${chordTransitionIdx === idx ? 'bg-amber-400 text-black border-amber-500 shadow-md shadow-amber-500/10' : 'bg-slate-900 border-slate-800 text-slate-400'}`}
                            >
                              {ch}
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-1">
                        <div className="text-[10px] font-mono text-slate-500 uppercase">Interactive clean switch metric</div>
                        <div className="text-xs font-mono">Cleanliness: <strong className="text-emerald-400">88%</strong></div>
                        <div className="text-xs font-mono">Switch score: <strong className="text-cyan-400">{chordTransitionSpeed}%</strong></div>
                      </div>

                      <button
                        onClick={handleTransitionStrum}
                        className="w-full bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 font-mono text-xs font-bold py-2.5 rounded-lg flex justify-center items-center gap-1 cursor-pointer transition-colors"
                      >
                        Pluck Switch Done
                      </button>
                    </div>

                    <div className="md:col-span-8">
                      <div className="text-xs font-mono text-slate-400 uppercase tracking-wider mb-2">Finger placement map</div>
                      {/* Render custom chord shapes using fingerings map converting string 1-6 */}
                      <Fretboard 
                        highlights={chordEx.fingerings.map((fg) => ({
                          string: fg.string,
                          fret: fg.fret,
                          label: fg.fret === 0 ? "O" : fg.fret === -1 ? "X" : fg.finger ? `F${fg.finger}` : `F`,
                          color: fg.fret === 0 ? 'rgba(34, 211, 238, 0.2)' : fg.fret === -1 ? 'rgb(239, 68, 68)' : 'linear-gradient(135deg, #14B8A6 0%, #0F766E 100%)'
                        }))}
                        expectedNote={chordEx.name}
                      />
                    </div>

                  </div>
                </motion.div>
              )}

              {/* EAR TRAINING MODULE */}
              {currentActivity?.activity === 'Ear Training' && (
                <motion.div
                  key="ear-training"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-5"
                >
                  <div className="flex justify-between items-center pb-3 border-b border-slate-800">
                    <div>
                      <h3 className="text-lg font-display font-medium text-slate-100">Guiding Ear Recognition</h3>
                      <p className="text-xs text-teal-400 font-mono mt-1">Progressive interval & open-note identification quiz</p>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-mono text-slate-400">Current Quiz Streak</span>
                      <div className="text-sm font-bold text-amber-500 font-mono">🔥 {earStreak} in a row</div>
                    </div>
                  </div>

                  {/* Sound Trigger pluck card */}
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                    
                    <div className="md:col-span-5 bg-slate-950 border border-slate-900 rounded-xl p-5 flex flex-col items-center justify-center text-center gap-3">
                      <button
                        onClick={playEarGuitarPluck}
                        className="w-14 h-14 rounded-full bg-teal-500 text-black flex items-center justify-center cursor-pointer transition-transform hover:scale-105 shadow-lg shadow-teal-500/10"
                        title="Listen to test note"
                      >
                        <Volume2 className="w-6 h-6 stroke-[2.5px]" />
                      </button>
                      <div>
                        <h4 className="text-xs font-mono text-slate-300 font-bold uppercase">Synthesized string pluck</h4>
                        <p className="text-[11px] text-slate-500 leading-relaxed mt-1">Play note to adjust your inner pitch, then pick corresponding option.</p>
                      </div>
                    </div>

                    <div className="md:col-span-7 space-y-3">
                      <div className="text-xs font-mono text-slate-400 uppercase tracking-wider">Select Expected Pitch Name</div>
                      <div className="grid grid-cols-2 gap-3">
                        {earOptions.map((opt) => (
                          <button
                            key={`ear-opt-${opt}`}
                            onClick={() => handleEarGuess(opt)}
                            className="bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-200 font-mono py-3 px-4 rounded-xl text-xs font-bold transition-transform hover:scale-[1.02] cursor-pointer"
                          >
                            Play Pitch: {opt}
                          </button>
                        ))}
                      </div>
                    </div>

                  </div>

                  {/* Ear practice history */}
                  {earHistory.length > 0 && (
                    <div className="border-t border-slate-850 pt-3">
                      <div className="text-[10px] font-mono text-slate-500 uppercase">Recent Quiz History:</div>
                      <div className="flex gap-2.5 mt-2">
                        {earHistory.map((hist, i) => (
                          <span 
                            key={`hist-${i}`}
                            className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold border ${hist.passed ? 'bg-emerald-950/40 text-emerald-400 border-emerald-900/60' : 'bg-rose-950/40 text-rose-450 border-rose-900/60'}`}
                          >
                            Note {hist.note}: {hist.passed ? "✔ HIT" : "❌ MISS"}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </motion.div>
              )}

              {/* SONG PRACTICE MODULE */}
              {currentActivity?.activity === 'Song' && (
                <motion.div
                  key="song"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6"
                >
                  <div className="flex justify-between items-center pb-3 border-b border-slate-800">
                    <div>
                      <h3 className="text-lg font-display font-medium text-slate-100">Song Play: {songEx.name}</h3>
                      <p className="text-xs text-cyan-400 font-mono mt-1">Artist: {songEx.artist} • Rec level: {songEx.requiredLevel} • Chords: {songEx.requiredChords.join(', ')}</p>
                    </div>
                    <span className="text-xs font-mono font-bold text-amber-400 bg-amber-400/10 border border-amber-400/30 px-2.5 py-1 rounded">TEMPO: {songEx.beatsPerMinute} BPM</span>
                  </div>

                  {/* Scrolling Sheets Karaoke Hud */}
                  <div className="bg-slate-950 border border-slate-900 rounded-xl p-5 overflow-hidden relative">
                    <div className="absolute top-2.5 left-3 text-[9px] font-mono text-slate-500">LIVE SHEETS PLAYBACK SCORE</div>

                    <div className="h-28 flex flex-col items-center justify-center text-center gap-4 py-2">
                      <div className="text-lg font-mono font-black text-amber-400 tracking-wider">
                        ACTIVE CHORD FOCUS: {songEx.chordsTimeline[songTime % songEx.chordsTimeline.length]?.chord || "G"}
                      </div>
                      
                      <div className="text-sm font-semibold max-w-sm text-slate-350">
                        "{songEx.lyrics?.[songTime % (songEx.lyrics?.length || 1)]?.text || "Keep standard downstrokes going cleanly!"}"
                      </div>
                    </div>

                    <div className="w-full bg-slate-905 h-1 relative overflow-hidden rounded">
                      <motion.div 
                        initial={{ left: 0 }}
                        animate={{ left: `${(songTime * 8) % 100}%` }}
                        className="w-16 h-full bg-cyan-400 absolute rounded shadow-[0_0_8px_#22D3EE]" 
                      />
                    </div>
                  </div>

                  <div className="text-xs text-slate-500 font-mono flex justify-between items-center">
                    <span>Timeline: {songTime} seconds</span>
                    <span>Next transition Chord: {songEx.chordsTimeline[(songTime + 4) % songEx.chordsTimeline.length]?.chord || "C"}</span>
                  </div>

                  {/* Fretboard highlighting chords */}
                  <div>
                    <div className="text-xs font-mono text-slate-400 mb-2">Active Chord fingers guide map</div>
                    <Fretboard 
                      highlights={
                        db.chords.find(c => c.id === (songEx.chordsTimeline[songTime % songEx.chordsTimeline.length]?.chord || "G"))?.fingerings.map(fg => ({
                          string: fg.string,
                          fret: fg.fret,
                          label: fg.fret === 0 ? "O" : fg.fret === -1 ? "X" : fg.finger ? `F${fg.finger}` : `F`,
                          color: 'linear-gradient(135deg, #EC4899 0%, #BE185D 100%)' // fuchsia visual cue
                        })) || []
                      }
                      expectedNote={songEx.chordsTimeline[songTime % songEx.chordsTimeline.length]?.chord || "G"}
                    />
                  </div>
                </motion.div>
              )}

            </AnimatePresence>
          </div>

          {/* Right sidebar details helper */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* Visualizer mic capture stream block */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
              <h3 className="text-xs font-mono font-bold text-slate-450 uppercase tracking-widest mb-4">Acoustic Audio Inputs</h3>
              
              <div className="bg-slate-950 border border-slate-900/60 rounded-xl p-4 flex flex-col justify-center items-center text-center gap-3.5 min-h-[140px]">
                
                {micState === 'on' ? (
                  <div className="space-y-3.5 w-full">
                    {/* Animated waveform container */}
                    <div className="flex justify-center items-end gap-1 h-12">
                      {Array.from({ length: 12 }, (_, i) => (
                        <motion.div 
                          key={`wave-bar-${i}`}
                          className="w-1.5 bg-gradient-to-t from-cyan-500 to-amber-400 rounded-full"
                          animate={{ height: [12, Math.random() * 45 + 10, 12] }}
                          transition={{ repeat: Infinity, duration: 0.6 + i * 0.05 }}
                        />
                      ))}
                    </div>

                    <div className="space-y-1">
                      <div className="text-xs font-mono text-slate-400 uppercase">Input Pitch detected:</div>
                      <div className="text-lg font-mono font-black text-amber-400">{liveFreq ? `${liveFreq} Hz` : "listening..."}</div>
                      {liveNote && (
                        <div className="text-xs font-mono text-slate-300">
                          Note name: <strong className="text-cyan-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800 ml-1">{liveNote}</strong>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="w-10 h-10 rounded-full border border-slate-800 flex items-center justify-center text-slate-500">
                      <VolumeX className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-mono font-bold text-slate-400 uppercase">Mic Signal Off</h4>
                      <p className="text-[11px] text-slate-500 leading-relaxed max-w-xs mt-1">Connect microphone analysis to capture note pitches automatically!</p>
                    </div>
                    
                    <button
                      onClick={toggleMicrophoneAnalysis}
                      className="px-3.5 py-1.5 border border-slate-800 hover:border-slate-700 bg-slate-900 text-slate-300 text-[10px] font-mono font-bold rounded shadow-inner cursor-pointer hover:bg-slate-800 transition-colors"
                    >
                      Turn Mic On
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Sidebar item: Active routine schedule progression */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
              <h3 className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider">Session Progression</h3>
              
              <div className="space-y-2.5">
                {activeRoutine.map((step, idx) => {
                  const isCurrent = idx === currentStepIdx;
                  const isFinished = idx < currentStepIdx;
                  return (
                    <div 
                      key={`schedule-row-${idx}`}
                      className={`flex justify-between items-center p-2.5 rounded-xl border transition-all ${isCurrent ? 'bg-amber-400/10 border-amber-400/40 text-amber-400 font-bold' : isFinished ? 'bg-slate-950/20 border-slate-950 text-slate-500' : 'bg-slate-950/60 border-slate-900/60 text-slate-400'}`}
                    >
                      <div className="flex items-center gap-2">
                        {isFinished ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-500 shadow-sm" />
                        ) : (
                          <span className={`w-2 h-2 rounded-full ${isCurrent ? 'bg-amber-400 animate-ping' : 'bg-slate-800'}`} />
                        )}
                        <span className="text-xs font-mono">{step.activity}</span>
                      </div>
                      <span className="text-[10px] font-mono">{Math.round(step.duration / 60)}m</span>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
