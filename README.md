# Momentum — Functional MVP (v2)

Momentum is a responsive, mobile-first productivity workspace. This version expands the starter prototype around the idea that people may be starting with no routine, a partial routine, or a timetable that needs to be protected.

## Included
- First-run welcome/setup that asks for the user's name and whether they have an existing routine.
- Responsive navigation: sidebar on desktop and bottom navigation on phones.
- Today page with a single daily timeline combining fixed commitments and planned tasks.
- Goals and AI-assisted goal planning with a review/approval step.
- Manual recurring commitments and an image timetable upload flow. With the AI service configured, the image is sent to the server-side function for timetable extraction; extracted blocks are shown for confirmation before saving.
- Standby tasks that can be promoted into today's plan when a class, event or other commitment is cancelled.
- Task completion, daily completion percentage, streaks (at least 40% of the day's tasks, with at least one task), personal best, wins and daily reflections.
- AI companion context includes goals, tasks, routines, standby tasks, reflections and wins so it can help with decisions and identify useful experience to build on.
- Browser-local persistence via localStorage.

## Run locally
1. Install Node.js.
2. Extract the ZIP and open the `momentum` folder in VS Code.
3. Run `npm install`.
4. Copy `.env.example` to `.env` and add your OpenAI API key as `OPENAI_API_KEY=...`.
5. Run `npm run dev` and open the local URL shown by Netlify CLI.

The AI key must stay in the server environment. Do not put it in `app.js` or share it in chat.

## Deploy to Netlify
1. Push this folder to a GitHub repository.
2. Import the repository in Netlify.
3. Add `OPENAI_API_KEY` under Site configuration → Environment variables.
4. Deploy. Netlify uses `netlify.toml` to publish the site and functions.

## Important current limitations
- The welcome flow is a profile setup, not secure account authentication. Data is stored in the current browser only. It will not sync across devices and can be lost if browser storage is cleared.
- Timetable image reading, AI planning and AI chat require a configured OpenAI API key and a model that supports image input for timetable analysis.
- Image extraction is a best-effort assist. The user must review the extracted days and times before saving them.
- The AI companion can reason over saved workspace context, but there is no cloud memory or cross-device account database yet.
- Browser notifications, calendar integrations, robust schedule conflict detection, OCR fallback, account authentication, database sync, privacy/terms pages, API rate limiting and production security review remain future work.
- Streaks are based on task completion threshold, not merely opening the app. A day counts when at least 40% of that day's tasks are completed (and at least one task exists).


## Momentum Companion + document import update
- Routine upload accepts images, text-based PDF, DOCX and TXT files. PDF/DOCX text is extracted in the browser before being sent to the Netlify function for schedule parsing. Scanned PDFs should be uploaded as page images if they contain no selectable text. Legacy `.doc` files are not supported; save them as `.docx` first.
- The AI companion now returns structured plan updates. A one-day reset can move unfinished tasks for today out of the active plan and add a fresh set of tasks. Normal weekly fixed commitments are preserved.
- The companion can add small goal-building actions over the next several days, choosing task durations itself. It does not silently rewrite established weekly commitments; lasting routine changes should be proposed for approval.
- AI features require `OPENAI_API_KEY` in Netlify environment variables. Routine import and companion planning will not work until this is configured.
