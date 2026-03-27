# STRIDE — n8n + ChatGPT Integration Guide

---

## PART 1 — Get your OpenAI API Key (5 mins)

1. Go to **https://platform.openai.com**
2. Sign up or log in
3. Click your profile icon (top right) → **"API Keys"**
4. Click **"Create new secret key"** → give it a name like "STRIDE"
5. **Copy the key immediately** — it starts with `sk-...`
   ⚠️ You won't be able to see it again after closing the popup
6. Save it somewhere safe (Notes app, password manager)

> 💳 You'll need to add a payment method under Billing.
> A month of plan generation costs pennies — maybe $0.10–0.50/month.

---

## PART 2 — Set up n8n Cloud (5 mins)

1. Go to **https://n8n.io** and click **"Start for free"**
2. Create an account
3. You'll land on your n8n dashboard — this is where you build workflows

---

## PART 3 — Build the Workflow in n8n (10 mins)

This is the main part. Follow each step carefully.

### Step 1 — Create a new workflow
- Click **"+ New Workflow"** (top right of your n8n dashboard)
- Give it a name: **"STRIDE Plan Generator"**

---

### Step 2 — Add a Webhook node (the entry point)
- Click the **+** button in the canvas
- Search for **"Webhook"** and select it
- In the settings panel on the right:
  - **HTTP Method** → `POST`
  - **Path** → type `stride-plan` (this becomes part of your URL)
  - **Respond** → `Immediately` ← important, change this
  - **Response Mode** → `Using Respond to Webhook Node` ← set this
- Click **"Listen for test event"** — leave this running

---

### Step 3 — Add an OpenAI node
- Click the **+** after the Webhook node
- Search for **"OpenAI"** and select it
- Select **"Message a Model"** as the operation
- Click **"Create new credential"**:
  - Paste your `sk-...` API key
  - Click Save
- Set these fields:
  - **Model** → `gpt-4o` (or `gpt-3.5-turbo` for cheaper)
  - **Messages** → click "Add Message":
    - **Role** → `User`
    - **Content** → click the expression icon `{}` and paste this:

```
{{ $json.body.prompt }}
```

---

### Step 4 — Add a "Respond to Webhook" node
- Click **+** after the OpenAI node
- Search for **"Respond to Webhook"** and select it
- Set **Respond With** → `JSON`
- In the **Response Body** field, click the expression icon `{}` and paste:

```json
{
  "workouts": {{ $json.message.content }}
}
```

> ⚠️ Note: ChatGPT will return the JSON array as a string inside `message.content`.
> The STRIDE app is built to handle this automatically.

---

### Step 5 — Test it
- Click **"Test workflow"** (top of the canvas)
- Go back to your STRIDE dashboard in the browser
- Fill in your running details
- Paste your webhook URL (see Part 4 below) into the n8n field
- Hit **"⚡ Generate Plan"**
- Watch n8n light up as it processes the request!

---

### Step 6 — Activate the workflow
- Once the test works, click the **"Inactive"** toggle (top right) → turn it **Active**
- This makes your webhook live permanently

---

## PART 4 — Get your Webhook URL

1. Click on your **Webhook node** in n8n
2. You'll see two URLs:
   - **Test URL** — use this while testing (only works when workflow is open)
   - **Production URL** — use this once activated (works 24/7)
3. Copy the **Production URL** — it looks like:
   ```
   https://yourname.app.n8n.cloud/webhook/stride-plan
   ```
4. Paste it into the **"n8n Webhook URL"** field in your STRIDE dashboard

---

## PART 5 — Quick Troubleshooting

| Problem | Fix |
|---------|-----|
| "Something went wrong" in STRIDE | Check n8n execution log — click "Executions" in left sidebar |
| Webhook not receiving data | Make sure you're using Production URL and workflow is Active |
| OpenAI error | Check your API key is correct and you have billing set up |
| Empty calendar | The AI response may not be valid JSON — try gpt-4o instead of gpt-3.5 |
| CORS error in browser | Add a "Set Headers" node after Webhook, add header: `Access-Control-Allow-Origin: *` |

---

## How the data flows

```
Your Browser (STRIDE)
       │
       │  POST { prompt: "You are a running coach..." }
       ▼
  n8n Webhook
       │
       │  Passes prompt to ChatGPT
       ▼
  OpenAI (ChatGPT)
       │
       │  Returns JSON array of 30 workouts
       ▼
  Respond to Webhook
       │
       │  Sends { "workouts": [...] } back
       ▼
Your Browser (STRIDE)
  → Renders the calendar!
```

---

## The exact JSON your calendar expects

Each workout in the array needs these 4 fields:

```json
[
  {
    "day": 1,
    "type": "easy",
    "title": "Easy Recovery Run",
    "description": "30 minutes at conversational pace. Heart rate zone 2."
  },
  {
    "day": 2,
    "type": "rest",
    "title": "Rest Day",
    "description": "Full recovery. Light stretching optional."
  },
  {
    "day": 3,
    "type": "interval",
    "title": "Track Intervals",
    "description": "Warm up 10 mins, then 8 x 400m at 5K pace with 90 sec rest, cool down 10 mins."
  }
]
```

Valid `type` values: `easy` `tempo` `interval` `long` `rest`
