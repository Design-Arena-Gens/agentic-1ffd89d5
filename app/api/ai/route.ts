import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const tasks = (body?.tasks ?? []) as Array<{
      title: string;
      effort: number;
      impact: number;
      due?: string;
      done?: boolean;
    }>;
    const health = (body?.health ?? {}) as {
      sleepHours?: number;
      waterCups?: number;
      steps?: number;
      breaksPerHour?: number;
      mood?: string;
    };

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      const suggestions = buildFallbackSuggestions(tasks, health);
      return NextResponse.json({ provider: "fallback", suggestions });
    }

    const prompt = buildPrompt(tasks, health);

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0.7,
        messages: [
          {
            role: "system",
            content:
              "You are an elite productivity and health coach. Be concise, actionable, and specific. Consider task priority (impact/effort/urgency), energy management, and recovery. Output structured, markdown-friendly guidance.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      const suggestions = buildFallbackSuggestions(tasks, health, `AI error: ${text}`);
      return NextResponse.json({ provider: "fallback", suggestions });
    }

    const data = await res.json();
    const content = data?.choices?.[0]?.message?.content ?? "";
    return NextResponse.json({ provider: "openai", content });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Unexpected error" },
      { status: 500 }
    );
  }
}

function buildPrompt(tasks: any[], health: Record<string, any>): string {
  const taskLines = tasks
    .slice(0, 30)
    .map(
      (t, i) =>
        `${i + 1}. ${t.title} (impact ${t.impact}/5, effort ${t.effort}/5${t.due ? `, due ${t.due}` : ""}${t.done ? ", marked done" : ""})`
    )
    .join("\n");

  const h = {
    sleep: Number(health.sleepHours ?? 0),
    water: Number(health.waterCups ?? 0),
    steps: Number(health.steps ?? 0),
    breaks: Number(health.breaksPerHour ?? 0),
    mood: String(health.mood ?? "unknown"),
  };

  return [
    "Here are my current tasks and health metrics.",
    "",
    "Tasks:",
    taskLines || "(none)",
    "",
    "Health:",
    `Sleep: ${h.sleep}h, Water: ${h.water} cups, Steps: ${h.steps}, Breaks/hour: ${h.breaks}, Mood: ${h.mood}`,
    "",
    "Please produce:",
    "1) A short day plan (time-boxed blocks).",
    "2) Top 5 task priorities with justifications (impact/effort/urgency).",
    "3) 5 habit tweaks that support today's workload (sleep, hydration, steps, breaks).",
    "4) 5 quick wins I can do in 10 minutes or less.",
    "Use markdown with headings and bullet lists. Be concrete, no fluff.",
  ].join("\n");
}

function buildFallbackSuggestions(
  tasks: Array<{ title: string; effort: number; impact: number; due?: string; done?: boolean }>,
  health: { sleepHours?: number; waterCups?: number; steps?: number; breaksPerHour?: number; mood?: string },
  note?: string
) {
  const incomplete = tasks.filter((t) => !t.done);
  const prioritized = [...incomplete].sort((a, b) => b.impact * 2 - b.effort - (a.impact * 2 - a.effort));
  const top = prioritized.slice(0, 5).map((t) => `${t.title} ? do soon (impact ${t.impact}, effort ${t.effort})`);

  const sleep = Number(health.sleepHours ?? 0);
  const water = Number(health.waterCups ?? 0);
  const steps = Number(health.steps ?? 0);
  const breaks = Number(health.breaksPerHour ?? 0);

  const habits: string[] = [];
  if (sleep < 7) habits.push("Aim for 7?9h tonight; set a fixed shutdown time.");
  else habits.push("Protect your sleep window; no screens 1h before bed.");
  if (water < 8) habits.push("Place a full bottle on desk; 2 cups by 10am, 4 by 2pm.");
  else habits.push("Maintain hydration cadence: 1 cup per hour during work.");
  if (steps < 8000) habits.push("Insert two 10-min walks (midday and late afternoon) to hit 8?10k steps.");
  else habits.push("Keep step streak with a brisk 20-min walk post-lunch.");
  if (breaks < 2) habits.push("Use 50/10 focus cycles; micro-stretch each break.");
  else habits.push("Sustain 50/10 cadence; add 2x mobility breaks (AM/PM).");

  const quickWins = incomplete
    .filter((t) => t.effort <= 2)
    .slice(0, 5)
    .map((t) => `Start: ${t.title} (<=10m setup)`);
  while (quickWins.length < 5) quickWins.push("Inbox sweep: archive or assign 10 emails.");

  const plan = [
    "09:00?11:00 Deep Work: top priority",
    "11:00?11:10 Break + hydration",
    "11:10?12:30 Deep Work: priority #2",
    "12:30?13:15 Lunch + 10-min walk",
    "13:15?15:00 Execution: small tasks",
    "15:00?15:10 Break + mobility",
    "15:10?16:30 Execution: priority #3",
    "16:30?17:00 Wrap-up & plan tomorrow",
  ].join("\n");

  if (note) habits.unshift(`(Note) ${note}`);

  return { plan, habits, quickWins, top } as const;
}
