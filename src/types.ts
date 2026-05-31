/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Level {
  id: number;
  name: string;
  goal: string;
  badge: string;
  badgeColorId: string; // 'bronze' | 'silver' | 'gold' | 'neon' | 'legendary'
  requiredScore: number;
}

export interface WarmupExercise {
  id: string;
  name: string;
  fretPattern: string;
  fingerPattern: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  instructions: string;
  animationSteps: number[]; // relative timing/string offsets to animate fingers
}

export interface Scale {
  id: string;
  name: string;
  notes: string[]; // e.g. ["C", "D", "E", "F", "G", "A", "B"]
  level: 'Beginner' | 'Intermediate' | 'Advanced';
  // List of string + fret positions for highlights, string index 0 is high E, 5 is low E.
  // format: "string,fret,note_name"
  fretHighlights: string[]; 
}

export interface RhythmExercise {
  id: string;
  name: string;
  pattern: string; // e.g. "1 2 3 4" or "1 & 2 & 3 & 4 &"
  subdivision: 'quarter' | 'eighth' | 'triplet' | 'sixteenth';
  level: 'Beginner' | 'Intermediate' | 'Advanced';
  beats: number[]; // timing markers
}

export interface ChordDetail {
  id: string;
  name: string;
  fingerings: { string: number; fret: number; finger?: number }[]; // string 1-6 (1=high E, 6=low E), fret (0=open, -1=muted)
  level: 'Beginner' | 'Intermediate' | 'Advanced';
  transitionSequence?: string[]; // related chords to practice transitions
}

export interface Song {
  id: string;
  name: string;
  artist?: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  requiredLevel: number;
  requiredChords: string[];
  requiredScales: string[];
  requiredRhythms: string[];
  chordsTimeline: { time: number; chord: string }[];
  lyrics?: { time: number; text: string }[];
  beatsPerMinute: number;
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string; // lucide icon name
  rarity: 'Common' | 'Rare' | 'Epic' | 'Legendary';
  unlockedAt?: string;
}

export interface UserStats {
  level: number;
  xp: number;
  streak: number;
  lastPracticeDate?: string;
  completedSessions: number;
  badges: string[]; // Badge ID list
  skills: {
    scales: number;
    rhythm: number;
    chords: number;
    ear: number;
    songs: number;
  };
}

export type SessionDuration = 30 | 45 | 60;

export interface SessionRoutineItem {
  activity: 'Warm Up' | 'Scales' | 'Rhythm' | 'Chords' | 'Ear Training' | 'Song';
  duration: number; // in seconds
}

export interface ExamResults {
  warmUpScore: number;
  scalesScore: number;
  rhythmScore: number;
  chordsScore: number;
  earScore: number;
  songScore: number;
  totalScore: number;
  passed: boolean;
}
