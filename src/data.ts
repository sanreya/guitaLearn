/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Level, WarmupExercise, Scale, RhythmExercise, ChordDetail, Song, Badge, UserStats } from './types';
import { saveUserStatsToDb } from './firebase';

export const DEFAULT_LEVELS: Level[] = [
  { id: 1, name: "String Survivor", goal: "Learn guitar anatomy, proper posture, finger positioning & basic rhythm.", badge: "Bronze Pick", badgeColorId: "bronze", requiredScore: 80 },
  { id: 2, name: "Campfire Hero", goal: "Master open chords, basic strumming, and easy acoustic campfire songs.", badge: "Campfire Legend", badgeColorId: "bronze", requiredScore: 80 },
  { id: 3, name: "TikTok Guitarist", goal: "Tackle popular chord progressions, fingerstyle basics, and short song covers.", badge: "Viral Vibes", badgeColorId: "silver", requiredScore: 80 },
  { id: 4, name: "Bedroom Rockstar", goal: "Learn barre chords, pentatonic scales, and intermediate song covers.", badge: "Silver Strings", badgeColorId: "silver", requiredScore: 80 },
  { id: 5, name: "Stage Ready", goal: "Explore improvisation basics, advanced rhythm timing, and clean ear training.", badge: "Golden Fret", badgeColorId: "gold", requiredScore: 80 },
  { id: 6, name: "Guitar Wizard", goal: "Master modal scales, advanced guitar techniques, and complex lead solos.", badge: "Arcane Strings", badgeColorId: "neon", requiredScore: 80 },
  { id: 7, name: "Guitar God", goal: "Reach professional level guitar proficiency and perform jaw-dropping solos.", badge: "Legendary Axe Master", badgeColorId: "legendary", requiredScore: 80 }
];

export const DEFAULT_WARMUP_EXERCISES: WarmupExercise[] = [
  {
    id: "spider_walk",
    name: "Spider Walk",
    fretPattern: "1-2-3-4",
    fingerPattern: "1-2-3-4",
    difficulty: "Beginner",
    instructions: "Play frets 1, 2, 3, 4 sequentially on the Low E string using individual fingers, then advance to the next string. Repeat down and back.",
    animationSteps: [1, 2, 3, 4]
  },
  {
    id: "reverse_spider",
    name: "Reverse Spider",
    fretPattern: "4-3-2-1",
    fingerPattern: "4-3-2-1",
    difficulty: "Intermediate",
    instructions: "Play frets 4, 3, 2, 1 descending on each string. Ensures control and solid reverse coordination.",
    animationSteps: [4, 3, 2, 1]
  },
  {
    id: "finger_independence",
    name: "Finger Independence",
    fretPattern: "1-3-2-4",
    fingerPattern: "1-3-2-4",
    difficulty: "Advanced",
    instructions: "Alternate fingers: index (1) then ring (3), middle (2) then pinky (4). Build powerful physical coordination.",
    animationSteps: [1, 3, 2, 4]
  },
  {
    id: "chromatic_crawl",
    name: "Chromatic Crawl",
    fretPattern: "1-2-3-4-5",
    fingerPattern: "1-2-3-4-5",
    difficulty: "Advanced",
    instructions: "Spider variation using 5 frets across multiple strings, forcing horizontal shifting alongside vertical movement.",
    animationSteps: [1, 2, 3, 4, 5]
  }
];

