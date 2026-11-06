import { Link } from "wouter";
import { Card } from "@/components/ui/card";
import { AppNavMenu } from "@/components/app-nav-menu";

interface Section {
  theme: string;
  changes: string[];
}

interface DateRelease {
  date: string;
  sections: Section[];
}

const releases: DateRelease[] = [
  {
    date: "May 2, 2026",
    sections: [
      {
        theme: "Create & Schedule Runs",
        changes: [
          "Tap the hamburger menu and choose \"Create Run\" to add a run for any date and time",
          "Location name and weather address are now separate fields — name your spot freely, then optionally pin a geocoded address for accurate weather",
          "Saved locations appear in a dropdown for quick selection — saving stores the name and weather coords for everyone",
          "Three-dot menu on run detail lets creators and admins edit or delete their runs",
          "Custom runs show a burnt-orange left stripe and the creator's name",
        ],
      },
      {
        theme: "Permission Sets",
        changes: [
          "Three roles: Runner (default), Creator, and Admin",
          "Creator role unlocked with a password — allows creating, editing, and deleting runs",
          "Admin role provides full override access, including deleting runs that already have check-ins",
          "Roles persist across sessions and can be managed from the Settings page",
        ],
      },
      {
        theme: "Settings Page",
        changes: [
          "New Settings page (hamburger menu → Settings) to manage your name and role in one place",
          "Shows your current role badge, password unlock to upgrade, and a sign-out button",
        ],
      },
      {
        theme: "New Logo",
        changes: [
          "Updated to the runners + lighthouse logo — two silhouettes at the coast",
          "Appears in the nav bar on every page and as the browser tab icon",
        ],
      },
    ],
  },
  {
    date: "March 19, 2026",
    sections: [
      {
        theme: "Skip Feature",
        changes: [
          "Tap \"I'm Skipping\" to mark yourself out for a run",
          "Skipper avatars appear in a muted stack alongside runners",
          "Switch between running and skipping instantly with one tap",
          "Separate \"Skipping\" section on the run detail page",
        ],
      },
      {
        theme: "Style Refresh",
        changes: [
          "New color palette: burnt orange primary, dark navy background, forest green accents",
          "Fraunces serif headings throughout the app",
          "Inter body font for clean readability",
          "Runner avatar colors updated to light pastels",
        ],
      },
      {
        theme: "Navigation & Layout",
        changes: [
          "Hamburger menu in the top-right corner",
          "What's New page added (you're reading it)",
          "Tide sparkline on the home card — SVG curve with run-time marker",
        ],
      },
    ],
  },
  {
    date: "February 20, 2026",
    sections: [
      {
        theme: "Timezone & Labels",
        changes: [
          "Fixed early-morning wrong-day display — now uses Eastern time correctly",
          "\"Undo\" renamed to \"Bail\" with an exit icon",
          "\"You're in\" changed to \"You're committed\"",
          "Post-run hide delay extended to 60 minutes",
        ],
      },
    ],
  },
  {
    date: "February 19, 2026",
    sections: [
      {
        theme: "Weather & Tides",
        changes: [
          "Weather forecast on home card, upcoming rows, and run detail",
          "Tide chart on run detail page (York Harbor, NOAA data)",
          "Wind speed, direction, and precipitation chance added",
          "App renamed from Run Group to Club Nubb",
        ],
      },
    ],
  },
  {
    date: "February 18, 2026",
    sections: [
      {
        theme: "Initial Launch",
        changes: [
          "Check in for upcoming weekday runs with a single tap",
          "See who else is running — avatars and name list",
          "Quick name entry stored locally, no account needed",
          "Runs auto-created Monday–Friday at 5:30 AM, Short Sands Beach",
        ],
      },
    ],
  },
];

export default function WhatsNew() {
  return (
    <div className="flex flex-col min-h-full">
      <div className="nav-header" style={{ background: "hsl(215,18%,24%)" }} data-testid="whats-new-header">
        <div className="max-w-[500px] mx-auto w-full px-4 pt-8 pb-6 flex items-center gap-3">
          <Link href="/" className="flex items-center gap-3 flex-1" data-testid="link-home">
            <img src="/logo.png" alt="Clubb Nubb" className="h-9 w-auto" />
            <span className="text-xl font-bold font-serif text-white tracking-tight" data-testid="text-app-name">
              Clubb Nubb
            </span>
          </Link>
          <AppNavMenu />
        </div>
      </div>

      <div className="content-wrapper flex-1 pb-8">
        <h1 className="text-[32px] font-bold font-serif leading-tight mb-5" style={{ color: "#F8FAFC" }} data-testid="text-heading">
          What's New
        </h1>
        <div className="space-y-5">
        {releases.map((release, i) => (
          <Card key={i} className="p-5 space-y-5" data-testid={`card-release-${i}`}>
            <h2 className="text-2xl font-bold font-serif leading-tight" data-testid={`text-release-date-${i}`}>
              {release.date}
            </h2>
            <div className="space-y-5" data-testid={`section-release-${i}`}>
              {release.sections.map((section, j) => (
                <div key={j} data-testid={`section-theme-${i}-${j}`}>
                  <h2 className="text-sm font-semibold text-primary mb-2 uppercase tracking-wide" data-testid={`text-theme-${i}-${j}`}>
                    {section.theme}
                  </h2>
                  <ul className="space-y-1.5">
                    {section.changes.map((change, k) => (
                      <li key={k} className="flex items-start gap-2 text-sm" data-testid={`text-change-${i}-${j}-${k}`}>
                        <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                        <span>{change}</span>
                      </li>
                    ))}
                  </ul>
                  {j < release.sections.length - 1 && (
                    <div className="mt-5 border-t border-border" />
                  )}
                </div>
              ))}
            </div>
          </Card>
        ))}
        </div>
      </div>
    </div>
  );
}
