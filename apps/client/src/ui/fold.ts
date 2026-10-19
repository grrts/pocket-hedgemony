/**
 * A fold on a Realm book page (SHELL-172): a one-line summary the player reads
 * at a glance, and the detail behind a tap. Folds stay as the player left them
 * while the page re-renders, so choosing a setting inside one keeps it open.
 */

/** Which folds the player left open, by key. */
export const openFolds = new Set<string>();

export function fold(key: string, title: string, summary: string, body: string, openFirst = false): string {
  const open = openFolds.has(key) || (openFirst && !openFolds.has(`${key}:closed`));
  return `<details class="inst-fold" data-page-fold="${key}"${open ? " open" : ""}><summary><b>${title}</b><small>${summary}</small></summary><div class="inst-body">${body}</div></details>`;
}

/** Keeps each fold's open state across renders. */
export function bindFolds(root: ParentNode): void {
  root.querySelectorAll<HTMLDetailsElement>("details[data-page-fold]").forEach((d) =>
    d.addEventListener("toggle", () => {
      const k = d.dataset.pageFold!;
      if (d.open) {
        openFolds.add(k);
        openFolds.delete(`${k}:closed`);
      } else {
        openFolds.delete(k);
        openFolds.add(`${k}:closed`);
      }
    }),
  );
}
