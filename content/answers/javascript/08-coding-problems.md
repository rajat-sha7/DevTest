=== j176 | E | Find the factorial of a number
**Factorial `n!` is the product of all integers from 1 to `n` (with `0! = 1`); compute it iteratively in O(n) time, validate the input, and use `BigInt` because results exceed `Number`'s safe range after `18!` and overflow to `Infinity` after `170!`.**

### Approaches
- **Iterative loop** (best default): multiply an accumulator from 2 to `n`. O(n) time, O(1) space, no recursion limits.
- **Recursive**: `n * factorial(n - 1)` with base case `n <= 1`. Clear, but uses O(n) stack and can overflow for very large `n`.
- **Memoised / table**: useful when you need many factorials (for combinations `nCr = n! / (r! (n-r)!)`).
- **`reduce`** over a range: concise, but builds an array first.

### Input validation
Factorial is defined for non-negative integers. Reject negatives, fractions, `NaN` and non-numbers with a clear error. (The gamma function extends it to real numbers, but that is out of scope.)

### Precision
- `Number` is exact only up to `2^53 - 1`; `18!` is the largest factorial that fits exactly (`19!` loses precision).
- `171!` exceeds `Number.MAX_VALUE` and becomes `Infinity`.
- `BigInt` keeps every digit: `factorial(50n)` is exact.

### Follow-ups
- Count trailing zeros of `n!` without computing it: count factors of 5 (`n/5 + n/25 + ...`).
- Compute `n! mod m` for large `n` to stay within limits.
--- code
function factorial(n) {
  if (!Number.isInteger(n) || n < 0) throw new RangeError("n must be a non-negative integer");
  let result = 1n;
  for (let i = 2n; i <= BigInt(n); i++) result *= i;
  return result;
}

const factorialRecursive = (n) => (n <= 1 ? 1 : n * factorialRecursive(n - 1)); // fine for small n

console.log(factorial(0), factorial(5), factorialRecursive(5)); // 1n 120n 120
console.log(factorial(25)); // 15511210043330985984000000n - exact
console.log(factorialRecursive(25)); // 1.5511210043330986e+25 - Number loses digits
console.log(factorialRecursive(171)); // Infinity

try {
  factorial(-3);
} catch (e) {
  console.log(e.message); // n must be a non-negative integer
}

// Follow-up: trailing zeros of n! without computing it
function trailingZeros(n) {
  let count = 0;
  for (let p = 5; p <= n; p *= 5) count += Math.floor(n / p);
  return count;
}
console.log(trailingZeros(100), String(factorial(100)).match(/0*$/)[0].length); // 24 24

// Combinations with factorials: nCr
const nCr = (n, r) => factorial(n) / (factorial(r) * factorial(n - r));
console.log(nCr(10, 3)); // 120n

=== j177 | M | Implement Binary Search
**Binary search finds a target in a sorted array by repeatedly comparing it with the middle element and discarding the half that cannot contain it, giving O(log n) time; the classic pitfalls are off-by-one boundaries and forgetting the array must be sorted.**

### Iterative template
1. `lo = 0`, `hi = arr.length - 1`.
2. While `lo <= hi`: `mid = lo + ((hi - lo) >> 1)`.
3. If `arr[mid] === target` return `mid`; if smaller, `lo = mid + 1`; else `hi = mid - 1`.
4. Return `-1` when the range is empty.

### Variants interviewers ask
- **First/last occurrence** of a duplicate value (keep searching left or right after a match).
- **Lower bound / insertion point**: the first index where `arr[i] >= target`, used to insert while keeping order.
- **Search in a rotated sorted array**.
- **Binary search on the answer**: the smallest capacity, speed or time that satisfies a condition (when the condition is monotonic).
- **Custom comparator** for objects (search by date or id).

### Details worth mentioning
- `lo + ((hi - lo) >> 1)` avoids overflow in languages with fixed-size integers; in JavaScript `Math.floor((lo + hi) / 2)` is fine for normal array sizes.
- Recursion works too but adds O(log n) stack space.
- Sorting first costs O(n log n), so binary search pays off when you search the same sorted data many times.
--- code
function binarySearch(arr, target) {
  let lo = 0;
  let hi = arr.length - 1;
  while (lo <= hi) {
    const mid = lo + ((hi - lo) >> 1);
    if (arr[mid] === target) return mid;
    if (arr[mid] < target) lo = mid + 1;
    else hi = mid - 1;
  }
  return -1;
}

