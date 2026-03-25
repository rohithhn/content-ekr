/**
 * studioIconRenderer — converts a Lucide icon name into an SVG data URL
 * suitable for loading into fabric.js as a fabric.Image.
 *
 * Uses react-dom/server renderToStaticMarkup to generate the SVG string
 * without touching the DOM, then creates a Blob URL from it.
 *
 * All URLs returned are object URLs — call URL.revokeObjectURL() when done
 * if you care about memory (fabric.Image holds a ref so revoke after load).
 */

import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import * as LucideIcons from "lucide-react";

/** All icon names available to the AI layout generator. */
export const AVAILABLE_ICONS = [
  // Security / threat
  "Shield", "ShieldAlert", "ShieldCheck", "ShieldOff", "ShieldX",
  "Lock", "LockKeyhole", "LockOpen", "KeyRound", "Key",
  "Bug", "AlertTriangle", "AlertCircle", "AlertOctagon",
  "Eye", "EyeOff", "Fingerprint", "Scan", "ScanLine",
  // AI / ML
  "Cpu", "Brain", "Zap", "Sparkles", "Bot", "CircuitBoard",
  "Network", "Workflow", "Boxes", "Layers",
  // Data / analytics
  "BarChart2", "BarChart3", "BarChart4", "LineChart", "PieChart",
  "TrendingUp", "TrendingDown", "Activity", "Gauge",
  "Database", "Server", "HardDrive", "Archive",
  // DevOps / infra
  "GitBranch", "GitMerge", "GitPullRequest", "Terminal",
  "Code", "Code2", "FileCode", "Globe", "Cloud", "CloudLightning",
  // Process / flow
  "ArrowRight", "ArrowDown", "ArrowLeft", "ArrowUp",
  "ArrowRightLeft", "Repeat", "RefreshCw", "RotateCcw",
  "Filter", "Funnel", "SlidersHorizontal", "Settings2",
  // Status / compliance
  "CheckCircle", "CheckCircle2", "XCircle", "MinusCircle",
  "FileCheck", "FileX", "FileText", "ClipboardCheck",
  "Scale", "Gavel", "Flag", "Bookmark",
  // Communication / people
  "Users", "User", "UserCheck", "UserX", "Building", "Building2",
  "Mail", "Bell", "BellOff", "MessageSquare",
  // Misc / decorative
  "Star", "Target", "Crosshair", "Flame", "Rocket",
  "Award", "Medal", "Trophy", "ThumbsUp",
  "Clock", "Timer", "Calendar", "Search", "Link", "ExternalLink",
] as const;

export type IconName = (typeof AVAILABLE_ICONS)[number];

/**
 * Returns a data URL (base64 SVG) for the given icon name, color, and size.
 * Returns empty string if the icon doesn't exist.
 */
export function iconToDataURL(
  name: string,
  color: string,
  size: number = 48
): string {
  const Icon = (LucideIcons as Record<string, any>)[name];
  if (!Icon) return "";

  try {
    const svgString = renderToStaticMarkup(
      createElement(Icon, {
        color,
        size,
        strokeWidth: 1.5,
      })
    );
    const b64 = btoa(unescape(encodeURIComponent(svgString)));
    return `data:image/svg+xml;base64,${b64}`;
  } catch {
    return "";
  }
}
