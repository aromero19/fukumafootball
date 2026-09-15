// Only actual scored picks contribute. Missing weeks are never zero-percent weeks.
export function summarizeHistory(rows) {
  const seasons = new Map();
  for (const row of rows) {
    const scored = Number(row.scored_picks), correct = Number(row.correct_picks);
    if (!scored) continue;
    const season = seasons.get(row.year) ?? { year: row.year, correct: 0, scored: 0, weeks: 0 };
    season.correct += correct; season.scored += scored; season.weeks++;
    seasons.set(row.year, season);
  }
  return [...seasons.values()].sort((a,b)=>a.year-b.year).map(row=>({...row,rate:100*row.correct/row.scored}));
}
