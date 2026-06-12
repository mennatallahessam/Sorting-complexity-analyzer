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
  chart.data.datasets[0].data = array;
  chart.update();
}

/** Run the generator step‑by‑step, respecting the selected speed */
export function runGenerator(gen, speed, onComplete) {
  animationSpeed = speed;
  function step() {
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
