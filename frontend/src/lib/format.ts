const pad = (n: number) => n.toString().padStart(2, "0");

export function formatCountdown(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return "00:00";
  const total = Math.floor(seconds);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return "0m";
  const total = Math.floor(seconds);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m`;
  return `${total}s`;
}

export function formatExpiry(expiresAt: number): string {
  return formatDuration(Math.max(0, expiresAt - Math.floor(Date.now() / 1000)));
}

const timeFormat: Intl.DateTimeFormatOptions = {
  hour: "2-digit",
  minute: "2-digit",
};

export function formatListDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const now = new Date();
  const sameDay =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();
  if (sameDay) return date.toLocaleTimeString([], timeFormat);
  if (date.getFullYear() === now.getFullYear()) {
    return date.toLocaleDateString([], { month: "short", day: "numeric" });
  }
  return date.toLocaleDateString([], {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function formatFullDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString([], {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const exponent = Math.min(
    units.length - 1,
    Math.floor(Math.log(bytes) / Math.log(1024))
  );
  const value = bytes / 1024 ** exponent;
  return `${value >= 10 || exponent === 0 ? Math.round(value) : value.toFixed(1)} ${units[exponent]}`;
}

interface ParsedAddress {
  name: string;
  email: string;
}

export function parseAddress(raw: string): ParsedAddress {
  const value = (raw || "").trim();
  const match = value.match(/^(.*?)\s*<([^>]+)>$/);
  if (match) {
    const name = match[1].replace(/^["']|["']$/g, "").trim();
    const email = match[2].trim();
    return { name: name || email, email };
  }
  return { name: value, email: value };
}

export function initialsFor(parsed: ParsedAddress): string {
  const source = parsed.name.includes("@") ? parsed.name.split("@")[0] : parsed.name;
  const tokens = source.split(/[^a-zA-Z0-9]+/).filter(Boolean);
  if (tokens.length === 0) return "#";
  if (tokens.length === 1) return tokens[0].slice(0, 2).toUpperCase();
  return (tokens[0][0] + tokens[1][0]).toUpperCase();
}

export function toSnippet(body: string, max = 140): string {
  const clean = (body || "").replace(/\s+/g, " ").trim();
  if (!clean) return "";
  return clean.length > max ? `${clean.slice(0, max).trimEnd()}…` : clean;
}
