// script.js - UI orchestration and interaction logic

import { parseInput, generateRandomArray, parseFileContent } from "./data.js";
import { algorithmsMap } from "./algorithms.js";
import { metrics, getMetrics } from "./metrics.js";
import { initChart, runGenerator, exportChartAsPng } from "./visualizer.js";

// ---------- UI Elements ----------
const manualInput = document.getElementById("manualInput");
const loadFileBtn = document.getElementById("loadFileBtn");
const fileInput = document.getElementById("fileInput");
const generateBtn = document.getElementById("generateBtn");
const randomOptions = document.getElementById("randomOptions");
const createRandomBtn = document.getElementById("createRandomBtn");
const closeRandomBtn = document.getElementById("closeRandomBtn");
const randSize = document.getElementById("randSize");
const randMax = document.getElementById("randMax");
const algList = document.getElementById("algList");
const runSelectedBtn = document.getElementById("runSelectedBtn");
const runAllBtn = document.getElementById("runAllBtn");
const speedSelect = document.getElementById("speedSelect");
const pauseBtn = document.getElementById("pauseBtn");
const resumeBtn = document.getElementById("resumeBtn");
const summaryContainer = document.getElementById("summaryContainer");
const exportCsvBtn = document.getElementById("exportCsvBtn");
const exportPngBtn = document.getElementById("exportPngBtn");

// ---------- State ----------
let currentGenerator = null;
let currentTimeoutId = null;
let isPaused = false;
let results = [];

// ---------- Helper Functions ----------
function populateAlgorithmCheckboxes() {
  const fragment = document.createDocumentFragment();
  Object.keys(algorithmsMap).forEach((name) => {
    const label = document.createElement("label");
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.value = name;
    label.appendChild(checkbox);
    label.appendChild(document.createTextNode(" " + name));
    fragment.appendChild(label);
  });
  algList.appendChild(fragment);
}

function getSelectedAlgorithms() {
  return Array.from(algList.querySelectorAll("input[type=checkbox]:checked")).map((c) => c.value);
}

function displayResult(name, metricObj) {
  const div = document.createElement("div");
  div.className = "result-card";
  div.innerHTML = `
    <strong>${name}</strong><br/>
    Time: ${metricObj.timeMs.toFixed(2)} ms<br/>
    Comparisons: ${metricObj.comparisons}<br/>
    Swaps: ${metricObj.swaps}`;
  summaryContainer.appendChild(div);
}

function resetUI() {
  summaryContainer.innerHTML = "";
  results = [];
}

function exportCSV() {
  if (results.length === 0) return;
  const header = ["Algorithm", "Time (ms)", "Comparisons", "Swaps"].join(",");
  const rows = results.map((r) => [r.name, r.timeMs.toFixed(2), r.comparisons, r.swaps].join(","));
  const csvContent = [header, ...rows].join("\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "sorting_summary.csv";
  a.click();
  URL.revokeObjectURL(url);
}

// ---------- Core Execution ----------
async function runAlgorithm(name, array) {
  metrics.reset();
  metrics.start();
  initChart(array);
  const gen = algorithmsMap[name](array);
  const speed = parseInt(speedSelect.value, 10);

  return new Promise((resolve) => {
    function step() {
      if (isPaused) {
        currentTimeoutId = setTimeout(step, 200); // poll while paused
        return;
      }
      const { value, done } = gen.next();
      if (done) {
        metrics.stop();
        const m = getMetrics();
        results.push({ name, ...m });
        displayResult(name, m);
        resolve();
        return;
      }
      // Chart update
      // visualizer.js updateChart is internal; we call runGenerator for consistency
      // But to keep simple, we reuse runGenerator logic here:
      // (visualizer.runGenerator will manage its own timeouts, so we delegate)
      // Instead, use runGenerator:
    }
    // Use visualizer's helper to manage animation loop
    runGenerator(gen, speed, () => {
      metrics.stop();
      const m = getMetrics();
      results.push({ name, ...m });
      displayResult(name, m);
      resolve();
    });
  });
}

async function runAlgorithms(names, baseArray) {
  resetUI();
  for (const name of names) {
    // Clone array for each algorithm to start from identical state
    const arrCopy = baseArray.slice();
    await runAlgorithm(name, arrCopy);
  }
}

// ---------- Event Handlers ----------
loadFileBtn.addEventListener("click", () => fileInput.click());
fileInput.addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (ev) => {
    const content = ev.target.result;
    const data = parseFileContent(content);
    manualInput.value = data.join(", ");
  };
  reader.readAsText(file);
});

generateBtn.addEventListener("click", () => randomOptions.classList.remove("hidden"));
closeRandomBtn.addEventListener("click", () => randomOptions.classList.add("hidden"));
createRandomBtn.addEventListener("click", () => {
  const size = parseInt(randSize.value, 10) || 50;
  const max = parseInt(randMax.value, 10) || 999;
  const arr = generateRandomArray(size, max);
  manualInput.value = arr.join(", ");
  randomOptions.classList.add("hidden");
});

runSelectedBtn.addEventListener("click", () => {
  const selected = getSelectedAlgorithms();
  if (selected.length === 0) return alert("Select at least one algorithm.");
  const raw = manualInput.value;
  const baseArray = parseInput(raw);
  if (baseArray.length === 0) return alert("Provide a non‑empty dataset.");
  runAlgorithms(selected, baseArray);
});

runAllBtn.addEventListener("click", () => {
  const all = Object.keys(algorithmsMap);
  const raw = manualInput.value;
  const baseArray = parseInput(raw);
  if (baseArray.length === 0) return alert("Provide a non‑empty dataset.");
  runAlgorithms(all, baseArray);
});

pauseBtn.addEventListener("click", () => {
  isPaused = true;
  pauseBtn.classList.add("hidden");
  resumeBtn.classList.remove("hidden");
});

resumeBtn.addEventListener("click", () => {
  isPaused = false;
  resumeBtn.classList.add("hidden");
  pauseBtn.classList.remove("hidden");
});

exportCsvBtn.addEventListener("click", exportCSV);
exportPngBtn.addEventListener("click", () => exportChartAsPng());

// Initialize UI on load
populateAlgorithmCheckboxes();

// Theoretical complexity table population
const complexityData = {
  "Bubble Sort": ["O(n)", "O(n²)", "O(n²)", "O(1)"],
  "Selection Sort": ["O(n²)", "O(n²)", "O(n²)", "O(1)"],
  "Insertion Sort": ["O(n)", "O(n²)", "O(n²)", "O(1)"],
  "Merge Sort": ["O(n log n)", "O(n log n)", "O(n log n)", "O(n)"],
  "Quick Sort": ["O(n log n)", "O(n log n)", "O(n²)", "O(log n)"],
  "Heap Sort": ["O(n log n)", "O(n log n)", "O(n log n)", "O(1)"],
  "Counting Sort": ["O(n + k)", "O(n + k)", "O(n + k)", "O(k)"],
  "Radix Sort": ["O(nk)", "O(nk)", "O(nk)", "O(n + k)"],
};

const tbody = document.querySelector("#complexityTable tbody");
Object.entries(complexityData).forEach(([alg, comps]) => {
  const tr = document.createElement("tr");
  tr.innerHTML = `<td>${alg}</td><td>${comps[0]}</td><td>${comps[1]}</td><td>${comps[2]}</td><td>${comps[3]}</td>`;
  tbody.appendChild(tr);
});
