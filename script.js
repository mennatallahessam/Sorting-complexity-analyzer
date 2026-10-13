// script.js — Vue 3 app orchestration (CDN global build)

import { parseInput, generateRandomArray, parseFileContent } from "./data.js";
import { algorithmsMap } from "./algorithms.js";
import { metrics, getMetrics } from "./metrics.js";
import { initChart, runGenerator, exportChartAsPng } from "./visualizer.js";

const { createApp, reactive, computed, ref } = Vue;

createApp({
  setup() {
    // ── State ────────────────────────────────────────────────────────────────
    const inputText = ref("");
    const showRandomModal = ref(false);
    const randSize = ref(50);
    const randMax = ref(999);
    const selectedAlgorithms = ref([]);
    const isRunning = ref(false);
    const isPaused = ref(false);
    const currentAlgorithmName = ref("None");
    const speed = ref(500);
    const results = reactive([]);
    const fileInputRef = ref(null);

    // Algorithm names and complexity data are static
    const algorithmNames = Object.keys(algorithmsMap);

    const complexityData = {
      "Bubble Sort":    ["O(n)",       "O(n²)",       "O(n²)",       "O(1)"],
      "Selection Sort": ["O(n²)",      "O(n²)",       "O(n²)",       "O(1)"],
      "Insertion Sort": ["O(n)",       "O(n²)",       "O(n²)",       "O(1)"],
      "Merge Sort":     ["O(n log n)", "O(n log n)",  "O(n log n)",  "O(n)"],
      "Quick Sort":     ["O(n log n)", "O(n log n)",  "O(n²)",       "O(log n)"],
      "Heap Sort":      ["O(n log n)", "O(n log n)",  "O(n log n)",  "O(1)"],
      "Counting Sort":  ["O(n + k)",   "O(n + k)",    "O(n + k)",    "O(k)"],
      "Radix Sort":     ["O(nk)",      "O(nk)",       "O(nk)",       "O(n + k)"],
    };

    // ── Computed ─────────────────────────────────────────────────────────────
    const sortedResults = computed(() =>
      [...results].sort((a, b) => a.timeMs - b.timeMs)
    );

    const maxTime = computed(() =>
      Math.max(...results.map((r) => r.timeMs), 1)
    );

    // ── Helpers ───────────────────────────────────────────────────────────────
    function rankClass(rank) {
      if (rank === 1) return "rank-1";
      if (rank === 2) return "rank-2";
      if (rank === 3) return "rank-3";
      return "rank-other";
    }

    function barClass(index, total) {
      if (index === 0) return "bar-fastest";
      if (index === total - 1 && total > 1) return "bar-slowest";
      return "bar-medium";
    }

    function barWidth(timeMs) {
      return Math.max(5, (timeMs / maxTime.value) * 100);
    }

    // ── File Input ────────────────────────────────────────────────────────────
    function triggerFileInput() {
      fileInputRef.value?.click();
    }

    function handleFileLoad(e) {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        inputText.value = parseFileContent(ev.target.result).join(", ");
      };
      reader.readAsText(file);
    }

    // ── Random Array ──────────────────────────────────────────────────────────
    function createRandom() {
      const arr = generateRandomArray(randSize.value || 50, randMax.value || 999);
      inputText.value = arr.join(", ");
      showRandomModal.value = false;
    }

    // ── Core Execution ────────────────────────────────────────────────────────
    async function runAlgorithm(name, array) {
      metrics.reset();
      currentAlgorithmName.value = name;
      metrics.start();
      initChart(array);
      const gen = algorithmsMap[name](array);

      return new Promise((resolve) => {
        runGenerator(gen, speed.value, () => {
          metrics.stop();
          const m = getMetrics();
          results.push({ name, ...m });
          resolve();
        });
      });
    }

    async function runAlgorithms(names) {
      const raw = inputText.value;
      const baseArray = parseInput(raw);
      if (baseArray.length === 0) {
        alert("Provide a non-empty dataset.");
        return;
      }

      // Clear previous results
      results.splice(0, results.length);
      isRunning.value = true;
      isPaused.value = false;
      window.isPaused = false;

      for (const name of names) {
        const arrCopy = baseArray.slice();
        await runAlgorithm(name, arrCopy);
      }

      isRunning.value = false;
      currentAlgorithmName.value = "None";
    }

    function runSelected() {
      if (selectedAlgorithms.value.length === 0) {
        alert("Select at least one algorithm.");
        return;
      }
      runAlgorithms(selectedAlgorithms.value);
    }

    function runAll() {
      runAlgorithms(algorithmNames);
    }

    // ── Pause / Resume ────────────────────────────────────────────────────────
    function pause() {
      isPaused.value = true;
      window.isPaused = true;
    }

    function resume() {
      isPaused.value = false;
      window.isPaused = false;
    }

    // ── Export ─────────────────────────────────────────────────────────────────
    function exportCSV() {
      if (results.length === 0) return;
      const header = ["Algorithm", "Time (ms)", "Comparisons", "Swaps"].join(",");
      const rows = results.map((r) =>
        [r.name, r.timeMs.toFixed(2), r.comparisons, r.swaps].join(",")
      );
      const csvContent = [header, ...rows].join("\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "sorting_summary.csv";
      a.click();
      URL.revokeObjectURL(url);
    }

    function exportPng() {
      exportChartAsPng();
    }

    // ── Expose to template ────────────────────────────────────────────────────
    return {
      inputText,
      showRandomModal,
      randSize,
      randMax,
      selectedAlgorithms,
      isRunning,
      isPaused,
      currentAlgorithmName,
      speed,
      results,
      sortedResults,
      algorithmNames,
      complexityData,
      fileInputRef,
      // helpers
      rankClass,
      barClass,
      barWidth,
      // handlers
      triggerFileInput,
      handleFileLoad,
      createRandom,
      runSelected,
      runAll,
      pause,
      resume,
      exportCSV,
      exportPng,
    };
  },
}).mount("#app");
