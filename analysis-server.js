/**
 * DHV Intelligence Analysis Server
 * Port: 3001
 * Accepts YouTube URLs → researches via Gemini → stores reports → dashboard polls
 */

const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = 3001;
const REPORTS_FILE = path.join(__dirname, 'reports.json');
const QUEUE_FILE = path.join(__dirname, 'queue.json');

// Load env
function loadEnv() {
  const searchPaths = [
    path.join(__dirname, '.env'),
    path.join(__dirname, '../../..', '.env'),
    path.join(__dirname, '../../../..', 'antigravity', '.env'),
    path.join(process.env.USERPROFILE || process.env.HOME || '', '.gemini', 'antigravity', '.env'),
    path.join(process.env.USERPROFILE || process.env.HOME || '', '.env'),
    path.join(process.cwd(), '.env')
  ];
  let loaded = false;
  for (const p of searchPaths) {
    if (fs.existsSync(p)) {
      const envFile = fs.readFileSync(p, 'utf8');
      envFile.split('\n').forEach(line => {
        const [k, ...v] = line.split('=');
        if (k && !k.startsWith('#') && v.length && !process.env[k.trim()]) {
          process.env[k.trim()] = v.join('=').trim();
        }
      });
      if (!loaded) { console.log(`[Env] Loaded: ${p}`); loaded = true; }
    }
  }
}
loadEnv();

// ── Content Guard ── reject clearly non-business / entertainment URLs
const JUNK_PATTERNS = [
  /never gonna give you up/i,
  /rick astley/i,
  /official music video/i,
  /official video.*song/i,
  /vevo/i,
  /lyrics video/i,
  /\bprank\b/i,
  /\bchallenge\b.*tiktok/i,
  /reaction video/i
];
const JUNK_CHANNELS = ['rick astley', 'vevo', 'warnermusicgroup', 'sonymusicglobal'];

function isJunkContent(meta) {
  const title = (meta.title || '').toLowerCase();
  const channel = (meta.channel || '').toLowerCase();
  if (JUNK_CHANNELS.some(j => channel.includes(j))) return true;
  if (JUNK_PATTERNS.some(p => p.test(meta.title || ''))) return true;
  return false;
}

// Init storage
if (!fs.existsSync(REPORTS_FILE)) fs.writeFileSync(REPORTS_FILE, '[]');
if (!fs.existsSync(QUEUE_FILE)) fs.writeFileSync(QUEUE_FILE, '[]');

function readJSON(file) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8') || '[]'); } catch { return []; }
}
function writeJSON(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

// Extract YouTube video ID
function extractVideoId(videoUrl) {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/watch\?.*v=([a-zA-Z0-9_-]{11})/
  ];
  for (const p of patterns) {
    const m = videoUrl.match(p);
    if (m) return m[1];
  }
  return null;
}

// Fetch YouTube oEmbed metadata (no API key needed)
function getYouTubeMeta(videoId) {
  return new Promise((resolve) => {
    const oEmbedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
    https.get(oEmbedUrl, (res) => {
      let data = '';
      res.on('data', d => data += d);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ title: parsed.title, channel: parsed.author_name, thumbnail: parsed.thumbnail_url });
        } catch { resolve({ title: 'Unknown Title', channel: 'Unknown Channel', thumbnail: '' }); }
      });
    }).on('error', () => resolve({ title: 'Unknown Title', channel: 'Unknown Channel', thumbnail: '' }));
  });
}

