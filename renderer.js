// renderer.js

// Function to auto-resize textarea
function autoResizeTextarea(element) {
  element.style.height = "auto";
  element.style.height = element.scrollHeight + "px";
}

document.addEventListener("DOMContentLoaded", function () {
  // Get references to textareas
  const accountCodesInput = document.getElementById("account-codes-input");
  const sqlOutputInput = document.getElementById("sql-output-input");
  const generatedSqlOutput = document.getElementById("generated-sql-output");
  const subscriptionToCancelInput = document.getElementById(
    "subscription-to-cancel"
  );

  // Add event listeners for auto-resizing
  if (accountCodesInput) {
    accountCodesInput.addEventListener("input", function () {
      autoResizeTextarea(this);
    });
    autoResizeTextarea(accountCodesInput);
  }

  if (sqlOutputInput) {
    sqlOutputInput.addEventListener("input", function () {
      autoResizeTextarea(this);
    });
    autoResizeTextarea(sqlOutputInput);
  }

  if (generatedSqlOutput) {
    generatedSqlOutput.addEventListener("input", function () {
      autoResizeTextarea(this);
    });
    autoResizeTextarea(generatedSqlOutput);
  }

  if (
    subscriptionToCancelInput &&
    subscriptionToCancelInput.tagName.toLowerCase() === "textarea"
  ) {
    subscriptionToCancelInput.addEventListener("input", function () {
      autoResizeTextarea(this);
    });
    autoResizeTextarea(subscriptionToCancelInput);
  }

  // Add event listener to the "Copy to Clipboard" button
  const copySqlButton = document.getElementById("copy-sql");
  copySqlButton.addEventListener("click", function () {
    const generatedSqlOutput = document.getElementById("generated-sql-output");
    generatedSqlOutput.select();
    generatedSqlOutput.setSelectionRange(0, 99999);

    try {
      const successful = document.execCommand("copy");
      if (successful) {
        showCustomAlert("SQL query copied to clipboard!");
      } else {
        showCustomAlert("Unable to copy SQL query.");
      }
    } catch (err) {
      console.error("Error copying to clipboard:", err);
      showCustomAlert("Unable to copy SQL query.");
    }

    window.getSelection().removeAllRanges();
  });
});

// Variables
let inputFilePath = null;
let outputFilePath = null;
let subscriptionValue = null;

// Get elements
const importAccountsBtn = document.getElementById("import-accounts");
const getSubscriptionsBtn = document.getElementById("get-subscriptions");
const cancelSubscriptionBtn = document.getElementById("cancel-subscription");

const accountCodesModal = document.getElementById("account-codes-modal");
const sqlOutputModal = document.getElementById("sql-output-modal");
const outputInfoModal = document.getElementById("output-info-modal");
const subscriptionInputModal = document.getElementById(
  "subscription-input-modal"
);
const progressModal = document.getElementById("progress-modal");

const closeAccountCodesModalBtn = document.getElementById(
  "close-account-codes-modal"
);
const closeSqlOutputModalBtn = document.getElementById(
  "close-sql-output-modal"
);
const closeOutputInfoModalBtn = document.getElementById(
  "close-output-info-modal"
);
const closeOutputInfoBtn = document.getElementById("close-output-info");
const closeSubscriptionInputModalBtn = document.getElementById(
  "close-subscription-input-modal"
);

const generateSqlBtn = document.getElementById("generate-sql");
const fetchDxfeedIdsBtn = document.getElementById("fetch-dxfeed-ids");
const confirmCancelSubscriptionBtn = document.getElementById(
  "confirm-cancel-subscription"
);

const outputTextarea = document.getElementById("output");

const dxfeedProgressContainer = document.getElementById(
  "dxfeed-progress-container"
);
const dxfeedProgressBar = document.getElementById("dxfeed-progress-bar");
const dxfeedProgressLabel = document.getElementById("dxfeed-progress-label");

const processProgressBar = document.getElementById("process-progress-bar");
const processProgressLabel = document.getElementById("process-progress-label");
const progressModalTitle = document.getElementById("progress-modal-title");

importAccountsBtn.addEventListener("click", importAccounts);
getSubscriptionsBtn.addEventListener("click", sendGetRequests);
cancelSubscriptionBtn.addEventListener("click", openCancelSubscriptionModal);