export const DEFAULT_SCALES: Scale[] = [
  {
    id: "c_major",
    name: "C Major",
    notes: ["C", "D", "E", "F", "G", "A", "B"],
    level: "Beginner",
    fretHighlights: ["5,3,C", "4,0,D", "4,2,E", "4,3,F", "3,0,G", "3,2,A", "2,0,B", "2,1,C"]
  },
  {
    id: "g_major",
    name: "G Major",
    notes: ["G", "A", "B", "C", "D", "E", "F#"],
    level: "Beginner",
    fretHighlights: ["5,3,G", "4,0,A", "4,2,B", "4,3,C", "3,0,D", "3,2,E", "2,0,F#", "2,0,G"]
  },
  {
    id: "d_major",
    name: "D Major",
    notes: ["D", "E", "F#", "G", "A", "B", "C#"],
    level: "Beginner",
    fretHighlights: ["4,0,D", "4,2,E", "4,4,F#", "3,0,G", "3,2,A", "2,0,B", "2,2,C#", "2,3,D"]
  },
  {
    id: "a_minor",
    name: "Natural Minor (A Minor)",
    notes: ["A", "B", "C", "D", "E", "F", "G"],
    level: "Intermediate",
    fretHighlights: ["5,5,A", "5,7,B", "5,8,C", "4,5,D", "4,7,E", "4,8,F", "3,5,G", "3,7,A"]
  },
  {
    id: "pentatonic_major_g",
    name: "Pentatonic Major (G)",
    notes: ["G", "A", "B", "D", "E"],
    level: "Intermediate",
    fretHighlights: ["5,3,G", "5,5,A", "4,2,B", "4,5,D", "3,2,E", "3,5,G", "2,2,A", "2,5,B"]
  },
  {
    id: "pentatonic_minor_a",
    name: "Pentatonic Minor (A)",
    notes: ["A", "C", "D", "E", "G"],
    level: "Intermediate",
    fretHighlights: ["5,5,A", "5,8,C", "4,5,D", "4,7,E", "3,5,G", "3,7,A", "2,5,C", "2,8,D"]
  },
  {
    id: "blues_scale_a",
    name: "Blues Scale (A)",
    notes: ["A", "C", "D", "D#", "E", "G"],
    level: "Advanced",
    fretHighlights: ["5,5,A", "5,8,C", "4,5,D", "4,6,D#", "4,7,E", "3,5,G", "3,7,A", "2,5,C", "2,8,D"]
  },
  {
    id: "dorian_mode_d",
    name: "Dorian Mode (D)",
    notes: ["D", "E", "F", "G", "A", "B", "C"],
    level: "Advanced",
    fretHighlights: ["5,10,D", "5,12,E", "4,8,F", "4,10,G", "4,12,A", "3,9,B", "3,10,C", "3,12,D"]
  }
];

export const DEFAULT_RHYTHMS: RhythmExercise[] = [
  { id: "quarter_notes", name: "Quarter Notes (1 2 3 4)", pattern: "1 2 3 4", subdivision: "quarter", level: "Beginner", beats: [1, 2, 3, 4] },
  { id: "eighth_notes", name: "Eighth Notes (1 & 2 & 3 & 4 &)", pattern: "1 & 2 & 3 & 4 &", subdivision: "eighth", level: "Intermediate", beats: [1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5] },
  { id: "triplets", name: "Triplets (1-la-li 2-la-li)", pattern: "1 triplet 2 triplet 3 triplet 4 triplet", subdivision: "triplet", level: "Advanced", beats: [1, 1.33, 1.66, 2, 2.33, 2.66, 3, 3.33, 3.66, 4, 4.33, 4.66] },
  { id: "syncopation", name: "Syncopation Challenge", pattern: "1 . & 3 . & 4", subdivision: "eighth", level: "Advanced", beats: [1, 1.5, 3, 3.5, 4] },
  { id: "polyrhythm_3_4", name: "Polyrhythm 3 over 4", pattern: "Pulse 3 overlaying 4", subdivision: "eighth", level: "Advanced", beats: [1, 2.33, 3.66] }
];