// Call Gemini API for analysis
function analyzeWithGemini(meta, videoId) {
  return new Promise((resolve, reject) => {
    const GEMINI_KEY = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY || '';
    if (!GEMINI_KEY || GEMINI_KEY.includes('REPLACE')) {
      // Fallback: generate a template report without AI
      resolve(generateFallbackReport(meta, videoId));
      return;
    }

    const prompt = `You are the DHV Intelligence Analysis Agent for Dub Hajar Ventures LLC — a Texas-based holding company with:
- Series A (TTL): Texas Total Loss — insurance claim automation, B2B law firms, voice AI intake (Twilio)
- Series B (PMA): PMAction — clinical ADHD/wellness PWA, 30-day program, Stripe payments
- Series C (SaaS Factory): Micro-SaaS, templates, digital products, Etsy/Gumroad arbitrage
- Revenue target: $20K/mo

CONFIRMED TECH STACK — only reference these tools in your recommendations:
  AI Models: Gemini 2.0 Flash (primary agents), Gemini Pro (complex reasoning), Claude (code generation), Perplexity API (research)
  Database: Firebase / Firestore ONLY — Supabase is BANNED
  Auth: Firebase Auth ONLY
  Hosting: Firebase Hosting
  Payments: Stripe
  Voice/SMS: Twilio
  Agents: Antigravity platform with MCP protocol, 40+ custom skills
  Content: TTL Inbound SEO Agent, Marketing Content Creator, Community Engagement Manager
  Revenue agents: Global Arbitrage Agent (Series C), B2B Lead Enrichment (Series A)
  
BANNED from recommendations: OpenAI, GPT-4, Supabase, Vercel (for core apps), any non-Google auth.
If the video recommends a tool not in our stack, evaluate whether it REPLACES an existing tool or is a new addition, and flag which stack component it affects.

Analyze this YouTube video for board-level strategic relevance:
Title: "${meta.title}"
Channel: "${meta.channel}"
Video ID: ${videoId}
YouTube URL: https://www.youtube.com/watch?v=${videoId}

Return ONLY valid JSON (no markdown, no explanation) with this exact structure:
{
  "verdict": "deploy|watch|study|pass|risk",
  "verdictLabel": "🟢 Deploy Now|🟡 Watch / Pilot|🔵 Deep Study|⚪ Pass|🔴 Risk Flag",
  "confidence": <number 0-100>,
  "effort": "Low|Medium|High|Very High|Zero (Principle)",
  "timeline": "Now|Q2 2026|Q3 2026|Q4 2026|6+ Months|Immediate|Skip",
  "market": "<concise market size or category>",
  "boardAnswer": "What changed|Why it matters|What management is doing|What risk exists|What decision is needed",
  "tags": ["color1","Label1","color2","Label2","color3","Label3"],
  "summary": "<2-3 sentence strategic thesis. No fluff.>",
  "fullAnalysis": {
    "situation": "<What is this and what changed? 2-3 sentences.>",
    "opportunity": "<Specific DHV use case — map to Series A, B, or C. Be concrete.>",
    "risk": "<Honest risk assessment. No minimizing.>",
    "action": "<Concrete next step with owner and timeline.>",
    "recommendation": "<One-sentence board verdict.>"
  }
}

Tag colors must be from: blue, purple, green, yellow, red.
Verdict logic: confidence>=85 + low effort = deploy; confidence 65-84 = watch; confidence 75-85 needs research = study; confidence<60 = pass; security/legal issue = risk.`;

    const postData = JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.3, maxOutputTokens: 1500 }
    });

    const options = {
      hostname: 'generativelanguage.googleapis.com',
      path: `/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_KEY}`,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(postData) }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', d => data += d);
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          const text = response.candidates?.[0]?.content?.parts?.[0]?.text || '';
          // Extract JSON from response
          const jsonMatch = text.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const analysis = JSON.parse(jsonMatch[0]);
            resolve(analysis);
          } else {
            resolve(generateFallbackReport(meta, videoId));
          }
        } catch (e) {
          console.error('Gemini parse error:', e.message);
          resolve(generateFallbackReport(meta, videoId));
        }
      });
    });
    req.on('error', (e) => {
      console.error('Gemini request error:', e.message);
      resolve(generateFallbackReport(meta, videoId));
    });
    req.write(postData);
    req.end();
  });
}

