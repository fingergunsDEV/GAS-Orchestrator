/**
 * STATEMANAGER.gs
 * Handles persistence of agent sessions using PropertiesService and Drive.
 */

var MAX_PROP_SIZE = 9000; // PropertiesService limit is ~9kb per value

/**
 * REUSABLE PERSISTENCE WRAPPER
 * Handles PropertiesService's 9kb limit by spilling to Drive.
 */
var PersistentState = {
  set: function(key, value) {
    var data = (typeof value === 'string') ? value : JSON.stringify(value);
    var props = PropertiesService.getScriptProperties();
    
    if (data.length < MAX_PROP_SIZE) {
      props.setProperty(key, data);
    } else {
      var folder = this._getFolder();
      var fileName = "blob_" + key.replace(/[^a-zA-Z0-9]/g, "_") + ".json";
      var file = this._getFile(folder, fileName);
      if (file) file.setContent(data);
      else folder.createFile(fileName, data, MimeType.PLAIN_TEXT);
      props.setProperty(key, "DRIVE_BLOB:" + fileName);
    }
  },
  
  get: function(key) {
    var props = PropertiesService.getScriptProperties();
    var val = props.getProperty(key);
    if (!val) return null;
    
    if (val.indexOf("DRIVE_BLOB:") === 0) {
      var fileName = val.substring(11);
      var folder = this._getFolder();
      var file = this._getFile(folder, fileName);
      if (!file) return null;
      var content = file.getBlob().getDataAsString();
      try { return JSON.parse(content); } catch(e) { return content; }
    }
    
    try { return JSON.parse(val); } catch(e) { return val; }
  },
  
  remove: function(key) {
    var props = PropertiesService.getScriptProperties();
    var val = props.getProperty(key);
    if (val && val.indexOf("DRIVE_BLOB:") === 0) {
      var fileName = val.substring(11);
      var folder = this._getFolder();
      var file = this._getFile(folder, fileName);
      if (file) file.setTrashed(true);
    }
    props.deleteProperty(key);
  },

  _getFolder: function() {
    var name = "_GAS_Orchestrator_System_";
    var folders = DriveApp.getFoldersByName(name);
    if (folders.hasNext()) return folders.next();
    return DriveApp.createFolder(name);
  },

  _getFile: function(folder, name) {
    var files = folder.getFilesByName(name);
    if (files.hasNext()) return files.next();
    return null;
  }
};

/**
 * SECURE VAULT
 * Encrypted management of API keys and secrets.
 */
var SecureVault = {
  _salt: "HGM_SWARM_V4_SECURE_SALT",
  
  _obfuscate: function(text) {
    var result = "";
    for (var i = 0; i < text.length; i++) {
      result += String.fromCharCode(text.charCodeAt(i) ^ this._salt.charCodeAt(i % this._salt.length));
    }
    return Utilities.base64Encode(result);
  },
  
  _deobfuscate: function(encoded) {
    try {
      var text = Utilities.newBlob(Utilities.base64Decode(encoded)).getDataAsString();
      var result = "";
      for (var i = 0; i < text.length; i++) {
        result += String.fromCharCode(text.charCodeAt(i) ^ this._salt.charCodeAt(i % this._salt.length));
      }
      return result;
    } catch(e) {
      return encoded; // Fallback for unencrypted legacy keys
    }
  },

  setSecret: function(key, value) {
    if (!key || !value) return false;
    var encrypted = this._obfuscate(value.trim());
    PropertiesService.getScriptProperties().setProperty("VAULT_" + key, encrypted);
    return true;
  },

  getSecret: function(key) {
    var val = PropertiesService.getScriptProperties().getProperty("VAULT_" + key);
    if (!val) {
      // Fallback to legacy un-prefixed keys during transition
      val = PropertiesService.getScriptProperties().getProperty(key);
      if (!val) return null;
      return val; 
    }
    return this._deobfuscate(val);
  },
  
  deleteSecret: function(key) {
    PropertiesService.getScriptProperties().deleteProperty("VAULT_" + key);
    // Also delete legacy just in case
    PropertiesService.getScriptProperties().deleteProperty(key);
  },
  
  listKeys: function() {
    var props = PropertiesService.getScriptProperties().getProperties();
    var keys = [];
    for (var k in props) {
      if (k.startsWith("VAULT_")) {
        var name = k.substring(6);
        keys.push({ name: name, value: "**** (Encrypted)" });
      } else if (k === "GEMINI_API_KEY" || k === "GITHUB_TOKEN" || k.includes("API_KEY")) {
        keys.push({ name: k, value: "**** (Legacy)" });
      }
    }
    return keys;
  }
};

/**
 * Saves the current session state.
 */
function saveSessionState(sessionId, history) {
  try {
    var key = "SESSION_" + sessionId;
    var state = {
      id: sessionId,
      timestamp: new Date().toISOString(),
      history: history
    };
    PersistentState.set(key, state);
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
    var key = "SESSION_" + sessionId;
    return PersistentState.get(key);
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
    PersistentState.set(key, missionData);
    console.log("Mission state saved: " + sessionId);
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
    return PersistentState.get(key);
  } catch (e) {
    return null;
  }
}

/**
 * Clears a session.
 */
function clearSessionState(sessionId) {
  PersistentState.remove("SESSION_" + sessionId);
  PersistentState.remove("MISSION_" + sessionId);
  PersistentState.remove("SWARM_" + sessionId);
}

/**
 * SWARM STATUS (v4.12.0)
 * Manages the active agent swarm and inter-agent mailbox.
 */
function logSwarmMessage(sessionId, from, to, subject, body) {
  var key = "SWARM_" + sessionId;
  var state = PersistentState.get(key) || { agents: [], messages: [] };
  
  var msg = {
    time: Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "HH:mm:ss"),
    from: from,
    to: to,
    subject: subject,
    body: body
  };
  
  state.messages.push(msg);
  if (state.messages.length > 50) state.messages.shift(); // Keep last 50
  
  // Also ensure the agents are in the 'agents' list
  var updateAgent = function(name, role, status) {
    var agent = state.agents.find(function(a) { return a.name === name; });
    if (agent) {
      agent.status = status;
      agent.lastActive = msg.time;
    } else {
      state.agents.push({ name: name, role: role, status: status, worktree: "root", lastActive: msg.time });
    }
  };
  
  updateAgent(from, "sender", "ACTIVE");
  updateAgent(to, "receiver", "ACTIVE");
  
  PersistentState.set(key, state);
}

function getSwarmStatus(sessionId) {
  if (!sessionId) return { agents: [], messages: [] };
  var key = "SWARM_" + sessionId;
  return PersistentState.get(key) || { agents: [], messages: [] };
}

function updateSwarmAgent(sessionId, name, role, status, worktree) {
  var key = "SWARM_" + sessionId;
  var state = PersistentState.get(key) || { agents: [], messages: [] };
  
  var agent = state.agents.find(function(a) { return a.name === name; });
  if (agent) {
    agent.role = role || agent.role;
    agent.status = status || agent.status;
    agent.worktree = worktree || agent.worktree;
    agent.lastActive = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "HH:mm:ss");
  } else {
    state.agents.push({
      name: name,
      role: role || "worker",
      status: status || "ACTIVE",
      worktree: worktree || "root",
      lastActive: Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "HH:mm:ss")
    });
  }
  
  PersistentState.set(key, state);
}
