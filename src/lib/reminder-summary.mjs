const days = ["Sundays", "Mondays", "Tuesdays", "Wednesdays", "Thursdays", "Fridays", "Saturdays"];

// One-line state shown on the closed "Reminder emails" row of the profile page.
export function reminderSummary(setting) {
  if (!setting) return "Couldn’t load";
  if (!setting.has_email) return "Off · needs an email on file";
  if (!setting.enabled) return "Off";
  const [hour, minute] = setting.send_time.split(":").map(Number);
  const time = `${hour % 12 || 12}:${String(minute).padStart(2, "0")} ${hour < 12 ? "AM" : "PM"}`;
  return `On · ${days[setting.day]} at ${time}`;
}
