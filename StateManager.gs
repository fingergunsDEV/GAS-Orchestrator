/**
 * STATEMANAGER.gs
 * Handles persistence of agent sessions using PropertiesService and Drive.
 */

var MAX_PROP_SIZE = 9000; // PropertiesService limit is ~9kb per value

/**
 * Saves the current session state.
 * If small, uses PropertiesService. If large, uses a temp file in Drive.
 */
function saveSessionState(sessionId, history) {
  try {
    var state = JSON.stringify({
      id: sessionId,
      timestamp: new Date().toISOString(),
      history: history
    });

    if (state.length < MAX_PROP_SIZE) {
      PropertiesService.getScriptProperties().setProperty("SESSION_" + sessionId, state);
    } else {
      // For large history, save to Drive (or Sheets if Drive is restricted, but Drive is easier for JSON)
      var folder = getOrCreateSystemFolder();
      var fileName = "session_" + sessionId + ".json";
      var file = getFileByName(folder, fileName);
      if (file) {
        file.setContent(state);
      } else {
        folder.createFile(fileName, state, MimeType.PLAIN_TEXT);
      }
      // Leave a pointer in Properties
      PropertiesService.getScriptProperties().setProperty("SESSION_" + sessionId, "DRIVE:" + fileName);
    }
    console.log("Session saved: " + sessionId);
  } catch (e) {
    console.error("Failed to save session: " + e.message);
  }
}

/**
 * Loads a session state.
 */
function loadSessionState(sessionId) {
  try {
    var ptr = PropertiesService.getScriptProperties().getProperty("SESSION_" + sessionId);
    if (!ptr) return null;

    if (ptr.startsWith("DRIVE:")) {
      var fileName = ptr.substring(6);
      var folder = getOrCreateSystemFolder();
      var file = getFileByName(folder, fileName);
      if (!file) return null;
      return JSON.parse(file.getBlob().getDataAsString());
    } else {
      return JSON.parse(ptr);
    }
  } catch (e) {
    console.error("Failed to load session: " + e.message);
    return null;
  }
}

/**
 * Saves a long-running Mission State.
 */
function saveMissionState(sessionId, missionData) {
  try {
    var key = "MISSION_" + sessionId;
    var data = JSON.stringify(missionData);
    if (data.length < MAX_PROP_SIZE) {
       PropertiesService.getScriptProperties().setProperty(key, data);
    } else {
       var folder = getOrCreateSystemFolder();
       var fileName = "mission_" + sessionId + ".json";
       var file = getFileByName(folder, fileName);
       if (file) file.setContent(data);
       else folder.createFile(fileName, data, MimeType.PLAIN_TEXT);
       PropertiesService.getScriptProperties().setProperty(key, "DRIVE:" + fileName);
    }
  } catch (e) {
    console.error("Failed to save mission: " + e.message);
  }
}

/**
 * Loads a Mission State.
 */
function loadMissionState(sessionId) {
  try {
    var key = "MISSION_" + sessionId;
    var ptr = PropertiesService.getScriptProperties().getProperty(key);
    if (!ptr) return null;

    if (ptr.startsWith("DRIVE:")) {
      var fileName = ptr.substring(6);
      var folder = getOrCreateSystemFolder();
      var file = getFileByName(folder, fileName);
      if (!file) return null;
      return JSON.parse(file.getBlob().getDataAsString());
    } else {
      return JSON.parse(ptr);
    }
  } catch (e) {
    return null;
  }
}

/**
 * Clears a session.
 */
function clearSessionState(sessionId) {
  var ptr = PropertiesService.getScriptProperties().getProperty("SESSION_" + sessionId);
  if (ptr && ptr.startsWith("DRIVE:")) {
    var fileName = ptr.substring(6);
    var folder = getOrCreateSystemFolder();
    var file = getFileByName(folder, fileName);
    if (file) file.setTrashed(true);
  }
  PropertiesService.getScriptProperties().deleteProperty("SESSION_" + sessionId);
  
  // Also clear mission
  PropertiesService.getScriptProperties().deleteProperty("MISSION_" + sessionId);
}

// --- Helpers ---

function getOrCreateSystemFolder() {
  var name = "_GAS_Orchestrator_System_";
  var folders = DriveApp.getFoldersByName(name);
  if (folders.hasNext()) return folders.next();
  return DriveApp.createFolder(name);
}

function getFileByName(folder, name) {
  var files = folder.getFilesByName(name);
  if (files.hasNext()) return files.next();
  return null;
}
