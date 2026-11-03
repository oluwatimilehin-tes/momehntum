exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method not allowed" };
  const key = process.env.OPENAI_API_KEY;
  if (!key) return { statusCode: 503, body: JSON.stringify({ error: "AI is not configured yet. The app owner must add OPENAI_API_KEY to the Netlify environment variables." }) };
  try {
    const body = JSON.parse(event.body || "{}");
    const system = `You are Momentum, the central decision-making and planning engine of a personal productivity app. You are not a passive chatbot. Your primary job is to interpret what the user says, make sound decisions, and translate those decisions into a realistic plan that the app can apply. Be warm, direct, grounded and concise. Challenge distorted assumptions gently (for example, all-or-nothing thinking, unrealistic workloads, or switching goals impulsively), but never shame the user. Decide suitable task durations yourself; do not ask the user to choose minutes or hours. Protect fixed commitments, sleep, meals, travel, rest and personal responsibilities. Never schedule over fixed commitments. Leave breathing room. The user may ask for a one-day rescue/reset plan when overwhelmed or behind; in that case create a temporary plan for today only, replacing only unfinished tasks scheduled for today while preserving completed tasks and the normal weekly routine. If the user expresses a longer-term ambition, integrate small sustainable actions into the next several days, using existing goals and prior commitments to preserve continuity. Do not automatically delete or rewrite established weekly commitments or permanently change the routine. Add actionable tasks through updates; propose lasting routine changes in the reply and ask permission before applying them. If the user is simply reflecting or chatting and no plan change is needed, return no updates. Never claim a change was applied unless it is included in updates. Use saved reflections and wins as evidence of skills and progress when relevant; do not invent achievements. Output must be valid JSON for chat actions.`;
    let messages;
    if (body.action === "plan") {
      const planSystem = system + ` Return valid JSON only with shape {"summary":"...","tasks":[{"title":"...","date":"YYYY-MM-DD","time":"HH:MM or empty","duration":30,"reason":"..."}],"resources":[{"title":"...","why":"...","url":""}]}. Schedule around existing commitments. If the user has no routine, propose a gentle starter rhythm with a few repeatable anchors rather than a packed timetable. Do not schedule tasks inside known commitments. Leave buffer time and at least one recovery/rest period. Include useful resources only when you are confident they exist.`;
      messages = [{ role: "system", content: planSystem }, { role: "user", content: `Build a realistic starter plan for this goal. Goal: ${JSON.stringify(body.goal)}. Profile: ${JSON.stringify(body.profile || {})}. Existing commitments: ${JSON.stringify(body.routines || [])}. Standby tasks: ${JSON.stringify(body.standby || [])}. Return 4-10 upcoming tasks between today and the deadline, sized to available weekly hours. The plan should fit the person's actual starting point.` }];
    } else if (body.action === "chat") {
      const chatSystem = system + `\nReturn ONLY JSON with this exact shape: {"reply":"natural concise response","updates":{"mode":"none|today_reset|today_update","tasks":[{"title":"...","date":"YYYY-MM-DD","time":"HH:MM or empty","duration":25,"goalId":"existing goal id or empty"}],"standby":[{"title":"...","duration":15,"category":"Learning|Admin|Creative|Personal"}]}}. Use updates.mode=today_reset when the user says the day has gone off track, they are overwhelmed, behind, or need a fresh plan for the remaining day. This replaces only unfinished tasks for today. Use today_update for normal additions or reshaping without resetting today's existing tasks. For a longer-term goal, create small concrete actions across the coming 3-7 days, sized by your judgement, and connect them to an existing goal when possible. If the user is only sharing an update or asking a question, use mode=none and empty arrays. Never generate more than 5 tasks in one response unless they explicitly request a larger plan. Do not invent precise availability: use flexible time (empty time) unless a clear free window is available from the context. Keep tasks realistic and avoid stacking them back-to-back.`;
      messages = [{ role: "system", content: chatSystem + `\nSaved workspace context: ${JSON.stringify(body.context || {}).slice(0, 22000)}` },
        ...(body.history || []).slice(-12).map(m => ({ role: m.role === "assistant" ? "assistant" : "user", content: String(m.content).slice(0, 4000) })),
        { role: "user", content: String(body.message || "").slice(0, 4000) }];
    } else if (body.action === "analyze_schedule_text") {
      const text = String(body.text || "").slice(0, 30000);
      if (!text.trim()) throw new Error("The document did not contain readable text.");
      messages = [{ role: "system", content: system + ` Extract recurring weekly commitments from the supplied schedule document. Return valid JSON only: {"commitments":[{"title":"...","day":"Monday","start":"08:00","end":"10:00"}]}. Use full English day names and 24-hour time. If a date-specific commitment has a clear date, skip it for now rather than guessing a recurring day. Omit unclear items.` }, { role: "user", content: `Extract fixed commitments from this uploaded routine document:\n${text}` }];
    } else if (body.action === "analyze_schedule") {
      if (!body.image || !String(body.image).startsWith("data:image/")) throw new Error("Please upload a valid timetable image.");
      const imageUrl = String(body.image);
      if (imageUrl.length > 11_000_000) throw new Error("That image is too large. Please upload an image under 8MB.");
      messages = [
        { role: "system", content: system + ` Read the timetable image carefully. Extract only clear recurring weekly commitments. Return valid JSON only in this shape: {"commitments":[{"title":"Class name or commitment","day":"Monday","start":"08:00","end":"10:00"}]}. Use full English day names and 24-hour times. If a time or day is unclear, omit that item rather than guessing. Do not create study tasks from the timetable; only extract fixed commitments.` },
        { role: "user", content: [{ type: "text", text: "Please read this timetable and extract the weekly commitments. Be conservative: do not guess unclear details." }, { type: "image_url", image_url: { url: imageUrl, detail: "high" } }] }
      ];
    } else return { statusCode: 400, body: JSON.stringify({ error: "Unknown action" }) };

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST", headers: { "Authorization": `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: process.env.OPENAI_MODEL || "gpt-4o-mini", messages, temperature: 0.35, ...(["plan", "analyze_schedule", "analyze_schedule_text", "chat"].includes(body.action) ? { response_format: { type: "json_object" } } : {}) })
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error?.message || "AI request failed");
    const content = result.choices?.[0]?.message?.content || "";
    if (body.action === "plan") return { statusCode: 200, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ plan: JSON.parse(content) }) };
    if (body.action === "analyze_schedule" || body.action === "analyze_schedule_text") return { statusCode: 200, headers: { "Content-Type": "application/json" }, body: JSON.stringify(JSON.parse(content)) };
    if (body.action === "chat") return { statusCode: 200, headers: { "Content-Type": "application/json" }, body: JSON.stringify(JSON.parse(content)) };
    return { statusCode: 200, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reply: content }) };
  } catch (error) {
    return { statusCode: 500, body: JSON.stringify({ error: error.message || "Something went wrong" }) };
  }
};
