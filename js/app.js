/* ══════════════════════════════════
   STRIDE — App Module
   ══════════════════════════════════ */

const WEBHOOK_URL = 'https://n8n-production-d386.up.railway.app/webhook/stride-plan';

let paceUnit = 'km'; // 'km' or 'mile'

/* ══════════════════════════════════
   PACE UNIT TOGGLE
   ══════════════════════════════════ */

function setPaceUnit(unit) {
  paceUnit = unit;
  document.getElementById('pace-km').classList.toggle('active', unit === 'km');
  document.getElementById('pace-mile').classList.toggle('active', unit === 'mile');
}

/* ══════════════════════════════════
   HR ZONES
   ══════════════════════════════════ */

const HR_ZONES = [
  { zone: 'Z1', name: 'Recovery',    pct: [0.50, 0.60], color: '#6bcfe8', desc: 'Very easy, barely breathing hard' },
  { zone: 'Z2', name: 'Aerobic',     pct: [0.60, 0.70], color: '#4ecdc4', desc: 'Easy, conversational pace' },
  { zone: 'Z3', name: 'Tempo',       pct: [0.70, 0.80], color: '#ffe66d', desc: 'Comfortably hard, can speak in short sentences' },
  { zone: 'Z4', name: 'Threshold',   pct: [0.80, 0.90], color: '#ff9f43', desc: 'Hard effort, difficult to speak' },
  { zone: 'Z5', name: 'VO2 Max',     pct: [0.90, 1.00], color: '#ff6b6b', desc: 'Maximum effort, cannot speak' },
];

function getHRZones(maxHR) {
  return HR_ZONES.map(z => ({
    ...z,
    low:  Math.round(maxHR * z.pct[0]),
    high: Math.round(maxHR * z.pct[1])
  }));
}

function toggleHRZones() {
  const panel  = document.getElementById('hr-zones-panel');
  const maxHR  = parseInt(document.getElementById('max-hr').value);
  const btn    = document.getElementById('btn-view-zones');

  if (panel.style.display !== 'none') {
    panel.style.display = 'none';
    btn.textContent = 'View Zones';
    return;
  }

  if (!maxHR || maxHR < 100) { showToast('Please enter a valid max heart rate first.', 'error'); return; }

  const zones = getHRZones(maxHR);
  const grid  = document.getElementById('hz-grid');
  grid.innerHTML = '';

  zones.forEach(z => {
    const row = document.createElement('div');
    row.className = 'hz-row';
    row.style.background = z.color + '18';
    row.innerHTML = `
      <div class="hz-dot" style="background:${z.color}"></div>
      <div class="hz-name" style="color:${z.color}">${z.zone} — ${z.name}</div>
      <div class="hz-range" style="color:${z.color}">${z.low}–${z.high} bpm</div>
    `;
    grid.appendChild(row);
  });

  panel.style.display = 'block';
  btn.textContent = 'Hide Zones';
}

// Enable/disable "View Zones" button as user types max HR
document.addEventListener('DOMContentLoaded', () => {
  const hrInput = document.getElementById('max-hr');
  const btn     = document.getElementById('btn-view-zones');
  hrInput.addEventListener('input', () => {
    const val = parseInt(hrInput.value);
    btn.disabled = !(val >= 100 && val <= 220);
    // If zones panel is open, refresh it live
    if (document.getElementById('hr-zones-panel').style.display !== 'none') toggleHRZones();
  });
});

/* ══════════════════════════════════
   TIME INPUTS
   ══════════════════════════════════ */

function getPBTime() {
  const mins = document.getElementById('pb-mins').value.trim();
  const secs = document.getElementById('pb-secs').value.trim();
  if (!mins && !secs) return 'no PB yet';
  const m = parseInt(mins) || 0;
  const s = parseInt(secs) || 0;
  return `${m}:${String(s).padStart(2,'0')}`;
}

