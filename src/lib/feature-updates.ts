// Keep newest additions first. The home page displays the first five entries.
export const featureUpdates = [
  {
    title: "Easier player management",
    description: "Admins can find players in a compact table, filter participation, and edit details or photos in one place.",
    href: "/admin/players",
    linkLabel: "Manage players (admin only)",
  },
  {
    title: "Admin password recovery",
    description: "Admins can choose a new password using a recovery email. Ask the league administrator for a fresh recovery link if you cannot sign in.",
    href: "/admin/login",
    linkLabel: "Admin sign-in",
  },
  {
    title: "Playing for money",
    description: "Standings now show admin-confirmed money participation. Find Angelo’s Venmo account and QR code on the new Play for Money page; status is updated manually after payment.",
    href: "/PlayForMoney",
    linkLabel: "Play for money",
  },
  {
    title: "Clearer photo uploads",
    description: "Photo uploads now show separate preview and saving steps, with helpful messages if a request takes too long.",
    href: "/profile",
    linkLabel: "Update your photo",
  },


  {
    title: "Past seasons recovered",
    description: "Recovered picks from 2016–2024 are now available. Some games and weeks are missing, so these records and totals are incomplete.",
    href: "/history",
    linkLabel: "Browse the season archive",
  },

] as const;
