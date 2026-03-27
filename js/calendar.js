/* ══════════════════════════════════
   STRIDE — Calendar Module
   ══════════════════════════════════ */

let draggedDay  = null;
let workoutData = {};

/* ── Main render function ── */

function renderCalendar(workouts, params) {
  const now         = new Date();
  const year        = now.getFullYear();
  const month       = now.getMonth();
  const monthName   = now.toLocaleString('default', { month: 'long' });
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const todayDate   = now.getDate();

  // Get first day of month — convert Sun=0 to Mon=0 base
  // JS: 0=Sun,1=Mon...6=Sat → we want Mon=0,Tue=1...Sun=6
  const jsFirstDay   = new Date(year, month, 1).getDay(); // 0=Sun
  const firstDay     = (jsFirstDay + 6) % 7;              // Mon-based offset

  workoutData = {};
  workouts.forEach(w => { workoutData[w.day] = w; });

  for (let d = 1; d <= daysInMonth; d++) {
    if (!workoutData[d]) {
      workoutData[d] = { day: d, type: 'rest', title: 'Rest Day', description: 'Active recovery. Light stretching or walking.' };
    }
  }

  document.getElementById('calendar-month-title').innerHTML =
    `<span>${monthName}</span> ${year} — Training Plan`;

  const infoRow = document.getElementById('plan-info-row');
  infoRow.style.display = 'flex';
  infoRow.innerHTML = `
    <div class="info-chip">5K PB: <span>${params.pb}</span></div>
    <div class="info-chip">Goal: <span>${params.goalTime} ${params.distance}</span></div>
    <div class="info-chip">Training: <span>${params.days}x/week</span></div>
  `;

  document.getElementById('calendar-legend').style.display = 'flex';

  const container = document.getElementById('calendar-container');
  container.innerHTML = '';

  const grid = document.createElement('div');
  grid.className = 'calendar-grid';

  // Monday-first day headers
  ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].forEach(d => {
    const h = document.createElement('div');
    h.className = 'cal-day-header';
    h.textContent = d;
    grid.appendChild(h);
  });

  const totalCells = Math.ceil((firstDay + daysInMonth) / 7) * 7;
  let dayCounter = 1;

  for (let i = 0; i < totalCells; i++) {
    const cell = document.createElement('div');

    if (i < firstDay || dayCounter > daysInMonth) {
      cell.className = 'cal-cell empty';
    } else {
      const d = dayCounter;
      cell.className = 'cal-cell';
      if (d === todayDate) cell.classList.add('today');
      cell.dataset.day = d;

      const dateLabel = document.createElement('div');
      dateLabel.className = 'cal-date';
      dateLabel.textContent = d;
      cell.appendChild(dateLabel);

      const w = workoutData[d];
      if (w) cell.appendChild(createWorkoutCard(w, d));

      cell.addEventListener('dragover', e => { e.preventDefault(); cell.classList.add('drag-over'); });
      cell.addEventListener('dragleave', () => cell.classList.remove('drag-over'));
      cell.addEventListener('drop', e => {
        e.preventDefault();
        cell.classList.remove('drag-over');
        if (draggedDay !== null && draggedDay !== d) swapWorkouts(draggedDay, d);
      });

      dayCounter++;
    }
    grid.appendChild(cell);
  }

  container.appendChild(grid);
}

/* ── Workout card ── */

function createWorkoutCard(workout, day) {
  const card = document.createElement('div');
  card.className        = 'workout-card';
  card.dataset.type     = workout.type;
  card.dataset.day      = day;
  card.draggable        = true;

  // Show just the title + a short summary line
  const summary = workout.main_session
    ? workout.main_session.substring(0, 55) + (workout.main_session.length > 55 ? '…' : '')
    : (workout.description || '').substring(0, 55) + ((workout.description || '').length > 55 ? '…' : '');

  card.innerHTML = `
    <div class="workout-card-title">${workout.title}</div>
    <div class="workout-card-desc">${summary}</div>
  `;

  card.addEventListener('dragstart', () => {
    draggedDay = day;
    setTimeout(() => card.classList.add('dragging'), 0);
  });
  card.addEventListener('dragend', () => { card.classList.remove('dragging'); draggedDay = null; });
  card.addEventListener('click', () => openModal(workout, day));

  return card;
}