// Lower bound: first index with arr[i] >= target (also the insertion point)
function lowerBound(arr, target, compare = (a, b) => a - b) {
  let lo = 0;
  let hi = arr.length; // note: exclusive upper bound
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (compare(arr[mid], target) < 0) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

const sorted = [1, 3, 5, 7, 7, 7, 9, 11];
console.log(binarySearch(sorted, 9), binarySearch(sorted, 4)); // 6 -1
console.log(lowerBound(sorted, 7), lowerBound(sorted, 8)); // 3 6 - first 7, and where 8 would go

// Insert while keeping the array sorted
const scores = [10, 20, 30];
scores.splice(lowerBound(scores, 25), 0, 25);
console.log(scores); // [10, 20, 25, 30]

// Search objects with a comparator
const events = [{ at: 100 }, { at: 200 }, { at: 300 }];
console.log(lowerBound(events, { at: 250 }, (a, b) => a.at - b.at)); // 2

// Binary search on the answer: smallest daily capacity to ship all packages in 5 days
function minCapacity(weights, days) {
  const canShip = (cap) => {
    let needed = 1, load = 0;
    for (const w of weights) {
      if (load + w > cap) { needed++; load = 0; }
      load += w;
    }
    return needed <= days;
  };
  let lo = Math.max(...weights), hi = weights.reduce((a, b) => a + b, 0);
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    canShip(mid) ? (hi = mid) : (lo = mid + 1);
  }
  return lo;
}
console.log(minCapacity([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 5)); // 15

=== j178 | M | Sort an array (Bubble Sort)
**Bubble sort repeatedly walks through the array swapping adjacent elements that are out of order, so the largest remaining value "bubbles" to the end on each pass; it is O(n²) and mainly a teaching example, but an early-exit flag makes it O(n) for already sorted input.**

### Algorithm
1. For each pass `i` from 0 to `n - 1`:
2. Compare `arr[j]` with `arr[j + 1]` for `j` from 0 to `n - i - 2` (the last `i` elements are already in place).
3. Swap them if they are in the wrong order.
4. If a pass makes **no swaps**, the array is sorted: stop early.

### Properties
- **Time**: O(n²) average and worst case; O(n) best case with the early exit.
- **Space**: O(1), in place.
- **Stable**: equal elements keep their relative order (because you only swap when strictly greater).

### Why you would not use it in production
`Array.prototype.sort` (TimSort in V8) is O(n log n), stable, and heavily optimised. Use `arr.toSorted((a, b) => a - b)` in real code.

### What interviewers look for
- Correct loop bounds and the shrinking inner range.
- The early-exit optimisation.
- Mentioning complexity and stability.
- Knowing better algorithms: **merge sort** (O(n log n), stable), **quicksort** (O(n log n) average, in place), **insertion sort** (great for small or nearly sorted arrays, used inside TimSort).
- Not mutating the caller's array unless asked (copy first).
--- code
function bubbleSort(input, compare = (a, b) => a - b) {
  const arr = [...input]; // don't mutate the caller's array
  for (let i = 0; i < arr.length - 1; i++) {
    let swapped = false;
    for (let j = 0; j < arr.length - 1 - i; j++) {
      if (compare(arr[j], arr[j + 1]) > 0) {
        [arr[j], arr[j + 1]] = [arr[j + 1], arr[j]];
        swapped = true;
      }
    }
    if (!swapped) break; // already sorted: stop early
  }
  return arr;
}

console.log(bubbleSort([5, 2, 9, 1, 5, 6])); // [1, 2, 5, 5, 6, 9]
console.log(bubbleSort(["pear", "apple", "fig"], (a, b) => a.localeCompare(b))); // ["apple", "fig", "pear"]

// Stable: equal keys keep their original order
const people = [{ n: "A", age: 30 }, { n: "B", age: 25 }, { n: "C", age: 30 }];
console.log(bubbleSort(people, (a, b) => a.age - b.age).map((p) => p.n)); // ["B", "A", "C"]

// Merge sort for comparison: O(n log n), also stable
function mergeSort(arr) {
  if (arr.length <= 1) return arr;
  const mid = arr.length >> 1;
  const [left, right] = [mergeSort(arr.slice(0, mid)), mergeSort(arr.slice(mid))];
  const out = [];
  let i = 0, j = 0;
  while (i < left.length && j < right.length) out.push(left[i] <= right[j] ? left[i++] : right[j++]);
  return [...out, ...left.slice(i), ...right.slice(j)];
}

const big = Array.from({ length: 3000 }, () => Math.floor(Math.random() * 1e6));
let t = performance.now();
bubbleSort(big);
const bubbleMs = performance.now() - t;
t = performance.now();
const merged = mergeSort(big);
const mergeMs = performance.now() - t;
console.log(`merge sort faster: ${mergeMs < bubbleMs}`, merged.join() === big.toSorted((a, b) => a - b).join()); // merge sort faster: true true

=== j179 | E | Group an array of objects by key
**Use `Object.groupBy(items, item => key)` (or `Map.groupBy` for non-string keys) in modern JavaScript; in interviews, implement it with a single `reduce` or loop that pushes each item into the array for its key.**

### Built-ins (ES2024)
- **`Object.groupBy(iterable, fn)`** returns a null-prototype object: `{ [key]: items[] }`. Keys are converted to strings.
- **`Map.groupBy(iterable, fn)`** returns a `Map`, so keys can be objects, numbers or dates without string conversion.
Both preserve the original order within each group.

### Manual implementation
One pass over the data, O(n):
```
const groups = {};
for (const item of items) (groups[key(item)] ??= []).push(item);
```
Use `Object.create(null)` (or a `Map`) so a key like `"constructor"` or `"__proto__"` cannot collide with inherited properties.

### Useful variations
- **Group by a property name** or by a **computed key** (first letter, year, price range).
- **Group and aggregate**: count, sum or average per group.
- **Nested grouping**: by year, then by month.
- **Count only**: when you only need counts, accumulate numbers instead of arrays.

### Where it comes up
Rendering sectioned lists, building charts, reports by category, and organising API results.
--- code
const orders = [
  { id: 1, customer: "Ada", status: "paid", total: 120, date: "2026-01-05" },
  { id: 2, customer: "Linus", status: "pending", total: 80, date: "2026-01-20" },
  { id: 3, customer: "Ada", status: "paid", total: 45, date: "2026-02-02" },
  { id: 4, customer: "Grace", status: "refunded", total: 60, date: "2026-02-14" },
];

// Built-in (ES2024)
const byStatus = Object.groupBy(orders, (o) => o.status);
console.log(Object.keys(byStatus), byStatus.paid.map((o) => o.id)); // ["paid", "pending", "refunded"] [1, 3]

// Manual implementation with a safe, prototype-free object
function groupBy(items, keyOrFn) {
  const getKey = typeof keyOrFn === "function" ? keyOrFn : (item) => item[keyOrFn];
  const groups = Object.create(null);
  for (const item of items) (groups[getKey(item)] ??= []).push(item);
  return groups;
}
console.log(groupBy(orders, "customer").Ada.length); // 2

// Computed key: by month
console.log(Object.keys(groupBy(orders, (o) => o.date.slice(0, 7)))); // ["2026-01", "2026-02"]

// Group and aggregate: revenue per customer
const revenue = Object.fromEntries(
  Object.entries(groupBy(orders, "customer")).map(([name, list]) => [name, list.reduce((s, o) => s + o.total, 0)])
);
console.log(revenue); // { Ada: 165, Linus: 80, Grace: 60 }

// Map.groupBy keeps non-string keys
const bySize = Map.groupBy(orders, (o) => (o.total >= 100 ? "large" : "small"));
console.log([...bySize.keys()]); // ["large", "small"]

=== j180 | E | Count frequency of elements in array
**Count frequencies in one pass with a `Map` (value → count); it is O(n), handles any value type including `NaN` and objects, and preserves first-seen order, after which you can sort or filter the counts as needed.**

### Why a Map rather than an object
- Object keys are always strings: `1` and `"1"` collide, and keys like `"constructor"` or `"__proto__"` can clash with inherited properties.
- A `Map` keeps types distinct, has a `size`, and iterates in insertion order.
For simple string data an object (or `Object.create(null)`) is fine, and `Object.groupBy` can count too.

### Common follow-ups
- **Most frequent element** (the mode): track the max while counting, or sort the entries.
- **Top k frequent elements**: sort entries by count (O(n log n)), or use bucket sort by count for O(n).
- **Characters in a string**: `for (const ch of str)` iterates by code point, so emoji are counted correctly.
- **Words in text**: normalise case and split on non-letters (`/\P{L}+/u`) first.
- **First non-repeating element**: count, then scan again for the first with count 1.
- **Are two strings anagrams?** Compare their character counts.

### Complexity
O(n) time and O(k) space for k distinct values; sorting the result adds O(k log k).
--- code
function countFrequency(items) {
  const counts = new Map();
  for (const item of items) counts.set(item, (counts.get(item) ?? 0) + 1);
  return counts;
}

const votes = ["js", "ts", "js", "go", "ts", "js", 1, "1", NaN, NaN];
console.log(countFrequency(votes)); // Map { "js" => 3, "ts" => 2, "go" => 1, 1 => 1, "1" => 1, NaN => 2 }

// Most frequent (mode) and top-k
const entries = [...countFrequency(["a", "b", "a", "c", "b", "a"])];
const sorted = entries.sort((x, y) => y[1] - x[1]);
console.log("mode:", sorted[0][0], "| top 2:", sorted.slice(0, 2).map(([v]) => v)); // mode: a | top 2: ["a", "b"]

// Characters (emoji-safe) and words
console.log(Object.fromEntries(countFrequency("hello😀😀"))); // { h: 1, e: 1, l: 2, o: 1, "😀": 2 }
const text = "The cat and the hat. THE end!";
const words = text.toLowerCase().split(/\P{L}+/u).filter(Boolean);
console.log(Object.fromEntries(countFrequency(words))); // { the: 3, cat: 1, and: 1, hat: 1, end: 1 }

// First non-repeating character
const firstUnique = (s) => {
  const counts = countFrequency(s);
  return [...s].find((ch) => counts.get(ch) === 1) ?? null;
};
console.log(firstUnique("swiss"), firstUnique("aabb")); // w null

// Anagram check using counts
const isAnagram = (a, b) => {
  if (a.length !== b.length) return false;
  const counts = countFrequency(a);
  for (const ch of b) {
    if (!counts.get(ch)) return false;
    counts.set(ch, counts.get(ch) - 1);
  }
  return true;
};
console.log(isAnagram("listen", "silent"), isAnagram("rat", "car")); // true false

=== j181 | M | Merge two sorted arrays
**Use two pointers, one per array: repeatedly take the smaller current element into the result and advance that pointer, then append whatever remains; this produces a sorted result in O(n + m) time, which beats concatenating and re-sorting (O((n + m) log(n + m))).**

### Algorithm
1. `i = 0`, `j = 0`, `result = []`.
2. While both have elements: push `a[i] <= b[j] ? a[i++] : b[j++]`. Using `<=` keeps the merge **stable** (equal elements from `a` come first).
3. Append the remaining elements of whichever array is not exhausted.

### Variations
- **Custom comparator** for objects (merge two lists of events by timestamp).
- **Merge in place** (LeetCode 88): when `a` has extra space at the end, fill from the back with three pointers so nothing is overwritten. O(1) extra space.
- **Remove duplicates while merging** (union of sorted arrays).
- **Merge k sorted arrays**: use a min-heap (O(N log k)), or merge pairs repeatedly like merge sort.
- **Intersection of two sorted arrays** with the same two-pointer idea.

### Why it matters
This is the merge step of merge sort and the basis for combining sorted streams (paginated results from two sources, log files, time-series data).
--- code
function mergeSorted(a, b, compare = (x, y) => x - y) {
  const out = [];
  let i = 0, j = 0;
  while (i < a.length && j < b.length) {
    out.push(compare(a[i], b[j]) <= 0 ? a[i++] : b[j++]); // <= keeps it stable
  }
  while (i < a.length) out.push(a[i++]);
  while (j < b.length) out.push(b[j++]);
  return out;
}

console.log(mergeSorted([1, 3, 5, 7], [2, 4, 6, 8, 10, 12])); // [1, 2, 3, 4, 5, 6, 7, 8, 10, 12]
console.log(mergeSorted([], [1, 2]), mergeSorted([5], [])); // [1, 2] [5]

// Objects with a comparator: merge two feeds by time
const feedA = [{ t: 1, src: "A" }, { t: 4, src: "A" }];
const feedB = [{ t: 2, src: "B" }, { t: 4, src: "B" }, { t: 9, src: "B" }];
console.log(mergeSorted(feedA, feedB, (x, y) => x.t - y.t).map((e) => `${e.t}${e.src}`)); // ["1A", "2B", "4A", "4B", "9B"]

// In place, filling from the back (LeetCode 88)
function mergeInPlace(nums1, m, nums2, n) {
  let i = m - 1, j = n - 1, k = m + n - 1;
  while (j >= 0) nums1[k--] = i >= 0 && nums1[i] > nums2[j] ? nums1[i--] : nums2[j--];
  return nums1;
}
console.log(mergeInPlace([1, 2, 3, 0, 0, 0], 3, [2, 5, 6], 3)); // [1, 2, 2, 3, 5, 6]

// Merge k sorted arrays by merging pairs (like merge sort)
const mergeK = (lists) => (lists.length <= 1 ? lists[0] ?? [] : mergeSorted(mergeK(lists.slice(0, lists.length >> 1)), mergeK(lists.slice(lists.length >> 1))));
console.log(mergeK([[1, 4], [2, 5], [0, 3, 6]])); // [0, 1, 2, 3, 4, 5, 6]

=== j182 | E | Chunk an array
**Chunking splits an array into consecutive sub-arrays of a given size (the last one may be shorter); loop in steps of `size` and `slice(i, i + size)`, which is O(n) and does not mutate the original.**

### Implementation choices
- **`for` loop with `slice`**: clear and fast.
- **`Array.from({ length: Math.ceil(n / size) }, (_, i) => arr.slice(i * size, i * size + size))`**: concise one-liner.
- **Generator**: yields chunks lazily, perfect for huge or streamed data.
- **`reduce`**: possible but harder to read.

### Validation
`size` must be a positive integer. Decide how to handle `0`, negatives and non-integers (throw a `RangeError`, as below). An empty input returns `[]`.

### Where chunking is used
- **Batching API calls** (send 100 records per request, or process at most N in parallel).
- **Pagination** on the client.
- **Grid layouts** (rows of N cards).
- **Rate-limited processing** combined with delays between batches.

### Related operations
- **Sliding windows** (overlapping chunks, e.g. moving averages): advance by 1 instead of by `size`.
- **Split by a condition** (start a new chunk when a value changes): use a loop that compares with the previous item.
--- code
function chunk(arr, size) {
  if (!Number.isInteger(size) || size < 1) throw new RangeError("size must be a positive integer");
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

const chunkOneLiner = (arr, size) =>
  Array.from({ length: Math.ceil(arr.length / size) }, (_, i) => arr.slice(i * size, i * size + size));

function* chunkLazy(iterable, size) {
  let batch = [];
  for (const item of iterable) {
    batch.push(item);
    if (batch.length === size) {
      yield batch;
      batch = [];
    }
  }
  if (batch.length) yield batch;
}

const nums = [1, 2, 3, 4, 5, 6, 7];
console.log(chunk(nums, 3)); // [[1, 2, 3], [4, 5, 6], [7]]
console.log(chunkOneLiner(nums, 2)); // [[1, 2], [3, 4], [5, 6], [7]]
console.log([...chunkLazy(new Set("abcde"), 2)]); // [["a", "b"], ["c", "d"], ["e"]]
console.log(chunk([], 4)); // []

// Batching requests: at most 2 at a time
const ids = [101, 102, 103, 104, 105];
const fetchUser = (id) => new Promise((r) => setTimeout(() => r({ id }), 5));
const results = [];
for (const batch of chunk(ids, 2)) results.push(...(await Promise.all(batch.map(fetchUser))));
console.log(results.map((u) => u.id)); // [101, 102, 103, 104, 105]

// Sliding window (overlapping)
const windows = (arr, size) => arr.slice(0, arr.length - size + 1).map((_, i) => arr.slice(i, i + size));
console.log(windows([1, 2, 3, 4], 2)); // [[1, 2], [2, 3], [3, 4]]

=== j183 | M | Shuffle an array (Fisher-Yates)
**The Fisher-Yates (Knuth) shuffle walks the array from the end and swaps each element with a random element at or before it, producing every permutation with equal probability in O(n) time; the popular `sort(() => Math.random() - 0.5)` is biased and should not be used.**

### Algorithm
```
for i from n-1 down to 1:
  j = random integer in [0, i]   // inclusive!
  swap arr[i], arr[j]
```
The `+1` in `Math.floor(Math.random() * (i + 1))` is essential; picking from `[0, i)` (Sattolo's algorithm) only produces cyclic permutations.

### Why the sort trick is wrong
Sorting algorithms assume a consistent comparator. A random comparator gives a biased distribution (some orders come up much more often than others, and the bias depends on the engine's sort algorithm), and it is O(n log n) instead of O(n).

### Randomness quality
- `Math.random()` is fine for UI (shuffling cards in a game, randomising quiz questions).
- For anything security-sensitive or fairness-critical (lotteries, raffles, cryptography), use `crypto.getRandomValues` and avoid modulo bias.

### Practical notes
- Shuffle a copy if the caller's array must not change.
- For a random sample of k items, run only k iterations of the loop (a partial Fisher-Yates).
- For reproducible shuffles (tests, seeded games), use a seeded pseudo-random generator.
--- code
function shuffle(input, random = Math.random) {
  const arr = [...input]; // shuffle a copy
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1)); // 0..i inclusive
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// Secure randomness for fairness-critical use
const secureRandom = () => crypto.getRandomValues(new Uint32Array(1))[0] / 2 ** 32;

console.log(shuffle([1, 2, 3, 4, 5]).length, shuffle(["a", "b", "c"], secureRandom).toSorted().join()); // 5 a,b,c

// Verify uniformity: each of the 6 orders of [1,2,3] should appear ~1/6 of the time
function distribution(shuffler, runs = 60_000) {
  const counts = {};
  for (let i = 0; i < runs; i++) {
    const key = shuffler([1, 2, 3]).join("");
    counts[key] = (counts[key] ?? 0) + 1;
  }
  const values = Object.values(counts);
  return { orders: values.length, maxDeviation: Math.max(...values.map((v) => Math.abs(v / runs - 1 / 6))).toFixed(3) };
}
console.log("Fisher-Yates:", distribution(shuffle)); // { orders: 6, maxDeviation: ~0.00x } - uniform
console.log("sort trick:  ", distribution((a) => [...a].sort(() => Math.random() - 0.5))); // noticeably larger deviation - biased

// Random sample of k items: partial Fisher-Yates
function sample(input, k) {
  const arr = [...input];
  for (let i = 0; i < k; i++) {
    const j = i + Math.floor(Math.random() * (arr.length - i));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr.slice(0, k);
}
console.log(sample(["a", "b", "c", "d", "e"], 2).length); // 2

=== j184 | E | Find max and min in one pass
**Track both values in a single loop: start with the first element as both min and max, then compare each remaining element against both; this is O(n) time and O(1) space and avoids spreading huge arrays into `Math.min`/`Math.max`.**

### Why not `Math.max(...arr)`?
It is fine for small arrays, but:
- It walks the array twice (once for min, once for max).
- Spreading a very large array (hundreds of thousands of elements) can exceed the engine's argument limit and throw a `RangeError`.
- On an empty array, it returns `-Infinity`/`Infinity`, which may hide a bug.

### Details to handle
- **Empty input**: return `undefined`/`null` or throw, and document which.
- **`NaN`**: `Math.max` returns `NaN` if any element is `NaN`; a manual loop with `<`/`>` silently ignores it. Decide which behaviour you want.
- **Objects**: compare by a key (find the cheapest product, the latest event) and return the whole object.
- **Pairwise comparison trick**: comparing elements in pairs first, then the smaller with min and the larger with max, uses about 1.5n comparisons instead of 2n. Mention it as an optimisation.

### Related
- `reduce` version: concise, same complexity.
- Second largest: track the top two values in one pass.
--- code
function minMax(arr) {
  if (arr.length === 0) return null;
  let min = arr[0];
  let max = arr[0];
  for (let i = 1; i < arr.length; i++) {
    const v = arr[i];
    if (v < min) min = v;
    else if (v > max) max = v;
  }
  return { min, max };
}

console.log(minMax([7, 2, 9, -4, 5])); // { min: -4, max: 9 }
console.log(minMax([42]), minMax([])); // { min: 42, max: 42 } null

// Large arrays: spreading can throw, the loop cannot
const big = Array.from({ length: 300_000 }, (_, i) => (i * 7919) % 300_000);
try {
  Math.max(...big);
  console.log("spread worked here");
} catch (e) {
  console.log("spread failed:", e.name); // RangeError in some engines
}
console.log(minMax(big)); // { min: 0, max: 299999 }

// By key, returning the whole object
function minMaxBy(items, key) {
  if (!items.length) return null;
  return items.reduce(
    (acc, item) => ({
      min: item[key] < acc.min[key] ? item : acc.min,
      max: item[key] > acc.max[key] ? item : acc.max,
    }),
    { min: items[0], max: items[0] }
  );
}
const products = [{ name: "Pen", price: 2 }, { name: "Laptop", price: 1200 }, { name: "Book", price: 15 }];
const { min, max } = minMaxBy(products, "price");
console.log(min.name, max.name); // Pen Laptop

// Second largest in one pass
const secondLargest = (arr) => {
  let first = -Infinity, second = -Infinity;
  for (const v of arr) {
    if (v > first) [first, second] = [v, first];
    else if (v > second && v < first) second = v;
  }
  return second === -Infinity ? null : second;
};
console.log(secondLargest([5, 9, 9, 3, 7])); // 7

=== j185 | E | Intersection of two arrays
**Put one array into a `Set`, then filter the other array to the values the set contains; this is O(n + m) time, and wrapping the result in another `Set` removes duplicates if each common value should appear once.**

### Variations to clarify with the interviewer
- **Unique intersection** (LeetCode 349): each common value once: `[...new Set(a.filter(x => setB.has(x)))]`.
- **With multiplicity** (LeetCode 350): `[1,2,2,1]` ∩ `[2,2]` = `[2,2]`: count occurrences in a `Map` and decrement as you match.
- **Sorted inputs**: two pointers, O(n + m) with O(1) extra space.
- **Objects**: intersect by a key such as `id`.
- **Many arrays**: reduce over them, intersecting pairwise; start with the smallest for speed.

### Built-in Set methods (ES2025)
`setA.intersection(setB)`, `union`, `difference`, `symmetricDifference`, `isSubsetOf` and more are now part of the language in up-to-date engines. Feature-detect before relying on them for older browsers.

### Complexity
- `filter` + `includes`: O(n·m), fine only for tiny arrays.
- Set lookup: O(n + m) time, O(m) space.
- Sorting first then two pointers: O(n log n + m log m), useful if the data is already sorted.
--- code
// Unique intersection
const intersection = (a, b) => {
  const setB = new Set(b);
  return [...new Set(a.filter((x) => setB.has(x)))];
};
console.log(intersection([1, 2, 2, 3, 4], [2, 2, 4, 6])); // [2, 4]

// With multiplicity
function intersectionWithCounts(a, b) {
  const counts = new Map();
  for (const x of a) counts.set(x, (counts.get(x) ?? 0) + 1);
  const out = [];
  for (const x of b) {
    if (counts.get(x) > 0) {
      out.push(x);
      counts.set(x, counts.get(x) - 1);
    }
  }
  return out;
}
console.log(intersectionWithCounts([1, 2, 2, 1], [2, 2, 3])); // [2, 2]

// Sorted input: two pointers, O(1) extra space
function intersectSorted(a, b) {
  const out = [];
  let i = 0, j = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) { if (out.at(-1) !== a[i]) out.push(a[i]); i++; j++; }
    else if (a[i] < b[j]) i++;
    else j++;
  }
  return out;
}
console.log(intersectSorted([1, 3, 5, 7, 9], [3, 4, 5, 9, 10])); // [3, 5, 9]

// Objects by key, and many arrays at once
const teamA = [{ id: 1, n: "Ada" }, { id: 2, n: "Linus" }];
const teamB = [{ id: 2, n: "Linus" }, { id: 3, n: "Grace" }];
const idsB = new Set(teamB.map((u) => u.id));
console.log(teamA.filter((u) => idsB.has(u.id)).map((u) => u.n)); // ["Linus"]
console.log([[1, 2, 3, 4], [2, 3, 4], [3, 4, 5]].reduce(intersection)); // [3, 4]

// Built-in Set methods where available (ES2025)
if (typeof Set.prototype.intersection === "function") console.log([...new Set([1, 2, 3]).intersection(new Set([2, 3, 4]))]); // [2, 3]

=== j186 | E | Union of two arrays
**The union is every distinct value that appears in either array: `[...new Set([...a, ...b])]` does it in O(n + m) time and keeps first-occurrence order; for objects, merge by a key using a `Map`.**

### Variations
- **Primitives**: `new Set([...a, ...b])`. Remember `Set` treats `NaN` as equal to `NaN` and `0` as equal to `-0`.
- **Objects by key**: a `Map` from key to object. Decide whether the first or the last occurrence wins (later sources often hold fresher data).
- **Merging records**: when the same id appears in both, merge their fields (`{ ...a, ...b }`).
- **Sorted arrays**: two pointers produce a sorted, de-duplicated union in O(n + m).
- **Many arrays**: `new Set(arrays.flat())`.
- **Multiset union**: keep the maximum count of each value from either array.

### Built-in Set methods (ES2025)
`setA.union(setB)` returns a new Set; also `intersection`, `difference`, `symmetricDifference`, `isSubsetOf`, `isSupersetOf`, `isDisjointFrom`. Feature-detect for older environments.

### Related operations
- **Difference** (in A but not B): `a.filter(x => !setB.has(x))`.
- **Symmetric difference** (in exactly one): difference both ways, combined.
--- code
const a = [1, 2, 3, NaN];
const b = [3, 4, 5, NaN];
console.log([...new Set([...a, ...b])]); // [1, 2, 3, NaN, 4, 5]

// Objects by key: later sources win, fields merged
function unionBy(key, ...lists) {
  const map = new Map();
  for (const item of lists.flat()) map.set(item[key], { ...map.get(item[key]), ...item });
  return [...map.values()];
}
const cached = [{ id: 1, name: "Ada" }, { id: 2, name: "Linus" }];
const fresh = [{ id: 2, name: "Linus T.", online: true }, { id: 3, name: "Grace" }];
console.log(unionBy("id", cached, fresh));
// [{ id: 1, name: "Ada" }, { id: 2, name: "Linus T.", online: true }, { id: 3, name: "Grace" }]

// Sorted union with two pointers
function unionSorted(x, y) {
  const out = [];
  let i = 0, j = 0;
  const push = (v) => out.at(-1) !== v && out.push(v);
  while (i < x.length && j < y.length) {
    if (x[i] < y[j]) push(x[i++]);
    else if (x[i] > y[j]) push(y[j++]);
    else { push(x[i]); i++; j++; }
  }
  while (i < x.length) push(x[i++]);
  while (j < y.length) push(y[j++]);
  return out;
}
console.log(unionSorted([1, 3, 5, 5], [2, 3, 6])); // [1, 2, 3, 5, 6]

// Difference and symmetric difference
const setB = new Set(b);
const setA = new Set(a);
console.log(a.filter((x) => !setB.has(x)), [...a.filter((x) => !setB.has(x)), ...b.filter((x) => !setA.has(x))]); // [1, 2] [1, 2, 4, 5]

if (typeof Set.prototype.union === "function") console.log([...new Set([1, 2]).union(new Set([2, 3]))]); // [1, 2, 3]

=== j187 | M | Implement currying function
**Beyond the basic `curry(fn)` (collect `fn.length` arguments), interviewers often ask for two harder variants: an infinitely curried sum that ends when called with no arguments, and Lodash-style currying with placeholders that let you skip arguments and fill them later.**

### Variant 1: infinite currying
`sum(1)(2)(3)()` → 6. Each call returns a new function capturing the running total; a call with no arguments returns the result. A twist: make the function usable directly as a number via `valueOf`/`Symbol.toPrimitive`, so `+sum(1)(2)` works without the final `()`.

### Variant 2: placeholders
With a placeholder symbol `_`, `curried(_, 2)(1)` fills position 0 later. Algorithm:
1. Keep an array of collected arguments.
2. Each new call fills existing placeholders first (left to right), then appends.
3. Call `fn` once the first `fn.length` positions contain real values (no placeholders).

### Points to mention
- Preserve `this` with `apply`.
- `fn.length` ignores defaults and rest parameters, so accept an explicit arity.
- Currying adds call overhead and can hurt readability; it shines for configuration-first helpers and point-free pipelines.
- Related: partial application with `bind`, and composition helpers (`pipe`), which pair naturally with curried functions.
--- code
// Variant 1: infinite currying, finished by an empty call (or used as a number)
function sum(...initial) {
  let total = initial.reduce((a, b) => a + b, 0);
  const next = (...more) => {
    if (more.length === 0) return total;
    total += more.reduce((a, b) => a + b, 0);
    return next;
  };
  next[Symbol.toPrimitive] = () => total; // allows +sum(1)(2)
  return next;
}
console.log(sum(1)(2)(3)()); // 6
console.log(sum(1, 2)(3, 4)(5)()); // 15
console.log(+sum(10)(20)); // 30

// Variant 2: currying with placeholders (Lodash-style)
const _ = Symbol("placeholder");
function curryWithPlaceholders(fn, arity = fn.length) {
  return function curried(...args) {
    const filled = (collected, incoming) => {
      const out = [...collected];
      const rest = [...incoming];
      for (let i = 0; i < out.length && rest.length; i++) if (out[i] === _) out[i] = rest.shift();
      return [...out, ...rest];
    };
    const ready = (collected) => collected.length >= arity && collected.slice(0, arity).every((a) => a !== _);
    const run = (collected) => (ready(collected) ? fn.apply(this, collected) : (...more) => run(filled(collected, more)));
    return run(filled([], args));
  };
}

const formatDate = curryWithPlaceholders((year, month, day) => `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`);
const firstOfMonth = formatDate(_, _, 1); // fix the day, fill year and month later
console.log(firstOfMonth(2026)(3)); // 2026-03-01
console.log(formatDate(2026, _, 15)(12)); // 2026-12-15
console.log(formatDate(2026)(7)(4)); // 2026-07-04

=== j188 | M | Implement function composition
**Implement `compose` and `pipe` with `reduceRight` and `reduce`, then make them production-ready: allow the first function to take several arguments, validate inputs, support async steps, and attach context to errors so a failing step is easy to identify.**

### Basic versions
- `pipe(f, g, h)(x)` = `h(g(f(x)))`, using `reduce`.
- `compose(f, g, h)(x)` = `f(g(h(x)))`, using `reduceRight`.

### Production details
1. **First function gets all arguments**: `pipe(add, double)(2, 3)` should call `add(2, 3)`; later functions are unary.
2. **Empty pipeline**: return an identity function.
3. **Validation**: throw a clear `TypeError` if a step is not a function, at composition time rather than at call time.
4. **Async support**: `pipeAsync` awaits each step, so steps can return promises.
5. **Error context**: wrap failures with the step index and name (using `Error`'s `cause`).
6. **Preserve `this`** if the composed function will be used as a method (rare, but easy with `apply`).

### Where composition appears
Data transformation pipelines, middleware chains, validation rules, Redux `compose` for enhancers, and functional libraries (Ramda `pipe`, Lodash `flow`).

### Complexity
Composition itself is O(k) for k functions; each call runs every step once.
--- code
function pipe(...fns) {
  fns.forEach((fn, i) => {
    if (typeof fn !== "function") throw new TypeError(`pipe: argument ${i} is not a function`);
  });
  if (fns.length === 0) return (x) => x; // identity
  const [first, ...rest] = fns;
  return function (...args) {
    return rest.reduce((value, fn) => fn.call(this, value), first.apply(this, args));
  };
}
const compose = (...fns) => pipe(...fns.reverse());

function pipeAsync(...fns) {
  return async (input) => {
    let value = input;
    for (const [i, fn] of fns.entries()) {
      try {
        value = await fn(value);
      } catch (err) {
        throw new Error(`pipeAsync failed at step ${i} (${fn.name || "anonymous"}): ${err.message}`, { cause: err });
      }
    }
    return value;
  };
}

const add = (a, b) => a + b;
const double = (n) => n * 2;
const toLabel = (n) => `Total: ${n}`;

console.log(pipe(add, double, toLabel)(2, 3)); // Total: 10 (first step receives both args)
console.log(compose(toLabel, double, add)(2, 3)); // Total: 10
console.log(pipe()(42)); // 42 (identity)

try {
  pipe(double, "not a function");
} catch (e) {
  console.log(e.message); // pipe: argument 1 is not a function
}

const fetchUser = async (id) => ({ id, name: "ada lovelace" });
const capitalise = (u) => ({ ...u, name: u.name.replace(/\b\w/g, (c) => c.toUpperCase()) });
const requireEmail = function requireEmail(u) {
  if (!u.email) throw new Error("email missing");
  return u;
};

console.log(await pipeAsync(fetchUser, capitalise)(1)); // { id: 1, name: "Ada Lovelace" }
try {
  await pipeAsync(fetchUser, capitalise, requireEmail)(1);
} catch (e) {
  console.log(e.message); // pipeAsync failed at step 2 (requireEmail): email missing
}

=== j189 | M | Retry an API call on failure
**Retry an HTTP request only for failures that can succeed on a second try (network errors, timeouts, 408, 429 and 5xx), using exponential backoff with jitter, respecting the server's `Retry-After` header, capping attempts, and never blindly retrying non-idempotent requests like payments.**

### What to retry
- **Retry**: network failures (`TypeError` from `fetch`), timeouts, `408`, `429 Too Many Requests`, `500`, `502`, `503`, `504`.
- **Do not retry**: `400`, `401`, `403`, `404`, `422` (the request itself is wrong), and user aborts.
- **Idempotency**: `GET`, `PUT` and `DELETE` are safe to repeat; `POST` usually is not unless the API supports an **idempotency key** (Stripe-style `Idempotency-Key` header), so the server can deduplicate.

### Backoff strategy
- **Exponential**: 300 ms, 600 ms, 1.2 s, 2.4 s... capped at a maximum.
- **Jitter**: randomise each delay so thousands of clients do not retry in sync (the "thundering herd").
- **`Retry-After`**: if the server sends it (seconds or an HTTP date), wait at least that long.

### Other essentials
- A **per-attempt timeout** (`AbortSignal.timeout`) so one hanging request does not stall everything.
- Respect a caller's **`AbortSignal`** to cancel the whole retry loop.
- **Log** attempts for observability.
- Cap the **total time** as well as the number of attempts.

### Related
The generic "retry any promise" utility is covered in "Implement Promise retry logic"; this answer focuses on HTTP semantics.
--- code
const RETRYABLE_STATUS = new Set([408, 429, 500, 502, 503, 504]);
const sleep = (ms, signal) =>
  new Promise((resolve, reject) => {
    const t = setTimeout(resolve, ms);
    signal?.addEventListener("abort", () => (clearTimeout(t), reject(signal.reason)), { once: true });
  });

async function fetchWithRetry(url, { retries = 3, baseDelay = 50, maxDelay = 2000, timeout = 5000, signal, fetchImpl = fetch, ...init } = {}) {
  for (let attempt = 0; ; attempt++) {
    let response;
    try {
      response = await fetchImpl(url, { ...init, signal: AbortSignal.any([AbortSignal.timeout(timeout), ...(signal ? [signal] : [])]) });
      if (response.ok || !RETRYABLE_STATUS.has(response.status)) return response; // success or a non-retryable error
    } catch (err) {
      if (signal?.aborted) throw err; // the caller cancelled: stop
      if (attempt >= retries) throw err; // network error, out of attempts
    }
    if (response && attempt >= retries) return response; // give the last response back to the caller

    const retryAfter = Number(response?.headers.get("retry-after")) * 1000 || 0;
    const backoff = Math.min(maxDelay, baseDelay * 2 ** attempt);
    const delay = Math.max(retryAfter, backoff / 2 + Math.random() * (backoff / 2)); // exponential + jitter
    console.log(`attempt ${attempt + 1} failed (${response?.status ?? "network error"}), retrying in ~${Math.round(delay)}ms`);
    await sleep(delay, signal);
  }
}

// A fake server: two 503s, then success
let calls = 0;
const fakeFetch = async () => {
  calls++;
  if (calls === 1) throw new TypeError("Failed to fetch"); // network blip
  if (calls === 2) return new Response("busy", { status: 503, headers: { "Retry-After": "0" } });
  return new Response(JSON.stringify({ ok: true }), { status: 200 });
};

const res = await fetchWithRetry("https://api.example.com/data", { fetchImpl: fakeFetch });
console.log(res.status, await res.json(), "after", calls, "calls"); // 200 { ok: true } after 3 calls

// Non-retryable errors return immediately
const notFound = await fetchWithRetry("/missing", { fetchImpl: async () => new Response("", { status: 404 }) });
console.log(notFound.status); // 404 - no retries

=== j190 | M | Implement a rate limiter
**A rate limiter caps how many operations happen in a time window; the token bucket algorithm is the common choice because it allows short bursts while enforcing an average rate: tokens refill at a steady rate, each operation consumes one, and operations without a token are rejected or queued.**

### Common algorithms
- **Token bucket**: capacity `C`, refill `R` tokens per second. Allows bursts up to `C`, averages `R`/s. Used by many APIs and cloud providers.
- **Leaky bucket**: requests drain at a fixed rate; smooths traffic, no bursts.
- **Fixed window**: count requests per calendar window (e.g. per minute). Simple, but allows double bursts at window edges.
- **Sliding window log/counter**: tracks timestamps (or weighted counts) in a rolling window for accuracy without the edge problem.

### Client-side vs server-side
- **Client side**: avoid hitting a third-party API's limits, throttle expensive user actions, or space out analytics. Queue operations until a token is available instead of failing.
- **Server side**: protect your API per user, IP or API key. Return **429 Too Many Requests** with `Retry-After` and rate-limit headers. With several servers, store counters in a shared store (Redis) or use the platform's built-in limiting (API gateways, edge middleware).

### Implementation notes
- Refill lazily: compute tokens from the elapsed time when a request arrives instead of running a timer.
- Use a monotonic clock (`performance.now()`) so system clock changes do not break it.
- Expose remaining tokens and the wait time so callers can tell users when to retry.
--- code
class TokenBucket {
  constructor({ capacity, refillPerSecond }) {
    this.capacity = capacity;
    this.refillPerMs = refillPerSecond / 1000;
    this.tokens = capacity;
    this.last = performance.now();
  }
  #refill() {
    const now = performance.now();
    this.tokens = Math.min(this.capacity, this.tokens + (now - this.last) * this.refillPerMs);
    this.last = now;
  }
  tryRemove(cost = 1) {
    this.#refill();
    if (this.tokens >= cost) {
      this.tokens -= cost;
      return { allowed: true, remaining: Math.floor(this.tokens) };
    }
    return { allowed: false, retryAfterMs: Math.ceil((cost - this.tokens) / this.refillPerMs) };
  }
  // Wait for a token instead of failing (client-side use)
  async removeAsync(cost = 1) {
    for (;;) {
      const r = this.tryRemove(cost);
      if (r.allowed) return r;
      await new Promise((res) => setTimeout(res, r.retryAfterMs));
    }
  }
}

// Burst of 5 allowed, then ~10 per second
const limiter = new TokenBucket({ capacity: 5, refillPerSecond: 10 });
const results = Array.from({ length: 8 }, () => limiter.tryRemove().allowed);
console.log(results); // [true, true, true, true, true, false, false, false]

const blocked = limiter.tryRemove();
console.log(`429 Too Many Requests, Retry-After ~${blocked.retryAfterMs}ms`);

// Queue instead of rejecting: 3 extra calls get spaced out at ~100ms each
const started = performance.now();
for (let i = 0; i < 3; i++) await limiter.removeAsync();
console.log(`3 queued calls finished after ~${Math.round((performance.now() - started) / 100) * 100}ms`); // ~300ms

=== j191 | M | Deep compare two objects
**A deep equality check compares structure and values recursively: same type, same keys and deeply equal values at every level; a solid implementation also handles `NaN`, dates, arrays vs objects, `Map`/`Set` and circular references.**

### Algorithm
1. If `Object.is(a, b)`, return `true` (handles `NaN` and identical references).
2. If either is not an object (or is `null`), return `false`.
3. Different prototypes or constructors → `false` (an array is not equal to an object with numeric keys).
4. Special cases: `Date` (compare `getTime()`), `RegExp` (source and flags), `Map` (same size, each key's value deeply equal), `Set` (same size and members).
5. Compare own keys: same count, and every key in `a` exists in `b` with a deeply equal value. `Reflect.ownKeys` includes symbols.
6. **Cycles**: keep a `WeakMap` of pairs already being compared to avoid infinite recursion.

### Choices to discuss
- Should `0` equal `-0`? (`Object.is` says no; `===` says yes.)
- Is key **order** relevant? Usually not.
- Should `undefined` properties count (`{a: undefined}` vs `{}`)? Strict equality says they differ.
- Class instances: compare prototypes, or only data?

### In practice
- Node: `util.isDeepStrictEqual`; test runners: `expect(a).toEqual(b)` / `toStrictEqual`.
- Lodash `isEqual`.
- React and memoisation deliberately use **shallow** comparison for speed; deep comparison of big trees on every render is expensive.

### JSON shortcut
`JSON.stringify(a) === JSON.stringify(b)` breaks on key order, `undefined`, dates, `NaN`, Maps/Sets and cycles; avoid it except for quick, known-shape checks.
--- code
function deepEqual(a, b, seen = new WeakMap()) {
  if (Object.is(a, b)) return true;
  if (typeof a !== "object" || typeof b !== "object" || a === null || b === null) return false;
  if (Object.getPrototypeOf(a) !== Object.getPrototypeOf(b)) return false;

  // cycle guard
  if (seen.get(a) === b) return true;
  seen.set(a, b);

  if (a instanceof Date) return a.getTime() === b.getTime();
  if (a instanceof RegExp) return a.source === b.source && a.flags === b.flags;
  if (a instanceof Map) {
    if (a.size !== b.size) return false;
    for (const [k, v] of a) if (!b.has(k) || !deepEqual(v, b.get(k), seen)) return false;
    return true;
  }
  if (a instanceof Set) {
    if (a.size !== b.size) return false;
    for (const v of a) if (!b.has(v)) return false; // primitives; extend for objects if needed
    return true;
  }

  const keysA = Reflect.ownKeys(a);
  const keysB = Reflect.ownKeys(b);
  if (keysA.length !== keysB.length) return false;
  return keysA.every((k) => Object.prototype.hasOwnProperty.call(b, k) && deepEqual(a[k], b[k], seen));
}

const x = { id: 1, tags: ["a", "b"], meta: { created: new Date(0), score: NaN }, lookup: new Map([["k", { v: 1 }]]) };
const y = { meta: { score: NaN, created: new Date(0) }, lookup: new Map([["k", { v: 1 }]]), tags: ["a", "b"], id: 1 };
console.log(deepEqual(x, y)); // true (key order doesn't matter, NaN equals NaN)

console.log(deepEqual([1, 2], { 0: 1, 1: 2 })); // false - array vs object
console.log(deepEqual({ a: undefined }, {})); // false - different keys
console.log(deepEqual(new Set([1, 2]), new Set([2, 1]))); // true
console.log(JSON.stringify({ a: 1, b: 2 }) === JSON.stringify({ b: 2, a: 1 })); // false - why the JSON trick fails

// Circular structures
const c1 = { name: "loop" };
c1.self = c1;
const c2 = { name: "loop" };
c2.self = c2;
console.log(deepEqual(c1, c2)); // true

=== j192 | E | Convert an array of pairs to an object
**Use `Object.fromEntries(pairs)`, which turns an iterable of `[key, value]` pairs into an object (later duplicate keys win); write a `reduce` or loop version when you need validation, custom duplicate handling, or nested keys.**

### Details
- Works with any iterable of pairs: arrays, `Map` (`Object.fromEntries(map)`), `URLSearchParams`, generator output.
- Keys are converted to strings (symbols stay symbols).
- Duplicate keys: the **last** pair wins. If you need all values, group them into arrays instead.
- It is the inverse of `Object.entries`, which makes `Object.fromEntries(Object.entries(obj).map(...))` the standard way to transform an object's keys or values.

### Safety with untrusted keys
Keys like `"__proto__"` can be risky when you assign them into a normal object with `obj[key] = value` in a loop, because `obj["__proto__"] = ...` changes the prototype (prototype pollution). `Object.fromEntries` defines own properties, so `"__proto__"` becomes a normal key, and a `Map` or `Object.create(null)` is also safe.

### Variations
- **Validate pairs** (each must be a 2-item array).
- **Group duplicates** into arrays: `[["tag","a"],["tag","b"]]` → `{ tag: ["a","b"] }`.
- **Nested keys** with dot paths: `[["user.name","Ada"]]` → `{ user: { name: "Ada" } }`.
--- code
const pairs = [["name", "Ada"], ["role", "admin"], ["level", 3], ["role", "owner"]];
console.log(Object.fromEntries(pairs)); // { name: "Ada", role: "owner", level: 3 } - last duplicate wins

// From a Map and from query parameters
console.log(Object.fromEntries(new Map([["a", 1], ["b", 2]]))); // { a: 1, b: 2 }
console.log(Object.fromEntries(new URLSearchParams("q=js&page=2"))); // { q: "js", page: "2" }

// Transform an object via entries
const prices = { pen: 2, book: 12 };
console.log(Object.fromEntries(Object.entries(prices).map(([k, v]) => [k.toUpperCase(), Math.round(v * 1.2 * 100) / 100]))); // { PEN: 2.4, BOOK: 14.4 }

// Manual version with validation and grouping of duplicates
function pairsToObject(input, { groupDuplicates = false } = {}) {
  const out = Object.create(null);
  for (const pair of input) {
    if (!Array.isArray(pair) || pair.length !== 2) throw new TypeError(`Invalid pair: ${JSON.stringify(pair)}`);
    const [key, value] = pair;
    if (groupDuplicates && key in out) out[key] = [].concat(out[key], value);
    else out[key] = value;
  }
  return out;
}
console.log({ ...pairsToObject([["tag", "js"], ["tag", "ts"], ["id", 1]], { groupDuplicates: true }) }); // { tag: ["js", "ts"], id: 1 }

// Nested keys with dot paths
const toNested = (entries) =>
  entries.reduce((obj, [path, value]) => {
    const keys = path.split(".");
    keys.slice(0, -1).reduce((node, k) => (node[k] ??= {}), obj)[keys.at(-1)] = value;
    return obj;
  }, {});
console.log(toNested([["user.name", "Ada"], ["user.address.city", "London"], ["active", true]]));
// { user: { name: "Ada", address: { city: "London" } }, active: true }

// "__proto__" stays a plain key with fromEntries
const parsed = Object.fromEntries([["__proto__", { polluted: true }]]);
console.log(({}).polluted, Object.hasOwn(parsed, "__proto__")); // undefined true

=== j193 | E | Convert an object to an array of pairs
**`Object.entries(obj)` returns an array of `[key, value]` pairs for the object's own enumerable string-keyed properties, in property order; use `Reflect.ownKeys` if you also need symbol or non-enumerable keys.**

### Related methods
- `Object.keys(obj)`: only keys.
- `Object.values(obj)`: only values.
- `Object.entries(obj)`: pairs.
- `Map.prototype.entries()` / `[...map]`: pairs from a Map.
All of them include only **own enumerable** string keys, never inherited ones.

### Property order
Integer-like keys come first in ascending numeric order, then string keys in insertion order, then (for `Reflect.ownKeys`) symbols. This surprises people when keys look like numbers: `{ b: 1, 2: "x", a: 2, 1: "y" }` lists `1` and `2` first.

### Typical uses
- Iterating with destructuring: `for (const [key, value] of Object.entries(obj))`.
- Sorting an object by its values (objects themselves cannot be sorted).
- Converting to a `Map`: `new Map(Object.entries(obj))`.
- Transforming and rebuilding with `Object.fromEntries`.
- Filtering out empty or sensitive fields before sending data.

### Deep version
For nested objects, flatten into path/value pairs (`"user.address.city"`), which is useful for forms, query strings and diffing (see "Flatten a nested object").
--- code
const user = { name: "Ada", age: 36, 2: "two", 1: "one", [Symbol("id")]: 7 };
Object.defineProperty(user, "secret", { value: "hidden", enumerable: false });

console.log(Object.entries(user)); // [["1", "one"], ["2", "two"], ["name", "Ada"], ["age", 36]] - integer keys first
console.log(Reflect.ownKeys(user)); // ["1", "2", "name", "age", "secret", Symbol(id)]

// Iterate with destructuring
for (const [key, value] of Object.entries({ theme: "dark", fontSize: 16 })) console.log(`${key} = ${value}`);

// Sort an object by its values
const scores = { ada: 88, linus: 95, grace: 91 };
const ranked = Object.entries(scores).sort(([, a], [, b]) => b - a);
console.log(ranked.map(([name]) => name)); // ["linus", "grace", "ada"]

// Filter fields, then rebuild
const form = { email: "ada@example.com", password: "hunter2", nickname: "", age: 36 };
const safe = Object.fromEntries(Object.entries(form).filter(([k, v]) => k !== "password" && v !== ""));
console.log(safe); // { email: "ada@example.com", age: 36 }

// Object -> Map
const map = new Map(Object.entries(scores));
console.log(map.get("grace"), map.size); // 91 3

// Deep: nested object -> path/value pairs
const toPairsDeep = (obj, prefix = "") =>
  Object.entries(obj).flatMap(([k, v]) =>
    v && typeof v === "object" && !Array.isArray(v) ? toPairsDeep(v, `${prefix}${k}.`) : [[`${prefix}${k}`, v]]
  );
console.log(toPairsDeep({ user: { name: "Ada", address: { city: "London" } }, active: true }));
// [["user.name", "Ada"], ["user.address.city", "London"], ["active", true]]

=== j194 | M | Flatten a nested object
**Flattening turns a nested object into a single-level object whose keys are paths (`"user.address.city"`); recurse into plain objects (and optionally arrays), building the key by joining the parent path with the current key, and stop at primitives, dates and other non-plain values.**

### Decisions to make (ask the interviewer)
- **Separator**: `.` is common; use something else if keys can contain dots.
- **Arrays**: index them (`"tags.0"`), keep them as values, or use bracket notation (`"tags[0]"`).
- **Empty objects/arrays**: drop them or keep `{}`/`[]` as values so the structure can be restored.
- **Special objects** (`Date`, `Map`, class instances): treat as leaf values.
- **Depth limit** and **cycle detection** for untrusted data.

### The inverse: unflatten
Split each key on the separator and create intermediate objects (or arrays when the next segment is numeric) as needed. Round-tripping flatten → unflatten is a good test.

### Where it is used
- Form libraries and validation errors keyed by field path (`"address.zip"`).
- Query strings and environment variables (`APP__DB__HOST`).
- Translations files (`"home.hero.title"`).
- Diffing objects and storing documents in flat key-value stores.
- Logging and analytics properties.

### Complexity
O(n) over the total number of values; recursion depth equals nesting depth (use an explicit stack for extremely deep data).
--- code
const isPlainObject = (v) => v !== null && typeof v === "object" && Object.getPrototypeOf(v) === Object.prototype;

function flattenObject(obj, { separator = ".", flattenArrays = true } = {}, prefix = "", out = {}, seen = new WeakSet()) {
  if (seen.has(obj)) throw new TypeError("Circular reference");
  seen.add(obj);
  for (const [key, value] of Object.entries(obj)) {
    const path = prefix ? `${prefix}${separator}${key}` : key;
    const recurse = isPlainObject(value) || (flattenArrays && Array.isArray(value));
    if (recurse && Object.keys(value).length > 0) flattenObject(value, { separator, flattenArrays }, path, out, seen);
    else out[path] = value; // primitives, dates, empty objects/arrays
  }
  return out;
}

function unflattenObject(flat, separator = ".") {
  const root = {};
  for (const [path, value] of Object.entries(flat)) {
    const keys = path.split(separator);
    let node = root;
    keys.forEach((key, i) => {
      if (i === keys.length - 1) node[key] = value;
      else node = node[key] ??= /^\d+$/.test(keys[i + 1]) ? [] : {}; // arrays for numeric segments
    });
  }
  return root;
}

const profile = {
  user: { name: "Ada", address: { city: "London", zip: "N1" } },
  tags: ["admin", "editor"],
  created: new Date(0),
  prefs: {},
};

const flat = flattenObject(profile);
console.log(flat);
// { "user.name": "Ada", "user.address.city": "London", "user.address.zip": "N1", "tags.0": "admin", "tags.1": "editor", created: Date, prefs: {} }

console.log(Object.keys(flattenObject(profile, { flattenArrays: false })).includes("tags")); // true - arrays kept whole

const restored = unflattenObject(flat);
console.log(JSON.stringify(restored) === JSON.stringify(profile)); // true - round trip works

=== j195 | H | Implement Function.prototype.bind
**A `bind` polyfill returns a new function that calls the original with a fixed `this` and pre-filled arguments; a complete version also handles `new` (where the bound `this` is ignored), keeps the prototype chain for constructors, and sets `name` and `length`.**

### Requirements
1. `fn.myBind(thisArg, ...preset)` returns a function; calling it runs `fn` with `this = thisArg` and `[...preset, ...callArgs]`.
2. Throws `TypeError` if called on a non-function.
3. **`new boundFn()`** must create an instance of the original function: ignore `thisArg`, keep the preset arguments, and make `instanceof` work.
4. Bound `this` cannot be overridden later with `call`/`apply`.
5. Nice to have: `name` is `"bound " + fn.name`, and `length` is `max(0, fn.length - preset.length)`.

### Detecting `new`
Use `new.target` inside the bound function (or `this instanceof bound` in older code). When it is set, call the original with `Reflect.construct(fn, args, new.target)`, which also handles classes correctly.

### Prototype handling
Native bound functions have no `prototype` property, yet `new bound()` produces instances of the original. Using `Reflect.construct` gives exactly that, so `instance instanceof fn` is true without copying prototypes manually.

### Why interviewers ask
It tests closures, `this` rules, `new` semantics, `call`/`apply`, and attention to spec details. Mentioning `new.target` and `Reflect.construct` stands out.
--- code
Object.defineProperty(Function.prototype, "myBind", {
  value: function myBind(thisArg, ...preset) {
    const target = this;
    if (typeof target !== "function") throw new TypeError("Bind must be called on a function");

    function bound(...args) {
      if (new.target) return Reflect.construct(target, [...preset, ...args], new.target); // `new` ignores thisArg
      return target.apply(thisArg, [...preset, ...args]);
    }

    Object.defineProperty(bound, "name", { value: `bound ${target.name}` });
    Object.defineProperty(bound, "length", { value: Math.max(0, target.length - preset.length) });
    bound.prototype = target.prototype; // so `new.target.prototype` and instanceof line up
    return bound;
  },
  writable: true,
  configurable: true,
  enumerable: false,
});

const user = { name: "Ada" };
function greet(greeting, punctuation) {
  return `${greeting}, ${this.name}${punctuation}`;
}

const greetAda = greet.myBind(user, "Hello");
console.log(greetAda("!")); // Hello, Ada!
console.log(greetAda.call({ name: "Linus" }, "?")); // Hello, Ada? - bound `this` wins
console.log(greetAda.name, greetAda.length); // "bound greet" 1

// `new` ignores the bound `this` but keeps preset arguments
function Point(x, y) {
  this.x = x;
  this.y = y;
}
const PointAtX5 = Point.myBind({ ignored: true }, 5);
const p = new PointAtX5(10);
console.log(p, p instanceof Point); // Point { x: 5, y: 10 } true

// Matches the native behaviour
const native = Point.bind(null, 5);
console.log(new native(10) instanceof Point, JSON.stringify(new native(10)) === JSON.stringify(p)); // true true

delete Function.prototype.myBind;

=== j196 | M | Implement Function.prototype.call
**A `call` polyfill runs the function immediately with a given `this`: temporarily attach the function to the context object under a unique `Symbol` key, invoke it as a method (so `this` becomes the object), delete the key, and return the result.**

### Steps
1. Ensure `this` (the function being called) is callable; otherwise throw `TypeError`.
2. Normalise the context:
   - `null`/`undefined` → `globalThis` (sloppy-mode behaviour; strict-mode functions would actually receive `undefined`, which this trick cannot reproduce for `null`).
   - Primitives → box them with `Object(value)` so a property can be attached.
3. Use a **`Symbol`** as the temporary key so it can never collide with an existing property and does not show up in normal key listings.
4. Call `context[key](...args)`, which sets `this` to `context`.
5. **Always delete the key**, even if the function throws (use `try/finally`).
6. Return the result.

### Limitations to mention
- Fails on frozen or non-extensible objects (you cannot add the temporary property). Real engines do not have this problem; a fallback is `Reflect.apply`, but that defeats the purpose of the exercise.
- Strict-mode semantics for `null`/`undefined` and primitives are approximated.

### Why it is asked
It shows you understand that `this` is determined by **how** a function is called (method call syntax), and attention to cleanup and collisions.
--- code
Object.defineProperty(Function.prototype, "myCall", {
  value: function myCall(context, ...args) {
    if (typeof this !== "function") throw new TypeError("myCall must be called on a function");
    const ctx = context == null ? globalThis : Object(context); // box primitives
    const key = Symbol("fn"); // unique, can't collide
    ctx[key] = this;
    try {
      return ctx[key](...args); // method call -> `this` is ctx
    } finally {
      delete ctx[key]; // always clean up
    }
  },
  writable: true,
  configurable: true,
  enumerable: false,
});

function introduce(greeting, punctuation) {
  return `${greeting}, I'm ${this.name}${punctuation}`;
}

const ada = { name: "Ada" };
console.log(introduce.myCall(ada, "Hi", "!")); // Hi, I'm Ada!
console.log(Object.getOwnPropertySymbols(ada).length); // 0 - temporary key removed

// Primitives are boxed
function describe() {
  return `${typeof this}: ${this.toUpperCase()}`;
}
console.log(describe.myCall("hello")); // object: HELLO

// Cleanup happens even if the function throws
function fails() {
  throw new Error("boom");
}
const target = {};
try {
  fails.myCall(target);
} catch (e) {
  console.log(e.message, Object.getOwnPropertySymbols(target).length); // boom 0

}

// Same results as the native call
console.log(introduce.myCall(ada, "Hey", ".") === introduce.call(ada, "Hey", ".")); // true

delete Function.prototype.myCall;

=== j197 | E | Implement Function.prototype.apply
**`apply` is `call` with the arguments supplied as an array: attach the function to the context under a temporary `Symbol`, invoke it with the spread argument list, clean up, and return the result, treating a missing or `null` argument list as no arguments.**

### Steps
1. Check that `this` is a function.
2. Normalise the context (`null`/`undefined` → `globalThis`, primitives boxed with `Object()`).
3. Validate the arguments: `null` or `undefined` means "no arguments"; otherwise it must be an array-like object, or throw a `TypeError` like the native version does (`fn.apply(ctx, 5)` throws).
4. Convert array-likes (e.g. `arguments`, `{ length: 2, 0: "a", 1: "b" }`) with `Array.from`.
5. Attach under a unique `Symbol`, call with spread, delete in `finally`, return.

### Differences from call
Only the argument format. With modern spread syntax, `fn.call(ctx, ...args)` and `fn.apply(ctx, args)` are interchangeable; `apply` is convenient when you already hold an array or `arguments` object, for example when forwarding inside wrappers.

### Limits to mention
- Engines cap the number of arguments a call can take; spreading huge arrays can throw `RangeError` (same as native).
- The temporary-property trick fails on frozen objects.
--- code
Object.defineProperty(Function.prototype, "myApply", {
  value: function myApply(context, argsList) {
    if (typeof this !== "function") throw new TypeError("myApply must be called on a function");
    let args = [];
    if (argsList != null) {
      if (typeof argsList !== "object" && typeof argsList !== "function") {
        throw new TypeError("CreateListFromArrayLike called on non-object");
      }
      args = Array.from(argsList); // supports array-likes
    }
    const ctx = context == null ? globalThis : Object(context);
    const key = Symbol("fn");
    ctx[key] = this;
    try {
      return ctx[key](...args);
    } finally {
      delete ctx[key];
    }
  },
  writable: true,
  configurable: true,
  enumerable: false,
});

console.log(Math.max.myApply(null, [3, 9, 4])); // 9

const account = { owner: "Ada", balance: 100 };
function withdraw(amount, fee) {
  this.balance -= amount + fee;
  return `${this.owner} has ${this.balance} left`;
}
console.log(withdraw.myApply(account, [30, 2])); // Ada has 68 left

// Array-likes and missing args
console.log(Array.prototype.join.myApply({ length: 3, 0: "a", 1: "b", 2: "c" }, ["-"])); // a-b-c
function count() {
  return arguments.length;
}
console.log(count.myApply(null), count.myApply(null, undefined), count.myApply(null, [1, 2])); // 0 0 2

// Invalid argument list throws like the native version
for (const fn of [() => count.apply(null, 5), () => count.myApply(null, 5)]) {
  try {
    fn();
  } catch (e) {
    console.log(e.name); // TypeError (x2)
  }
}

delete Function.prototype.myApply;

=== j198 | H | Implement an Async Queue
**A production-grade async queue accepts tasks (functions returning promises), runs at most `concurrency` of them at a time, resolves each `add()` with that task's own result or error, and supports priorities, pausing, cancellation and an `onIdle()` promise.**

### API
- `add(task, { priority, signal })` → promise of the task's result.
- `concurrency` limit (1 = strictly sequential).
- `pause()` / `start()`.
- `onIdle()` → resolves when nothing is running or waiting.
- `size` (waiting) and `pending` (running).
- Cancellation: a task whose `AbortSignal` aborts before it starts is removed and rejected.

### Implementation outline
1. Keep a waiting list (sorted by priority, stable for equal priorities) and a running counter.
2. `add` pushes an entry containing the task, its `resolve`/`reject`, priority and signal, then calls `#next()`.
3. `#next()` starts tasks while `running < concurrency` and not paused. Each task:
   - increments `running`;
   - runs `Promise.resolve().then(task)` so synchronous throws become rejections;
   - settles the caller's promise;
   - in `finally`, decrements `running` and calls `#next()` again.
4. When `running === 0` and the list is empty, resolve all `onIdle` waiters.

### Design notes
- One failing task must not stop the queue.
- Starting tasks from `finally` keeps the pipeline full.
- For large backlogs, a binary heap makes priority insertion O(log n) instead of O(n).
- Libraries like `p-queue` provide this, plus rate limiting (interval caps).
--- code
class AsyncQueue {
  #waiting = [];
  #running = 0;
  #paused = false;
  #idleWaiters = [];

  constructor({ concurrency = 1 } = {}) {
    this.concurrency = concurrency;
  }

  get size() { return this.#waiting.length; }
  get pending() { return this.#running; }

  add(task, { priority = 0, signal } = {}) {
    return new Promise((resolve, reject) => {
      if (signal?.aborted) return reject(signal.reason);
      const entry = { task, priority, resolve, reject, signal };
      const i = this.#waiting.findIndex((e) => e.priority < priority); // stable priority insert
      i === -1 ? this.#waiting.push(entry) : this.#waiting.splice(i, 0, entry);
      signal?.addEventListener("abort", () => {
        const idx = this.#waiting.indexOf(entry);
        if (idx !== -1) {
          this.#waiting.splice(idx, 1);
          reject(signal.reason);
          this.#checkIdle();
        }
      }, { once: true });
      this.#next();
    });
  }

  pause() { this.#paused = true; }
  start() { this.#paused = false; this.#next(); }
  onIdle() {
    return this.#running === 0 && this.#waiting.length === 0 ? Promise.resolve() : new Promise((r) => this.#idleWaiters.push(r));
  }

  #next() {
    while (!this.#paused && this.#running < this.concurrency && this.#waiting.length) {
      const { task, resolve, reject } = this.#waiting.shift();
      this.#running++;
      Promise.resolve()
        .then(task)
        .then(resolve, reject)
        .finally(() => {
          this.#running--;
          this.#next();
          this.#checkIdle();
        });
    }
  }
  #checkIdle() {
    if (this.#running === 0 && this.#waiting.length === 0) this.#idleWaiters.splice(0).forEach((r) => r());
  }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const queue = new AsyncQueue({ concurrency: 2 });
const log = [];
let peak = 0;
const job = (name, ms, fail = false) => async () => {
  peak = Math.max(peak, queue.pending);
  await sleep(ms);
  if (fail) throw new Error(`${name} failed`);
  log.push(name);
  return name;
};

queue.pause();
const a = queue.add(job("A", 30));
const b = queue.add(job("B (fails)", 10, true)).catch((e) => e.message);
const c = queue.add(job("C low", 5), { priority: -1 });
const d = queue.add(job("D urgent", 5), { priority: 10 });
const controller = new AbortController();
const e = queue.add(job("E cancelled", 5), { signal: controller.signal }).catch(() => "E was cancelled");
controller.abort();
queue.start();

console.log(await Promise.all([a, b, c, d, e])); // ["A", "B (fails) failed", "C low", "D urgent", "E was cancelled"]
await queue.onIdle();
console.log(log, "peak concurrency:", peak); // ["D urgent", "C low", "A"] peak concurrency: 2 (D ran first: highest priority)

=== j199 | M | Implement Promise retry logic
**A generic `retry(fn, options)` utility calls an async function, and on failure waits and calls it again, up to a limit, with configurable backoff, jitter, a `shouldRetry` predicate, an `onRetry` hook and `AbortSignal` support; it rethrows the last error (with context) when attempts run out.**

### Options worth supporting
- `retries`: maximum extra attempts.
- `delay` strategy: fixed, linear or exponential (`base * factor ** attempt`), capped by `maxDelay`.
- **Jitter**: "full jitter" picks a random delay between 0 and the backoff, which spreads retries from many clients.
- `shouldRetry(error, attempt)`: retry only transient errors (network, timeout, 5xx), not validation or auth failures.
- `onRetry(error, attempt, delay)`: logging and metrics.
- `signal`: stop waiting and give up when the caller aborts.
- Pass the **attempt number** to `fn`, so it can adjust (e.g. a longer timeout on later attempts).

### Error reporting
When giving up, throw an error that says how many attempts were made, with the original error as `cause` (or collect all errors into an `AggregateError`).

### Pitfalls
- **Retrying non-idempotent operations** (charging a card) can duplicate side effects; use idempotency keys.
- **Retry storms**: retries multiply load on a struggling service; combine backoff with circuit breakers on servers.
- Do not retry inside nested layers that also retry (the multiplication effect).
- Tests: inject the `sleep` function or use fake timers so tests run instantly.

### Related
"Retry an API call on failure" applies this to HTTP specifics (status codes, `Retry-After`).
--- code
async function retry(fn, {
  retries = 3,
  baseDelay = 100,
  factor = 2,
  maxDelay = 5_000,
  jitter = true,
  shouldRetry = () => true,
  onRetry = () => {},
  signal,
  sleep = (ms) => new Promise((r) => setTimeout(r, ms)),
} = {}) {
  for (let attempt = 0; ; attempt++) {
    signal?.throwIfAborted();
    try {
      return await fn(attempt);
    } catch (error) {
      if (attempt >= retries || !shouldRetry(error, attempt)) {
        throw new Error(`Failed after ${attempt + 1} attempt(s): ${error.message}`, { cause: error });
      }
      const backoff = Math.min(maxDelay, baseDelay * factor ** attempt);
      const delay = jitter ? Math.random() * backoff : backoff; // full jitter
      onRetry(error, attempt + 1, Math.round(delay));
      await sleep(delay);
    }
  }
}

// Flaky operation: fails twice with a transient error, then succeeds
let calls = 0;
const flaky = async (attempt) => {
  calls++;
  if (calls < 3) throw Object.assign(new Error("ECONNRESET"), { transient: true });
  return `succeeded on attempt ${attempt + 1}`;
};

const result = await retry(flaky, {
  baseDelay: 10,
  shouldRetry: (err) => err.transient === true,
  onRetry: (err, n, ms) => console.log(`retry #${n} after ${err.message} (waiting ${ms}ms)`),
});
console.log(result); // succeeded on attempt 3

// Permanent errors are not retried
try {
  await retry(async () => { throw new Error("400 Bad Request"); }, { shouldRetry: (e) => !e.message.startsWith("4") });
} catch (e) {
  console.log(e.message, "| cause:", e.cause.message); // Failed after 1 attempt(s): 400 Bad Request | cause: 400 Bad Request
}

// Abort stops further attempts
const controller = new AbortController();
controller.abort(new Error("user navigated away"));
try {
  await retry(flaky, { signal: controller.signal });
} catch (e) {
  console.log(e.message); // user navigated away
}

=== j200 | H | Build a mini React-like state system
**A mini React-style state system needs a component function that re-runs to produce UI, a `useState` hook whose values live outside the function in a per-component array indexed by call order, and setters that update the value and schedule a re-render, ideally batched in a microtask.**

### How React's hooks really work (simplified)
1. Each component instance has an array of hook slots.
2. During render, a cursor starts at 0; each `useState` call reads slot `cursor++`. This is why **hooks must be called in the same order every render**: no hooks inside conditions or loops.
3. The setter writes to its slot and schedules a re-render.
4. **Batching**: several setter calls in the same tick cause a single render, scheduled as a microtask.
5. Setters accept a value or an **updater function** (`set(c => c + 1)`), which avoids stale values when updating several times in a row.
6. **Bail out** if the new value is identical (`Object.is`) to the old one.

### Adding `useEffect`
Store effect callbacks and their dependency arrays in slots; after rendering, run effects whose dependencies changed, calling the previous cleanup first.

### What the real React adds
A fiber tree per component, reconciliation (diffing the new UI against the old), priorities and concurrent rendering, transitions, Suspense, context, server components, and the React Compiler's automatic memoisation. But the core idea of hooks is exactly this ordered slot list.

### Why this is a great interview question
It tests closures, render scheduling, microtasks, and the rules of hooks, and shows you understand what React does rather than only how to use it.
--- code
function createRoot(Component, onRender) {
  const hooks = []; // state slots for this component instance
  let cursor = 0;
  let scheduled = false;
  const effects = [];

  function render() {
    scheduled = false;
    cursor = 0; // hooks are matched by call order
    const output = Component();
    onRender(output);
    effects.splice(0).forEach((run) => run()); // run effects after rendering
  }

  function scheduleRender() {
    if (scheduled) return; // batch several updates into one render
    scheduled = true;
    queueMicrotask(render);
  }

  function useState(initial) {
    const i = cursor++;
    if (!(i in hooks)) hooks[i] = typeof initial === "function" ? initial() : initial; // lazy init
    const setState = (next) => {
      const value = typeof next === "function" ? next(hooks[i]) : next;
      if (Object.is(value, hooks[i])) return; // bail out: nothing changed
      hooks[i] = value;
      scheduleRender();
    };
    return [hooks[i], setState];
  }

  function useEffect(callback, deps) {
    const i = cursor++;
    const prev = hooks[i];
    const changed = !prev || !deps || deps.some((d, k) => !Object.is(d, prev.deps[k]));
    if (changed) {
      effects.push(() => {
        prev?.cleanup?.();
        hooks[i] = { deps, cleanup: callback() };
      });
    }
  }

  return { render, useState, useEffect };
}

// A "component" using the hooks
const renders = [];
const root = createRoot(Counter, (ui) => renders.push(ui));
const { useState, useEffect } = root;
let api;

function Counter() {
  const [count, setCount] = useState(0);
  const [label] = useState(() => "Clicks");
  useEffect(() => {
    renders.push(`effect: count is ${count}`);
    return () => renders.push(`cleanup for ${count}`);
  }, [count]);
  api = { increment: () => setCount((c) => c + 1), setSame: () => setCount(count) };
  return `${label}: ${count}`;
}

root.render(); // initial render
api.increment();
api.increment();
api.increment(); // three updates in one tick...
await Promise.resolve(); // ...one batched render
api.setSame(); // same value: no render
await Promise.resolve();
console.log(renders);
// ["Clicks: 0", "effect: count is 0", "Clicks: 3", "cleanup for 0", "effect: count is 3"]
