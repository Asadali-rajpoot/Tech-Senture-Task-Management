import React from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

interface ColorToken {
  name: string;
  hex: string;
  cssVar: string;
  twClass: string;
  textClass: string;
  usage: string;
  mapping: string;
}

const tokens: ColorToken[] = [
  {
    name: "Primary",
    hex: "#6366F1",
    cssVar: "var(--primary)",
    twClass: "bg-primary",
    textClass: "text-white",
    usage: "Primary actions, active nav items, links, focus rings",
    mapping: "Task status: In Progress",
  },
  {
    name: "Secondary",
    hex: "#8B5CF6",
    cssVar: "var(--secondary)",
    twClass: "bg-secondary",
    textClass: "text-white",
    usage: "Secondary actions, gradients/accents alongside Primary",
    mapping: "Secondary buttons, accented highlights",
  },
  {
    name: "Background",
    hex: "#F8FAFC",
    cssVar: "var(--background)",
    twClass: "bg-background border border-border",
    textClass: "text-text",
    usage: "App background / page canvas",
    mapping: "Main application layout canvas",
  },
  {
    name: "Text",
    hex: "#18181B",
    cssVar: "var(--text)",
    twClass: "bg-[#18181B]",
    textClass: "text-white",
    usage: "Primary body and heading text",
    mapping: "Standard text typography",
  },
  {
    name: "Muted",
    hex: "#71717A",
    cssVar: "var(--muted)",
    twClass: "bg-muted",
    textClass: "text-white",
    usage: "Secondary text, placeholders, timestamps, helper copy",
    mapping: "Priority: Low, Task status: To Do",
  },
  {
    name: "Success",
    hex: "#22C55E",
    cssVar: "var(--success)",
    twClass: "bg-success",
    textClass: "text-white",
    usage: "Completed status, positive confirmations (e.g. task Done)",
    mapping: "Task status: Done",
  },
  {
    name: "Warning",
    hex: "#F59E0B",
    cssVar: "var(--warning)",
    twClass: "bg-warning",
    textClass: "text-white",
    usage: "Medium priority, due-soon states, non-blocking alerts",
    mapping: "Priority: Medium",
  },
  {
    name: "Danger",
    hex: "#EF4444",
    cssVar: "var(--danger)",
    twClass: "bg-danger",
    textClass: "text-white",
    usage: "High priority, overdue badges, destructive actions",
    mapping: "Priority: High, Overdue badge, Delete actions",
  },
];

export default function DevColorsPage() {
  return (
    <div className="bg-background min-h-screen p-6 md:p-12">
      <div className="mx-auto max-w-5xl space-y-8">
        <div className="border-border flex items-center justify-between border-b pb-6">
          <div>
            <div className="flex items-center gap-3">
              <Link
                href="/"
                className="text-muted hover:text-text inline-flex items-center gap-1.5 text-sm transition-colors"
              >
                <ArrowLeft className="size-4" />
                Back to App
              </Link>
            </div>
            <h1 className="text-text mt-2 text-2xl font-bold tracking-tight">
              Design System — Color Tokens (QA)
            </h1>
            <p className="text-muted mt-1 text-sm">
              Verification page for the 8 design tokens defined in PRD.md §7.2
              and ARCHITECTURE.md §5.
            </p>
          </div>
          <span className="bg-primary/10 text-primary rounded-full px-3 py-1 text-xs font-semibold">
            Internal Dev QA
          </span>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {tokens.map((token) => (
            <div
              key={token.name}
              className="border-border bg-card overflow-hidden rounded-xl border shadow-sm transition-all hover:shadow-md"
            >
              <div
                className={`flex h-28 items-center justify-center font-mono text-sm font-semibold tracking-wide ${token.twClass} ${token.textClass}`}
                style={{ backgroundColor: token.hex }}
              >
                {token.hex}
              </div>
              <div className="space-y-2 p-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-text font-semibold">{token.name}</h3>
                  <code className="bg-muted/10 text-muted rounded px-1.5 py-0.5 font-mono text-xs">
                    {token.cssVar}
                  </code>
                </div>
                <p className="text-muted text-xs leading-relaxed">
                  <strong className="text-text font-medium">Usage:</strong>{" "}
                  {token.usage}
                </p>
                <p className="text-muted border-border/50 border-t pt-2 text-xs leading-relaxed">
                  <strong className="text-text font-medium">Mapping:</strong>{" "}
                  {token.mapping}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className="border-border bg-card rounded-xl border p-6">
          <h2 className="text-text mb-4 text-lg font-semibold">
            Color Palette & Usage Rules (PRD.md §7.2.1)
          </h2>
          <div className="text-muted grid grid-cols-1 gap-4 text-sm md:grid-cols-2">
            <div className="border-border/60 bg-background space-y-2 rounded-lg border p-4">
              <h3 className="text-text font-medium">Priority Mapping</h3>
              <ul className="space-y-1 text-xs">
                <li>
                  <strong className="text-[#71717A]">Low:</strong> Muted
                  (#71717A)
                </li>
                <li>
                  <strong className="text-[#F59E0B]">Medium:</strong> Warning
                  (#F59E0B)
                </li>
                <li>
                  <strong className="text-[#EF4444]">High:</strong> Danger
                  (#EF4444)
                </li>
              </ul>
            </div>
            <div className="border-border/60 bg-background space-y-2 rounded-lg border p-4">
              <h3 className="text-text font-medium">Task Status Mapping</h3>
              <ul className="space-y-1 text-xs">
                <li>
                  <strong className="text-[#71717A]">To Do:</strong> Muted
                  (#71717A)
                </li>
                <li>
                  <strong className="text-[#6366F1]">In Progress:</strong>{" "}
                  Primary (#6366F1)
                </li>
                <li>
                  <strong className="text-[#22C55E]">Done:</strong> Success
                  (#22C55E)
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
