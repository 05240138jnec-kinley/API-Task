// Works from http://localhost:3000 AND from Live Server (127.0.0.1:5500)
const API = location.port === '3000' ? '/tasks' : 'http://localhost:3000/tasks';

let tasks = [];
let filter = 'all';
let query = '';
let editingId = null;

const $ = (id) => document.getElementById(id);
const board = $('board');

/* ---------- API helper ---------- */
async function api(path = '', options = {}) {
  const res = await fetch(API + path, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (res.status === 204) return null;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

/* ---------- Helpers ---------- */
function toast(msg) {
  const t = $('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => t.classList.remove('show'), 2200);
}

function timeAgo(date) {
  const s = Math.max(0, (Date.now() - new Date(date)) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return Math.floor(s / 60) + ' min ago';
  if (s < 86400) return Math.floor(s / 3600) + ' h ago';
  return Math.floor(s / 86400) + ' d ago';
}

function showError(msg) {
  $('error').textContent = msg;
  $('error').hidden = !msg;
}

/* ---------- Load + mutate ---------- */
async function load() {
  try {
    tasks = await api();
    showError('');
  } catch (e) {
    tasks = [];
    showError('Could not reach the API (' + e.message +
      '). Check that "npm start" is running, then open http://localhost:3000');
  }
  render();
}

async function run(fn, message) {
  try {
    await fn();
    if (message) toast(message);
  } catch (e) {
    toast(e.message);
  }
  await load();
}

/* ---------- Render ---------- */
function updateSummary() {
  const total = tasks.length;
  const done = tasks.filter((t) => t.completed).length;
  const left = total - done;
  const pct = total ? Math.round((done / total) * 100) : 0;

  $('c-all').textContent = total;
  $('c-active').textContent = left;
  $('c-done').textContent = done;
  $('pct').textContent = pct + '%';
  $('ring').style.strokeDashoffset = 113.1 * (1 - pct / 100);

  const hour = new Date().getHours();
  const hello = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  $('greeting').textContent = !total
    ? `${hello}. Your board is empty.`
    : left === 0
      ? `${hello}. Everything is done. Nice work!`
      : `${hello}. ${left} ${left === 1 ? 'task' : 'tasks'} left.`;
}

function render() {
  updateSummary();

  const shown = tasks.filter((t) => {
    const okFilter = filter === 'all' || (filter === 'done' ? t.completed : !t.completed);
    return okFilter && t.title.toLowerCase().includes(query.toLowerCase());
  });

  board.innerHTML = '';

  if (!shown.length) {
    const empty = document.createElement('div');
    empty.className = 'empty';
    empty.innerHTML = tasks.length
      ? '<strong>No matching tasks</strong>Try another filter or search.'
      : '<strong>Your board is empty</strong>Type a task above and press Enter.';
    board.append(empty);
    return;
  }

  shown.forEach((t) => board.append(buildNote(t)));
}

function buildNote(t) {
  const note = document.createElement('article');
  note.className = `note c${t.id % 5}` + (t.completed ? ' done' : '');

  const body = document.createElement('div');
  body.className = 'note-body';

  const cb = document.createElement('input');
  cb.type = 'checkbox';
  cb.checked = !!t.completed;
  cb.setAttribute('aria-label', 'Mark complete');
  cb.onchange = () =>
    run(
      () => api('/' + t.id, { method: 'PATCH', body: JSON.stringify({ completed: cb.checked }) }),
      cb.checked ? 'Task completed' : 'Task reopened'
    );
  body.append(cb);

  if (editingId === t.id) {
    const input = document.createElement('input');
    input.className = 'note-edit';
    input.value = t.title;
    input.maxLength = 255;
    let saved = false;
    const save = async () => {
      if (saved) return;
      saved = true;
      const title = input.value.trim();
      editingId = null;
      if (title && title !== t.title) {
        await run(() => api('/' + t.id, { method: 'PATCH', body: JSON.stringify({ title }) }), 'Task updated');
      } else render();
    };
    input.onkeydown = (e) => {
      if (e.key === 'Enter') save();
      if (e.key === 'Escape') { saved = true; editingId = null; render(); }
    };
    input.onblur = save;
    body.append(input);
    setTimeout(() => { input.focus(); input.select(); }, 0);
  } else {
    const title = document.createElement('div');
    title.className = 'note-title';
    title.textContent = t.title; // textContent keeps it safe from XSS
    title.ondblclick = () => { editingId = t.id; render(); };
    body.append(title);
  }

  const foot = document.createElement('div');
  foot.className = 'note-foot';
  const when = document.createElement('span');
  when.textContent = timeAgo(t.created_at);
  const actions = document.createElement('span');
  actions.className = 'note-actions';

  const edit = document.createElement('button');
  edit.textContent = 'Edit';
  edit.onclick = () => { editingId = t.id; render(); };

  const del = document.createElement('button');
  del.className = 'del';
  del.textContent = 'Delete';
  del.onclick = () => {
    note.classList.add('leaving');
    setTimeout(() => run(() => api('/' + t.id, { method: 'DELETE' }), 'Task deleted'), 250);
  };

  actions.append(edit, del);
  foot.append(when, actions);
  note.append(body, foot);
  return note;
}

/* ---------- Events ---------- */
$('add-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const input = $('new-title');
  const title = input.value.trim();
  if (!title) return toast('Write something first');
  await run(() => api('', { method: 'POST', body: JSON.stringify({ title }) }), 'Task added');
  input.value = '';
  input.focus();
});

document.querySelectorAll('.tabs button').forEach((b) => {
  b.onclick = () => {
    filter = b.dataset.filter;
    document.querySelectorAll('.tabs button').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    render();
  };
});

$('search').addEventListener('input', (e) => { query = e.target.value; render(); });

$('theme').onclick = () => {
  const dark = document.documentElement.dataset.theme !== 'dark';
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  try { localStorage.setItem('theme', dark ? 'dark' : 'light'); } catch {}
};
try {
  const saved = localStorage.getItem('theme');
  if (saved) document.documentElement.dataset.theme = saved;
} catch {}

/* ---------- Start ---------- */
board.innerHTML = '<div class="skeleton"></div><div class="skeleton"></div><div class="skeleton"></div>';
load();