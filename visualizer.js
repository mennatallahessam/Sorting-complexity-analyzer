// visualizer.js - handles Chart.js visualization and step playback

import { metrics } from "./metrics.js";

let chart = null;
let animationSpeed = 500; // default ms per step

/** Initialize Chart.js bar chart with the initial array */
export function initChart(initialArray) {
  const ctx = document.getElementById("chartCanvas").getContext("2d");

  // Create color array for bars (default accent color)
  const barColors = initialArray.map(() => getComputedStyle(document.documentElement).getPropertyValue("--accent-2").trim());

  chart = new Chart(ctx, {
    type: "bar",
    data: {
      labels: initialArray.map((_, i) => i + 1),
      datasets: [
        {
          label: "Values",
          data: initialArray,
          backgroundColor: barColors,
          borderWidth: 0,
        },
      ],
    },
    options: {
      animation: {
        duration: 0,
      },
      scales: {
        y: {
          beginAtZero: true,
        },
      },
      plugins: {
        legend: { display: false },
      },
    },
  });
}

/** Update chart data without animation */
function updateChart(array) {
  if (!chart) return;
  // Compute bar colors: highlight elements that changed compared to previous state
  const prev = chart.__prevArray || [];
  const current = window.currentIndices || [];
  const barColors = array.map((val, i) => {
    if (current.includes(i)) {
      return getCssVar('--accent-3'); // highlight comparison
    }
    const changed = prev[i] !== undefined && prev[i] !== val;
    return changed ? getCssVar('--accent-1') : getCssVar('--accent-2');
  });
  // Reset after use
  window.currentIndices = [];

  // Update labels to match array length
  chart.data.labels = array.map((_, i) => i + 1);
  chart.data.datasets[0].data = array;
  chart.data.datasets[0].backgroundColor = barColors;
  chart.update();
  // Save current array for next diff
  chart.__prevArray = array.slice();
}

/** Run the generator step‑by‑step, respecting the selected speed */
export function runGenerator(gen, speed, onComplete) {
  animationSpeed = speed;
  function step() {
    // Respect pause state via window.isPaused flag
    if (window.isPaused) {
      setTimeout(step, 200);
      return;
    }
    const { value, done } = gen.next();
    if (done) {
      if (onComplete) onComplete();
      return;
    }
    updateChart(value);
    setTimeout(step, animationSpeed);
  }
  step();
}

/** Export the current chart as PNG */
export function exportChartAsPng(filename = "sorting_visualization.png") {
  if (!chart) return;
  const url = chart.toBase64Image();
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
}

/** Helper to retrieve CSS variable for colors */
function getCssVar(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

export { getCssVar };