export const DEFAULT_CHORDS: ChordDetail[] = [
  {
    id: "G",
    name: "G Major",
    fingerings: [
      { string: 6, fret: 3, finger: 3 }, // Low E
      { string: 5, fret: 2, finger: 2 }, // A
      { string: 4, fret: 0 },             // D open
      { string: 3, fret: 0 },             // G open
      { string: 2, fret: 0 },             // B open
      { string: 1, fret: 3, finger: 4 }  // High E
    ],
    level: "Beginner",
    transitionSequence: ["G", "C", "D", "G"]
  },
  {
    id: "C",
    name: "C Major",
    fingerings: [
      { string: 6, fret: -1 },            // Low E muted
      { string: 5, fret: 3, finger: 3 }, // A
      { string: 4, fret: 2, finger: 2 }, // D
      { string: 3, fret: 0 },             // G open
      { string: 2, fret: 1, finger: 1 }, // B
      { string: 1, fret: 0 }              // High E open
    ],
    level: "Beginner",
    transitionSequence: ["C", "F", "G", "C"]
  },
  {
    id: "D",
    name: "D Major",
    fingerings: [
      { string: 6, fret: -1 },            // Low E muted
      { string: 5, fret: -1 },            // A muted
      { string: 4, fret: 0 },             // D open
      { string: 3, fret: 2, finger: 1 }, // G
      { string: 2, fret: 3, finger: 3 }, // B
      { string: 1, fret: 2, finger: 2 }  // High E
    ],
    level: "Beginner",
    transitionSequence: ["D", "G", "A", "D"]
  },
  {
    id: "Em",
    name: "E Minor",
    fingerings: [
      { string: 6, fret: 0 },             // Low E open
      { string: 5, fret: 2, finger: 2 }, // A
      { string: 4, fret: 2, finger: 3 }, // D
      { string: 3, fret: 0 },             // G open
      { string: 2, fret: 0 },             // B open
      { string: 1, fret: 0 }              // High E open
    ],
    level: "Beginner",
    transitionSequence: ["Em", "Am", "B7", "Em"]
  },
  {
    id: "Am",
    name: "A Minor",
    fingerings: [
      { string: 6, fret: -1 },            // Low E muted
      { string: 5, fret: 0 },             // A open
      { string: 4, fret: 2, finger: 2 }, // D
      { string: 3, fret: 2, finger: 3 }, // G
      { string: 2, fret: 1, finger: 1 }, // B
      { string: 1, fret: 0 }              // High E open
    ],
    level: "Beginner",
    transitionSequence: ["Am", "Dm", "E7", "Am"]
  },
  {
    id: "F",
    name: "F Major (Barre)",
    fingerings: [
      { string: 6, fret: 1, finger: 1 }, // Low E barre
      { string: 5, fret: 3, finger: 3 }, // A
      { string: 4, fret: 3, finger: 4 }, // D
      { string: 3, fret: 2, finger: 2 }, // G
      { string: 2, fret: 1, finger: 1 }, // B barre
      { string: 1, fret: 1, finger: 1 }  // High E barre
    ],
    level: "Intermediate",
    transitionSequence: ["F", "Bb", "C", "F"]
  },
  {
    id: "Bm",
    name: "B Minor (Barre)",
    fingerings: [
      { string: 6, fret: -1 },            // Low E muted
      { string: 5, fret: 2, finger: 1 }, // A barre
      { string: 4, fret: 4, finger: 3 }, // D
      { string: 3, fret: 4, finger: 4 }, // G
      { string: 2, fret: 3, finger: 2 }, // B
      { string: 1, fret: 2, finger: 1 }  // High E barre
    ],
    level: "Intermediate",
    transitionSequence: ["Bm", "Em", "F#7", "Bm"]
  }
];

