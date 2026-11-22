import { sequential } from '../../src/sequential';
import { sequentialAllSettled, Result } from '../../src/sequentialAllSettled';

import './style.css';

interface TaskDef {
  name: string;
  needs: string;
  duration: number;
  value: (previous: string | undefined) => string;
}

type BarStatus = 'idle' | 'running' | 'fulfilled' | 'rejected';

interface Bar {
  status: BarStatus;
  start: number;
  end: number;
  value?: string;
}

type LaneId = 'all' | 'sequential' | 'settled';

interface Lane {
  id: LaneId;
  title: string;
  summary: string;
  libraryCode?: string;
  nativeCode: string;
  run: (requests: ((previous: unknown[]) => Promise<string>)[]) => Promise<unknown>;
}

interface LaneState {
  startedAt: number;
  settledAt?: number;
  outcome?: 'resolved' | 'rejected';
  output?: unknown;
  bars: Bar[];
}

/**
 * The fake requests. Each one uses the result of the one before it, if it got one.
 */
const TASKS: TaskDef[] = [
  { name: 'Look up user', needs: 'Nothing', duration: 700, value: () => 'user #42' },
  {
    name: 'Load their orders',
    needs: 'The user',
    duration: 900,
    value: (user) => `orders of ${user}`,
  },
  {
    name: 'Price shipping',
    needs: 'The orders',
    duration: 500,
    value: (orders) => (orders ? 'shipping: $7.50' : 'shipping: $NaN'),
  },
  { name: 'Send receipt', needs: 'The shipping price', duration: 600, value: () => 'receipt sent' },
];

const TOTAL = TASKS.reduce((sum, task) => sum + task.duration, 0);

const LANES: Lane[] = [
  {
    id: 'all',
    title: 'Promise.all',
    summary:
      'Starts every request at once. Fastest, but no request can use an earlier result, so the orders are loaded for an undefined user. One failure rejects the whole thing, while the other requests keep running in the background.',
    nativeCode: `const results = await Promise.all(
  requests.map((request) => request()),
);`,
    run: (requests) => Promise.all(requests.map((request) => request([]))),
  },
  {
    id: 'sequential',
    title: 'sequential',
    summary:
      'Runs one request at a time and hands each one the results so far. The first failure rejects, and the requests after it never start.',
    libraryCode: `import sequential from '@brianmcallister/sequential-promise';

const results = await sequential(requests);`,
    nativeCode: `const results = [];

for (const request of requests) {
  results.push(await request(results));
}`,
    run: (requests) => sequential<string>(requests),
  },
  {
    id: 'settled',
    title: 'sequentialAllSettled',
    summary:
      'Also runs one request at a time, but keeps going after a failure. It resolves with the outcome of every request, in the same shape as Promise.allSettled.',
    libraryCode: `import {
  sequentialAllSettled,
} from '@brianmcallister/sequential-promise';

const results = await sequentialAllSettled(requests);`,
    nativeCode: `const results = [];

for (const request of requests) {
  try {
    const value = await request(results);
    results.push({ status: 'fulfilled', value });
  } catch (reason) {
    results.push({ status: 'rejected', reason });
  }
}`,
    run: (requests) => sequentialAllSettled<string>(requests as ((list: Result<string>[]) => Promise<string>)[]),
  },
];

const failing = new Set<number>([2]);
const states = new Map<LaneId, LaneState>();
let frame = 0;

const $ = <T extends HTMLElement>(selector: string, root: ParentNode = document) =>
  root.querySelector(selector) as T;

const el = (tag: string, className?: string, text?: string) => {
  const node = document.createElement(tag);

  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;

  return node;
};

/**
 * Get the value of the previous request from either a plain results list or a settled one.
 */
const previousValue = (results: unknown[]) => {
  const last = results[results.length - 1];

  if (last && typeof last === 'object' && 'status' in last) {
    const settled = last as Result<string>;

    return settled.status === 'fulfilled' ? settled.value : undefined;
  }

  return last as string | undefined;
};

/**
 * Wrap each task as a function that returns a promise, recording its timing into a lane.
 */
