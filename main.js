// main.js

const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const fs = require("fs-extra");
const axios = require("axios");

let outputFilePath = null;
let logFileStream = null;

function createWindow() {
  const win = new BrowserWindow({
    width: 1000,
    height: 700,
    minWidth: 650,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  win.loadFile("index.html");
}

app.whenReady().then(() => {
  createWindow();

  app.on("activate", function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", function () {
  if (process.platform !== "darwin") app.quit();
});

/** IPC Handlers **/

ipcMain.handle("process-feeds", async (event, data) => {
  const { inputFilePath, subscriptionValue, authKey, requestType } = data;

  if (!inputFilePath || !fs.existsSync(inputFilePath)) {
    await writeLog("Input file not found or not selected.\n");
    return;
  }

  try {
    const fileContent = await fs.readFile(inputFilePath, "utf8");
    const feedIds = fileContent.split(/\r?\n/).filter(Boolean);

    const timestamp = new Date().toISOString().replace(/[:.]/g, "_");
    const userDataPath = app.getPath("desktop");
    outputFilePath = path.join(userDataPath, `output_${timestamp}.log`);
    logFileStream = fs.createWriteStream(outputFilePath, { flags: "a" });

    const totalFeeds = feedIds.length;

    for (let i = 0; i < totalFeeds; i++) {
      const feedId = feedIds[i];
      const requestData = subscriptionValue
        ? { subscriptions: [subscriptionValue] }
        : null;
      const headers = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authKey}`,
      };

      let url = `https://services.get.dxfeed.com/api/v1/accounts/${feedId}/subscriptions/`;
      if (requestType === "POST") {
        url = `https://services.get.dxfeed.com/api/v1/accounts/${feedId}/subscriptions/cancel`;
      }

      try {
        let response;
        if (requestType === "GET") {
          response = await axios.get(url, { headers });
        } else {
          response = await axios.post(url, requestData, { headers });
        }

        const logEntry = `Feed ID: ${feedId}, Request Type: ${requestType}, Response: ${JSON.stringify(
          response.data
        )}\n`;
        await writeLog(logEntry);
      } catch (error) {
        const errorEntry = `Feed ID: ${feedId}, Request Type: ${requestType}, Error: ${error.message}\n`;
        await writeLog(errorEntry);
      }

      event.sender.send("update-progress", i + 1, totalFeeds);
    }

    logFileStream.end();
    logFileStream = null;

    await writeLog(`Processing complete. Output saved to ${outputFilePath}\n`);
  } catch (error) {
    console.error(error);
    await writeLog(`An error occurred: ${error.message}\n`);
  }
});

ipcMain.handle("fetch-dxfeed-id", async (event, url, headers) => {
  try {
    const response = await axios.get(url, { headers });
    return response.data;
  } catch (error) {
    throw error;
  }
});

ipcMain.handle("save-dxfeed-ids", async (event, dxFeedIds) => {
  try {
    const userDataPath = app.getPath("userData");
    const inputFilePath = path.join(userDataPath, "dxfeed_ids.txt");
    await fs.writeFile(inputFilePath, dxFeedIds.join("\n"), "utf8");
  } catch (error) {
    console.error("Error saving dxFeed IDs:", error);
    throw error;
  }
});

ipcMain.handle("get-dxfeed-ids-file-path", async () => {
  const userDataPath = app.getPath("userData");
  return path.join(userDataPath, "dxfeed_ids.txt");
});

ipcMain.handle("write-log", async (event, message) => {
  await writeLog(message);
});

ipcMain.handle("get-output-file-path", async () => {
  return outputFilePath;
});

ipcMain.handle("get-user-data-path", () => {
  return app.getPath("userData");
});

app.on("before-quit", () => {
  if (logFileStream) {
    logFileStream.end();
  }
});

async function writeLog(message) {
  if (!outputFilePath) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "_");
    const userDataPath = app.getPath("desktop"); //ПОМЕНЯЛ
    outputFilePath = path.join(userDataPath, `output_${timestamp}.log`);
    logFileStream = fs.createWriteStream(outputFilePath, { flags: "a" });
  }

  if (logFileStream) {
    logFileStream.write(message);
  } else {
    await fs.appendFile(outputFilePath, message, "utf8");
  }
}
