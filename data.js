// data.js - utilities for dataset handling

/**
 * Parse a string of numbers separated by commas, spaces, or newlines into an array of integers.
 */
export function parseInput(text) {
  if (!text) return [];
  return text
    .trim()
    .split(/[,\s]+/)
    .map(Number)
    .filter((n) => !isNaN(n));
}

/** Generate a random integer between 0 and max (inclusive) */
function randInt(max) {
  return Math.floor(Math.random() * (max + 1));
}

/**
 * Generate a random array of given size and max value.
 */
export function generateRandomArray(size = 50, maxVal = 999) {
  const arr = [];
  for (let i = 0; i < size; i++) {
    arr.push(randInt(maxVal));
  }
  return arr;
}

/**
 * Read a plain‑text file (as string) and parse numbers.
 * The UI will pass the file content to this function.
 */
export function parseFileContent(content) {
  return parseInput(content);
}
