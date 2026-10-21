// The desktop save folder (domain/saves SAVE-144, SAVE-145): one `.phsave`
// file per save in `<userData>/saves/<campaignId>/<savedAt>-<saveId>.phsave`,
// the same names as in the cloud (SAVE-053), so Steam Auto-Cloud can carry the
// folder. The renderer parses headers; this side only moves bytes, and reads
// no more of a file than its header for the Load card (SAVE-036).
import { mkdir, open, readdir, readFile, rename, rm } from "node:fs/promises";
import { dirname, join, normalize, sep } from "node:path";

const EXT = ".phsave";
const MAGIC = "PHSV";
/** A header longer than this is not one of ours (it holds a 96 × 64 PNG at most). */
const MAX_HEADER = 4 * 1024 * 1024;
/** `<campaignId>/<savedAt>-<saveId>.phsave`, nothing else. */
const NAME = /^[A-Za-z0-9_-]{1,128}\/[0-9]{1,16}-[A-Za-z0-9_-]{1,128}\.phsave$/;

export function isSavePath(path) {
  return typeof path === "string" && NAME.test(path);
}

/** The save folder at `root`; every path is checked against the file-name rule before it touches the disk. */
export function saveFolder(root) {
  root = normalize(root);
  const at = (path) => {
    if (!isSavePath(path)) throw new Error(`not a save path: ${String(path)}`);
    const file = normalize(join(root, path));
    if (!file.startsWith(root + sep)) throw new Error(`outside the save folder: ${path}`);
    return file;
  };

  /** The header's bytes (magic, version, length, JSON), or undefined when the file is not a readable save. */
  async function head(file) {
    let fh;
    try {
      fh = await open(file, "r");
      const prefix = Buffer.alloc(10);
      const { bytesRead } = await fh.read(prefix, 0, 10, 0);
      if (bytesRead < 10 || prefix.toString("latin1", 0, 4) !== MAGIC) return undefined;
      const len = prefix.readUInt32LE(6);
      if (len > MAX_HEADER) return undefined;
      const bytes = Buffer.alloc(10 + len);
      const got = await fh.read(bytes, 0, bytes.length, 0);
      if (got.bytesRead < bytes.length) return undefined;
      return new Uint8Array(bytes.buffer, bytes.byteOffset, bytes.length);
    } catch {
      return undefined;
    } finally {
      await fh?.close();
    }
  }

  return {
    root,

    /** Every save's path and header bytes. Files that are not saves (temporary files, others' files) are left alone. */
    async list() {
      let campaigns;
      try {
        campaigns = await readdir(root, { withFileTypes: true });
      } catch {
        return [];
      }
      const out = [];
      for (const c of campaigns) {
        if (!c.isDirectory()) continue;
        let files;
        try {
          files = await readdir(join(root, c.name));
        } catch {
          continue;
        }
        for (const f of files) {
          const path = `${c.name}/${f}`;
          if (!f.endsWith(EXT) || !isSavePath(path)) continue;
          const h = await head(join(root, c.name, f));
          if (h) out.push({ path, head: h });
        }
      }
      return out;
    },

    async read(path) {
      try {
        const b = await readFile(at(path));
        return new Uint8Array(b.buffer, b.byteOffset, b.length);
      } catch (e) {
        if (e?.code === "ENOENT") return undefined;
        throw e;
      }
    },

    /**
     * Writes a save the safe way (SAVE-032): a `.tmp` file beside it, flushed,
     * renamed into place, and only then the saves it replaces removed.
     */
    async commit(path, bytes, removed = []) {
      const file = at(path);
      const gone = removed.map(at);
      await mkdir(dirname(file), { recursive: true });
      const tmp = `${file}.tmp`;
      const fh = await open(tmp, "w");
      try {
        await fh.writeFile(bytes);
        await fh.sync();
      } finally {
        await fh.close();
      }
      await rename(tmp, file);
      for (const g of gone) if (g !== file) await rm(g, { force: true });
    },

    async remove(path) {
      await rm(at(path), { force: true });
    },
  };
}
