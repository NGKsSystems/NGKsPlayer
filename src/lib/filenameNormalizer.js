/**
 * NGKsSystems
 * NGKsPlayer
 *
 * Module: filenameNormalizer.js
 * Purpose: TODO – describe responsibility
 *
 * Design Rules:
 * - Modular, reusable, no duplicated logic
 * - Shared core preferred over copy-paste
 *
 * Owner: NGKsSystems
 */
// NGKsPlayer — Filename Normalizer (Artist - Title.ext)
// Hybrid approach: regex first, optional tag read, OpenRouter fallback.
// Node/Electron main-process safe. Requires Node 18+ (fetch) or polyfill.

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as mm from "music-metadata"; // npm i music-metadata

const AUDIO_EXTS = new Set([
  ".mp3",".flac",".m4a",".aac",".ogg",".wav",".wma",".opus",".mp4"
]);

// Known band names that start with numbers or might be misinterpreted
const KNOWN_BAND_NAMES = new Set([
  "38 Special", "3 Doors Down", "3 Days Grace", "10 Years", "30 Seconds to Mars",
  "10,000 Maniacs", "50 Cent", "2Pac", "2 Live Crew", "311", "21 Pilots",
  "3OH!3", "5 Finger Death Punch", "5FDP", "7 Mary 3", "12 Stones",
  "16 Horsepower", "24kGoldn", "36 Crazyfists", "3rd Strike", "4 Non Blondes",
  "6 Underground", "7 Seconds", "8Ball & MJG", "9 Inch Nails", "1 Republic",
  "AC/DC"
]);

// Band name variations that should be auto-corrected
const BAND_NAME_CORRECTIONS = {
  // AC/DC variations - all should become "AC-DC" (AC/DC is illegal filename)
  "AC/DC": "AC-DC",
  "AC~DC": "AC-DC", 
  "AC_DC": "AC-DC",
  "ACDC": "AC-DC",
  "AC DC": "AC-DC",
  "AC.DC": "AC-DC",
  "AC*DC": "AC-DC",
  
  // 38 Special variations
  "Special": "38 Special",
  ".38 Special": "38 Special",
  "38Special": "38 Special",
  "Thirty Eight Special": "38 Special"
};

const DASH_RE = /\s+[\-–—]\s+/;
const TRACKNUM_RE = /^\s*(?:disc\s*\d+\s*[-_. ]*)?(?:cd\s*\d+\s*[-_. ]*)?(?:\d{1,2}|[A-Za-z]\d)\s*[-_. ]+/i;
const NOISE_RE = new RegExp([
  String.raw`\[(?:[^\]]+)\]`,                    // [Official], [HD], [Lyrics], [320kbps]
  String.raw`\((?:[^)]+)\)`,                     // (Remastered), (Live), (Official Video), (Extended Mix)
  String.raw`\{(?:[^}]+)\}`,                     // {High Quality}
  String.raw`\b(?:official|lyrics?|audio|video|mv|hd|uhd|4k)\b`,
  String.raw`\b(?:remaster(?:ed)?|visualizer|live|cover|clean|dirty|explicit)\b`,
  String.raw`\b(?:radio edit|320kbps|128kbps|hq|prod\.?.*|mix|rip)\b`,
  String.raw`\b(?:extended|acoustic|unplugged|remix)\b`,
  String.raw`https?://\S+`,
].join("|"), "gi");

function cleanNoise(s) {
  // Remove underscores and replace with spaces
  let cleaned = s.replaceAll("_", " ");
  
  // Remove noise patterns
  cleaned = cleaned.replace(NOISE_RE, " ");
  
  // Fix multiple dashes - convert "Another - Brick - in - the - Wall" to "Another Brick in the Wall"
  cleaned = cleaned.replace(/\s*[-–—]\s*/g, " - ").replace(/(\s-\s){2,}/g, " ");
  
  // Clean up extra spaces
  cleaned = cleaned.replace(/\s+/g, " ");
  
  // Remove leading/trailing punctuation and spaces
  cleaned = cleaned.replace(/^[.\s\-_]+|[.\s\-_]+$/g, "");
  
  return cleaned.trim();
}

