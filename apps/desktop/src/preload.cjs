// The bridge between the game (apps/client, in a sandboxed renderer) and the
// desktop shell: the save folder, the device token in safeStorage, and Steam.
// The game finds it as `window.phDesktop` (apps/client/src/desktop.ts); a
// browser has none and the game uses IndexedDB and localStorage instead.
const { contextBridge, ipcRenderer } = require("electron");

/** Asked once: whether Steam is running, the Steam name, whether this is a Steam Deck. */
const info = ipcRenderer.sendSync("ph:info");

contextBridge.exposeInMainWorld("phDesktop", {
  version: 1,
  steamDeck: info.steamDeck,
  saves: {
    list: () => ipcRenderer.invoke("ph:saves:list"),
    read: (path) => ipcRenderer.invoke("ph:saves:read", path),
    commit: (path, bytes, removed) => ipcRenderer.invoke("ph:saves:commit", path, bytes, removed),
    remove: (path) => ipcRenderer.invoke("ph:saves:remove", path),
  },
  secret: {
    usable: info.secretUsable,
    get: () => ipcRenderer.sendSync("ph:secret:get"),
    set: (value) => ipcRenderer.sendSync("ph:secret:set", value),
  },
  steam: info.steam
    ? {
        name: info.steam.name,
        webTicket: (identity) => ipcRenderer.invoke("ph:steam:ticket", identity),
      }
    : undefined,
});
