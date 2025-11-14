"use client";

import React, { useMemo, useState } from "react";

type Task = {
  id: string;
  title: string;
  effort: number; // 1-5
  impact: number; // 1-5
  due?: string;
  done?: boolean;
};

type Health = {
  sleepHours: number;
  waterCups: number;
  steps: number;
  breaksPerHour: number;
  mood: "low" | "ok" | "high";
};

export default function HomePage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [taskTitle, setTaskTitle] = useState("");
  const [taskEffort, setTaskEffort] = useState(2);
  const [taskImpact, setTaskImpact] = useState(3);
  const [taskDue, setTaskDue] = useState<string>("");

  const [health, setHealth] = useState<Health>({
    sleepHours: 7,
    waterCups: 6,
    steps: 6000,
    breaksPerHour: 2,
    mood: "ok",
  });

  const [aiResponse, setAiResponse] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const prioritized = useMemo(() => {
    return [...tasks].sort((a, b) => {
      const scoreA = a.impact * 2 - a.effort + (a.due ? 1 : 0);
      const scoreB = b.impact * 2 - b.effort + (b.due ? 1 : 0);
      return scoreB - scoreA;
    });
  }, [tasks]);

  function addTask() {
    if (!taskTitle.trim()) return;
    setTasks((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        title: taskTitle.trim(),
        effort: taskEffort,
        impact: taskImpact,
        due: taskDue || undefined,
        done: false,
      },
    ]);
    setTaskTitle("");
    setTaskEffort(2);
    setTaskImpact(3);
    setTaskDue("");
  }

  function toggleDone(id: string) {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, done: !t.done } : t)));
  }

  async function getInsights() {
    setLoading(true);
    setError(null);
    setAiResponse(null);
    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tasks, health }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      if (data.content) {
        setAiResponse(data.content);
      } else if (data.suggestions) {
        const { plan, habits, quickWins } = data.suggestions;
        const md = [
          "## Personalized Plan",
          "",
          plan,
          "",
          "## Habit Tweaks",
          "",
          ...habits.map((h: string) => `- ${h}`),
          "",
          "## Quick Wins",
          "",
          ...quickWins.map((q: string) => `- ${q}`),
        ].join("\n");
        setAiResponse(md);
      } else {
        setAiResponse("No insights returned.");
      }
    } catch (e: any) {
      setError(e?.message || "Failed to get insights");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="container">
      <header className="header">
        <h1>Agentic Coach</h1>
        <p>Take charge of productivity and health with integrated AI.</p>
      </header>

      <section className="grid">
        <div className="card">
          <h2>Productivity Planner</h2>
          <div className="row">
            <input
              placeholder="Task title"
              value={taskTitle}
              onChange={(e) => setTaskTitle(e.target.value)}
            />
            <label>
              Impact
              <input
                type="range"
                min={1}
                max={5}
                value={taskImpact}
                onChange={(e) => setTaskImpact(Number(e.target.value))}
              />
            </label>
            <label>
              Effort
              <input
                type="range"
                min={1}
                max={5}
                value={taskEffort}
                onChange={(e) => setTaskEffort(Number(e.target.value))}
              />
            </label>
            <input
              type="date"
              value={taskDue}
              onChange={(e) => setTaskDue(e.target.value)}
            />
            <button onClick={addTask}>Add</button>
          </div>
          <ul className="list">
            {prioritized.map((t) => (
              <li key={t.id} className={`item ${t.done ? "done" : ""}`}>
                <div className="item-main">
                  <input type="checkbox" checked={!!t.done} onChange={() => toggleDone(t.id)} />
                  <div className="item-texts">
                    <div className="title">{t.title}</div>
                    <div className="meta">
                      Impact {t.impact} ? Effort {t.effort}
                      {t.due ? ` ? Due ${t.due}` : ""}
                    </div>
                  </div>
                </div>
              </li>
            ))}
            {prioritized.length === 0 && <li className="muted">No tasks yet.</li>}
          </ul>
        </div>

        <div className="card">
          <h2>Health Tracker</h2>
          <div className="grid-2">
            <label>
              Sleep (h)
              <input
                type="number"
                min={0}
                max={24}
                value={health.sleepHours}
                onChange={(e) => setHealth({ ...health, sleepHours: Number(e.target.value) })}
              />
            </label>
            <label>
              Water (cups)
              <input
                type="number"
                min={0}
                max={30}
                value={health.waterCups}
                onChange={(e) => setHealth({ ...health, waterCups: Number(e.target.value) })}
              />
            </label>
            <label>
              Steps
              <input
                type="number"
                min={0}
                max={50000}
                value={health.steps}
                onChange={(e) => setHealth({ ...health, steps: Number(e.target.value) })}
              />
            </label>
            <label>
              Breaks/hr
              <input
                type="number"
                min={0}
                max={12}
                value={health.breaksPerHour}
                onChange={(e) => setHealth({ ...health, breaksPerHour: Number(e.target.value) })}
              />
            </label>
            <label>
              Mood
              <select
                value={health.mood}
                onChange={(e) => setHealth({ ...health, mood: e.target.value as Health["mood"] })}
              >
                <option value="low">Low</option>
                <option value="ok">OK</option>
                <option value="high">High</option>
              </select>
            </label>
          </div>
          <div className="hints">
            <span>Target: 7-9h sleep ? 8 cups water ? 8k-10k steps</span>
          </div>
        </div>
      </section>

      <section className="card">
        <div className="row space-between">
          <h2>AI Insights</h2>
          <button onClick={getInsights} disabled={loading}>
            {loading ? "Thinking..." : "Get AI Insights"}
          </button>
        </div>
        {error && <div className="error">{error}</div>}
        {aiResponse ? (
          <Markdown content={aiResponse} />
        ) : (
          <p className="muted">AI will propose a day plan, habit tweaks, and quick wins from your current inputs.</p>
        )}
      </section>

      <footer className="footer">
        <span>Tip: Set OPENAI_API_KEY on Vercel for enhanced AI.</span>
      </footer>
    </main>
  );
}

function Markdown({ content }: { content: string }) {
  // super-lightweight markdown renderer for headers and lists
  const html = useMemo(() => {
    const lines = content.split(/\r?\n/);
    const out: string[] = [];
    for (const line of lines) {
      if (line.startsWith("### ")) out.push(`<h3>${escapeHtml(line.slice(4))}</h3>`);
      else if (line.startsWith("## ")) out.push(`<h2>${escapeHtml(line.slice(3))}</h2>`);
      else if (line.startsWith("# ")) out.push(`<h1>${escapeHtml(line.slice(2))}</h1>`);
      else if (line.startsWith("- ")) out.push(`<li>${escapeHtml(line.slice(2))}</li>`);
      else if (line.trim() === "") out.push("<br/>");
      else out.push(`<p>${escapeHtml(line)}</p>`);
    }
    // Wrap consecutive <li> into <ul>
    const merged: string[] = [];
    let buffer: string[] = [];
    const flush = () => {
      if (buffer.length > 0) {
        merged.push(`<ul>${buffer.join("")}</ul>`);
        buffer = [];
      }
    };
    for (const frag of out) {
      if (frag.startsWith("<li>")) buffer.push(frag);
      else {
        flush();
        merged.push(frag);
      }
    }
    flush();
    return merged.join("");
  }, [content]);

  return <div className="markdown" dangerouslySetInnerHTML={{ __html: html }} />;
}

function escapeHtml(s: string) {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