function alreadyNormalized(stem) {
  // MAXIMUM DETECTION MODE - Flag absolutely everything for processing
  console.log(`🔍 CHECKING: "${stem}"`);
  console.log(`❌ FLAGGED: Maximum detection mode - flagging all files`);
  return false; // Flag every single file
}

function sanitize(s) {
  // Remove illegal characters
  let cleaned = s
    .replaceAll("/", "-").replaceAll("\\", "-")
    .replaceAll(":", "").replaceAll("|", "")
    .replaceAll("*", "").replaceAll("?", "")
    .replaceAll("<", "").replaceAll(">", "")
    .replaceAll('"', "'");
  
  // Apply proper title case
  cleaned = toTitleCase(cleaned);
  
  return cleaned.trim();
}

function toTitleCase(str) {
  // Words that should stay lowercase (unless at start)
  const lowerWords = ['a', 'an', 'and', 'as', 'at', 'but', 'by', 'for', 'if', 'in', 
                     'nor', 'of', 'on', 'or', 'so', 'the', 'to', 'up', 'yet', 'with'];
  
  // First, handle special band name patterns before general title case
  let result = str;
  
  // Handle AC/DC and AC-DC variants (case insensitive)
  result = result.replace(/\b(ac[\s\-\/]*dc)\b/gi, 'AC-DC');
  
  // Handle other special cases
  const specialWords = {
    'usa': 'USA',
    'uk': 'UK', 
    'dj': 'DJ',
    'mc': 'MC',
    'tv': 'TV',
    'pc': 'PC',
    'ai': 'AI'
  };
  
  // Apply general title case
  result = result.toLowerCase().replace(/\b\w+/g, (word, index) => {
    // Check special words
    const lower = word.toLowerCase();
    if (specialWords[lower]) return specialWords[lower];
    
    // First word is always capitalized
    if (index === 0) return word.charAt(0).toUpperCase() + word.slice(1);
    
    // Check if it should stay lowercase
    if (lowerWords.includes(lower)) return word.toLowerCase();
    
    // Regular title case
    return word.charAt(0).toUpperCase() + word.slice(1);
  });
  
  return result;
}

function tidyFeat(s) {
  return s.replace(/\b(?:feat|featuring|ft|with)\b\.?\s*/gi, "feat. ");
}

function normalizeBandName(name, bandExceptions = null) {
  // Use database exceptions if provided, fallback to hardcoded ones
  if (bandExceptions) {
    for (const exception of bandExceptions) {
      if (name.toUpperCase() === exception.variant.toUpperCase()) {
        return exception.correct_name;
      }
    }
  } else {
    // Fallback to hardcoded corrections
    const upperName = name.toUpperCase();
    for (const [variant, correct] of Object.entries(BAND_NAME_CORRECTIONS)) {
      if (upperName === variant.toUpperCase()) {
        return correct;
      }
    }
  }
  
  // Special handling for AC/DC variants - remove all non-letter chars and check
  const cleanName = name.replace(/[^a-zA-Z]/g, '').toUpperCase();
  if (cleanName === 'ACDC') {
    return "AC-DC";
  }
  
  return name; // Return original if no correction needed
}

function normalizeParts(artist, title, bandExceptions = null) {
  const normalizedArtist = normalizeBandName(artist, bandExceptions);
  return {
    artist: tidyFeat(sanitize(normalizedArtist)),
    title: sanitize(title)
  };
}

// Export the main functions needed by the main process
export { normalizeParts, normalizeBandName };

// Calculate statistics for normalization plans
export function calculateStats(plans) {
  const stats = {
    total: plans.length,
    toRename: 0,
    skipped: 0,
    errors: 0,
    skipReasons: {},
    // AI-related stats expected by the UI
    aiSuccessRate: 0,
    aiRetryRate: 0,
    methodSuccessRates: {
      ai: {
        attempted: 0,
        succeeded: 0
      },
      tags: {
        attempted: 0,
        succeeded: 0
      },
      regex: {
        attempted: 0,
        succeeded: 0
      }
    },
    methodBreakdown: {
      ai: 0,
      tags: 0,
      regex: 0,
      mixed: 0
    }
  };

  for (const plan of plans) {
    if (plan.status === 'plan') {
      stats.toRename++;
      // For now, assume regex-based parsing since we're not using AI in basic version
      stats.methodBreakdown.regex++;
      stats.methodSuccessRates.regex.attempted++;
      stats.methodSuccessRates.regex.succeeded++;
    } else if (plan.status === 'skip') {
      stats.skipped++;
      const reason = plan.reason || 'unknown';
      stats.skipReasons[reason] = (stats.skipReasons[reason] || 0) + 1;
    } else if (plan.status === 'error') {
      stats.errors++;
    }
  }

  return stats;
}

