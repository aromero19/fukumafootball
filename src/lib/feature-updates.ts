// Keep newest additions first. The home page displays the first five entries.
export const featureUpdates = [
  {
    title: "Clearer photo uploads",
    description: "Photo uploads now show separate preview and saving steps, with helpful messages if a request takes too long.",
    href: "/profile",
    linkLabel: "Update your photo",
  },
  {
    title: "Clearer historical standings",
    description: "Browse past seasons with readable week links and standings limited to players with recorded scores. Recovered historical records remain incomplete.",
    href: "/standings",
    linkLabel: "View standings",
  },
  {
    title: "Historical statistics",
    description: "Explore career totals, season accuracy, and weekly trends for current and former players.",
    href: "/history",
    linkLabel: "Explore player history",
  },
  {
    title: "Past seasons recovered",
    description: "Recovered picks from 2016–2024 are now available. Some games and weeks are missing, so these records and totals are incomplete.",
    href: "/history",
    linkLabel: "Browse the season archive",
  },
  {
    title: "Upload your pictures",
    description: "Choose a photo from your phone or computer, preview it, and save it directly to your profile.",
    href: "/profile",
    linkLabel: "Upload a photo",
  },
] as const;