/* ── Swap workouts ── */

function swapWorkouts(fromDay, toDay) {
  const temp = { ...workoutData[fromDay] };
  workoutData[fromDay] = { ...workoutData[toDay], day: fromDay };
  workoutData[toDay]   = { ...temp, day: toDay };
  updateCell(fromDay);
  updateCell(toDay);
  showToast(`Day ${fromDay} ↔ Day ${toDay} swapped`, 'info');
}

function updateCell(day) {
  const cell = document.querySelector(`.cal-cell[data-day="${day}"]`);
  if (!cell) return;
  const oldCard = cell.querySelector('.workout-card');
  if (oldCard) oldCard.remove();
  const w = workoutData[day];
  if (w) cell.appendChild(createWorkoutCard(w, day));
}

/* ══════════════════════════════════
   MODAL — Structured workout display
   ══════════════════════════════════ */

const typeColors = {
  easy:     'var(--easy)',
  tempo:    'var(--tempo)',
  interval: 'var(--interval)',
  long:     'var(--long)',
  rest:     'var(--muted)'
};

function openModal(workout, day) {
  const now     = new Date();
  const dateObj = new Date(now.getFullYear(), now.getMonth(), day);
  const dateStr = dateObj.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });

  document.getElementById('modal-title').textContent = workout.title;
  document.getElementById('modal-date').textContent  = dateStr;

  const color  = typeColors[workout.type] || 'var(--muted)';
  const badge  = document.getElementById('modal-type-badge');
  badge.textContent        = workout.type.charAt(0).toUpperCase() + workout.type.slice(1);
  badge.style.color        = color;
  badge.style.border       = `1px solid ${color}`;
  badge.style.background   = 'transparent';
  badge.style.borderRadius = '100px';
  badge.style.padding      = '4px 14px';
  badge.style.fontSize     = '11px';
  badge.style.fontWeight   = '700';
  badge.style.textTransform = 'uppercase';
  badge.style.letterSpacing = '2px';

  // Build structured sections
  const body = document.getElementById('modal-body');
  body.innerHTML = '';

  if (workout.type === 'rest') {
    body.appendChild(makeSection('rest', '😴', 'Rest Day', workout.description || 'Full recovery day. Stay hydrated and get good sleep.'));
  } else {
    if (workout.warm_up)       body.appendChild(makeSection('warmup',   '🔥', 'Warm Up',      workout.warm_up));
    if (workout.main_session)  body.appendChild(makeSection('main',     '⚡', 'Main Session', workout.main_session));
    if (workout.cool_down)     body.appendChild(makeSection('cooldown', '🧊', 'Cool Down',    workout.cool_down));
    if (workout.notes)         body.appendChild(makeSection('notes',    '📋', 'Coach Notes',  workout.notes));

    // Fallback if AI returned plain description only
    if (!workout.warm_up && !workout.main_session && workout.description) {
      body.appendChild(makeSection('main', '⚡', 'Session', workout.description));
    }
  }

  document.getElementById('workout-modal').classList.add('show');
}

function makeSection(type, icon, label, text) {
  const section = document.createElement('div');
  section.className = `workout-section ${type}`;

  section.innerHTML = `
    <div class="workout-section-header">
      <span class="workout-section-icon">${icon}</span>
      ${label}
    </div>
    <div class="workout-section-body">${text}</div>
  `;
  return section;
}

function closeModal() {
  document.getElementById('workout-modal').classList.remove('show');
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('workout-modal').addEventListener('click', function(e) {
    if (e.target === this) closeModal();
  });
});
