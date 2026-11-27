import test from "node:test";
import assert from "node:assert/strict";
import { pickRecord, teamForm } from "../src/lib/trends.mjs";

const game = (week, away, home, win, year = 2026) => ({
  game_id: year * 100 + week,
  year,
  week,
  away_team_id: away,
  home_team_id: home,
  win_team_id: win,
  game_date_time: null,
});

test("team form counts ties, ignores open games and orders by week", () => {
  const games = [game(4, 1, 2, 1), game(1, 1, 3, 3), game(2, 4, 1, 33), game(3, 1, 5, 1), game(5, 1, 6, 34), game(6, 7, 8, 7)];
  assert.deepEqual(teamForm(games, 1), {
    wins: 2,
    losses: 1,
    ties: 1,
    streak: { result: "W", length: 2 },
    lastFive: ["L", "T", "W", "W"],
  });
});

test("team form keeps only the last five and handles no results", () => {
  const games = [1, 2, 3, 4, 5, 6, 7].map((week) => game(week, 1, 2, week < 3 ? 1 : 2));
  assert.deepEqual(teamForm(games, 1).lastFive, ["L", "L", "L", "L", "L"]);
  assert.deepEqual(teamForm(games, 1).streak, { result: "L", length: 5 });
  assert.deepEqual(teamForm([game(1, 1, 2, 34)], 1), { wins: 0, losses: 0, ties: 0, streak: null, lastFive: [] });
});

test("pick record credits ties, splits season from career and lists newest first", () => {
  const rows = [
    { team_id: 1, game: game(1, 1, 2, 1) },
    { team_id: 1, game: game(2, 3, 1, 33) },
    { team_id: 1, game: game(3, 1, 4, 4) },
    { team_id: 1, game: game(4, 1, 5, 1) },
    { team_id: 1, game: game(5, 1, 6, 34) },
    { team_id: 1, game: game(9, 1, 2, 2, 2025) },
    { team_id: 2, game: game(1, 1, 2, 1) },
  ];
  const record = pickRecord(rows, 1, 2026);
  assert.equal(record.right, 3);
  assert.equal(record.wrong, 1);
  assert.equal(record.careerRight, 3);
  assert.equal(record.careerPicks, 5);
  assert.deepEqual(record.recent.map((row) => [row.week, row.opponentId, row.home, row.right, row.tie]), [
    [4, 5, false, true, false],
    [3, 4, false, false, false],
    [2, 3, true, true, true],
  ]);
});

test("pick record is empty for a team never picked", () => {
  assert.deepEqual(pickRecord([], 9, 2026), { right: 0, wrong: 0, careerRight: 0, careerPicks: 0, recent: [] });
});
