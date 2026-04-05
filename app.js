import { initializeApp } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-app.js";
import { getFirestore, doc, onSnapshot, setDoc } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-firestore.js";

/* =====================================================
   DHV CEO COMMAND CENTER — DATA MODEL & RENDER LOGIC v4.1
   Wired to live Firestore state for persistence across reloads
   ===================================================== */

const firebaseConfig = {
  projectId: "gravityclaw-hub-2026",
  apiKey: "AIzaSyBBrH7sz6LTnDJsbfB1VghkUt_VcCYnoFg",
  authDomain: "gravityclaw-hub-2026.firebaseapp.com"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

/** 1. DEFAULT DATA MODELS (Fallback / Seeding) **/

const seriesAKanban = [
  {
    id: "col-ttl-1", title: "Inbound Leads", color: "amber",
    cards: [
      { id: "a1", priority: "med", title: "Apollo Batch (TX)", desc: "105 Adjuster emails sourced", meta: "B2B Outreach" },
      { id: "a2", priority: "med", title: "Organic SEO (FL)", desc: "12 inbound form fills via Seguro Facil", meta: "B2C Funnel" }
    ]
  },
  {
    id: "col-ttl-2", title: "Scoring Engine", color: "blue",
    cards: [
      { id: "a3", priority: "high", title: "Pending Voice-AI", desc: "4 Leads passed threshold. TWILIO trigger standby.", meta: "Voice AI" }
    ]
  },
  {
    id: "col-ttl-3", title: "Affiliate Captured", color: "green",
    cards: [
      { id: "a4", priority: "med", title: "Reject Traffic", desc: "45 leads diverted to Datalot ($45/ea).", meta: "Recycled Rev" }
    ]
  }
];

const seriesBKanban = [
  {
    id: "col-b-1", title: "Development", color: "amber",
    cards: [
      { id: "b1", priority: "high", title: "Autism Tracker", desc: "Module wireframes pending.", meta: "Clinical App" }
    ]
  },
  {
    id: "col-b-2", title: "UAT / Compliance", color: "blue",
    cards: [
      { id: "b2", priority: "med", title: "ADHD Vault Guilt-Reset", desc: "Verifying DPDP Act data erasure protocols.", meta: "Security" }
    ]
  },
  {
    id: "col-b-3", title: "Live Platforms", color: "green",
    cards: [
      { id: "b3", priority: "med", title: "PMA Main Hub", desc: "Serving 12 active modules.", meta: "Live" }
    ]
  }
];

const seriesCKanban = [
  {
    id: "col-c-1", title: "MVP Generation", color: "amber",
    cards: []
  },
  {
    id: "col-c-2", title: "CEO Approval / UAT", color: "blue",
    cards: [
      { id: "c1", priority: "high", title: "SB-458 Demand Kit", desc: "Markdown asset waiting for PDF wrapper.", meta: "Legal SaaS" }
    ]
  },
  {
    id: "col-c-3", title: "Marketplace Syndicated", color: "green",
    cards: [
      { id: "c2", priority: "med", title: "Maker Vault", desc: "Live on Etsy. $29/ea.", meta: "B2B SaaS", link: "products/maker-vault/index.html" },
      { id: "c3", priority: "med", title: "Budget Calm", desc: "Live on Etsy. $17/ea.", meta: "B2C SaaS", link: "products/budget-calm/index.html" },
      { id: "c4", priority: "med", title: "Seguro Fácil", desc: "Embedded affiliate links live.", meta: "Landing", link: "products/seguro-facil/index.html" },
      { id: "c5", priority: "med", title: "Hook Engine", desc: "Generating TikToks.", meta: "Tool", link: "products/hook-engine/index.html" },
      { id: "c6", priority: "med", title: "Prompt Playbook", desc: "Gumroad redirect config.", meta: "Asset", link: "products/prompt-playbook/index.html" }
    ]
  }
];

const agents = [
  { name: "ceo-global", dept: "Leadership", desc: "Consolidates metrics, weekly roadmap." },
  { name: "chief-learning-officer", dept: "Leadership", desc: "Audits escalations, enforces global CLO rules." },
  { name: "business-gap-auditor", dept: "Leadership", desc: "Analyzes Webpage Risk, Churn, Lead logic." },
  { name: "hr-agent", dept: "Leadership", desc: "Handles workforce metrics, assigns skills." },
  { name: "series-c-auditor", dept: "Leadership", desc: "Validates 80%+ MVP fitness." },
  
  { name: "high-velocity-seo-agent", dept: "Marketing", desc: "Generates geo/localized SEO content." },
  { name: "ttl-inbound-seo-agent", dept: "Marketing", desc: "Top-of-funnel inbound content creation." },
  { name: "social-posting-agent", dept: "Marketing", desc: "Pushes approved viral scripts to social APIs." },
  { name: "marketing-content-creator", dept: "Marketing", desc: "Writes FB/IG reality-check posts." },
  { name: "freemium-paywall-agent", dept: "Marketing", desc: "Triggers specific Fake Door paywalls via PMAction." },
  { name: "b2b-lead-enrichment-scraper", dept: "Marketing", desc: "Scrapes auto/law targets for Apollo." },
  { name: "b2b-partnership-negotiator", dept: "Marketing", desc: "Negotiates aggregators like SmartFinancial." },
  { name: "email-management", dept: "Marketing", desc: "Triages inbound, handles sequences." },
  { name: "community-engagement-manager", dept: "Marketing", desc: "Auto-replies to Insta/TikTok comments." },

  { name: "browser-automation", dept: "R&D Operations", desc: "Puppeteer & Gemini Vision scraping." },
  { name: "dockerizing-projects", dept: "R&D Operations", desc: "Containerizes unstructured code." },
  { name: "mcp-connector", dept: "R&D Operations", desc: "Bridges Context Protocols." },
  { name: "firebase-v2-migration", dept: "R&D Operations", desc: "Migrates v1 to Gen2 functions." },
  { name: "pma-pwa-deployment", dept: "R&D Operations", desc: "Pwa/Service worker deployment." },
  { name: "global-arbitrage-agent", dept: "R&D Operations", desc: "Locates MIT wrappers for resale." },
  { name: "skills-bootstrapper", dept: "R&D Operations", desc: "Generates SKILL.md rules autonomously." },
  { name: "prompt-factory", dept: "R&D Operations", desc: "Takes messy ideas -> JSON API blocks." },
  { name: "speech-transcription", dept: "R&D Operations", desc: "Whisper/Flash logic parsing." },
  { name: "vin-acv-evaluator", dept: "R&D Operations", desc: "Calculates ACV for TTL leads." },
  { name: "voice-ai-coordinator", dept: "R&D Operations", desc: "Twilio bridging." },
  { name: "web-search", dept: "R&D Operations", desc: "Grounds logic in current Google data." },
  { name: "tech-radar", dept: "R&D Operations", desc: "Scrapes AI headlines for alerts." },

  { name: "red-team-deployment-auditor", dept: "Compliance & QA", desc: "Hostile tester. Tries to break deploys." },
  { name: "uat-testing-agent", dept: "Compliance & QA", desc: "Persona validation (Consumer, Lawyer, CSR)." },
  { name: "logic-auditor-agent", dept: "Compliance & QA", desc: "Global holistic rule compliance." },
  { name: "security-compliance", dept: "Compliance & QA", desc: "Key rotation, secret scanning." },
  { name: "code-verifier", dept: "Compliance & QA", desc: "Sanity checks before merge." },
  { name: "account-provisioning-agent", dept: "Compliance & QA", desc: "Regulates 3rd party logins securely." },
  { name: "credential-auditor-agent", dept: "Compliance & QA", desc: "Performs active ping tests on API keys." },
  { name: "cost-optimization-agent", dept: "Compliance & QA", desc: "Revokes tokens if budget is met." },
  { name: "texas-total-loss-standards", dept: "Compliance & QA", desc: "Enforces US Tort liability rules." },
  
  { name: "workspace-janitor", dept: "General Utils", desc: "Clears .gemini temporary artifact dumps." },
  { name: "task-router", dept: "General Utils", desc: "Orphaned task multi-processing." },
  { name: "spanish-language-agent", dept: "General Utils", desc: "Forces UI and logic localized translations." },
  { name: "ai-visibility-tracker", dept: "General Utils", desc: "Watches ChatGPT mentions for DubHajar." },
  { name: "gravityclaw-switchboard", dept: "General Utils", desc: "Main relay." },
  { name: "notes-pkm", dept: "General Utils", desc: "Google Keep syncing." },
  { name: "plant-care", dept: "General Utils", desc: "Biometric notifications." }
];

/** 2. RENDER FUNCTIONS **/

function renderKanban(elementId, dataArray) {
  const container = document.getElementById(elementId);
  if (!container) return;
  
  let html = '';
  dataArray.forEach(col => {
    html += `
      <div class="kanban-col">
        <div class="col-header col-header-${col.color}">
          <div class="col-title"><div class="col-dot" style="background: var(--${col.color})"></div> ${col.title}</div>
          <div class="col-count">${col.cards.length}</div>
        </div>
        <div class="col-body">
    `;
    
    if (col.cards.length === 0) {
      html += `<div class="empty-state"><span>📂</span><span>Queue Empty</span></div>`;
    } else {
      col.cards.forEach(card => {
        let actionBtn = card.link 
          ? `<a href="${card.link}" target="_blank" class="kbtn approve" style="text-align:center;text-decoration:none;display:block;">Open Product</a>`
          : '';

        html += `
          <div class="kcard" draggable="true">
            <div class="kcard-header">
              <span class="kbadge kbadge-${col.color}">${card.meta}</span>
              <span class="kcard-priority ${card.priority}">${card.priority.toUpperCase()}</span>
            </div>
            <div class="kcard-title" style="margin-top:0.5rem;">${card.title}</div>
            <div class="kcard-desc">${card.desc}</div>
            ${actionBtn ? `<div class="kcard-actions" style="margin-top:0.5rem;">${actionBtn}</div>` : ''}
          </div>
        `;
      });
    }

    html += `</div></div>`;
  });
  container.innerHTML = html;
}

function renderAgents(dataArray) {
  const container = document.getElementById('workforce-grid');
  if(!container) return;

  const depts = {};
  dataArray.forEach(a => {
    if(!depts[a.dept]) depts[a.dept] = [];
    depts[a.dept].push(a);
  });

  let html = '';
  Object.keys(depts).forEach(deptName => {
    html += `
      <div class="glass-card" style="display:flex; flex-direction:column; gap:1rem;">
        <h3 style="color:var(--cyan); border-bottom:1px solid rgba(255,255,255,0.1); padding-bottom:0.5rem;">${deptName}</h3>
        <div style="display:flex;flex-wrap:wrap;gap:0.75rem;">
    `;
    depts[deptName].forEach(ag => {
      html += `
        <div style="width:100%; display:flex; flex-direction:column; gap:4px; padding-bottom:0.5rem; border-bottom:1px solid rgba(255,255,255,0.05);">
          <div><span class="agent-pill">${ag.name}</span></div>
          <div style="font-size:0.75rem; color:var(--text-muted); padding-left: 20px;">> ${ag.desc}</div>
        </div>
      `;
    });
    html += `</div></div>`;
  });
  
  container.innerHTML = html;
}

/** 3. FIRESTORE SYNC LOGIC **/

const syncKanban = (docId, defaultData, elementId) => {
  const ref = doc(db, 'dashboard_metrics', docId);
  onSnapshot(ref, (snap) => {
    if (snap.exists()) {
      renderKanban(elementId, snap.data().columns);
    } else {
      console.log(`Seeding default Kanban data for ${docId}`);
      setDoc(ref, { columns: defaultData }).catch(console.warn);
      renderKanban(elementId, defaultData);
    }
  }, (err) => {
    console.error(`Firebase Sync Error on ${docId}:`, err);
    renderKanban(elementId, defaultData); // Fallback to local on error
  });
};

const syncAgents = () => {
  const ref = doc(db, 'dashboard_metrics', 'workforce_agents');
  onSnapshot(ref, (snap) => {
    if (snap.exists()) {
      renderAgents(snap.data().list);
    } else {
      console.log(`Seeding default Agent data`);
      setDoc(ref, { list: agents }).catch(console.warn);
      renderAgents(agents);
    }
  }, (err) => {
    console.error(`Firebase Sync Error on workforce_agents:`, err);
    renderAgents(agents); // Fallback to local on error
  });
};

// Initialize on page load
syncKanban('series_A', seriesAKanban, 'kanban-series-a');
syncKanban('series_B', seriesBKanban, 'kanban-series-b');
syncKanban('series_C', seriesCKanban, 'kanban-series-c');
syncAgents();

console.log("GravityClaw Logic Engine v4.1 initialized with Firebase Realtime Sync.");
