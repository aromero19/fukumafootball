const TIMEZONE = 'America/Denver';
const LOCALE = 'en-US';

export function dayLabel(iso) {
  if (!iso) return 'Date to be announced';
  
  // Create the date in UTC and format for Denver timezone
  const date = new Date(iso);
  return date.toLocaleDateString(LOCALE, { timeZone: TIMEZONE, weekday: 'long', month: 'short', day: 'numeric' });
}

export function timeLabel(iso) {
  if (!iso) return 'Time TBD';
  
  // Create the date in UTC and format for Denver timezone
  const date = new Date(iso);
  return date.toLocaleTimeString(LOCALE, { timeZone: TIMEZONE, hour: 'numeric', minute: '2-digit', hour12: true });
}

export function hasStarted(iso, now = Date.now()) {
  if (!iso) return false;
  
  // Compare the UTC times directly
  const gameDate = new Date(iso);
  const utcNow = new Date(now);
  
  return gameDate <= utcNow;
}

export function groupByDay(games) {
  if (!games || games.length === 0) return [];
  
  const groups = {};
  
  for (const game of games) {
    const gameDateTime = game.game_date_time;
    let dayLabelValue;
    
    if (!gameDateTime) {
      dayLabelValue = dayLabel(null);
    } else {
      const date = new Date(gameDateTime);
      dayLabelValue = date.toLocaleDateString(LOCALE, { timeZone: TIMEZONE, weekday: 'long', month: 'short', day: 'numeric' });
    }
    
    if (!groups[dayLabelValue]) {
      groups[dayLabelValue] = [];
    }
    
    groups[dayLabelValue].push(game);
  }
  
  return Object.entries(groups).map(([label, games]) => ({ label, games }));
}