function getGoalTime() {
  const h = parseInt(document.getElementById('goal-hrs').value)  || 0;
  const m = parseInt(document.getElementById('goal-mins').value) || 0;
  const s = parseInt(document.getElementById('goal-secs').value) || 0;
  if (!h && !m && !s) return '';
  if (h > 0) return `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
  return `${m}:${String(s).padStart(2,'0')}`;
}

function attachTimePreviews() {
  const updatePB = () => {
    const m = parseInt(document.getElementById('pb-mins').value) || 0;
    const s = parseInt(document.getElementById('pb-secs').value) || 0;
    document.getElementById('pb-preview').textContent = (m || s) ? `5K PB: ${m}:${String(s).padStart(2,'0')}` : '';
    if (s > 59) document.getElementById('pb-secs').value = 59;
  };

  const updateGoal = () => {
    const h = parseInt(document.getElementById('goal-hrs').value)  || 0;
    const m = parseInt(document.getElementById('goal-mins').value) || 0;
    const s = parseInt(document.getElementById('goal-secs').value) || 0;
    const distance = document.getElementById('goal-distance').value;
    const label = distance ? ` for ${distance}` : '';
    let preview = '';
    if (h || m || s) {
      preview = h > 0
        ? `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}${label}`
        : `${m}:${String(s).padStart(2,'0')}${label}`;
    }
    document.getElementById('goal-preview').textContent = preview;
    if (m > 59) document.getElementById('goal-mins').value = 59;
    if (s > 59) document.getElementById('goal-secs').value = 59;
  };

  ['pb-mins','pb-secs'].forEach(id => document.getElementById(id).addEventListener('input', updatePB));
  ['goal-hrs','goal-mins','goal-secs'].forEach(id => document.getElementById(id).addEventListener('input', updateGoal));
  document.getElementById('goal-distance').addEventListener('change', updateGoal);
}

document.addEventListener('DOMContentLoaded', attachTimePreviews);

/* ══════════════════════════════════
   GENERATE PLAN
   ══════════════════════════════════ */

async function generatePlan() {
  const pb       = getPBTime();
  const distance = document.getElementById('goal-distance').value;
  const goalTime = getGoalTime();
  const days     = document.getElementById('training-days').value;
  const maxHR    = document.getElementById('max-hr').value.trim();

  if (!distance || !goalTime || !days) {
    showToast('Please fill in goal distance, goal time, and training days.', 'error');
    return;
  }

  showLoading(true);

  try {
    const res = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: buildPrompt({ pb, distance, goalTime, days, maxHR, paceUnit }) })
    });

    if (!res.ok) throw new Error('Webhook returned HTTP ' + res.status);

    const data = await res.json();
    const plan = parseResponse(data);

    renderCalendar(plan, { pb, distance, goalTime, days });
    showLoading(false);
    showToast('Your monthly plan is ready! Drag workouts to rearrange. ✅', 'success');

  } catch (err) {
    showLoading(false);
    console.error('Plan generation error:', err);
    showToast('Something went wrong generating your plan. Please try again.', 'error');
  }
}

/* ── Parse response ── */
function parseResponse(data) {
  if (Array.isArray(data)) return data;
  if (data.workouts) {
    if (Array.isArray(data.workouts)) return data.workouts;
    return parseJSONFromText(data.workouts);
  }
  const raw = data.text || data.output || data.response || data.message || '';
  if (raw) return parseJSONFromText(raw);
  throw new Error('Unrecognised response format.');
}

function parseJSONFromText(text) {
  const clean = text.replace(/```json|```/g, '').trim();
  try {
    const parsed = JSON.parse(clean);
    if (Array.isArray(parsed)) return parsed;
  } catch (e) {
    const match = clean.match(/\[[\s\S]*\]/);
    if (match) return JSON.parse(match[0]);
  }
  throw new Error('Could not parse AI response as JSON.');
}

/* ── Build prompt ── */
function buildPrompt({ pb, distance, goalTime, days, maxHR, paceUnit }) {
  const now         = new Date();
  const monthName   = now.toLocaleString('default', { month: 'long' });
  const year        = now.getFullYear();
  const daysInMonth = new Date(year, now.getMonth() + 1, 0).getDate();
  const paceLabel   = paceUnit === 'km' ? 'min/km' : 'min/mile';

  const hrSection = maxHR ? `
