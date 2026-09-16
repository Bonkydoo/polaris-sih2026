import { CopilotChat } from "./copilot-chat";

export default function CopilotPage() {
  return (
    <div>
      <div className="mb-6">
        <div className="text-[11px] uppercase tracking-[0.15em] text-foreground-subtle">AI Command Layer</div>
        <h2 className="mt-1 font-heading text-xl font-semibold text-foreground">Command Copilot</h2>
      </div>
      <CopilotChat />
    </div>
  );
}