function generateFallbackReport(meta, videoId) {
  return {
    verdict: 'watch',
    verdictLabel: '🟡 Watch / Pilot',
    confidence: 65,
    effort: 'Medium',
    timeline: 'Q3 2026',
    market: 'AI/Tech Market',
    boardAnswer: 'What decision is needed',
    tags: ['blue', 'Technology', 'purple', 'AI/Automation', 'yellow', 'CEO Review Required'],
    summary: `Queued for board review: "${meta.title}" by ${meta.channel}. Structural analysis complete — deep strategic scoring requires Gemini API. Add GEMINI_API_KEY to .env to unlock full AI analysis.`,
    fullAnalysis: {
      situation: `"${meta.title}" by ${meta.channel} was submitted for intelligence analysis. Video metadata confirmed. Full content analysis requires Gemini API key.`,
      opportunity: 'Manual CEO review required. Evaluate alignment with Series A (TTL intake automation), Series B (PMA clinical tools), or Series C (SaaS Factory) based on video content.',
      risk: 'No automated risk scoring available without Gemini API. Do not deploy based on this report alone.',
      action: `CEO: Watch https://www.youtube.com/watch?v=${videoId} and assess manually. To enable automated AI analysis: add GEMINI_API_KEY to .env and restart the analysis server.`,
      recommendation: 'HOLD — Pending CEO manual review. Gemini API key required for automated board-level scoring.'
    }
  };
}

// Process a queued URL
async function processQueueItem(item) {
  console.log(`[Analysis] Processing: ${item.url}`);
  
  const videoId = extractVideoId(item.url);
  if (!videoId) {
    const reports = readJSON(REPORTS_FILE);
    reports.push({
      id: item.id,
      num: String(reports.length + 1).padStart(2, '0'),
      url: item.url,
      error: 'Could not extract video ID from URL',
      timestamp: new Date().toISOString(),
      status: 'error'
    });
    writeJSON(REPORTS_FILE, reports);
    return;
  }

  const meta = await getYouTubeMeta(videoId);
  console.log(`[Analysis] Video: "${meta.title}" by ${meta.channel}`);

  // Content guard — reject entertainment/junk content
  if (isJunkContent(meta)) {
    console.log(`[Analysis] ⛔ REJECTED (content guard): "${meta.title}"`);
    const queue = readJSON(QUEUE_FILE);
    const qItem = queue.find(q => q.id === item.id);
    if (qItem) { qItem.status = 'rejected'; writeJSON(QUEUE_FILE, queue); }
    return;
  }

  const analysis = await analyzeWithGemini(meta, videoId);
  
  const reports = readJSON(REPORTS_FILE);
  const reportNum = reports.length + 1;
  
  const report = {
    id: item.id,
    num: String(reportNum).padStart(2, '0'),
    title: meta.title,
    channel: meta.channel,
    thumbnail: meta.thumbnail,
    url: `https://www.youtube.com/watch?v=${videoId}`,
    submittedAt: item.submittedAt,
    completedAt: new Date().toISOString(),
    status: 'complete',
    isNew: true,
    ...analysis
  };

  reports.push(report);
  writeJSON(REPORTS_FILE, reports);

  console.log(`[Analysis] ✅ Complete: "${meta.title}" — Verdict: ${analysis.verdictLabel}`);
}

// Process queue
async function processQueue() {
  const queue = readJSON(QUEUE_FILE);
  const pending = queue.filter(i => i.status === 'pending');
  
  for (const item of pending) {
    // Mark as processing
    item.status = 'processing';
    writeJSON(QUEUE_FILE, queue);
    
    try {
      await processQueueItem(item);
      item.status = 'done';
    } catch (e) {
      console.error('[Analysis] Error:', e.message);
      item.status = 'error';
    }
    writeJSON(QUEUE_FILE, queue);
  }
}

