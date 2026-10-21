// The device token on the desktop (domain/saves SAVE-143, SAVE-057): encrypted
// with Electron's safeStorage in one file in userData. Where safeStorage can't
// encrypt, `set` answers false and the game keeps the token in web storage.
import { readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";

export function secretFile(file, safeStorage) {
  const usable = () => {
    try {
      return safeStorage.isEncryptionAvailable();
    } catch {
      return false;
    }
  };
  return {
    usable,
    get() {
      if (!usable()) return undefined;
      try {
        return safeStorage.decryptString(readFileSync(file));
      } catch {
        return undefined;
      }
    },
    /** Keeps the value (undefined forgets it); false when it could not be kept encrypted. */
    set(value) {
      if (value === undefined || value === null) {
        rmSync(file, { force: true });
        return true;
      }
      if (!usable()) return false;
      try {
        writeFileSync(`${file}.tmp`, safeStorage.encryptString(String(value)));
        renameSync(`${file}.tmp`, file);
        return true;
      } catch {
        return false;
      }
    },
  };
}
