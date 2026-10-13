// script.js — Vue 3 app with Express backend integration

import { parseInput, generateRandomArray, parseFileContent } from "./data.js";
import { algorithmsMap } from "./algorithms.js";
import { metrics, getMetrics } from "./metrics.js";
import { initChart, runGenerator, exportChartAsPng } from "./visualizer.js";

const { createApp, reactive, computed, ref, onMounted } = Vue;

// ── API helpers ───────────────────────────────────────────────────────────────
const API = {
  async saveRun(sessionId, results) {
    try {
      const res = await fetch('/api/runs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: sessionId,
          results: results.map(r => ({
            algorithm:   r.name,
            time_ms:     r.timeMs,
            comparisons: r.comparisons,
            swaps:       r.swaps,
            array_size:  r.arraySize,
          })),
        }),
      });
      return res.ok;
    } catch { return false; }
  },

  async fetchHistory() {
    try {
      const res = await fetch('/api/runs');
      return res.ok ? res.json() : [];
    } catch { return []; }
  },

  async fetchStats() {
    try {
      const res = await fetch('/api/stats');
      return res.ok ? res.json() : [];
    } catch { return []; }
  },

  async deleteRun(id) {
    try {
      const res = await fetch(`/api/runs/${id}`, { method: 'DELETE' });
      return res.ok;
    } catch { return false; }
  },

  async clearHistory() {
    try {
      const res = await fetch('/api/runs', { method: 'DELETE' });
      return res.ok;
    } catch { return false; }
  },
};

// ── Unique session ID for this page visit ─────────────────────────────────────
function newSessionId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

