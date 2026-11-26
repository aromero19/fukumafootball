// Team colors mapping by team ID
const teamColorsMap = new Map([
  [1, { bg: "#97233F", text: "#ffffff" }],
  [2, { bg: "#A71930", text: "#ffffff" }],
  [3, { bg: "#241773", text: "#ffffff" }],
  [4, { bg: "#00338D", text: "#ffffff" }],
  [5, { bg: "#0085CA", text: "#0b1220" }],
  [6, { bg: "#0B162A", text: "#ffffff" }],
  [7, { bg: "#FB4F14", text: "#0b1220" }],
  [8, { bg: "#311D00", text: "#ffffff" }],
  [9, { bg: "#003594", text: "#ffffff" }],
  [10, { bg: "#FB4F14", text: "#0b1220" }],
  [11, { bg: "#0076B6", text: "#ffffff" }],
  [12, { bg: "#203731", text: "#ffffff" }],
  [13, { bg: "#03202F", text: "#ffffff" }],
  [14, { bg: "#002C5F", text: "#ffffff" }],
  [15, { bg: "#006778", text: "#ffffff" }],
  [16, { bg: "#E31837", text: "#ffffff" }],
  [17, { bg: "#008E97", text: "#0b1220" }],
  [18, { bg: "#4F2683", text: "#ffffff" }],
  [19, { bg: "#002244", text: "#ffffff" }],
  [20, { bg: "#D3BC8D", text: "#0b1220" }],
  [21, { bg: "#0B2265", text: "#ffffff" }],
  [22, { bg: "#125740", text: "#ffffff" }],
  [23, { bg: "#000000", text: "#ffffff" }],
  [24, { bg: "#004C54", text: "#ffffff" }],
  [25, { bg: "#FFB612", text: "#0b1220" }],
  [26, { bg: "#0072B1", text: "#ffffff" }],
  [27, { bg: "#AA0000", text: "#ffffff" }],
  [28, { bg: "#002244", text: "#ffffff" }],
  [29, { bg: "#003594", text: "#ffffff" }],
  [30, { bg: "#D50A0A", text: "#ffffff" }],
  [31, { bg: "#4B92DB", text: "#0b1220" }],
  [32, { bg: "#5A1414", text: "#ffffff" }]
]);

// Default fallback colors
const DEFAULT_COLORS = { bg: "#0b2545", text: "#ffffff" };

/**
 * Returns background and text colors for a given team ID
 * @param {number} teamId - The team ID
 * @returns {{bg: string, text: string}} - Background and text color objects
 */
export function teamColors(teamId) {
  return teamColorsMap.get(teamId) || DEFAULT_COLORS;
}