/**
 * Domain Classifier for Real-Life Dungeon Master.
 * Maps hostnames to categories and productive flags following PRD §6.
 */

export interface Classification {
  domain: string;
  category: string;
  isProductive: boolean;
}

const CATEGORY_MAP: Record<string, { category: string; isProductive: boolean }> = {
  // Development
  "github.com": { category: "Development", isProductive: true },
  "gitlab.com": { category: "Development", isProductive: true },
  "stackoverflow.com": { category: "Development", isProductive: true },
  "stackexchange.com": { category: "Development", isProductive: true },
  "developer.mozilla.org": { category: "Development", isProductive: true },
  "docs.python.org": { category: "Development", isProductive: true },
  "npmjs.com": { category: "Development", isProductive: true },
  "pypi.org": { category: "Development", isProductive: true },
  "vercel.com": { category: "Development", isProductive: true },
  "neon.tech": { category: "Development", isProductive: true },
  "supabase.com": { category: "Development", isProductive: true },
  "aws.amazon.com": { category: "Development", isProductive: true },
  "console.cloud.google.com": { category: "Development", isProductive: true },
  "localhost": { category: "Development", isProductive: true },
  "127.0.0.1": { category: "Development", isProductive: true },

  // Problem Solving / DSA
  "leetcode.com": { category: "DSA", isProductive: true },
  "hackerrank.com": { category: "DSA", isProductive: true },
  "codeforces.com": { category: "DSA", isProductive: true },

  // Study & Learning
  "wikipedia.org": { category: "Study", isProductive: true },
  "coursera.org": { category: "Study", isProductive: true },
  "udemy.com": { category: "Study", isProductive: true },
  "edx.org": { category: "Study", isProductive: true },
  "khanacademy.org": { category: "Study", isProductive: true },
  "arxiv.org": { category: "Study", isProductive: true },
  "scholar.google.com": { category: "Study", isProductive: true },
  "medium.com": { category: "Study", isProductive: true },

  // Productivity
  "notion.so": { category: "Productivity", isProductive: true },
  "docs.google.com": { category: "Productivity", isProductive: true },
  "sheets.google.com": { category: "Productivity", isProductive: true },
  "slides.google.com": { category: "Productivity", isProductive: true },
  "figma.com": { category: "Productivity", isProductive: true },
  "linear.app": { category: "Productivity", isProductive: true },
  "trello.com": { category: "Productivity", isProductive: true },

  // Communication
  "slack.com": { category: "Communication", isProductive: true },
  "teams.microsoft.com": { category: "Communication", isProductive: true },
  "mail.google.com": { category: "Communication", isProductive: true },
  "outlook.live.com": { category: "Communication", isProductive: true },
  "zoom.us": { category: "Communication", isProductive: true },

  // Entertainment / Distraction
  "youtube.com": { category: "Entertainment", isProductive: false },
  "netflix.com": { category: "Entertainment", isProductive: false },
  "twitch.tv": { category: "Entertainment", isProductive: false },
  "reddit.com": { category: "Entertainment", isProductive: false },
  "twitter.com": { category: "Entertainment", isProductive: false },
  "x.com": { category: "Entertainment", isProductive: false },
  "instagram.com": { category: "Entertainment", isProductive: false },
  "facebook.com": { category: "Entertainment", isProductive: false },
  "tiktok.com": { category: "Entertainment", isProductive: false },
  "disneyplus.com": { category: "Entertainment", isProductive: false },
  "hulu.com": { category: "Entertainment", isProductive: false },
};

export function extractDomain(rawUrl?: string): string | null {
  if (!rawUrl) return null;
  try {
    const url = new URL(rawUrl);
    // Ignore internal browser schemes
    if (
      url.protocol === "chrome:" ||
      url.protocol === "edge:" ||
      url.protocol === "about:" ||
      url.protocol === "chrome-extension:" ||
      url.protocol === "view-source:"
    ) {
      return null;
    }
    let hostname = url.hostname.toLowerCase();
    if (hostname.startsWith("www.")) {
      hostname = hostname.substring(4);
    }
    return hostname;
  } catch {
    return null;
  }
}

export function classifyDomain(domain: string, userOverrides: Record<string, Classification> = {}): Classification {
  // Check user custom overrides first
  if (userOverrides[domain]) {
    return userOverrides[domain];
  }

  // Exact match
  if (CATEGORY_MAP[domain]) {
    return { domain, ...CATEGORY_MAP[domain] };
  }

  // Suffix matching (e.g. docs.github.com -> github.com)
  for (const [key, val] of Object.entries(CATEGORY_MAP)) {
    if (domain.endsWith("." + key)) {
      return { domain, ...val };
    }
  }

  // Default fallback
  return {
    domain,
    category: "Browsing",
    isProductive: true,
  };
}