createApp({
  setup() {
    // ── State ─────────────────────────────────────────────────────────────────
    const inputText       = ref('');
    const showRandomModal = ref(false);
    const randSize        = ref(50);
    const randMax         = ref(999);
    const selectedAlgorithms = ref([]);
    const isRunning       = ref(false);
    const isPaused        = ref(false);
    const currentAlgorithmName = ref('None');
    const speed           = ref(500);
    const results         = reactive([]);
    const fileInputRef    = ref(null);

    // Backend state
    const history         = reactive([]);  // rows from DB
    const globalStats     = reactive([]);  // per-algorithm aggregates
    const historyTab      = ref('session'); // 'session' | 'history' | 'stats'
    const backendOnline   = ref(true);
    const saveStatus      = ref('');       // '' | 'saving' | 'saved' | 'error'

    const sessionId = newSessionId();
    let currentArraySize = 0;

    // ── Statics ───────────────────────────────────────────────────────────────
    const algorithmNames = Object.keys(algorithmsMap);

    const complexityData = {
      'Bubble Sort':    ['O(n)',       'O(n²)',       'O(n²)',       'O(1)'],
      'Selection Sort': ['O(n²)',      'O(n²)',       'O(n²)',       'O(1)'],
      'Insertion Sort': ['O(n)',       'O(n²)',       'O(n²)',       'O(1)'],
      'Merge Sort':     ['O(n log n)', 'O(n log n)',  'O(n log n)',  'O(n)'],
      'Quick Sort':     ['O(n log n)', 'O(n log n)',  'O(n²)',       'O(log n)'],
      'Heap Sort':      ['O(n log n)', 'O(n log n)',  'O(n log n)',  'O(1)'],
      'Counting Sort':  ['O(n + k)',   'O(n + k)',    'O(n + k)',    'O(k)'],
      'Radix Sort':     ['O(nk)',      'O(nk)',       'O(nk)',       'O(n + k)'],
    };

    // ── Computed ──────────────────────────────────────────────────────────────
    const sortedResults = computed(() =>
      [...results].sort((a, b) => a.timeMs - b.timeMs)
    );

    const maxTime = computed(() =>
      Math.max(...results.map(r => r.timeMs), 1)
    );

    // Group history rows by session
    const groupedHistory = computed(() => {
      const map = new Map();
      for (const row of history) {
        if (!map.has(row.session_id)) map.set(row.session_id, []);
        map.get(row.session_id).push(row);
      }
      return [...map.entries()].map(([sid, rows]) => ({
        session_id: sid,
        date: rows[0].created_at,
        rows: rows.sort((a, b) => a.time_ms - b.time_ms),
      }));
    });

    // ── Helpers ───────────────────────────────────────────────────────────────
    function rankClass(rank) {
      if (rank === 1) return 'rank-1';
      if (rank === 2) return 'rank-2';
      if (rank === 3) return 'rank-3';
      return 'rank-other';
    }

    function barClass(index, total) {
      if (index === 0) return 'bar-fastest';
      if (index === total - 1 && total > 1) return 'bar-slowest';
      return 'bar-medium';
    }

    function barWidth(timeMs) {
      return Math.max(5, (timeMs / maxTime.value) * 100);
    }

    function formatDate(str) {
      if (!str) return '';
      const d = new Date(str.replace(' ', 'T') + 'Z');
      return d.toLocaleString();
    }

    // ── File Input ────────────────────────────────────────────────────────────
    function triggerFileInput() { fileInputRef.value?.click(); }

    function handleFileLoad(e) {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = ev => {
        inputText.value = parseFileContent(ev.target.result).join(', ');
      };
      reader.readAsText(file);
    }

    // ── Random Array ──────────────────────────────────────────────────────────
    function createRandom() {
      const arr = generateRandomArray(randSize.value || 50, randMax.value || 999);
      inputText.value = arr.join(', ');
      showRandomModal.value = false;
    }

    // ── Core Execution ────────────────────────────────────────────────────────
    async function runAlgorithm(name, array) {
      metrics.reset();
      currentAlgorithmName.value = name;
      metrics.start();
      initChart(array);
      const gen = algorithmsMap[name](array);

      return new Promise(resolve => {
        runGenerator(gen, speed.value, () => {
          metrics.stop();
          const m = getMetrics();
          results.push({ name, ...m, arraySize: array.length });
          resolve();
        });
      });
    }

    async function runAlgorithms(names) {
      const raw = inputText.value;
      const baseArray = parseInput(raw);
      if (baseArray.length === 0) { alert('Provide a non-empty dataset.'); return; }

      results.splice(0, results.length);
      currentArraySize = baseArray.length;
      isRunning.value = true;
      isPaused.value  = false;
      window.isPaused = false;
      saveStatus.value = '';

      for (const name of names) {
        await runAlgorithm(name, baseArray.slice());
      }

      isRunning.value = false;
      currentAlgorithmName.value = 'None';

      // ── Save to backend ──────────────────────────────────────────────────
      if (backendOnline.value && results.length > 0) {
        saveStatus.value = 'saving';
        const ok = await API.saveRun(sessionId, results);
        saveStatus.value = ok ? 'saved' : 'error';
        if (ok) {
          await loadHistory();
          await loadStats();
        }
        setTimeout(() => { saveStatus.value = ''; }, 3000);
      }
    }

    function runSelected() {
      if (selectedAlgorithms.value.length === 0) { alert('Select at least one algorithm.'); return; }
      runAlgorithms(selectedAlgorithms.value);
    }

    function runAll() { runAlgorithms(algorithmNames); }

    // ── Pause / Resume ────────────────────────────────────────────────────────
    function pause()  { isPaused.value = true;  window.isPaused = true;  }
    function resume() { isPaused.value = false; window.isPaused = false; }

    // ── Export ────────────────────────────────────────────────────────────────
    function exportCSV() {
      if (results.length === 0) return;
      const header = ['Algorithm', 'Time (ms)', 'Comparisons', 'Swaps'].join(',');
      const rows = results.map(r =>
        [r.name, r.timeMs.toFixed(2), r.comparisons, r.swaps].join(',')
      );
      const blob = new Blob([[header, ...rows].join('\n')], { type: 'text/csv;charset=utf-8;' });
      const a = Object.assign(document.createElement('a'), {
        href: URL.createObjectURL(blob), download: 'sorting_summary.csv',
      });
      a.click();
      URL.revokeObjectURL(a.href);
    }

    function exportPng() { exportChartAsPng(); }

    // ── History & Stats (backend) ─────────────────────────────────────────────
    async function loadHistory() {
      const rows = await API.fetchHistory();
      history.splice(0, history.length, ...rows);
    }

    async function loadStats() {
      const rows = await API.fetchStats();
      globalStats.splice(0, globalStats.length, ...rows);
    }

    async function deleteHistoryRun(id) {
      const ok = await API.deleteRun(id);
      if (ok) await loadHistory();
    }

    async function clearAllHistory() {
      if (!confirm('Clear all saved history?')) return;
      const ok = await API.clearHistory();
      if (ok) { history.splice(0); globalStats.splice(0); }
    }

    // ── Init ──────────────────────────────────────────────────────────────────
    onMounted(async () => {
      // Check if backend is reachable
      try {
        await fetch('/api/runs');
        backendOnline.value = true;
        await loadHistory();
        await loadStats();
      } catch {
        backendOnline.value = false;
      }
    });

    // ── Expose ────────────────────────────────────────────────────────────────
    return {
      inputText, showRandomModal, randSize, randMax,
      selectedAlgorithms, isRunning, isPaused, currentAlgorithmName,
      speed, results, sortedResults, algorithmNames, complexityData,
      fileInputRef, history, globalStats, historyTab, backendOnline, saveStatus,
      groupedHistory,
      // helpers
      rankClass, barClass, barWidth, formatDate,
      // handlers
      triggerFileInput, handleFileLoad, createRandom,
      runSelected, runAll, pause, resume,
      exportCSV, exportPng,
      deleteHistoryRun, clearAllHistory,
    };
  },
}).mount('#app');