// Determine if parts should be flipped from "Title - Artist" to "Artist - Title"
function shouldFlipParts(part1, part2) {
  // DISABLED: The flip logic was causing too many false positives
  // Files should already be in "Artist - Title" format or close to it
  // Manual correction via AI is better than aggressive auto-flipping
  
  // Only flip in very obvious cases where part2 is clearly a well-known artist
  // and part1 is clearly a song title
  
  // Check for extremely obvious artist names in part2
  const obviousArtists = [
    "Led Zeppelin", "Pink Floyd", "The Beatles", "Queen", "AC-DC", "AC/DC",
    "Rolling Stones", "The Rolling Stones", "Bob Dylan", "Elvis Presley",
    "Michael Jackson", "Madonna", "Prince", "David Bowie", "The Who"
  ];
  
  if (obviousArtists.some(artist => part2.toLowerCase().includes(artist.toLowerCase()))) {
    // And part1 looks like a song title
    if (part1.length < 50 && !/\b(?:the|and|band|group)\b/i.test(part1)) {
      return true;
    }
  }
  
  return false; // Default to NOT flipping
}

// Basic file processing function
async function planForFile(filePath, opts = {}) {
  const base = path.basename(filePath);
  const ext = path.extname(filePath).toLowerCase();
  
  console.log(`📋 PLANNING FILE: "${base}"`);
  
  if (!AUDIO_EXTS.has(ext)) {
    console.log(`⚠️ SKIP: Not audio file`);
    return { status: "skip", reason: "not_audio", file: base, srcPath: filePath };
  }

  const stem = path.basename(filePath, ext);
  
  // Check if already normalized (now much more conservative)
  if (alreadyNormalized(stem)) {
    console.log(`⚠️ SKIP: Already normalized`);
    return { status: "skip", reason: "already_normalized", file: base, srcPath: filePath };
  }

  // Try to extract artist and title
  let artist = "", title = "";
  let method = "regex";
  
  // 1) Try regex parsing first
  const cleaned = cleanNoise(stem.replace(TRACKNUM_RE, ""));
  const dashMatch = cleaned.match(DASH_RE);
  
  if (dashMatch) {
    const parts = cleaned.split(DASH_RE, 2);
    if (parts.length === 2) {
      let part1 = parts[0].trim();
      let part2 = parts[1].trim();
      
      // Check if we should flip "Title - Artist" to "Artist - Title"
      if (opts.flipIfTitleDashArtist && shouldFlipParts(part1, part2)) {
        artist = part2;
        title = part1;
      } else {
        artist = part1;
        title = part2;
      }
      method = "regex";
    }
  }

  // 2) If regex failed or AI is explicitly requested, try AI parsing
  if ((!artist || !title) && opts.useAI && opts.openRouterApiKey) {
    console.log(`🤖 AI PARSING ATTEMPT:
      Original filename: "${stem}"
      Cleaned: "${cleaned}"
      Regex found dash: ${!!dashMatch}
      Reason: ${!artist || !title ? 'Regex failed to parse' : 'AI explicitly requested'}`);
    
    try {
      const aiResult = await parseWithAI(stem, { 
        openRouterApiKey: opts.openRouterApiKey,
        bandExceptions: opts.bandExceptions 
      });
      
      if (aiResult && aiResult.includes(' - ')) {
        const aiParts = aiResult.split(' - ', 2);
        if (aiParts.length === 2) {
          artist = aiParts[0].trim();
          title = aiParts[1].trim();
          method = "ai";
          console.log(`✅ AI PARSING SUCCESS: "${artist}" - "${title}"`);
        }
      } else {
        console.log(`❌ AI PARSING FAILED: No valid "Artist - Title" format in response: "${aiResult}"`);
      }
    } catch (error) {
      console.error('❌ AI parsing failed:', error.message);
      // Continue with regex result or fail
    }
  }

  console.log(`🔍 After parsing: artist="${artist}", title="${title}", method="${method}"`);

  if (!artist || !title) {
    console.log(`❌ SKIP: Can't parse - missing artist or title`);
    return { status: "skip", reason: "cant_parse", file: base, srcPath: filePath, method };
  }

  // Apply band name normalization
  const normalizedParts = normalizeParts(artist, title, opts.bandExceptions);
  const toName = `${normalizedParts.artist} - ${normalizedParts.title}${ext}`;
  const dstPath = path.join(path.dirname(filePath), toName);

  console.log(`📝 Final result: "${base}" → "${toName}"`);

  if (path.basename(dstPath) === base) {
    console.log(`❌ SKIP: Unchanged after normalization`);
    return { status: "skip", reason: "unchanged", file: base, srcPath: filePath };
  }

  console.log(`✅ PLAN: Will rename`);
  return { status: "plan", from: base, to: toName, srcPath: filePath, dstPath, method };
}

