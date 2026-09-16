"use client";

import { useState } from "react";
import { Sparkles, Send, AlertCircle } from "lucide-react";

type Message = { role: "user" | "assistant"; content: string };

export function CopilotChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [notConfigured, setNotConfigured] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function ask(e: React.FormEvent) {
    e.preventDefault();
    const question = input.trim();
    if (!question || isLoading) return;

    setInput("");
    setError(null);
    const nextMessages: Message[] = [...messages, { role: "user", content: question }];
    setMessages(nextMessages);
    setIsLoading(true);

    try {
      const res = await fetch("/api/copilot", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ question, history: messages }),
      });
      const data = await res.json();

      if (data.configured === false) {
        setNotConfigured(true);
      } else if (data.error) {
        setError(data.error);
      } else {
        setMessages([...nextMessages, { role: "assistant", content: data.answer }]);
      }
    } catch {
      setError("Couldn't reach the Copilot. Check your connection and try again.");
    } finally {
      setIsLoading(false);
    }
  }

  if (notConfigured) {
    return (
      <div className="flex items-start gap-3 rounded-md border border-warning bg-warning-subtle p-5">
        <AlertCircle className="mt-0.5 size-5 shrink-0 text-warning-subtle-foreground" />
        <div>
          <div className="text-sm font-semibold text-warning-subtle-foreground">Copilot not configured</div>
          <p className="mt-1 text-sm text-warning-subtle-foreground">
            The Command Copilot needs an <span className="font-mono">ANTHROPIC_API_KEY</span> set as a server-only
            environment variable. Every other AI Command Layer feature (Reorder Forecaster, Vendor Deadline Watcher,
            etc.) works without it — this is the one feature that genuinely needs a live model call, since it
            answers open-ended questions rather than following a fixed template.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[600px] flex-col rounded-md border border-border bg-card">
      <div className="flex-1 space-y-4 overflow-y-auto p-5">
        {messages.length === 0 && (
          <p className="text-sm text-foreground-subtle">
            Ask a planning question — e.g. &ldquo;what happens to the fuel budget if Maitri&rsquo;s departure moves
            up a week?&rdquo; The Copilot answers using recent agent activity, open incidents, and the latest status
            report.
          </p>
        )}
        {messages.map((m, i) => (
          <div key={i} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
            <div
              className={`max-w-[80%] rounded-md px-4 py-2.5 text-sm ${
                m.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"
              }`}
            >
              {m.content}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex items-center gap-2 text-xs text-foreground-subtle">
            <Sparkles className="size-3.5 animate-pulse" /> Thinking…
          </div>
        )}
        {error && <div className="rounded-sm bg-critical-subtle px-3 py-2 text-xs text-critical-subtle-foreground">{error}</div>}
      </div>

      <form onSubmit={ask} className="flex gap-2 border-t border-border p-4">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask the Copilot…"
          className="flex-1 rounded-sm border border-border-strong bg-background px-3 py-2 text-sm outline-none focus-visible:border-ring"
        />
        <button
          type="submit"
          disabled={isLoading || !input.trim()}
          className="flex items-center gap-1.5 rounded-sm bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
        >
          <Send className="size-3.5" /> Send
        </button>
      </form>
    </div>
  );
}
