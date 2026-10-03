// Both EasyMDE modes use this callback. Never pass guest Markdown to its HTML renderer.
export function createStoryPreview() {
  const pending = new WeakMap<HTMLElement, { timer: ReturnType<typeof setTimeout>; controller: AbortController }>();
  return (markdown: string, preview: HTMLElement): string => {
    const previous = pending.get(preview);
    if (previous) {
      clearTimeout(previous.timer);
      previous.controller.abort();
    }
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const response = await fetch('/api/admin/news/preview', {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
          body: markdown,
          signal: controller.signal,
          redirect: 'error',
        });
        if (!response.ok) throw new Error('Preview unavailable');
        const html = await response.text();
        if (!controller.signal.aborted) preview.innerHTML = html;
      } catch {
        if (!controller.signal.aborted) preview.textContent = 'Couldn’t load the preview. Check your connection and staff sign-in, then try again.';
      }
    }, 150);
    pending.set(preview, { timer, controller });
    return 'Loading preview…';
  };
}
