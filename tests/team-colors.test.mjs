import { test } from 'node:test';
import assert from 'node:assert';
import { teamColors } from '../src/lib/team-colors.mjs';

// Helper function to calculate WCAG contrast ratio
function contrastRatio(color1, color2) {
  // Convert hex to RGB
  const rgb1 = hexToRgb(color1);
  const rgb2 = hexToRgb(color2);
  
  // Calculate relative luminance
  const lum1 = relativeLuminance(rgb1);
  const lum2 = relativeLuminance(rgb2);
  
  // Return contrast ratio (lighter / darker)
  const ratio = (Math.max(lum1, lum2) + 0.05) / (Math.min(lum1, lum2) + 0.05);
  return ratio;
}

// Convert hex color to RGB
function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
}

// Calculate relative luminance
function relativeLuminance(rgb) {
  const r = rgb.r / 255;
  const g = rgb.g / 255;
  const b = rgb.b / 255;
  
  // Apply sRGB transfer function
  const rSrgb = r <= 0.03928 ? r / 12.92 : Math.pow((r + 0.055) / 1.055, 2.4);
  const gSrgb = g <= 0.03928 ? g / 12.92 : Math.pow((g + 0.055) / 1.055, 2.4);
  const bSrgb = b <= 0.03928 ? b / 12.92 : Math.pow((b + 0.055) / 1.055, 2.4);
  
  return 0.2126 * rSrgb + 0.7152 * gSrgb + 0.0722 * bSrgb;
}

test('teamColors returns correct colors for known team IDs', () => {
  // Test all IDs from 1 to 32
  const expectedColors = new Map([
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

  for (const [teamId, expected] of expectedColors) {
    const result = teamColors(teamId);
    assert.deepStrictEqual(result, expected, `Team ${teamId} should return ${JSON.stringify(expected)}`);
  }
});

test('teamColors returns fallback colors for unknown team IDs', () => {
  const result = teamColors(999);
  assert.deepStrictEqual(result, { bg: "#0b2545", text: "#ffffff" });
});

test('teamColors meets WCAG contrast ratio requirements', () => {
  // Test all IDs from 1 to 32
  for (let teamId = 1; teamId <= 32; teamId++) {
    const { bg, text } = teamColors(teamId);
    const ratio = contrastRatio(bg, text);
    
    assert.ok(ratio >= 4.5, `Team ${teamId} must have WCAG contrast ratio of at least 4.5, got ${ratio.toFixed(2)}`);
  }
  
  // Test fallback ID
  const { bg, text } = teamColors(999);
  const ratio = contrastRatio(bg, text);
  
  assert.ok(ratio >= 4.5, `Fallback must have WCAG contrast ratio of at least 4.5, got ${ratio.toFixed(2)}`);
});