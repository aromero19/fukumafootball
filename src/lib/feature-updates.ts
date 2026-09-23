// Keep newest additions first. The home page displays the first five entries.
export const featureUpdates = [
  {
    title: "Your saved picks, right away",
    description: "Already submitted this week? Choose your profile to see who you picked. Use Back to edit picks to make changes while games are still open.",
    href: "/picks",
    linkLabel: "See your picks",
  },
  {
    title: "One clear profile photo",
    description: "See your current photo separately from replacement links. Saving a new image clears pending choices, and Remove photo restores the silhouette.",
    href: "/profile",
    linkLabel: "Update your photo",
  },
  {
    title: "See the whole family’s results",
    description: "Results opens to the latest week with recorded results. See team images, winners, and everyone’s picks, with your selected player first.",
    href: "/results",
    linkLabel: "See weekly results",
  },
  {
    title: "Playing for money",
    description: "Standings now show admin-confirmed money participation. Find Angelo’s Venmo account and QR code on the new Play for Money page; status is updated manually after payment.",
    href: "/PlayForMoney",
    linkLabel: "Play for money",
  },


  {
    title: "Past seasons recovered",
    description: "Recovered picks from 2016–2024 are now available. Some games and weeks are missing, so these records and totals are incomplete.",
    href: "/history",
    linkLabel: "Browse the season archive",
  },

] as const;
