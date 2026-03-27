# STRIDE — AI Running Plan Dashboard

A dark, sleek running dashboard with user auth, AI-generated monthly training plans, and a drag-and-drop calendar.

---

## Folder Structure

```
stride/
├── index.html          ← Main HTML (all screens)
├── css/
│   └── styles.css      ← All styles & theming
├── js/
│   ├── auth.js         ← Sign up / Login / Logout
│   ├── calendar.js     ← Calendar render + drag-and-drop
│   └── app.js          ← Plan generation (n8n + demo mode)
└── README.md
```

---

## How to Run

Just open `index.html` in any browser. No build step required.

---

## Features

- **Auth** — Sign up & login with accounts stored in localStorage
- **Training form** — 5K PB, race goal (distance + time), days/week
- **AI plan generation** — Two modes:
  1. **n8n + ChatGPT** (paste your webhook URL)
  2. **Demo mode** (uses Anthropic API directly — no webhook needed)
- **Drag-and-drop calendar** — Swap workouts between days
- **Workout modal** — Click any card for full details

---

## n8n Integration

### Setup

1. Create an n8n workflow with a **Webhook** trigger node
2. Add an **OpenAI / ChatGPT** node — pass `{{$json.prompt}}` as the user message
3. Return the ChatGPT response as JSON
4. Paste your webhook URL into the dashboard sidebar

### Payload sent to your webhook

```json
{
  "pb_time": "22:00–25:00",
  "goal_distance": "10K",
  "goal_time": "sub 45:00 for 10K",
  "training_days_per_week": 4,
  "month": "March 2026",
  "prompt": "You are an expert running coach..."
}
```

### Expected response from n8n

```json
{
  "workouts": [
    { "day": 1, "type": "easy",     "title": "Easy Run",    "description": "30 min at conversational pace." },
    { "day": 2, "type": "rest",     "title": "Rest Day",    "description": "Full recovery." },
    { "day": 3, "type": "interval", "title": "Track Reps",  "description": "8 x 400m at 5K pace, 90s rest." },
    ...
  ]
}
```

Valid workout `type` values: `easy` | `tempo` | `interval` | `long` | `rest`

---

## Customisation

| What | Where |
|------|-------|
| Colour scheme | CSS variables at top of `css/styles.css` |
| Workout types / colours | `.workout-card[data-type="..."]` in `styles.css` |
| AI prompt | `buildPrompt()` in `js/app.js` |
| Dropdown options | `index.html` select elements |
