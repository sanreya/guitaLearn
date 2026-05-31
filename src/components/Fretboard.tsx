/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion } from 'motion/react';

interface FretboardProps {
  // Array of format "string,fret,label" or object format, string ranges 1-6 (1=high E, 6=low E), fret ranges 0-12
  highlights: { string: number; fret: number; label?: string; color?: string }[];
  playedNote?: string;
  expectedNote?: string;
  accuracy?: number;
}

const TUNINGS = ["E", "B", "G", "D", "A", "E"]; // high E (1) to low E (6)

export default function Fretboard({ highlights, playedNote, expectedNote, accuracy }: FretboardProps) {
  // String indices correspond to 1 (high E) to 6 (low E)
  const stringsArr = [1, 2, 3, 4, 5, 6];
  const fretsArr = Array.from({ length: 13 }, (_, i) => i); // 0 (open) to 12

  // Match highlight helper
  const getHighlightForPosition = (stringNum: number, fretNum: number) => {
    return highlights.find(h => h.string === stringNum && h.fret === fretNum);
  };

  return (
    <div id="fretboard-canvas" className="w-full bg-slate-950 border border-slate-800 rounded-xl p-6 shadow-2xl relative overflow-hidden my-4 select-none">
      {/* Wooden / Graphite Fretboard Texture and Nut */}
      <div className="absolute top-0 bottom-0 left-0 right-0 opacity-15 bg-radial from-slate-800 to-black pointer-events-none" />
      
      {/* Diagnostic tuner feedback in upper corner */}
      <div className="flex justify-between items-center mb-4 border-b border-slate-800/60 pb-3">
        <div className="flex items-center gap-3">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
          <span className="text-xs font-mono tracking-wider text-slate-400">STUDIO-TUNER FEEDBACK:</span>
        </div>
        
        <div className="flex items-center gap-4">
          {expectedNote && (
            <div className="text-xs font-mono">
              <span className="text-slate-500">EXPECTED: </span>
              <span className="text-amber-400 font-bold">{expectedNote}</span>
            </div>
          )}
          {playedNote && (
            <div className="text-xs font-mono">
              <span className="text-slate-500">PLAYED: </span>
              <span className={`font-bold ${playedNote === expectedNote ? 'text-emerald-400' : 'text-cyan-400'}`}>
                {playedNote}
              </span>
            </div>
          )}
          {accuracy !== undefined && accuracy > 0 && (
            <div className="text-xs font-mono bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
              <span className="text-slate-500">ACCURACY: </span>
              <span className={`${accuracy >= 80 ? 'text-emerald-400' : 'text-amber-400'} font-bold`}>
                {accuracy}%
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Main interactive neck map */}
      <div className="relative overflow-x-auto overflow-y-hidden pb-2 pt-2 scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent">
        <div className="min-w-[800px] relative h-64 flex flex-col justify-between pr-4">
          
          {/* Natural neck dots markers on standard frets 3, 5, 7, 9, 12 */}
          <div className="absolute inset-0 pointer-events-none flex flex-row">
            {fretsArr.map((fret) => {
              const isDot = [3, 5, 7, 9].includes(fret);
              const isDoubleDot = fret === 12;
              return (
                <div 
                  key={`dot-${fret}`} 
                  className="flex-1 relative flex items-center justify-center border-r border-slate-800/30"
                >
                  {isDot && (
                    <div className="w-3.5 h-3.5 rounded-full bg-slate-800/80 shadow-inner mt-2" />
                  )}
                  {isDoubleDot && (
                    <div className="flex flex-col gap-8 justify-center items-center mt-2">
                      <div className="w-3.5 h-3.5 rounded-full bg-slate-800/80 shadow-inner" />
                      <div className="w-3.5 h-3.5 rounded-full bg-slate-800/80 shadow-inner" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Fret division wires */}
          <div className="absolute inset-0 pointer-events-none flex flex-row">
            {fretsArr.map((fret) => (
              <div 
                key={`wire-${fret}`} 
                className={`flex-1 h-full border-r ${fret === 0 ? 'border-r-[10px] border-amber-500/60' : 'border-r-2 border-slate-700/80 shadow-[1px_0_2px_rgba(0,0,0,0.8)]'}`}
              />
            ))}
          </div>

          {/* Render individual guitar strings */}
          <div className="absolute inset-0 pointer-events-none flex flex-col justify-between py-2">
            {stringsArr.map((stringNum) => {
              // low strings (higher stringNum) are thicker
              const thickness = Math.max(1, (7 - stringNum) * 0.85);
              return (
                <div 
                  key={`string-line-${stringNum}`} 
                  style={{ height: `${thickness}px` }}
                  className="w-full bg-gradient-to-r from-slate-400 via-slate-200 to-slate-400 shadow-sm opacity-90"
                />
              );
            })}
          </div>

          {/* Interactive note nodes layer */}
          <div className="relative z-10 w-full h-full flex flex-col justify-between py-2">
            {stringsArr.map((stringNum) => {
              return (
                <div key={`string-row-${stringNum}`} className="h-8 flex flex-row items-center w-full relative">
                  
                  {/* String tuning head guide */}
                  <div className="absolute -left-5 w-6 flex items-center justify-center font-mono text-xs font-bold text-slate-500 bg-slate-900 border border-slate-800 rounded-sm py-0.5 z-20">
                    {TUNINGS[stringNum - 1]}
                  </div>

                  {/* Individual fret columns */}
                  {fretsArr.map((fretNum) => {
                    const highlight = getHighlightForPosition(stringNum, fretNum);
                    
                    return (
                      <div 
                        key={`cell-${stringNum}-${fretNum}`} 
                        className="flex-1 h-full flex items-center justify-center relative"
                      >
                        {highlight ? (
                          <motion.div
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ type: "spring", stiffness: 400, damping: 25 }}
                            className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-mono font-bold text-black shadow-lg shadow-cyan-500/10 cursor-pointer z-20 relative`}
                            style={{ 
                              background: highlight.color || 'linear-gradient(135deg, #22D3EE 0%, #0891B2 100%)', 
                              boxShadow: `0 0 12px ${highlight.color || '#22D3EE'}` 
                            }}
                          >
                            <span>{highlight.label || fretNum}</span>
                            
                            {/* Inner core pulse */}
                            <div className="absolute inset-0.5 rounded-full border border-white/60 pointer-events-none" />
                          </motion.div>
                        ) : (
                          // Hover interaction node (can tap on string to play synth!)
                          <div 
                            onClick={() => {
                              // Play corresponding tuning pitch
                              const baseFreqs = [329.63, 246.94, 196.00, 146.83, 110.00, 82.41]; // E4, B3, G3, D3, A2, E2
                              const base = baseFreqs[stringNum - 1];
                              // freq increases by 2^(fret/12)
                              const computedFreq = base * Math.pow(2, fretNum / 12);
                              import('../audioEngine').then(({ audioEngine }) => {
                                audioEngine.playGuitarPluck(computedFreq, 'physics');
                              });
                            }}
                            className="w-4 h-4 rounded-full bg-slate-900/10 hover:bg-amber-400/35 transition-colors border border-transparent hover:border-amber-400/50 hover:shadow-cyan-400/10 cursor-pointer z-15"
                            title={`Play String ${stringNum} Fret ${fretNum}`}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>

        </div>
      </div>

      {/* Fret numbers markers at the bottom */}
      <div className="flex border-t border-slate-800/40 pt-2 font-mono text-[9px] text-slate-500">
        <div className="w-6" /> {/* Tuning offset spacer */}
        <div className="flex-1 flex justify-between pr-4">
          {fretsArr.map((fret) => (
            <div key={`num-${fret}`} className="flex-1 text-center font-bold">
              {fret === 0 ? "Nut" : `Fret ${fret}`}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
