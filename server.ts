/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Lazy-evaluation of Gemini API
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "MY_GEMINI_API_KEY" || apiKey.trim() === "") {
    return null;
  }
  if (!aiClient) {
    aiClient = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiClient;
}

// AI Route for customized coaching suggestions
app.post("/api/gemini/tips", async (req, res) => {
  const { levelName, completedSessions, streak, skills } = req.body;
  const client = getGeminiClient();

  const prompt = `Define highly tactical acoustic and electrical guitar practice tips for a student on level "${levelName}".
Stats: Streak is ${streak} days, completed ${completedSessions || 0} routines.
Skill scores:
- Scales: ${skills?.scales ?? 50}%
- Rhythm: ${skills?.rhythm ?? 50}%
- Chords: ${skills?.chords ?? 50}%
- Ear: ${skills?.ear ?? 50}%
- Songs: ${skills?.songs ?? 50}%

Return a strictly formatted JSON array containing exactly 3 customized advice points.
Each advice point must contain:
1. "category": one of "Scales", "Rhythm", "Chords", "Ear", "Songs", "Posture"
2. "title": descriptive 4-6 word title
3. "detail": 1-2 practical, actionable diagnostic sentences.
Do not wrap in markdown tags or extra descriptors, just the pristine pure JSON string array.`;

  if (!client) {
    // Elegant standard simulated fallback responses when API Key is pending entry
    const simulatedResponse = [
      {
        category: "Chords",
        title: "Clean standard finger placement",
        detail: "Focus on curling your joints higher on C Major to allow the open strings under it to ring out without unwanted buzz."
      },
      {
        category: "Rhythm",
        title: "Avoid rushing downstrokes",
        detail: "Practice your 1 & 2 & 3 & 4 & sequence with a physical tap of your heel. Anchor your forearm comfortably."
      },
      {
        category: "Scales",
        title: "Thumb placement consistency",
        detail: "Draw your thumb down slightly on the middle of the back of the neck during complex pentatonic climbs for massive horizontal reach."
      }
    ];
    return res.json({ source: "simulator", tips: simulatedResponse });
  }

  try {
    const response = await client.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json"
      }
    });

    const rawText = response.text || "";
    try {
      const parsedTips = JSON.parse(rawText.trim());
      return res.json({ source: "gemini", tips: parsedTips });
    } catch {
      // Clean extracted array fallback in case model omitted pure JSON
      const regex = /\[\s*{[\s\S]*}\s*\]/g;
      const matched = rawText.match(regex);
      if (matched) {
        return res.json({ source: "gemini-regex", tips: JSON.parse(matched[0]) });
      }
      throw new Error("Failed to parse pure JSON response");
    }
  } catch (err: any) {
    console.error("Gemini API Error:", err.message);
    res.status(500).json({ error: "Gemini calculation failed", details: err.message });
  }
});

// AI Route for generating custom backing tracks, chord progressions, or custom riffs
app.post("/api/gemini/generate-song", async (req, res) => {
  const { title, difficulty, availableChords } = req.body;
  const client = getGeminiClient();

  const prompt = `Create a brand new short guitar riff and lyric snippet for sheet training.
Title idea: "${title || "Desert Solitude"}"
Difficulty level: ${difficulty || "Beginner"}
Chords to utilize: ${JSON.stringify(availableChords || ["G", "C", "D"])}

Provide output as a structured JSON object:
{
  "title": "...",
  "chordSequence": "G - D - Em - C",
  "tabSnippet": "e|---3---2---0---0---\\nB|---3---3---0---1---\\nG|---0---2---0---0---",
  "coachingPointers": "Warm, reassuring advice about shifting fingers cleanly."
}
Return ONLY valid JSON.`;

  if (!client) {
    const backupRiff = {
      title: title || "Sunrise Drive",
      chordSequence: "G - C - D - G",
      tabSnippet: "e|-------3-------0-------2-------3---|\nB|-------3-------1-------3-------3---|\nG|-------0-------0-------2-------0---|\nD|-------0-------2-------0-------0---|\nA|-------2-------3-------x-------2---|\nE|-------3-------x-------x-------3---|",
      coachingPointers: "Position your third finger securely on the third fret of the high E string. Anchor your index on the second string for standard transition."
    };
    return res.json({ source: "simulator", riff: backupRiff });
  }

  try {
    const response = await client.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json"
      }
    });
    return res.json({ source: "gemini", riff: JSON.parse(response.text.trim()) });
  } catch (err: any) {
    console.error("Gemini Song Generation Error:", err.message);
    res.status(500).json({ error: "Song generator failed", details: err.message });
  }
});

// Boot logic
async function bootstrap() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server started on http://0.0.0.0:${PORT}`);
  });
}

bootstrap();