// Process entire folder
export async function planForFolder(root, opts = {}) {
  const entries = [];
  
  async function walk(dir) {
    const ls = await fs.readdir(dir, { withFileTypes: true });
    for (const d of ls) {
      const p = path.join(dir, d.name);
      if (d.isDirectory()) {
        if (opts.recurse) await walk(p);
      } else {
        entries.push(p);
      }
    }
  }
  
  const stat = await fs.stat(root);
  if (stat.isDirectory()) {
    await walk(root);
  } else {
    entries.push(root);
  }
  
  const plans = [];
  for (const p of entries) {
    plans.push(await planForFile(p, opts));
  }
  
  return plans;
}

// AI-powered parsing for filenames that can't be parsed with regex
export async function parseWithAI(filename, opts = {}) {
  const { 
    model = 'anthropic/claude-3.5-sonnet',
    openRouterApiKey,
    bandExceptions = []
  } = opts;

  if (!openRouterApiKey) {
    throw new Error('OpenRouter API key is required');
  }

  // Build band exceptions context
  const bandExamplesText = bandExceptions.length > 0 ? 
    `\nKnown band name variations: ${bandExceptions.slice(0, 20).map(e => `"${e.variant}" → "${e.correct_name}"`).join(', ')}` : '';

  const prompt = `Parse this music filename into "Artist - Title" format:

Filename: "${filename}"

CRITICAL: Return ONLY the formatted filename. Do NOT include any explanation, reasoning, or analysis.

Rules:
1. Extract the artist name and song title
2. Return ONLY in the format: "Artist - Title" 
3. Use proper capitalization (Title Case)
4. Clean up obvious noise like [Official], (Remastered), etc.
5. Handle AC/DC variants as "AC-DC" for Windows compatibility
6. IMPORTANT: If the format appears to be "Title - Artist", flip it to "Artist - Title"
7. Band names often contain words like "The", "And", "Chronicles", proper names, or plural forms${bandExamplesText}

Common flip-flop patterns to watch for:
- "Song Title - Band Name" → "Band Name - Song Title"
- Look for band-like names (The, And, Chronicles, Brothers, etc.)

Example responses (ONLY the clean result):
- "Led Zeppelin - Stairway to Heaven"
- "AC-DC - Thunderstruck" 
- "The Beatles - Hey Jude"
- "Girish And The Chronicles - Identity Crisis"

Response:`;

  console.log(`🤖 AI PARSING REQUEST:
    Model: ${model}
    Filename: "${filename}"
    Prompt length: ${prompt.length} chars
    Band exceptions: ${bandExceptions.length}`);

  try {
    const requestBody = {
      model,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 100,
      temperature: 0.1
    };

    console.log(`📤 FULL AI REQUEST:`, JSON.stringify(requestBody, null, 2));

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openRouterApiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://github.com/yourusername/ngksplayer',
        'X-Title': 'NGKsPlayer Music Normalizer'
      },
      body: JSON.stringify(requestBody)
    });

    console.log(`📥 AI RESPONSE STATUS: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ API ERROR BODY:`, errorText);
      throw new Error(`OpenRouter API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log(`📥 FULL AI RESPONSE:`, JSON.stringify(data, null, 2));

    const result = data.choices?.[0]?.message?.content?.trim();

    console.log(`🎯 AI FINAL RESULT: "${result}"`);

    if (!result) {
      throw new Error('No response from AI');
    }

    // Clean up any extra quotes that the AI might add
    let cleanedResult = result;
    if (cleanedResult.startsWith('"') && cleanedResult.endsWith('"')) {
      cleanedResult = cleanedResult.slice(1, -1);
    }
    if (cleanedResult.startsWith('"') && cleanedResult.endsWith('"')) {
      cleanedResult = cleanedResult.slice(1, -1);
    }

    // Extract just the filename if AI included reasoning/explanation
    // Look for pattern like "Artist - Title" at the start
    const filenameMatch = cleanedResult.match(/^([^"]+?(?:\s-\s[^"]+?)?)(?:\s+(?:Reasoning|Explanation|Analysis|Note):|$)/i);
    if (filenameMatch) {
      cleanedResult = filenameMatch[1].trim();
    }

    // Remove any trailing .mp3 or other extensions the AI might have added
    cleanedResult = cleanedResult.replace(/\.(mp3|flac|wav|m4a|aac)$/i, '');

    console.log(`🧹 CLEANED RESULT: "${cleanedResult}"`);

    return cleanedResult;
  } catch (error) {
    console.error('❌ AI parsing failed:', error);
    throw error;
  }
}

// AI-powered spelling correction for filenames
export async function correctSpelling(originalFilename, opts = {}) {
  const { 
    model = 'anthropic/claude-3.5-sonnet',
    openRouterApiKey,
    currentSuggestion,
    context
  } = opts;

  if (!openRouterApiKey) {
    throw new Error('OpenRouter API key is required');
  }

  const prompt = `Is this artist and song title correct? ${currentSuggestion.replace(path.extname(currentSuggestion), '')}

Important context:
- This is from a music file that may be a cover version, remix, live performance, etc.
- If it's a cover, the artist should be whoever is performing it, not the original artist
- Focus on correcting obvious errors like incomplete band names, misspellings, or wrong artist-title order
- If the artist and title are reasonable (even if it's a cover), respond with: "CORRECT"

If you find clear errors (like incomplete band names, obvious misspellings, or wrong order), provide the corrected "Artist - Title" format.`;

  console.log(`🔧 AI CORRECTION REQUEST:
    Original: "${originalFilename}"
    Current: "${currentSuggestion}"
    Model: ${model}
    Prompt length: ${prompt.length} chars`);

  try {
    const requestBody = {
      model,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 150,
      temperature: 0.1
    };

    console.log(`📤 CORRECTION REQUEST:`, JSON.stringify(requestBody, null, 2));

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openRouterApiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://github.com/yourusername/ngksplayer',
        'X-Title': 'NGKsPlayer Music Normalizer'
      },
      body: JSON.stringify(requestBody)
    });

    console.log(`📥 CORRECTION RESPONSE STATUS: ${response.status}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ CORRECTION API ERROR:`, errorText);
      throw new Error(`OpenRouter API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log(`📥 FULL CORRECTION RESPONSE:`, JSON.stringify(data, null, 2));

    const corrected = data.choices?.[0]?.message?.content?.trim();

    if (!corrected) {
      throw new Error('No response from AI');
    }

    console.log(`🎯 AI CORRECTION RESULT: "${corrected}"`);

    // Check if AI thinks current suggestion is correct
    if (corrected === "CORRECT" || corrected === "GOOD") {
      console.log(`✅ AI says current suggestion is correct`);
      return currentSuggestion; // Return the same suggestion
    }

    // If AI provided a correction, add the file extension back
    if (corrected && !corrected.includes('.')) {
      const ext = path.extname(currentSuggestion);
      const result = corrected + ext;
      console.log(`🔧 AI provided correction: "${result}"`);
      return result;
    }

    console.log(`🔧 AI provided raw correction: "${corrected}"`);
    return corrected;
  } catch (error) {
    console.error('❌ AI correction failed:', error);
    throw error;
  }
}
