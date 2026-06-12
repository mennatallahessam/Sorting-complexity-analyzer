// algorithms.js - sorting algorithms as generators
import { metrics } from "./metrics.js";

/** Utility to deep copy array for yielding */
function copy(arr) {
  return arr.slice();
}

/** Bubble Sort */
export function* bubbleSort(arr) {
  const a = arr.slice();
  const n = a.length;
  let swapped;
  for (let i = 0; i < n - 1; i++) {
    swapped = false;
    for (let j = 0; j < n - i - 1; j++) {
      metrics.incrementComparisons();
      if (a[j] > a[j + 1]) {
        [a[j], a[j + 1]] = [a[j + 1], a[j]];
        metrics.incrementSwaps();
        swapped = true;
        yield copy(a);
      }
    }
    if (!swapped) break;
  }
  yield copy(a);
}

/** Selection Sort */
export function* selectionSort(arr) {
  const a = arr.slice();
  const n = a.length;
  for (let i = 0; i < n - 1; i++) {
    let minIdx = i;
    for (let j = i + 1; j < n; j++) {
      metrics.incrementComparisons();
      if (a[j] < a[minIdx]) minIdx = j;
    }
    if (minIdx !== i) {
      [a[i], a[minIdx]] = [a[minIdx], a[i]];
      metrics.incrementSwaps();
      yield copy(a);
    }
  }
  yield copy(a);
}

/** Insertion Sort */
export function* insertionSort(arr) {
  const a = arr.slice();
  const n = a.length;
  for (let i = 1; i < n; i++) {
    let key = a[i];
    let j = i - 1;
    while (j >= 0 && a[j] > key) {
      metrics.incrementComparisons();
      a[j + 1] = a[j];
      metrics.incrementSwaps();
      j--;
      yield copy(a);
    }
    // One more comparison when while condition fails
    if (j >= 0) metrics.incrementComparisons();
    a[j + 1] = key;
    yield copy(a);
  }
  yield copy(a);
}

/** Merge Sort */
export function* mergeSort(arr) {
  const a = arr.slice();
  const aux = a.slice();
  const n = a.length;

  function* merge(l, m, r) {
    let i = l, j = m + 1, k = l;
    while (i <= m && j <= r) {
      metrics.incrementComparisons();
      if (aux[i] <= aux[j]) {
        a[k++] = aux[i++];
      } else {
        a[k++] = aux[j++];
      }
      metrics.incrementSwaps(); // treat each write as a swap for visualization
      yield copy(a);
    }
    while (i <= m) {
      a[k++] = aux[i++];
      metrics.incrementSwaps();
      yield copy(a);
    }
    while (j <= r) {
      a[k++] = aux[j++];
      metrics.incrementSwaps();
      yield copy(a);
    }
  }

  function* sort(l, r) {
    if (l >= r) return;
    const m = Math.floor((l + r) / 2);
    yield* sort(l, m);
    yield* sort(m + 1, r);
    // copy to aux before merge
    for (let i = l; i <= r; i++) aux[i] = a[i];
    yield* merge(l, m, r);
  }

  yield* sort(0, n - 1);
  yield copy(a);
}

/** Quick Sort (Lomuto partition) */
export function* quickSort(arr) {
  const a = arr.slice();
  const n = a.length;

  function* partition(low, high) {
    const pivot = a[high];
    let i = low - 1;
    for (let j = low; j < high; j++) {
      metrics.incrementComparisons();
      if (a[j] < pivot) {
        i++;
        [a[i], a[j]] = [a[j], a[i]];
        metrics.incrementSwaps();
        yield copy(a);
      }
    }
    [a[i + 1], a[high]] = [a[high], a[i + 1]];
    metrics.incrementSwaps();
    yield copy(a);
    return i + 1;
  }

  function* qs(low, high) {
    if (low < high) {
      const pi = yield* partition(low, high);
      yield* qs(low, pi - 1);
      yield* qs(pi + 1, high);
    }
  }

  yield* qs(0, n - 1);
  yield copy(a);
}

/** Heap Sort */
export function* heapSort(arr) {
  const a = arr.slice();
  const n = a.length;

  function heapify(n, i) {
    let largest = i;
    const l = 2 * i + 1;
    const r = 2 * i + 2;
    if (l < n) {
      metrics.incrementComparisons();
      if (a[l] > a[largest]) largest = l;
    }
    if (r < n) {
      metrics.incrementComparisons();
      if (a[r] > a[largest]) largest = r;
    }
    if (largest !== i) {
      [a[i], a[largest]] = [a[largest], a[i]];
      metrics.incrementSwaps();
      heapify(n, largest);
    }
  }

  // Build heap
  for (let i = Math.floor(n / 2) - 1; i >= 0; i--) {
    heapify(n, i);
  }
  // Extract elements
  for (let i = n - 1; i > 0; i--) {
    [a[0], a[i]] = [a[i], a[0]];
    metrics.incrementSwaps();
    yield copy(a);
    heapify(i, 0);
  }
  yield copy(a);
}

/** Counting Sort (assumes non‑negative integers) */
export function* countingSort(arr) {
  const a = arr.slice();
  const max = Math.max(...a);
  const count = new Array(max + 1).fill(0);
  // Count occurrences
  for (let num of a) {
    count[num]++;
    metrics.incrementSwaps(); // treat counting as operation
    yield copy(a);
  }
  // Reconstruct sorted array
  let idx = 0;
  for (let i = 0; i <= max; i++) {
    while (count[i] > 0) {
      a[idx++] = i;
      count[i]--;
      metrics.incrementSwaps();
      yield copy(a);
    }
  }
  yield copy(a);
}

/** Radix Sort (base 10) */
export function* radixSort(arr) {
  const a = arr.slice();
  const max = Math.max(...a);
  let exp = 1;
  const n = a.length;
  const output = new Array(n);
  while (Math.floor(max / exp) > 0) {
    const count = new Array(10).fill(0);
    // Count digits
    for (let i = 0; i < n; i++) {
      const digit = Math.floor(a[i] / exp) % 10;
      count[digit]++;
      metrics.incrementSwaps();
    }
    // Cumulative
    for (let i = 1; i < 10; i++) count[i] += count[i - 1];
    // Build output
    for (let i = n - 1; i >= 0; i--) {
      const digit = Math.floor(a[i] / exp) % 10;
      output[--count[digit]] = a[i];
    }
    // Copy back
    for (let i = 0; i < n; i++) {
      a[i] = output[i];
      metrics.incrementSwaps();
      yield copy(a);
    }
    exp *= 10;
  }
  yield copy(a);
}

// Export a map for easy lookup
export const algorithmsMap = {
  "Bubble Sort": bubbleSort,
  "Selection Sort": selectionSort,
  "Insertion Sort": insertionSort,
  "Merge Sort": mergeSort,
  "Quick Sort": quickSort,
  "Heap Sort": heapSort,
  "Counting Sort": countingSort,
  "Radix Sort": radixSort,
};