function importAccounts() {
  const authKey = document.getElementById("auth-key").value.trim();

  if (!authKey) {
    showCustomAlert(
      "Please enter the Bearer Auth Key before importing accounts. It could be found in project.properties"
    );
    return;
  }

  accountCodesModal.style.display = "block";
}

// Close modals
closeAccountCodesModalBtn.onclick = () =>
  (accountCodesModal.style.display = "none");
closeSqlOutputModalBtn.onclick = () => (sqlOutputModal.style.display = "none");
closeOutputInfoModalBtn.onclick = () =>
  (outputInfoModal.style.display = "none");
closeOutputInfoBtn.onclick = () => (outputInfoModal.style.display = "none");
closeSubscriptionInputModalBtn.onclick = () =>
  (subscriptionInputModal.style.display = "none");

window.onclick = function (event) {
  if (event.target === accountCodesModal) {
    accountCodesModal.style.display = "none";
  } else if (event.target === sqlOutputModal) {
    sqlOutputModal.style.display = "none";
  } else if (event.target === outputInfoModal) {
    outputInfoModal.style.display = "none";
  } else if (event.target === subscriptionInputModal) {
    subscriptionInputModal.style.display = "none";
  } else if (event.target === progressModal) {
    // Do not close the progress modal when clicking outside
  }
};

// Handle "Next Step" in Account Codes Modal
generateSqlBtn.onclick = () => {
  const accountCodesInput = document
    .getElementById("account-codes-input")
    .value.trim();
  if (!accountCodesInput) {
    showCustomAlert("Please enter account codes.");
    return;
  }

  const accountCodes = accountCodesInput.split(/\r?\n/).filter(Boolean);
  const sqlQuery = generateSqlQuery(accountCodes);

  const generatedSqlOutput = document.getElementById("generated-sql-output");
  generatedSqlOutput.value = sqlQuery;

  autoResizeTextarea(generatedSqlOutput);

  accountCodesModal.style.display = "none";
  sqlOutputModal.style.display = "block";
};

// Handle "Fetch dxFeed IDs" in SQL Output Modal
fetchDxfeedIdsBtn.onclick = async () => {
  const emailsInput = document.getElementById("sql-output-input").value.trim();
  if (!emailsInput) {
    showCustomAlert("Please enter the emails obtained from the SQL output.");
    return;
  }

  const emails = emailsInput.split(/\r?\n/).filter(Boolean);
  const authKey = document.getElementById("auth-key").value.trim();

  if (!authKey) {
    showCustomAlert(
      "Please enter the Bearer Auth Key. It could be found in project.properties"
    );
    return;
  }

  outputTextarea.value = "";

  dxfeedProgressContainer.style.display = "block";
  dxfeedProgressBar.value = 0;
  dxfeedProgressLabel.innerText = "0%";

  try {
    const dxFeedIds = await fetchDxFeedIds(emails, authKey);

    if (dxFeedIds.length === 0) {
      showCustomAlert(
        "No dxFeed IDs were fetched. Please check the emails and try again."
      );
      dxfeedProgressContainer.style.display = "none";
      return;
    }

    await window.electronAPI.saveDxFeedIds(dxFeedIds);

    sqlOutputModal.style.display = "none";

    inputFilePath = await window.electronAPI.getDxFeedIdsFilePath();

    showCustomAlert(
      "dxFeed IDs have been fetched and saved. You can now send requests."
    );
  } catch (error) {
    console.error(error);
    showCustomAlert(`An error occurred: ${error.message}`);
  } finally {
    dxfeedProgressContainer.style.display = "none";
  }
};

function showCustomAlert(message) {
  const alertModal = document.getElementById("custom-alert-modal");
  const alertMessage = document.getElementById("alert-message");

  alertMessage.innerText = message;
  alertModal.style.display = "block";

  // Close modal on clicking OK
  document.getElementById("custom-alert-ok").onclick = function () {
    alertModal.style.display = "none";
  };

  // Allow closing with the 'X' button
  document.getElementById("close-custom-alert").onclick = function () {
    alertModal.style.display = "none";
  };
}

// Function to generate SQL query
function generateSqlQuery(accountCodes) {
  const codesString = accountCodes.map((code) => `'${code}'`).join(", ");
  const sqlQuery = `SELECT p.email FROM accounts a \nLEFT JOIN principals p ON p.id = a.owner_id WHERE a.account_code IN \n(${codesString});`;
  return sqlQuery;
}