export const DEFAULT_SONGS: Song[] = [
  {
    id: "happy_birthday",
    name: "Happy Birthday",
    artist: "Traditional",
    difficulty: "Beginner",
    requiredLevel: 1,
    requiredChords: ["G", "D", "C"],
    requiredScales: ["G Major"],
    requiredRhythms: ["quarter_notes"],
    beatsPerMinute: 90,
    chordsTimeline: [
      { time: 0, chord: "G" },
      { time: 4, chord: "D" },
      { time: 8, chord: "D" },
      { time: 12, chord: "G" },
      { time: 16, chord: "G" },
      { time: 20, chord: "C" },
      { time: 24, chord: "G" },
      { time: 26, chord: "D" },
      { time: 28, chord: "G" }
    ],
    lyrics: [
      { time: 0, text: "Happy Birthday to you..." },
      { time: 4, text: "Happy Birthday to you..." },
      { time: 8, text: "Happy Birthday dear student..." },
      { time: 16, text: "Happy Birthday to you!" }
    ]
  },
  {
    id: "horse_with_no_name",
    name: "A Horse With No Name",
    artist: "America",
    difficulty: "Beginner",
    requiredLevel: 2,
    requiredChords: ["Em", "D"],
    requiredScales: ["Pentatonic Minor (A)"],
    requiredRhythms: ["eighth_notes"],
    beatsPerMinute: 110,
    chordsTimeline: [
      { time: 0, chord: "Em" },
      { time: 4, chord: "D" },
      { time: 8, chord: "Em" },
      { time: 12, chord: "D" },
      { time: 16, chord: "Em" },
      { time: 20, chord: "D" }
    ],
    lyrics: [
      { time: 0, text: "On the first part of the journey..." },
      { time: 8, text: "I was looking at all the life..." },
      { time: 16, text: "There were plants and birds and rocks and things..." }
    ]
  },
  {
    id: "wonderwall",
    name: "Wonderwall",
    artist: "Oasis",
    difficulty: "Intermediate",
    requiredLevel: 3,
    requiredChords: ["Em", "G", "D", "C"],
    requiredScales: ["Pentatonic Minor (A)"],
    requiredRhythms: ["eighth_notes"],
    beatsPerMinute: 88,
    chordsTimeline: [
      { time: 0, chord: "Em" },
      { time: 2, chord: "G" },
      { time: 4, chord: "D" },
      { time: 6, chord: "C" },
      { time: 8, chord: "Em" },
      { time: 10, chord: "G" },
      { time: 12, chord: "D" },
      { time: 14, chord: "C" }
    ],
    lyrics: [
      { time: 0, text: "Today is gonna be the day that they're gonna throw it back to you..." },
      { time: 8, text: "By now you should've somehow realized what you gotta do..." }
    ]
  },
  {
    id: "stand_by_me",
    name: "Stand By Me",
    artist: "Ben E. King",
    difficulty: "Intermediate",
    requiredLevel: 3,
    requiredChords: ["G", "Em", "C", "D"],
    requiredScales: ["G Major"],
    requiredRhythms: ["eighth_notes"],
    beatsPerMinute: 118,
    chordsTimeline: [
      { time: 0, chord: "G" },
      { time: 4, chord: "Em" },
      { time: 8, chord: "C" },
      { time: 10, chord: "D" },
      { time: 12, chord: "G" }
    ],
    lyrics: [
      { time: 0, text: "When the night has come, and the land is dark..." },
      { time: 4, text: "And the moon is the only light we'll see..." },
      { time: 8, text: "No, I won't be afraid, oh, I won't be afraid..." }
    ]
  },
  {
    id: "hotel_california",
    name: "Hotel California",
    artist: "Eagles",
    difficulty: "Advanced",
    requiredLevel: 4,
    requiredChords: ["Bm", "F", "G", "D", "Em"],
    requiredScales: ["Blues Scale (A)"],
    requiredRhythms: ["eighth_notes"],
    beatsPerMinute: 74,
    chordsTimeline: [
      { time: 0, chord: "Bm" },
      { time: 4, chord: "F" },
      { time: 8, chord: "G" },
      { time: 12, chord: "D" },
      { time: 16, chord: "Em" },
      { time: 20, chord: "Bm" }
    ],
    lyrics: [
      { time: 0, text: "On a dark desert highway, cool wind in my hair..." },
      { time: 8, text: "Warm smell of colitas, rising up through the air..." },
      { time: 16, text: "Up ahead in the distance, I saw a shimmering light..." }
    ]
  }
];