const makeRequests = (state: LaneState) =>
  TASKS.map((task, index) => (results: unknown[]) => {
    const bar = state.bars[index];

    bar.status = 'running';
    bar.start = performance.now() - state.startedAt;

    return new Promise<string>((resolve, reject) => {
      setTimeout(() => {
        bar.end = performance.now() - state.startedAt;

        if (failing.has(index)) {
          bar.status = 'rejected';
          reject(`${task.name} failed`);
        } else {
          bar.status = 'fulfilled';
          bar.value = task.value(previousValue(results));
          resolve(bar.value);
        }
      }, task.duration);
    });
  });

/**
 * Format a value like JavaScript source, with one array item per line.
 */
const format = (value: unknown): string => {
  if (Array.isArray(value)) {
    return value.length ? `[\n${value.map((item) => `  ${format(item)}`).join(',\n')},\n]` : '[]';
  }

  if (value && typeof value === 'object') {
    const entries = Object.entries(value).map(([key, item]) => `${key}: ${format(item)}`);

    return `{ ${entries.join(', ')} }`;
  }

  return typeof value === 'string' ? `'${value}'` : String(value);
};

const describeOutcome = (state: LaneState) => {
  if (!state.outcome) return 'Running…';

  if (state.outcome === 'rejected') return `Rejected with ${format(state.output)}`;

  return `Resolved with ${format(state.output)}`;
};

const renderTasks = () => {
  const list = $<HTMLOListElement>('#tasks');

  list.replaceChildren(
    ...TASKS.map((task, index) => {
      const item = el('li', 'task');
      const id = `fail-${index}`;
      const toggle = el('label', 'task__toggle') as HTMLLabelElement;
      const input = el('input') as HTMLInputElement;

      input.type = 'checkbox';
      input.id = id;
      input.checked = failing.has(index);
      input.addEventListener('change', () => {
        if (input.checked) failing.add(index);
        else failing.delete(index);
        run();
      });

      toggle.htmlFor = id;
      toggle.append(input, el('span', undefined, 'Fail'));

      item.append(
        el('span', 'task__number', String(index + 1)),
        el('span', 'task__name', task.name),
        el('span', 'task__meta', `${task.duration} ms · needs ${task.needs.toLowerCase()}`),
        toggle,
      );

      return item;
    }),
  );
};

const renderLanes = () => {
  const container = $<HTMLElement>('#lanes');

  container.replaceChildren(
    ...LANES.map((lane) => {
      const card = el('article', 'lane');
      card.dataset.lane = lane.id;

      const head = el('div', 'lane__head');
      const status = el('span', 'lane__status');
      status.setAttribute('aria-live', 'polite');
      head.append(el('h3', 'lane__title', lane.title), status, el('span', 'lane__time'));

      const timeline = el('div', 'timeline');
      const ticks = el('div', 'timeline__ticks');

      for (let ms = 0; ms <= TOTAL; ms += 500) {
        const tick = el('span', 'timeline__tick', `${ms / 1000}s`);
        tick.style.left = `${(ms / TOTAL) * 100}%`;
        ticks.append(tick);
      }

      timeline.append(ticks);

      TASKS.forEach((task) => {
        const row = el('div', 'timeline__row');
        const track = el('div', 'timeline__track');
        track.append(el('div', 'timeline__bar'), el('span', 'timeline__note'));
        row.append(el('span', 'timeline__label', task.name), track);
        timeline.append(row);
      });

      // The marker lives in the ticks layer, so its left offset is a share of the track width.
      const marker = el('div', 'timeline__marker');
      marker.append(el('span', 'timeline__marker-label'));
      ticks.append(marker);

      const code = el('div', 'lane__code');

      if (lane.libraryCode) {
        const block = el('figure', 'code');
        block.append(el('figcaption', undefined, 'With sequential-promise'), el('pre'));
        $('pre', block).textContent = lane.libraryCode;
        code.append(block);
      }

      const native = el('figure', 'code');
      native.append(el('figcaption', undefined, lane.libraryCode ? 'Plain JavaScript' : 'Built in'), el('pre'));
      $('pre', native).textContent = lane.nativeCode;
      code.append(native);

      card.append(
        head,
        el('p', 'lane__summary', lane.summary),
        timeline,
        el('pre', 'lane__output'),
        code,
      );

      return card;
    }),
  );
};

