import { test } from 'node:test';
import { equal } from 'node:assert';
import { dayLabel, timeLabel, hasStarted, groupByDay } from '../src/lib/game-time.mjs';

test('dayLabel returns proper date string', () => {
  const result = dayLabel('2026-11-26T18:00:00Z');
  equal(result, 'Thursday, Nov 26');
});

test('timeLabel returns proper time string', () => {
  const result = timeLabel('2026-11-26T18:00:00Z');
  equal(result, '11:00 AM');
});

test('hasStarted returns true for past games', () => {
  const result = hasStarted('2026-11-26T18:00:00Z', new Date('2026-11-26T19:00:00Z'));
  equal(result, true);
});

test('hasStarted returns false for future games', () => {
  const result = hasStarted('2026-11-26T18:00:00Z', new Date('2026-11-26T17:00:00Z'));
  equal(result, false);
});

test('dayLabel returns "Date to be announced" for null input', () => {
  const result = dayLabel(null);
  equal(result, 'Date to be announced');
});

test('timeLabel returns "Time TBD" for null input', () => {
  const result = timeLabel(null);
  equal(result, 'Time TBD');
});

test('hasStarted returns false for null input', () => {
  const result = hasStarted(null);
  equal(result, false);
});

test('groupByDay groups games by day correctly', () => {
  const games = [
    { game_date_time: '2026-11-26T18:00:00Z' },
    { game_date_time: '2026-11-26T19:00:00Z' },
    { game_date_time: '2026-11-27T18:00:00Z' }
  ];
  
  const result = groupByDay(games);
  equal(result.length, 2);
  equal(result[0].label, 'Thursday, Nov 26');
  equal(result[0].games.length, 2);
  equal(result[1].label, 'Friday, Nov 27');
  equal(result[1].games.length, 1);
});

test('groupByDay handles empty input', () => {
  const result = groupByDay([]);
  equal(result.length, 0);
});

test('groupByDay handles null input', () => {
  const result = groupByDay(null);
  equal(result.length, 0);
});

test('groupByDay handles game with null date time', () => {
  const games = [
    { game_date_time: '2026-11-26T18:00:00Z' },
    { game_date_time: null }
  ];
  
  const result = groupByDay(games);
  equal(result.length, 2);
  equal(result[0].label, 'Thursday, Nov 26');
  equal(result[0].games.length, 1);
  equal(result[1].label, 'Date to be announced');
  equal(result[1].games.length, 1);
});

test('groupByDay handles late UTC game that is same day in Denver', () => {
  // 2026-11-27T03:20:00Z is Thursday, Nov 26 in Denver time (2026-11-26T21:20:00-07:00)
  const games = [
    { game_date_time: '2026-11-27T03:20:00Z' }
  ];
  
  const result = groupByDay(games);
  equal(result.length, 1);
  equal(result[0].label, 'Thursday, Nov 26');
  equal(result[0].games.length, 1);
});