export const DEFAULT_BADGES: Badge[] = [
  { id: "first_chord", name: "Tiny Fingers", description: "First complete chord build and clean strum registered.", icon: "Music", rarity: "Common" },
  { id: "streak_7", name: "Never Miss A Practice", description: "Recorded a consistent 7-day practice streak.", icon: "Flame", rarity: "Rare" },
  { id: "streak_30", name: "String Addict", description: "Recorded an incredible 30-day practice streak.", icon: "Zap", rarity: "Epic" },
  { id: "perfect_exam", name: "Flawless Fretting", description: "Passed a level final progression exam with a perfect 100/100 score.", icon: "Crown", rarity: "Legendary" },
  { id: "level_1", name: "Bronze Pick Holder", description: "Successfully passed the String Survivor tier exam.", icon: "Award", rarity: "Common" },
  { id: "level_2", name: "Campfire Legend", description: "Successfully passed the Campfire Hero tier exam.", icon: "FlameKindling", rarity: "Common" },
  { id: "level_3", name: "Viral Vibes Champion", description: "Successfully passed the TikTok Guitarist tier exam.", icon: "Radio", rarity: "Rare" },
  { id: "level_4", name: "Silver Strings Rockstar", description: "Successfully passed the Bedroom Rockstar tier exam.", icon: "Sparkles", rarity: "Rare" },
  { id: "level_5", name: "Golden Fret Maester", description: "Successfully passed the Stage Ready tier exam.", icon: "Trophy", rarity: "Epic" },
  { id: "level_6", name: "Arcane Strings Wizard", description: "Successfully passed the Guitar Wizard tier exam.", icon: "Wand2", rarity: "Epic" },
  { id: "level_7", name: "Legendary Axe Master", description: "Successfully passed the absolute tier, achieving Guitar God status.", icon: "Swords", rarity: "Legendary" }
];

export function getDatabase() {
  const isServer = typeof window === 'undefined';
  if (isServer) {
    return {
      levels: DEFAULT_LEVELS,
      warmups: DEFAULT_WARMUP_EXERCISES,
      scales: DEFAULT_SCALES,
      rhythms: DEFAULT_RHYTHMS,
      chords: DEFAULT_CHORDS,
      songs: DEFAULT_SONGS,
      badges: DEFAULT_BADGES
    };
  }

  const getOrSet = <T>(key: string, defaultValue: T): T => {
    const value = localStorage.getItem(key);
    if (!value) {
      localStorage.setItem(key, JSON.stringify(defaultValue));
      return defaultValue;
    }
    try {
      return JSON.parse(value);
    } catch {
      return defaultValue;
    }
  };

  return {
    levels: getOrSet<Level[]>("gq_levels", DEFAULT_LEVELS),
    warmups: getOrSet<WarmupExercise[]>("gq_warmups", DEFAULT_WARMUP_EXERCISES),
    scales: getOrSet<Scale[]>("gq_scales", DEFAULT_SCALES),
    rhythms: getOrSet<RhythmExercise[]>("gq_rhythms", DEFAULT_RHYTHMS),
    chords: getOrSet<ChordDetail[]>("gq_chords", DEFAULT_CHORDS),
    songs: getOrSet<Song[]>("gq_songs", DEFAULT_SONGS),
    badges: getOrSet<Badge[]>("gq_badges", DEFAULT_BADGES)
  };
}

export function saveDatabase(category: string, data: any) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(`gq_${category}`, JSON.stringify(data));
}

export function getUserStats(): UserStats {
  const defaultStats: UserStats = {
    level: 1,
    xp: 120,
    streak: 18,
    lastPracticeDate: new Date().toISOString().split('T')[0],
    completedSessions: 5,
    badges: ["first_chord"],
    skills: {
      scales: 82,
      rhythm: 76,
      chords: 88,
      ear: 65,
      songs: 79
    }
  };

  if (typeof window === 'undefined') return defaultStats;

  const activeUid = localStorage.getItem("gq_active_uid");
  const loadKey = activeUid ? `gq_stats_user_${activeUid}` : "gq_user_stats";

  const value = localStorage.getItem(loadKey);
  if (!value) {
    localStorage.setItem(loadKey, JSON.stringify(defaultStats));
    return defaultStats;
  }
  try {
    return JSON.parse(value);
  } catch {
    return defaultStats;
  }
}

export function saveUserStats(stats: UserStats) {
  if (typeof window === 'undefined') return;

  const activeUid = localStorage.getItem("gq_active_uid");
  const saveKey = activeUid ? `gq_stats_user_${activeUid}` : "gq_user_stats";

  localStorage.setItem(saveKey, JSON.stringify(stats));
  localStorage.setItem("gq_user_stats", JSON.stringify(stats));

  if (activeUid) {
    saveUserStatsToDb(activeUid, stats).catch(err => {
      console.warn("Async Cloud DB Sync error:", err);
    });
  }
}