// CORS helper
function setCORSHeaders(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function jsonResponse(res, statusCode, data) {
  res.writeHead(statusCode, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

// HTTP Server
const server = http.createServer((req, res) => {
  setCORSHeaders(res);
  
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const parsed = url.parse(req.url, true);

  // POST /analyze — submit a YouTube URL
  if (req.method === 'POST' && parsed.pathname === '/analyze') {
    let body = '';
    req.on('data', d => body += d);
    req.on('end', () => {
      try {
        const { url: videoUrl } = JSON.parse(body);
        if (!videoUrl) return jsonResponse(res, 400, { error: 'url is required' });
        
        const videoId = extractVideoId(videoUrl);
        if (!videoId) return jsonResponse(res, 400, { error: 'Invalid YouTube URL' });

        const queue = readJSON(QUEUE_FILE);
        const id = `req_${Date.now()}`;
        queue.push({ id, url: videoUrl, videoId, status: 'pending', submittedAt: new Date().toISOString() });
        writeJSON(QUEUE_FILE, queue);

        // Start processing asynchronously
        setTimeout(processQueue, 100);
        
        jsonResponse(res, 202, { 
          accepted: true, 
          id,
          message: `Intelligence analysis queued for video ${videoId}. Report will be ready in ~15-30 seconds.`
        });
      } catch (e) {
        jsonResponse(res, 400, { error: 'Invalid JSON body' });
      }
    });
    return;
  }

  // GET /reports — return all completed reports
  if (req.method === 'GET' && parsed.pathname === '/reports') {
    const reports = readJSON(REPORTS_FILE).filter(r => r.status === 'complete');
    jsonResponse(res, 200, reports);
    return;
  }

  // GET /reports/new?since=ISO_TIMESTAMP — return reports newer than timestamp
  if (req.method === 'GET' && parsed.pathname === '/reports/new') {
    const since = parsed.query.since ? new Date(parsed.query.since) : new Date(0);
    const reports = readJSON(REPORTS_FILE)
      .filter(r => r.status === 'complete' && new Date(r.completedAt) > since);
    jsonResponse(res, 200, reports);
    return;
  }

  // GET /queue — return queue status
  if (req.method === 'GET' && parsed.pathname === '/queue') {
    const queue = readJSON(QUEUE_FILE);
    jsonResponse(res, 200, queue);
    return;
  }

  // DELETE /reports/clear-new — mark all as seen
  if (req.method === 'POST' && parsed.pathname === '/reports/mark-seen') {
    const reports = readJSON(REPORTS_FILE);
    reports.forEach(r => r.isNew = false);
    writeJSON(REPORTS_FILE, reports);
    jsonResponse(res, 200, { ok: true });
    return;
  }

  // GET /status
  if (req.method === 'GET' && parsed.pathname === '/status') {
    const queue = readJSON(QUEUE_FILE);
    const reports = readJSON(REPORTS_FILE);
    jsonResponse(res, 200, {
      server: 'DHV Intelligence Analysis Server',
      version: '1.0.0',
      pendingQueue: queue.filter(q => q.status === 'pending').length,
      totalReports: reports.filter(r => r.status === 'complete').length,
      geminiConfigured: !!(process.env.GEMINI_API_KEY && !process.env.GEMINI_API_KEY.includes('REPLACE')),
      uptime: process.uptime()
    });
    return;
  }

  jsonResponse(res, 404, { error: 'Not found' });
});

server.listen(PORT, () => {
  console.log(`\n🧠 DHV Intelligence Analysis Server running on http://localhost:${PORT}`);
  console.log(`   POST /analyze       — Submit YouTube URL for analysis`);
  console.log(`   GET  /reports       — Get all completed reports`);
  console.log(`   GET  /reports/new   — Get new reports since ?since=ISO_TIMESTAMP`);
  console.log(`   GET  /status        — Server health + queue stats`);
  const hasKey = process.env.GEMINI_API_KEY && !process.env.GEMINI_API_KEY.includes('REPLACE');
  console.log(`\n   Gemini API: ${hasKey ? '✅ Configured' : '⚠️  Not configured — add GEMINI_API_KEY to .env for AI analysis'}`);
  console.log(`   Reports file: ${REPORTS_FILE}\n`);
  
  // Process any pending items on startup
  processQueue();
});

process.on('SIGINT', () => { console.log('\n[Server] Shutting down...'); process.exit(0); });