const paint = () => {
  const now = performance.now();
  let busy = false;

  LANES.forEach((lane) => {
    const state = states.get(lane.id);
    const card = $<HTMLElement>(`[data-lane="${lane.id}"]`);

    if (!state || !card) return;

    const elapsed = Math.min(now - state.startedAt, TOTAL);
    const status = $<HTMLElement>('.lane__status', card);
    const label = state.outcome ? (state.outcome === 'resolved' ? 'Resolved' : 'Rejected') : 'Running';

    status.textContent = label;
    status.dataset.status = state.outcome ?? 'running';
    $<HTMLElement>('.lane__time', card).textContent = state.settledAt
      ? `settled after ${Math.round(state.settledAt)} ms`
      : `${Math.round(elapsed)} ms`;

    card.querySelectorAll<HTMLElement>('.timeline__row').forEach((row, index) => {
      const bar = state.bars[index];
      const barEl = $<HTMLElement>('.timeline__bar', row);
      const note = $<HTMLElement>('.timeline__note', row);
      const end = bar.status === 'running' ? now - state.startedAt : bar.end;

      barEl.dataset.status = bar.status;
      barEl.style.left = `${(bar.start / TOTAL) * 100}%`;
      barEl.style.width = bar.status === 'idle' ? '0' : `${(Math.max(end - bar.start, 0) / TOTAL) * 100}%`;

      const neverRan = bar.status === 'idle' && state.outcome;
      note.textContent = neverRan ? 'never started' : bar.status === 'rejected' ? 'failed' : (bar.value ?? '');
      note.dataset.status = neverRan ? 'idle' : bar.status;
      // Put the note after the bar, or before it when the bar ends near the right edge.
      const trackWidth = row.querySelector('.timeline__track')!.clientWidth;
      const flip = !neverRan && (end / TOTAL) * trackWidth + 8 + note.offsetWidth > trackWidth;
      note.classList.toggle('is-flipped', flip);
      note.style.left = neverRan
        ? '0'
        : flip
          ? `calc(${(bar.start / TOTAL) * 100}% - 8px)`
          : `calc(${(end / TOTAL) * 100}% + 8px)`;

      if (bar.status === 'running') busy = true;
    });

    const marker = $<HTMLElement>('.timeline__marker', card);
    marker.hidden = state.settledAt === undefined;

    if (state.settledAt !== undefined) {
      const position = state.settledAt / TOTAL;
      marker.style.left = `${position * 100}%`;
      // Keep the label inside the timeline when the marker is near either edge.
      marker.dataset.align = position > 0.85 ? 'end' : position < 0.15 ? 'start' : 'center';
      $<HTMLElement>('.timeline__marker-label', marker).textContent = state.outcome === 'resolved' ? 'resolved' : 'rejected';
    }

    $<HTMLElement>('.lane__output', card).textContent = describeOutcome(state);

    if (!state.outcome) busy = true;
  });

  frame = busy ? requestAnimationFrame(paint) : 0;
};

let runId = 0;

const run = () => {
  runId += 1;
  const thisRun = runId;
  const startedAt = performance.now();

  LANES.forEach((lane) => {
    const state: LaneState = {
      startedAt,
      bars: TASKS.map(() => ({ status: 'idle', start: 0, end: 0 })),
    };

    states.set(lane.id, state);

    const settle = (outcome: LaneState['outcome'], output: unknown) => {
      // Ignore lanes from a run that was replaced by a newer one.
      if (thisRun !== runId) return;

      state.outcome = outcome;
      state.output = output;
      state.settledAt = performance.now() - startedAt;
    };

    lane.run(makeRequests(state)).then(
      (output) => settle('resolved', output),
      (reason) => settle('rejected', reason),
    );
  });

  if (!frame) frame = requestAnimationFrame(paint);
};

renderTasks();
renderLanes();
$<HTMLButtonElement>('#run').addEventListener('click', run);
run();