- Max Heart Rate: ${maxHR} bpm
- HR Zones:
  Z1 Recovery: ${Math.round(maxHR*0.50)}–${Math.round(maxHR*0.60)} bpm
  Z2 Aerobic:  ${Math.round(maxHR*0.60)}–${Math.round(maxHR*0.70)} bpm
  Z3 Tempo:    ${Math.round(maxHR*0.70)}–${Math.round(maxHR*0.80)} bpm
  Z4 Threshold:${Math.round(maxHR*0.80)}–${Math.round(maxHR*0.90)} bpm
  Z5 VO2 Max:  ${Math.round(maxHR*0.90)}–${maxHR} bpm` : '- Max HR: not provided (use pace guidance only)';

  return `You are an expert running coach. Create a full monthly training plan for ${monthName} ${year} (${daysInMonth} days).

RUNNER PROFILE:
- 5K PB: ${pb}
- Race goal: ${goalTime} for ${distance}
- Training days per week: ${days}
- Pace preference: ${paceLabel}
${hrSection}

Generate a workout for EVERY day 1–${daysInMonth}.

CRITICAL: Respond ONLY with a valid JSON array, no markdown, no explanation.

Each day MUST use this exact JSON structure:
{
  "day": 1,
  "type": "easy",
  "title": "Easy Aerobic Run",
  "warm_up": "10 min easy jog at Z1 (${Math.round((maxHR||180)*0.50)}–${Math.round((maxHR||180)*0.60)} bpm). Dynamic stretches: leg swings, hip circles.",
  "main_session": "30 min steady run at Z2 (${Math.round((maxHR||180)*0.60)}–${Math.round((maxHR||180)*0.70)} bpm) — approx X:XX ${paceLabel}. Keep effort conversational.",
  "cool_down": "5 min easy walk. Static stretches: quads, calves, hamstrings, 30 sec each.",
  "notes": "If HR drifts above Z2, slow down. This is a recovery-building day."
}

For rest days use:
{
  "day": 2,
  "type": "rest",
  "title": "Rest Day",
  "description": "Full recovery. Light walking or gentle yoga if desired. Prioritise sleep and hydration."
}

WORKOUT TYPE RULES:
- "easy"     → Z1–Z2 HR, conversational pace, building aerobic base
- "tempo"    → Z3–Z4 HR, comfortably hard, with specific pace targets in ${paceLabel}
- "interval" → Z4–Z5 HR, specific rep structure (e.g. 8x400m), with recovery periods
- "long"     → Z2 HR, longest run of the week, on Saturday or Sunday
- "rest"     → no running, use description field only

PACING RULES:
- Always include both HR zone AND ${paceLabel} pace targets where relevant
- Calculate paces from the runner's 5K PB using standard equivalence tables
- For intervals, specify: number of reps, rep distance, target pace, recovery duration
- Progress difficulty across 4 weeks: week 1 base → week 2 build → week 3 peak → week 4 recovery

STRUCTURE RULES:
- warm_up: always include duration, HR zone, and 2–3 specific dynamic drills
- main_session: always include duration OR distance, HR zone, and target pace in ${paceLabel}
- cool_down: always include duration and 3–4 specific stretches with hold times
- notes: coaching tip, form cue, or race-relevance note
- Total running days per week must equal ${days}
- MUST include all ${daysInMonth} days`;
}

/* ══════════════════════════════════
   UI HELPERS
   ══════════════════════════════════ */

function showLoading(show) {
  const overlay = document.getElementById('loading-overlay');
  if (show) {
    overlay.classList.add('show');
    const msgs = [
      'Analysing your fitness profile…',
      'Calculating your HR zones…',
      'Building your weekly structure…',
      'Finalising your monthly calendar…'
    ];
    let i = 0;
    window._loadingInterval = setInterval(() => {
      i = (i + 1) % msgs.length;
      document.getElementById('loading-sub').textContent = msgs[i];
    }, 1800);
  } else {
    overlay.classList.remove('show');
    clearInterval(window._loadingInterval);
  }
}

let toastTimeout;
function showToast(msg, type = 'info') {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.className   = `toast ${type} show`;
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => toast.classList.remove('show'), 3500);
}