// Function to fetch dxFeed IDs for emails
async function fetchDxFeedIds(emails, authKey) {
  const dxFeedIds = [];
  const headers = {
    Authorization: `Bearer ${authKey}`,
  };

  const totalEmails = emails.length;

  for (let i = 0; i < totalEmails; i++) {
    const email = emails[i];
    const url = `https://services.get.dxfeed.com/api/v1/accounts/by-email/${encodeURIComponent(
      email
    )}`;
    try {
      const response = await window.electronAPI.fetchDxFeedId(url, headers);

      let dxFeedId = null;

      if (response && response.dxFeedId) {
        dxFeedId = response.dxFeedId;
      } else if (response && response.id) {
        dxFeedId = response.id;
      }

      if (dxFeedId) {
        dxFeedIds.push(dxFeedId);
      } else {
        const logMessage = `No dxFeed ID found for ${email}\n`;
        appendOutput(logMessage);
      }
    } catch (error) {
      if (error.response && error.response.status === 404) {
        const logMessage = `dxFeed ID not found for ${email}\n`;
        appendOutput(logMessage);
      } else {
        const logMessage = `Error fetching dxFeed ID for ${email}: ${error.message}\n`;
        appendOutput(logMessage);
      }
    }

    const percentage = Math.floor(((i + 1) / totalEmails) * 100);
    dxfeedProgressBar.value = percentage;
    dxfeedProgressLabel.innerText = `${percentage}%`;
  }

  return dxFeedIds;
}

// Function to send GET requests
async function sendGetRequests() {
  const authKey = document.getElementById("auth-key").value.trim();

  if (!inputFilePath || !authKey) {
    showCustomAlert(
      "Please ensure dxFeed IDs are imported and Bearer Auth Key is provided before sending requests."
    );
    return;
  }

  progressModalTitle.innerText = "Fetching Account Subscriptions...";
  processProgressBar.value = 0;
  processProgressLabel.innerText = "0%";
  progressModal.style.display = "block";

  try {
    await window.electronAPI.processFeeds({
      inputFilePath,
      subscriptionValue: null,
      authKey,
      requestType: "GET",
    });

    outputFilePath = await window.electronAPI.getOutputFilePath();
    document.getElementById("output-file-path").innerText = outputFilePath;
    outputInfoModal.style.display = "block";
  } catch (error) {
    console.error(error);
    showCustomAlert(
      `An error occurred while processing feeds: ${error.message}`
    );
  } finally {
    progressModal.style.display = "none";
  }
}

// Function to open Cancel Subscription modal
function openCancelSubscriptionModal() {
  subscriptionInputModal.style.display = "block";
  document.getElementById("subscription-to-cancel").focus();
}

// Handle "Confirm" button in Cancel Subscription Modal
confirmCancelSubscriptionBtn.onclick = async () => {
  const subscriptionInput = document
    .getElementById("subscription-to-cancel")
    .value.trim();
  if (!subscriptionInput) {
    showCustomAlert("Please enter the subscription to cancel.");
    return;
  }

  subscriptionValue = subscriptionInput;

  const authKey = document.getElementById("auth-key").value.trim();

  if (!inputFilePath || !authKey) {
    showCustomAlert(
      "Please ensure dxFeed IDs are imported and Bearer Auth Key is provided before sending requests."
    );
    return;
  }

  subscriptionInputModal.style.display = "none";

  progressModalTitle.innerText = "Cancelling Subscriptions...";
  processProgressBar.value = 0;
  processProgressLabel.innerText = "0%";
  progressModal.style.display = "block";

  try {
    await window.electronAPI.processFeeds({
      inputFilePath,
      subscriptionValue,
      authKey,
      requestType: "POST",
    });

    outputFilePath = await window.electronAPI.getOutputFilePath();
    document.getElementById("output-file-path").innerText = outputFilePath;
    outputInfoModal.style.display = "block";
  } catch (error) {
    console.error(error);
    showCustomAlert(
      `An error occurred while processing feeds: ${error.message}`
    );
  } finally {
    progressModal.style.display = "none";
  }
};

// Function to append messages to the output textarea
function appendOutput(message) {
  outputTextarea.value += message;
  outputTextarea.scrollTop = outputTextarea.scrollHeight;
}

// Listen for progress updates from the main process
window.electronAPI.onUpdateProgress((_event, current, total) => {
  const percentage = total > 0 ? Math.floor((current / total) * 100) : 0;
  processProgressBar.value = percentage;
  processProgressLabel.innerText = `${percentage}%`;
});
