/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { getDatabase, saveDatabase, DEFAULT_LEVELS, DEFAULT_WARMUP_EXERCISES, DEFAULT_SCALES, DEFAULT_RHYTHMS, DEFAULT_CHORDS, DEFAULT_SONGS, DEFAULT_BADGES } from '../data';
import { Plus, Trash2, Edit2, RotateCcw, Check, Save } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface AdminPanelProps {
  onDatabaseUpdate: () => void;
}

export default function AdminPanel({ onDatabaseUpdate }: AdminPanelProps) {
  const [activeTab, setActiveTab] = useState<'warmups' | 'scales' | 'chords' | 'songs'>('warmups');
  const [db, setDb] = useState(getDatabase());

  // Form states for creating new records
  const [warmupForm, setWarmupForm] = useState({ id: '', name: '', fretPattern: '', fingerPattern: '', difficulty: 'Beginner' as any, instructions: '' });
  const [scaleForm, setScaleForm] = useState({ id: '', name: '', notes: '', level: 'Beginner' as any, highlights: '' });
  const [chordForm, setChordForm] = useState({ id: '', name: '', level: 'Beginner' as any, stringsRaw: '6,3,3;5,2,2;4,0;3,0;2,0;1,3,4' });
  const [songForm, setSongForm] = useState({ id: '', name: '', artist: '', difficulty: 'Beginner' as any, requiredLevel: 1, requiredChords: '', beatsPerMinute: 90 });

  const resetAllToDefaults = () => {
    if (window.confirm("Are you sure you want to restore the entire database to original system defaults? This will overwrite your custom entries.")) {
      saveDatabase("levels", DEFAULT_LEVELS);
      saveDatabase("warmups", DEFAULT_WARMUP_EXERCISES);
      saveDatabase("scales", DEFAULT_SCALES);
      saveDatabase("rhythms", DEFAULT_RHYTHMS);
      saveDatabase("chords", DEFAULT_CHORDS);
      saveDatabase("songs", DEFAULT_SONGS);
      saveDatabase("badges", DEFAULT_BADGES);
      
      const refreshed = getDatabase();
      setDb(refreshed);
      onDatabaseUpdate();
    }
  };

  // Warmups Add
  const handleAddWarmup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!warmupForm.id || !warmupForm.name) return;

    const newWarmup = {
      ...warmupForm,
      animationSteps: warmupForm.fretPattern.split('-').map(Number).filter(n => !isNaN(n))
    };

    const updated = [...db.warmups, newWarmup];
    saveDatabase("warmups", updated);
    setDb({ ...db, warmups: updated });
    setWarmupForm({ id: '', name: '', fretPattern: '', fingerPattern: '', difficulty: 'Beginner', instructions: '' });
    onDatabaseUpdate();
  };

  const handleDeleteWarmup = (id: string) => {
    const updated = db.warmups.filter(item => item.id !== id);
    saveDatabase("warmups", updated);
    setDb({ ...db, warmups: updated });
    onDatabaseUpdate();
  };

  // Scales Add
  const handleAddScale = (e: React.FormEvent) => {
    e.preventDefault();
    if (!scaleForm.id || !scaleForm.name) return;
    
    // Process notes (comma separated)
    const notesArr = scaleForm.notes.split(',').map(s => s.trim()).filter(Boolean);
    // Process fret positions string 5,3,C;4,2,E etc 
    const fretHighlights = scaleForm.highlights.split(';').map(s => s.trim()).filter(Boolean);

    const newScale = {
      id: scaleForm.id,
      name: scaleForm.name,
      notes: notesArr,
      level: scaleForm.level,
      fretHighlights
    };

    const updated = [...db.scales, newScale];
    saveDatabase("scales", updated);
    setDb({ ...db, scales: updated });
    setScaleForm({ id: '', name: '', notes: '', level: 'Beginner', highlights: '' });
    onDatabaseUpdate();
  };

  const handleDeleteScale = (id: string) => {
    const updated = db.scales.filter(item => item.id !== id);
    saveDatabase("scales", updated);
    setDb({ ...db, scales: updated });
    onDatabaseUpdate();
  };

  // Chords Add
  const handleAddChord = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chordForm.id || !chordForm.name) return;

    // parse raw fingerings: 6,3,3; 5,2,2
    const fingerings = chordForm.stringsRaw.split(';').map(part => {
      const parts = part.split(',').map(Number);
      return {
        string: parts[0],
        fret: parts[1],
        finger: parts[2] || undefined
      };
    }).filter(f => !isNaN(f.string) && !isNaN(f.fret));

    const newChord = {
      id: chordForm.id,
      name: chordForm.name,
      level: chordForm.level,
      fingerings,
      transitionSequence: [chordForm.id, "C", "D", chordForm.id]
    };

    const updated = [...db.chords, newChord];
    saveDatabase("chords", updated);
    setDb({ ...db, chords: updated });
    setChordForm({ id: '', name: '', level: 'Beginner', stringsRaw: '6,3,3;5,2,2;4,0;3,0;2,0;1,3,4' });
    onDatabaseUpdate();
  };

  const handleDeleteChord = (id: string) => {
    const updated = db.chords.filter(item => item.id !== id);
    saveDatabase("chords", updated);
    setDb({ ...db, chords: updated });
    onDatabaseUpdate();
  };

  // Songs Add
  const handleAddSong = (e: React.FormEvent) => {
    e.preventDefault();
    if (!songForm.id || !songForm.name) return;

    const chordsArr = songForm.requiredChords.split(',').map(c => c.trim()).filter(Boolean);

    const newSong = {
      id: songForm.id,
      name: songForm.name,
      artist: songForm.artist || "Unknown Artist",
      difficulty: songForm.difficulty,
      requiredLevel: Number(songForm.requiredLevel),
      requiredChords: chordsArr,
      requiredScales: ["C Major"],
      requiredRhythms: ["quarter_notes"],
      beatsPerMinute: Number(songForm.beatsPerMinute),
      chordsTimeline: chordsArr.map((c, i) => ({ time: i * 4, chord: c })),
      lyrics: [{ time: 0, text: "Begin playing..." }]
    };

    const updated = [...db.songs, newSong];
    saveDatabase("songs", updated);
    setDb({ ...db, songs: updated });
    setSongForm({ id: '', name: '', artist: '', difficulty: 'Beginner', requiredLevel: 1, requiredChords: '', beatsPerMinute: 90 });
    onDatabaseUpdate();
  };

  const handleDeleteSong = (id: string) => {
    const updated = db.songs.filter(item => item.id !== id);
    saveDatabase("songs", updated);
    setDb({ ...db, songs: updated });
    onDatabaseUpdate();
  };

  return (
    <div id="admin-panel" className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl text-slate-100">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 pb-4 border-b border-slate-800">
        <div>
          <h2 className="text-xl font-display font-medium tracking-tight text-amber-400">Cozy Studio Admin Room</h2>
          <p className="text-xs text-slate-400 font-mono mt-1">Live Database Manager • Configured via LocalStorage</p>
        </div>
        
        <button
          onClick={resetAllToDefaults}
          className="flex items-center gap-2 hover:bg-slate-800 text-slate-300 border border-slate-800 rounded-lg px-4 py-2 text-xs font-mono transition-colors"
        >
          <RotateCcw className="w-3.5 h-3.5 text-rose-400" />
          Reset Original DB Seeds
        </button>
      </div>

      {/* Tabs list selector */}
      <div className="flex border-b border-slate-800/60 pb-3 gap-2 overflow-x-auto">
        {(['warmups', 'scales', 'chords', 'songs'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-1.5 text-xs font-mono font-bold uppercase rounded-md tracking-wider transition-all duration-150 ${activeTab === tab ? 'bg-amber-400/10 text-amber-400 border border-amber-400/30 shadow-[0_0_8px_rgba(245,158,11,0.15)]' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'}`}
          >
            {tab} ({tab === 'warmups' ? db.warmups.length : tab === 'scales' ? db.scales.length : tab === 'chords' ? db.chords.length : db.songs.length})
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 pt-6">
        
        {/* Left side: Config Form */}
        <div className="lg:col-span-4 bg-slate-950 p-5 rounded-xl border border-slate-800/80">
          <h3 className="text-sm font-mono font-semibold text-cyan-400 mb-4 tracking-wide uppercase">Add New Db Item</h3>
          
          {activeTab === 'warmups' && (
            <form onSubmit={handleAddWarmup} className="space-y-4">
              <div>
                <label className="block text-[10px] font-mono text-slate-400 mb-1">ID (unique)</label>
                <input type="text" value={warmupForm.id} onChange={e => setWarmupForm({...warmupForm, id: e.target.value})} className="w-full bg-slate-900 border border-slate-800 rounded p-2 text-xs text-white uppercase font-mono" placeholder="spider_alternate" required />
              </div>
              <div>
                <label className="block text-[10px] font-mono text-slate-400 mb-1">Exercise Name</label>
                <input type="text" value={warmupForm.name} onChange={e => setWarmupForm({...warmupForm, name: e.target.value})} className="w-full bg-slate-900 border border-slate-800 rounded p-2 text-xs text-white" placeholder="Fret Stretches" required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-mono text-slate-400 mb-1">Fret pattern</label>
                  <input type="text" value={warmupForm.fretPattern} onChange={e => setWarmupForm({...warmupForm, fretPattern: e.target.value})} className="w-full bg-slate-900 border border-slate-800 rounded p-2 text-xs text-white font-mono" placeholder="1-3-2-4" required />
                </div>
                <div>
                  <label className="block text-[10px] font-mono text-slate-400 mb-1">Finger pattern</label>
                  <input type="text" value={warmupForm.fingerPattern} onChange={e => setWarmupForm({...warmupForm, fingerPattern: e.target.value})} className="w-full bg-slate-900 border border-slate-800 rounded p-2 text-xs text-white font-mono" placeholder="1-3-2-4" required />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-mono text-slate-400 mb-1">Difficulty</label>
                <select value={warmupForm.difficulty} onChange={e => setWarmupForm({...warmupForm, difficulty: e.target.value as any})} className="w-full bg-slate-900 border border-slate-800 rounded p-2 text-xs text-white">
                  <option value="Beginner">Beginner</option>
                  <option value="Intermediate">Intermediate</option>
                  <option value="Advanced">Advanced</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-mono text-slate-400 mb-1">Instructions / Description</label>
                <textarea value={warmupForm.instructions} onChange={e => setWarmupForm({...warmupForm, instructions: e.target.value})} className="w-full bg-slate-900 border border-slate-800 rounded p-2 text-xs text-white h-20" placeholder="Alternating frets index to ring..." required />
              </div>
              <button type="submit" className="w-full bg-amber-500 text-black py-2 rounded font-mono text-xs font-bold hover:bg-amber-400 flex items-center justify-center gap-1 transition-colors">
                <Plus className="w-3.5 h-3.5 stroke-[3px]" /> Save to DB
              </button>
            </form>
          )}

          {activeTab === 'scales' && (
            <form onSubmit={handleAddScale} className="space-y-4">
              <div>
                <label className="block text-[10px] font-mono text-slate-400 mb-1">ID (unique)</label>
                <input type="text" value={scaleForm.id} onChange={e => setScaleForm({...scaleForm, id: e.target.value})} className="w-full bg-slate-900 border border-slate-800 rounded p-2 text-xs text-white uppercase font-mono" placeholder="c_pentatonic" required />
              </div>
              <div>
                <label className="block text-[10px] font-mono text-slate-400 mb-1">Scale Name</label>
                <input type="text" value={scaleForm.name} onChange={e => setScaleForm({...scaleForm, name: e.target.value})} className="w-full bg-slate-900 border border-slate-800 rounded p-2 text-xs text-white" placeholder="C Pentatonic Major" required />
              </div>
              <div>
                <label className="block text-[10px] font-mono text-slate-400 mb-1">Notes (comma sep)</label>
                <input type="text" value={scaleForm.notes} onChange={e => setScaleForm({...scaleForm, notes: e.target.value})} className="w-full bg-slate-900 border border-slate-800 rounded p-2 text-xs text-white font-mono" placeholder="C, D, E, G, A" required />
              </div>
              <div>
                <label className="block text-[10px] font-mono text-slate-400 mb-1">Level Grouping</label>
                <select value={scaleForm.level} onChange={e => setScaleForm({...scaleForm, level: e.target.value as any})} className="w-full bg-slate-900 border border-slate-800 rounded p-2 text-xs text-white">
                  <option value="Beginner">Beginner</option>
                  <option value="Intermediate">Intermediate</option>
                  <option value="Advanced">Advanced</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-mono text-slate-400 mb-1">Fret Highlights (format e.g. "5,3,C;4,2,E")</label>
                <textarea value={scaleForm.highlights} onChange={e => setScaleForm({...scaleForm, highlights: e.target.value})} className="w-full bg-slate-900 border border-slate-800 rounded p-2 text-xs text-white font-mono h-24" placeholder="5,3,C;4,2,E;4,3,F;3,0,G" required />
              </div>
              <button type="submit" className="w-full bg-amber-500 text-black py-2 rounded font-mono text-xs font-bold hover:bg-amber-400 flex items-center justify-center gap-1 transition-colors">
                <Plus className="w-3.5 h-3.5 stroke-[3px]" /> Save to DB
              </button>
            </form>
          )}

          {activeTab === 'chords' && (
            <form onSubmit={handleAddChord} className="space-y-4">
              <div>
                 <label className="block text-[10px] font-mono text-slate-400 mb-1">ID / Core Label</label>
                 <input type="text" value={chordForm.id} onChange={e => setChordForm({...chordForm, id: e.target.value})} className="w-full bg-slate-900 border border-slate-800 rounded p-2 text-xs text-white uppercase font-mono" placeholder="E" required />
              </div>
              <div>
                 <label className="block text-[10px] font-mono text-slate-400 mb-1">Chord Name</label>
                 <input type="text" value={chordForm.name} onChange={e => setChordForm({...chordForm, name: e.target.value})} className="w-full bg-slate-900 border border-slate-800 rounded p-2 text-xs text-white" placeholder="E Major" required />
              </div>
              <div>
                 <label className="block text-[10px] font-mono text-slate-400 mb-1">Level Group</label>
                 <select value={chordForm.level} onChange={e => setChordForm({...chordForm, level: e.target.value as any})} className="w-full bg-slate-900 border border-slate-800 rounded p-2 text-xs text-white">
                   <option value="Beginner">Beginner</option>
                   <option value="Intermediate">Intermediate</option>
                   <option value="Advanced">Advanced</option>
                 </select>
              </div>
              <div>
                 <label className="block text-[10px] font-mono text-slate-400 mb-1">Fingerings (low E string=6, high E string=1. split strings by semicolon)</label>
                 <textarea value={chordForm.stringsRaw} onChange={e => setChordForm({...chordForm, stringsRaw: e.target.value})} className="w-full bg-slate-900 border border-slate-800 rounded p-2 text-xs text-white font-mono h-24" placeholder="6,0;5,2,2;4,2,3;3,1,1;2,0;1,0" required />
              </div>
              <button type="submit" className="w-full bg-amber-500 text-black py-2 rounded font-mono text-xs font-bold hover:bg-amber-400 flex items-center justify-center gap-1 transition-colors">
                <Plus className="w-3.5 h-3.5 stroke-[3px]" /> Save to DB
              </button>
            </form>
          )}

          {activeTab === 'songs' && (
            <form onSubmit={handleAddSong} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-mono text-slate-400 mb-1">ID (unique)</label>
                  <input type="text" value={songForm.id} onChange={e => setSongForm({...songForm, id: e.target.value})} className="w-full bg-slate-900 border border-slate-800 rounded p-2 text-xs text-white font-mono uppercase" placeholder="oasis_wonder" required />
                </div>
                <div>
                  <label className="block text-[10px] font-mono text-slate-400 mb-1">Song Name</label>
                  <input type="text" value={songForm.name} onChange={e => setSongForm({...songForm, name: e.target.value})} className="w-full bg-slate-900 border border-slate-800 rounded p-2 text-xs text-white" placeholder="Fly Away" required />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-mono text-slate-400 mb-1">Artist</label>
                <input type="text" value={songForm.artist} onChange={e => setSongForm({...songForm, artist: e.target.value})} className="w-full bg-slate-900 border border-slate-800 rounded p-2 text-xs text-white" placeholder="Lenny Kravitz" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-mono text-slate-400 mb-1">Level Unlocked</label>
                  <input type="number" min={1} max={7} value={songForm.requiredLevel} onChange={e => setSongForm({...songForm, requiredLevel: Number(e.target.value)})} className="w-full bg-slate-900 border border-slate-800 rounded p-2 text-xs text-white font-mono" />
                </div>
                <div>
                  <label className="block text-[10px] font-mono text-slate-400 mb-1">Beats Per Minute</label>
                  <input type="number" min={40} max={240} value={songForm.beatsPerMinute} onChange={e => setSongForm({...songForm, beatsPerMinute: Number(e.target.value)})} className="w-full bg-slate-900 border border-slate-800 rounded p-2 text-xs text-white font-mono" />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-mono text-slate-400 mb-1">Difficulty</label>
                <select value={songForm.difficulty} onChange={e => setSongForm({...songForm, difficulty: e.target.value as any})} className="w-full bg-slate-900 border border-slate-800 rounded p-2 text-xs text-white">
                  <option value="Beginner">Beginner</option>
                  <option value="Intermediate">Intermediate</option>
                  <option value="Advanced">Advanced</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-mono text-slate-400 mb-1">Required Chords (comma sep)</label>
                <input type="text" value={songForm.requiredChords} onChange={e => setSongForm({...songForm, requiredChords: e.target.value})} className="w-full bg-slate-900 border border-slate-800 rounded p-2 text-xs text-white uppercase" placeholder="G, C, D" required />
              </div>
              <button type="submit" className="w-full bg-amber-500 text-black py-2 rounded font-mono text-xs font-bold hover:bg-amber-400 flex items-center justify-center gap-1 transition-colors">
                <Plus className="w-3.5 h-3.5 stroke-[3px]" /> Save to DB
              </button>
            </form>
          )}

        </div>

        {/* Right side: Database List View */}
        <div className="lg:col-span-8 bg-slate-950 p-5 rounded-xl border border-slate-800 flex flex-col h-[460px] overflow-y-auto">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider">Active JSON Records</h3>
            <span className="text-[10px] font-mono text-indigo-400 bg-indigo-950 border border-indigo-900/60 rounded px-2 py-0.5">DB Sync Active</span>
          </div>

          <div className="space-y-3.5 flex-1 select-text">
            {activeTab === 'warmups' && db.warmups.map((w) => (
              <div key={w.id} className="flex justify-between items-start bg-slate-900 border border-slate-800/80 p-3 rounded-lg hover:border-slate-700 transition-all">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold bg-slate-950 border border-slate-800 text-amber-500 px-2 py-0.5 rounded">{w.id}</span>
                    <span className="text-sm font-semibold text-slate-200">{w.name}</span>
                  </div>
                  <p className="text-xs text-slate-400 font-mono mt-1 font-semibold">Fret Fretpattern: {w.fretPattern} • Fingers: {w.fingerPattern} • <span className="text-cyan-400">{w.difficulty}</span></p>
                  <p className="text-xs text-slate-500 italic truncate max-w-md">{w.instructions}</p>
                </div>
                <button onClick={() => handleDeleteWarmup(w.id)} className="p-1.5 hover:bg-rose-950/40 border border-transparent hover:border-rose-900/40 rounded transition-colors text-rose-400" title="Delete record"><Trash2 className="w-4 h-4" /></button>
              </div>
            ))}

            {activeTab === 'scales' && db.scales.map((s) => (
              <div key={s.id} className="flex justify-between items-start bg-slate-900 border border-slate-800/80 p-3 rounded-lg hover:border-slate-700 transition-all">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold bg-slate-950 border border-slate-800 text-cyan-400 px-2 py-0.5 rounded">{s.id}</span>
                    <span className="text-sm font-semibold text-slate-200">{s.name}</span>
                  </div>
                  <p className="text-xs text-slate-400 font-mono font-bold">Notes: {s.notes.join(', ')} • Difficulty: {s.level}</p>
                  <p className="text-[10px] text-slate-500 max-w-md font-mono line-clamp-1">Highlights: {s.fretHighlights.join('; ')}</p>
                </div>
                <button onClick={() => handleDeleteScale(s.id)} className="p-1.5 hover:bg-rose-950/40 border border-transparent hover:border-rose-900/40 rounded transition-colors text-rose-400" title="Delete record"><Trash2 className="w-4 h-4" /></button>
              </div>
            ))}

            {activeTab === 'chords' && db.chords.map((ch) => (
              <div key={ch.id} className="flex justify-between items-start bg-slate-900 border border-slate-800/80 p-3 rounded-lg hover:border-slate-700 transition-all">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold bg-slate-950 border border-slate-800 text-teal-400 px-2.5 py-0.5 rounded">{ch.id}</span>
                    <span className="text-sm font-semibold text-slate-200">{ch.name}</span>
                  </div>
                  <p className="text-xs text-slate-400 font-mono">Difficulty: {ch.level}</p>
                  <p className="text-[10px] text-slate-500 font-mono">Fingerings: {JSON.stringify(ch.fingerings)}</p>
                </div>
                <button onClick={() => handleDeleteChord(ch.id)} className="p-1.5 hover:bg-rose-950/40 border border-transparent hover:border-rose-900/40 rounded transition-colors text-rose-400" title="Delete record"><Trash2 className="w-4 h-4" /></button>
              </div>
            ))}

            {activeTab === 'songs' && db.songs.map((sn) => (
              <div key={sn.id} className="flex justify-between items-start bg-slate-900 border border-slate-800/80 p-3 rounded-lg hover:border-slate-700 transition-all">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold bg-slate-950 border border-slate-800 text-fuchsia-400 px-2 py-0.5 rounded">{sn.id}</span>
                    <span className="text-sm font-semibold text-slate-200">{sn.name} ({sn.artist})</span>
                  </div>
                  <p className="text-xs text-slate-400 font-mono">Level Req: {sn.requiredLevel} • Chords: {sn.requiredChords.join(', ')} • Tempo: {sn.beatsPerMinute} BPM</p>
                  <p className="text-xs text-slate-500 italic line-clamp-1">{sn.difficulty} Song</p>
                </div>
                <button onClick={() => handleDeleteSong(sn.id)} className="p-1.5 hover:bg-rose-950/40 border border-transparent hover:border-rose-900/40 rounded transition-colors text-rose-400" title="Delete record"><Trash2 className="w-4 h-4" /></button>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
