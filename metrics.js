// metrics.js - tracking comparisons, swaps and timing

export const metrics = {
  comparisons: 0,
  swaps: 0,
  startTime: 0,
  endTime: 0,

  reset() {
    this.comparisons = 0;
    this.swaps = 0;
    this.startTime = 0;
    this.endTime = 0;
  },

  start() {
    this.startTime = performance.now();
  },

  stop() {
    this.endTime = performance.now();
  },

  get duration() {
    return this.endTime - this.startTime;
  },

  incrementComparisons() {
    this.comparisons++;
  },

  incrementSwaps() {
    this.swaps++;
  },
};

export function getMetrics() {
  return {
    comparisons: metrics.comparisons,
    swaps: metrics.swaps,
    timeMs: metrics.duration,
  };
}
