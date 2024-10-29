// preload.js

const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  processFeeds: (data) => ipcRenderer.invoke("process-feeds", data),
  fetchDxFeedId: (url, headers) =>
    ipcRenderer.invoke("fetch-dxfeed-id", url, headers),
  saveDxFeedIds: (dxFeedIds) =>
    ipcRenderer.invoke("save-dxfeed-ids", dxFeedIds),
  getDxFeedIdsFilePath: () => ipcRenderer.invoke("get-dxfeed-ids-file-path"),
  writeLog: (message) => ipcRenderer.invoke("write-log", message),
  getOutputFilePath: () => ipcRenderer.invoke("get-output-file-path"),
  onUpdateProgress: (callback) => ipcRenderer.on("update-progress", callback),
  getUserDataPath: () => ipcRenderer.invoke("get-user-data-path"),
});
