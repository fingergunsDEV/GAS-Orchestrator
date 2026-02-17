/**
 * Logger.gs
 * Handles persistent logging of Agent actions to Google Sheets.
 */

var LOG_SHEET_NAME = "Agent_Logs";

/**
 * Ensures the log sheet exists and returns it.
 */
function getLogSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(LOG_SHEET_NAME);
  
  if (!sheet) {
    sheet = ss.insertSheet(LOG_SHEET_NAME);
    // Set headers
    sheet.appendRow(["Timestamp", "Session ID", "Role", "Content/Tool", "Details"]);
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, 5).setFontWeight("bold");
  }
  return sheet;
}

/**
 * Logs a specific event or turn part.
 * @param {string} sessionId - Unique ID for the current chat session.
 * @param {string} role - 'model', 'user', 'system', or 'tool'.
 * @param {string} summary - Brief summary (e.g., "Tool Call: gmail_search").
 * @param {string} details - Full JSON content or detailed text.
 */
function logAgentEvent(sessionId, role, summary, details) {
  try {
    // 1. Always update ephemeral state for UI (Fast)
    updateLiveTelemetry(sessionId, role, summary);

    // 2. Only write to Spreadsheet if it's a critical event (Slow)
    var criticalEvents = ["Goal", "Final Report", "Team Success", "Team Failed", "Awaiting Approval", "SYSTEM_PAUSE"];
    var isCritical = criticalEvents.indexOf(summary) !== -1 || role === "user" || summary.indexOf("Error") !== -1;
    
    if (!isCritical) return;

    var sheet = getLogSheet();
    var timestamp = new Date();
    
    // Truncate details if too long
    var safeDetails = details;
    if (typeof details !== "string") {
      safeDetails = JSON.stringify(details, null, 2);
    }
    
    if (safeDetails.length > 30000) {
      safeDetails = safeDetails.substring(0, 30000) + "...[TRUNCATED]";
    }
    
    sheet.appendRow([timestamp, sessionId, role, summary, safeDetails]);
    
  } catch (e) {
    console.error("Failed to log: " + e.message);
  }
}

/**
 * Updates a fast-access telemetry stream in CacheService for the UI.
 */
function updateLiveTelemetry(sessionId, role, summary) {
  var cache = CacheService.getScriptCache();
  var telemetry = {
    t: new Date().getTime(),
    s: sessionId,
    r: role,
    m: summary
  };
  // Store the last 5 events in a rotating buffer in cache
  var key = "TELEMETRY_" + sessionId;
  var existing = cache.get(key);
  var buffer = existing ? JSON.parse(existing) : [];
  buffer.push(telemetry);
  if (buffer.length > 10) buffer.shift();
  cache.put(key, JSON.stringify(buffer), 21600);
}

/**
 * Returns the URL of the logging spreadsheet for the UI.
 */
function getLogSheetUrl() {
  return getLogSheet().getParent().getUrl();
}

/**
 * Fetches recent logs formatted for the Neural Monitor UI.
 */
function getNeuralHistory() {
  try {
    var sheet = getLogSheet();
    var lastRow = sheet.getLastRow();
    if (lastRow < 2) return { streams: [], issues: [] };
    
    var startRow = Math.max(2, lastRow - 20);
    var numRows = lastRow - startRow + 1;
    var data = sheet.getRange(startRow, 1, numRows, 5).getValues();
    
    var streams = [];
    var issues = [];
    
    data.reverse().forEach(function(row) {
      var ts = row[0];
      var timeStr = Utilities.formatDate(new Date(ts), Session.getScriptTimeZone(), "HH:mm:ss");
      var role = (row[2] || "SYSTEM").toString();
      var summary = (row[3] || "").toString();
      var details = (row[4] || "").toString();
      
      streams.push({
        time: timeStr,
        origin: role.toUpperCase(),
        target: 'SYSTEM',
        data: summary
      });
      
      if (summary.toLowerCase().indexOf('error') !== -1 || summary.toLowerCase().indexOf('failed') !== -1) {
        issues.push({
          title: 'System Alert',
          description: summary + ': ' + details.substring(0, 100),
          solution: 'Analyze the kernel events for specific tool failure patterns.'
        });
      }
    });
    
    return { streams: streams, issues: issues };
  } catch (e) {
    console.error("Failed to get neural history: " + e.message);
    return { streams: [], issues: [] };
  }
}
