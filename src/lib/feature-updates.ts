// Keep newest additions first. The home page displays the first five entries.
export const featureUpdates = [
  {
    title: "A simpler profile page",
    description:
      "Your profile now shows its two settings, photo and reminder emails, at a glance. Tap one to change it. Photos straight from your phone are welcome, and the save button lights up when yours is ready.",
    href: "/profile",
    linkLabel: "See your settings",
  },
  {
    title: "Straight to your picks",
    description:
      "Your phone or computer now remembers the profile you chose and opens Picks to it. Tap Change to switch. You can also add the site to your home screen from your browser menu.",
    href: "/picks",
    linkLabel: "Open my picks",
  },
  {
    title: "New phone-friendly look",
    description:
      "We've updated the site to work better on your phone. Team colors are now used across the site to make it more vibrant and fun!",
    href: "/picks",
    linkLabel: "See the new design",
  },
  {
    title: "A friendly reminder to make your picks",
    description:
      "Turn on email reminders in your Entry Profile and choose a day, time, and time zone. The default is Wednesday at 6 p.m. Mountain time. We’ll remind you before the first kickoff only if you haven’t submitted. An email address must be on file. Thanks to Ken Reed for the suggestion!",
    href: "/profile",
    linkLabel: "Set up pick reminders",
  },
  {
    title: "Your saved picks, right away",
    description:
      "Already submitted this week? Choose your profile to see who you picked. Use Back to edit picks to make changes while games are still open.",
    href: "/picks",
    linkLabel: "See your picks",
  },
] as const;
