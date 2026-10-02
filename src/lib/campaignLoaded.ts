// Campaign data loaded in the browser — CSVs the user picked or pasted on
// the page. They are read by the browser and kept in the browser: in this
// tab's sessionStorage by default (gone when the tab closes), or in
// localStorage if the user chose "keep on this device". Nothing in this
// module, or anything that reads it, sends the data anywhere.
const KEY = "cc-campaign-data";

export type LoadedFiles = Record<string, string>; // canonical file name → CSV text

export function readLoaded(): { files: LoadedFiles; kept: boolean } {
  for (const [store, kept] of [[sessionStorage, false], [localStorage, true]] as const) {
    try {
      const raw = store.getItem(KEY);
      if (raw) return { files: JSON.parse(raw) as LoadedFiles, kept };
    } catch {
      /* unreadable or blocked storage → treat as nothing loaded */
    }
  }
  return { files: {}, kept: false };
}

export function writeLoaded(files: LoadedFiles, keepOnDevice: boolean): void {
  clearLoaded();
  (keepOnDevice ? localStorage : sessionStorage).setItem(KEY, JSON.stringify(files));
}

export function clearLoaded(): void {
  sessionStorage.removeItem(KEY);
  localStorage.removeItem(KEY);
}
