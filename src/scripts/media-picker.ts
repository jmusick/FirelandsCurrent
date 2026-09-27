import { listLibrary, type MediaItem } from './media-client';

// Drives the <MediaPicker /> dialog. openMediaPicker() resolves with the chosen or newly uploaded
// image, or null if the dialog is closed without one.

let resolveCurrent: ((item: MediaItem | null) => void) | null = null;
let wired: HTMLDialogElement | null = null;
let query = '';
let page = 0;

function finish(dialog: HTMLDialogElement, item: MediaItem | null) {
  const resolve = resolveCurrent;
  resolveCurrent = null;
  if (dialog.open) dialog.close();
  resolve?.(item);
}

function showTab(dialog: HTMLDialogElement, name: 'library' | 'upload') {
  dialog.querySelectorAll<HTMLButtonElement>('[data-tab]').forEach((tab) => tab.setAttribute('aria-selected', String(tab.dataset.tab === name)));
  dialog.querySelectorAll<HTMLElement>('[data-panel]').forEach((panel) => { panel.hidden = panel.dataset.panel !== name; });
}

async function load(dialog: HTMLDialogElement, reset: boolean) {
  const grid = dialog.querySelector<HTMLElement>('.grid')!;
  const more = dialog.querySelector<HTMLButtonElement>('.more')!;
  const empty = dialog.querySelector<HTMLElement>('.empty')!;
  if (reset) { page = 0; grid.replaceChildren(); }
  const asked = query;
  const { items, more: hasMore } = await listLibrary(query, page);
  if (asked !== query) return;
  for (const item of items) {
    const button = document.createElement('button');
    button.type = 'button';
    const img = document.createElement('img');
    img.src = item.url;
    img.alt = '';
    img.loading = 'lazy';
    const name = Object.assign(document.createElement('span'), { className: 'name', textContent: item.filename });
    const dims = Object.assign(document.createElement('span'), { className: 'dims', textContent: `${item.width}×${item.height} · ${item.credit}` });
    button.replaceChildren(img, name, dims);
    button.title = item.caption || item.alt || item.filename;
    button.addEventListener('click', () => finish(dialog, item));
    grid.appendChild(button);
  }
  empty.hidden = grid.childElementCount > 0 || query !== '';
  more.hidden = !hasMore;
}

function wire(dialog: HTMLDialogElement) {
  dialog.querySelectorAll<HTMLButtonElement>('[data-tab]').forEach((tab) => tab.addEventListener('click', () => showTab(dialog, tab.dataset.tab as 'library' | 'upload')));
  dialog.querySelector('[data-close]')!.addEventListener('click', () => finish(dialog, null));
  dialog.addEventListener('close', () => finish(dialog, null));
  let timer: ReturnType<typeof setTimeout>;
  const search = dialog.querySelector<HTMLInputElement>('.search')!;
  search.addEventListener('input', () => {
    clearTimeout(timer);
    timer = setTimeout(() => { query = search.value.trim(); load(dialog, true); }, 250);
  });
  dialog.querySelector('.more')!.addEventListener('click', () => { page++; load(dialog, false); });
  dialog.addEventListener('media-uploaded', (event) => finish(dialog, (event as CustomEvent<MediaItem>).detail));
}

export function openMediaPicker(options: { title?: string; file?: File } = {}): Promise<MediaItem | null> {
  const dialog = document.getElementById('media-picker') as HTMLDialogElement | null;
  if (!dialog) return Promise.resolve(null);
  if (wired !== dialog) { wire(dialog); wired = dialog; }
  if (resolveCurrent) finish(dialog, null);
  dialog.querySelector('#media-picker-title')!.textContent = options.title ?? 'Choose an image';
  const search = dialog.querySelector<HTMLInputElement>('.search')!;
  search.value = query = '';
  if (options.file) {
    // A dropped or pasted file goes straight to the upload form, which still needs its credit.
    const input = dialog.querySelector<HTMLInputElement>('form[data-media-upload] input[type=file]')!;
    const files = new DataTransfer();
    files.items.add(options.file);
    input.files = files.files;
    input.dispatchEvent(new Event('change'));
    showTab(dialog, 'upload');
  } else showTab(dialog, 'library');
  load(dialog, true).catch(() => {});
  dialog.showModal();
  return new Promise((resolve) => { resolveCurrent = resolve; });
}
