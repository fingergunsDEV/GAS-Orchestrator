/**
 * Orchestrator.gs
 * Updated for Turn-by-Turn execution to support UI Visualization.
 */

var MAX_ITERATIONS = 10;

/**
 * Returns the currently logged in user's email.
 */
function getUserInfo() {
  return {
    email: Session.getActiveUser().getEmail() || "anonymous@agency"
  };
}

/**
 * Executes a single turn of the agentic loop.
 * Returns the updated history and a flag if the task is complete.
 */
function runAgentTurn(chatHistory, sessionId, imageData) {
  sessionId = sessionId || "debug_" + new Date().getTime();
  
  // Context Pruning: Keep system manageable
  if (chatHistory.length > 20) {
    console.log("Pruning chat history...");
    // Keep the first message (usually the user's initial prompt) and the last 15
    var firstMsg = chatHistory[0];
    var recentHistory = chatHistory.slice(-15);
    chatHistory = [firstMsg].concat(recentHistory);
  }

  console.log("Running turn. Session: " + sessionId);

  // If this is the start of a turn (user just sent a message) and has an image
  if (imageData && chatHistory.length > 0) {
    var lastTurn = chatHistory[chatHistory.length - 1];
    if (lastTurn.role === "user") {
      lastTurn.parts.push({
        mimeType: imageData.mimeType,
        data: imageData.data
      });
      logAgentEvent(sessionId, "user", "Image Uploaded", imageData.mimeType);
    }
  }

  // Extract the latest user prompt for Tool RAG
  var lastUserPrompt = "";
  for (var i = chatHistory.length - 1; i >= 0; i--) {
    if (chatHistory[i].role === "user") {
      lastUserPrompt = chatHistory[i].parts[0].text;
      break;
    }
  }

  var manifest = getRelevantTools(lastUserPrompt, 15);
  console.log("Tool RAG: Selected " + manifest.length + " tools for this turn.");
  var response = callGemini(chatHistory, manifest, "You are the Strategic Orchestrator. Lead the conversation and coordinate tools.");  
  
  // LOG USAGE TO FINANCE
  if (response.usage && typeof FinanceManager !== 'undefined') {
    var modelUsed = response.model || "gemini-model";
    FinanceManager.logUsage(response.usage.promptTokenCount, response.usage.candidatesTokenCount, modelUsed);
  }

  var turnResult = {
    type: response.type,
    content: "",
    toolCalled: null,
    history: chatHistory
  };

  if (response.type === "TEXT") {
    turnResult.content = response.text;
    turnResult.history.push({
      "role": "model",
      "parts": [{"text": response.text}]
    });
    
    logAgentEvent(sessionId, "model", "Response", response.text);
    return turnResult;
  }
  
  if (response.type === "TOOL_CALL") {
    turnResult.toolCalls = response.toolCalls;
    turnResult.thought = response.thought || "Executing " + response.toolCalls.length + " tool(s)...";
    
    // Add model's call(s) to history
    turnResult.history.push({
      "role": "model",
      "parts": response.toolCalls.map(function(tc) { return tc.part; })
    });

    // Handle Human-in-the-Loop for sensitive tools
    var props = PropertiesService.getScriptProperties();
    var sensitiveToolsJson = props.getProperty("SENSITIVE_TOOLS");
    var sensitiveTools = sensitiveToolsJson ? JSON.parse(sensitiveToolsJson) : ["gmail_send", "drive_delete", "sheets_clear"];
    
    // IMMUTABLE GUARDRAILS (v4.9.8)
    var IMMUTABLE_SENSITIVE = ["gmail_send", "drive_delete", "drive_trash_file", "sheets_clear", "vector_store_purge", "execute_system_wipe"];
    
    var isDryRun = props.getProperty("DRY_RUN_MODE") === "true";

    var needsApproval = response.toolCalls.some(function(tc) {
      return sensitiveTools.indexOf(tc.name) !== -1 || IMMUTABLE_SENSITIVE.indexOf(tc.name) !== -1;
    });

    if (needsApproval && !isDryRun) {
      turnResult.status = "AWAITING_APPROVAL";
      logAgentEvent(sessionId, "system", "Awaiting Approval", "Action protected by CORE_GUARDRAILS");
      return turnResult;
    }


    // Execute all tools
    var responseParts = [];
    response.toolCalls.forEach(function(tc) {
      logAgentEvent(sessionId, "model", "Tool Call: " + tc.name, tc.args);
      
      // PHASE 3: Fail-Safe Circuit Breakers
      // Check history for recursive loops (e.g. 5 identical calls)
      var loopCount = 0;
      for (var i = chatHistory.length - 1; i >= 0; i--) {
        if (chatHistory[i].role === "model" && chatHistory[i].parts) {
          chatHistory[i].parts.forEach(function(p) {
            if (p.functionCall && p.functionCall.name === tc.name && JSON.stringify(p.functionCall.args) === JSON.stringify(tc.args)) {
              loopCount++;
            }
          });
        }
      }

      var toolOutput;
      if (loopCount >= 5) {
        toolOutput = "SYSTEM_PAUSE: Circuit Breaker triggered. You are repeating the same action ('" + tc.name + "') too many times. Aborting loop to protect API quota.";
        logAgentEvent(sessionId, "system", "Circuit Breaker", "Halted recursive loop on " + tc.name);
      } else if (isDryRun) {
        toolOutput = "[DRY_RUN] Simulated execution of " + tc.name + " with args: " + JSON.stringify(tc.args);
      } else {
        toolOutput = dispatchToolCall(tc.name, tc.args);
      }
      
      if (typeof toolOutput === 'string' && toolOutput.startsWith("Error:")) {
        // PHASE 1: Autonomous Tool Synthesis
        if (toolOutput.indexOf("Tool not found") !== -1) {
          toolOutput = "TOOL_ERROR: The requested tool '" + tc.name + "' does not exist. [SYSTEM_MANDATE]: Autonomously dispatch the 'Technical R&D' team to write and deploy this tool using 'create_dynamic_tool'.";
          logAgentEvent(sessionId, "system", "Capability Gap Detected", "Triggered autonomous synthesis for " + tc.name);
        } else {
          toolOutput = "TOOL_ERROR: " + toolOutput;
        }
      }
      
      logAgentEvent(sessionId, "tool", "Output: " + tc.name, toolOutput);
      
      responseParts.push({
        functionResponse: {
          name: tc.name,
          response: { result: toolOutput }
        }
      });
    });

    turnResult.history.push({
      "role": "function",
      "parts": responseParts
    });

    turnResult.status = "CONTINUE";
    return turnResult;
  }

  return { error: "Unexpected response type from LLM." };
}

/**
 * MAIN ENTRY POINT
 * Called by the Frontend (index.html)
 */
function handleRequest(userText, imageData, sessionId) {
  try {
    // 1. Initialize State
    clearAgentState();
    
    // 2. Use provided session ID or generate a new one
    sessionId = sessionId || "user_" + new Date().getTime();

    // 3. Intercept Slash Commands
    if (userText.startsWith("/")) {
      var commandResult = handleSlashCommand(userText, sessionId);
      if (commandResult) {
        return { text: commandResult, sessionId: sessionId };
      }
    }
    
    // 4. Call the Root Orchestrator (The "Brain")
    // It will decide which team to deploy and execute the workflow.
    var result = runRootOrchestrator(userText, imageData, sessionId);
    
    // 5. Return result and the sessionId to UI
    return { text: result, sessionId: sessionId };
    
  } catch (e) {
    console.error("Orchestrator Error: " + e.message);
    return { text: "System Error: " + e.message, sessionId: sessionId };
  }
}

/**
 * Processes system-level slash commands.
 */
function handleSlashCommand(input, sessionId) {
  var parts = input.split(" ");
  var command = parts[0].toLowerCase();
  
  switch (command) {
    case "/help":
      return "### 🛠 SYSTEM_HELP_v3.2\n" +
             "Available Commands:\n" +
             "- `/list`: Enumerate all loaded agentic tools.\n" +
             "- `/apis`: Verify status of external API uplinks.\n" +
             "- `/guide`: Operational manual for the Team-of-Departments architecture.\n" +
             "- `/dryrun`: Toggle dry run (simulation) mode.\n" +
             "- `/sensitive`: View or edit sensitive tools list.\n" +
             "- `/status`: View system environment and status.\n" +
             "- `/version`: Display active system version.\n" +
             "- `/logs [count]`: Display recent system logs.\n" +
             "- `/sentinels`: List active system monitors.\n" +
             "- `/schedule`: List active scheduled tasks.\n" +
             "- `/cache clear`: Purge ephemeral UI cache.\n" +
             "- `/reset`: Emergency purge of session and mission state.\n" +
             "- `/clear`: Clear terminal history (local only).\n\n" +
             "**Operational Tip**: You can upload images for visual analysis or use natural language for complex multi-step missions.";

    case "/list":
      var manifest = getManifest();
      var list = "### 📦 LOADED_TOOL_MANIFEST\n" +
                 "Total Tools: " + manifest.length + "\n";
      
      if (typeof PluginManager !== 'undefined') {
        list += "Active Plugins: " + PluginManager.listPlugins() + "\n";
      }
      
      list += "\n";
      manifest.forEach(function(t) {
        list += "- **" + t.name + "**: " + t.description + "\n";
      });
      return list;

    case "/apis":
      return runSystemCredentialAudit();

    case "/dryrun":
      var props = PropertiesService.getScriptProperties();
      var current = props.getProperty("DRY_RUN_MODE") === "true";
      props.setProperty("DRY_RUN_MODE", (!current).toString());
      return "🛡 **SECURITY_UPDATE**: Dry Run Mode is now " + (!current ? "ENABLED (Simulation only)" : "DISABLED (Live execution)");

    case "/sensitive":
      var props = PropertiesService.getScriptProperties();
      var immutable = ["gmail_send", "drive_delete", "drive_trash_file", "sheets_clear", "vector_store_purge", "execute_system_wipe"];
      
      if (parts.length === 1) {
        var list = JSON.parse(props.getProperty("SENSITIVE_TOOLS") || '["gmail_send", "drive_delete", "sheets_clear"]');
        return "🔒 **SENSITIVE_TOOLS_LIST**:\n- Immutable (CORE): " + JSON.stringify(immutable) + "\n- User-Defined: " + JSON.stringify(list) + "\n\nUsage: `/sensitive add tool_name` or `/sensitive remove tool_name`";
      }
      var list = JSON.parse(props.getProperty("SENSITIVE_TOOLS") || '["gmail_send", "drive_delete", "sheets_clear"]');
      var action = parts[1].toLowerCase();
      var tool = parts[2];
      
      if (action === "add" && list.indexOf(tool) === -1) list.push(tool);
      if (action === "remove") {
        if (immutable.indexOf(tool) !== -1) return "🛑 **GUARDRAIL_VIOLATION**: Cannot remove CORE tool '" + tool + "' from sensitive list. This is a non-negotiable security measure.";
        list = list.filter(function(t) { return t !== tool; });
      }
      props.setProperty("SENSITIVE_TOOLS", JSON.stringify(list));
      return "🔒 **GUARDRAIL_UPDATED**: Sensitive list now: " + JSON.stringify(list);


    case "/guide":
      return "### 📘 OPERATIONAL_GUIDE\n" +
             "**1. Architecture**: This system uses a hierarchical multi-department framework. Your requests are parsed by the **Strategic Core**, which generates a tactical plan and delegates steps to specialized departments.\n\n" +
             "**2. Builder/Validator**: Every action is performed by a **Builder** and verified by a **Validator**. If the validator rejects the work, the builder retries with new logic.\n\n" +
             "**3. Continuity**: If a mission is too complex for the 6-minute GAS limit, the system will save a **Checkpoint**. You will see a 'Resume Mission' button to continue.\n\n" +
             "**4. Memory**: Important facts are saved to the **Vector Store**. Use 'Remember that...' to save preferences.";

    case "/reset":
      clearSessionState(sessionId);
      return "⚠️ **SYSTEM_RESET_COMPLETE**: All session memory and active mission chains have been purged.";

    case "/status":
      var props = PropertiesService.getScriptProperties();
      var isDryRun = props.getProperty("DRY_RUN_MODE") === "true";
      return "### 📊 SYSTEM_STATUS\n" +
             "- **Dry Run Mode**: " + (isDryRun ? "ENABLED" : "DISABLED") + "\n" +
             "- **Active Tools**: " + getManifest().length + "\n" +
             "- **Plugins**: " + (typeof PluginManager !== 'undefined' ? PluginManager.listPlugins() : "None") + "\n" +
             "- **Session ID**: " + sessionId;

    case "/version":
      return "### 🚀 SYSTEM_VERSION\n" +
             "**GAS Orchestrator v4.12.0** (Direct Sync Mode)\n" +
             "Core AI: Gemini 2.0 / 1.5 Pro (Thinking), Flash (Action)\n" +
             "Framework: Team-of-Departments Strategic Command";

    case "/logs":
      var limit = parseInt(parts[1], 10) || 5;
      if (typeof getNeuralHistory === 'undefined') return "⚠️ System Logger not found.";
      var history = getNeuralHistory();
      if (!history || !history.streams || history.streams.length === 0) return "📉 No recent logs found.";
      var logOut = "### 📋 RECENT SYSTEM LOGS\n";
      var recent = history.streams.slice(0, limit);
      recent.forEach(function(l) {
        logOut += "`[" + l.time + "] " + l.origin + "` " + l.data + "\n";
      });
      return logOut;

    case "/sentinels":
      if (typeof getSentinels !== 'undefined') {
        var list = getSentinels();
        if (list.length === 0) return "🛡️ No active sentinels.";
        return "### 🛡️ ACTIVE SENTINELS\n" + list.map(function(s) { return "- " + s.type + " (Target: " + s.targetId + ")"; }).join("\n");
      }
      return "⚠️ Sentinel system offline or undefined.";

    case "/schedule":
      if (typeof listScheduledTriggers !== 'undefined') {
        var triggers = listScheduledTriggers();
        if (triggers.length === 0) return "⏳ No scheduled missions.";
        return "### ⏳ SCHEDULED MISSIONS\n" + triggers.map(function(t) { return "- " + t.handlerFunction + " (ID: " + t.triggerId + ")"; }).join("\n");
      }
      return "⚠️ Scheduling system offline or undefined.";

    case "/cache":
      var sub = parts[1] || "clear";
      if (sub === "clear") {
        CacheService.getScriptCache().removeAll(["LIVE_TELEMETRY_" + sessionId]);
        return "🧹 **CACHE_CLEARED**: Ephemeral UI telemetry purged.";
      }
      return "Usage: `/cache clear`";

    default:
      return null; // Let it pass to LLM if not a system command
  }
}

/**
 * Resumes execution after a tool call (used after approval).
 */
function resumeWithToolResult(chatHistory, toolName, result) {
  chatHistory.push({
    "role": "function",
    "parts": [{
      "functionResponse": {
        "name": toolName,
        "response": { "result": result }
      }
    }]
  });
  return runAgentTurn(chatHistory);
}

function doGet(e) {
  if (e && e.parameter && e.parameter.code && e.parameter.state) {
    return handleSocialCallback(e);
  }
  return HtmlService.createTemplateFromFile("index")
      .evaluate()
      .setTitle("GAS Agentic Dashboard")
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.DEFAULT);
}

/**
 * Helper to include HTML files in templates.
 */
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

function verifyGeminiConnection() {
  try {
    var apiKey = PropertiesService.getScriptProperties().getProperty("GEMINI_API_KEY");
    if (!apiKey) return { success: false, message: "API Key missing." };
    var response = callGemini([{ role: "user", parts: [{ text: "ping" }] }], []);
    if (response.error) return { success: false, message: response.error };
    return { success: true, message: "Connection verified." };
  } catch (e) {
    return { success: false, message: e.message };
  }
}

/**
 * Helper to export chat history to a Google Doc.
 */
function performChatExport(history, title) {
  try {
    var doc = DocumentApp.create(title + " - " + new Date().toLocaleString());
    var body = doc.getBody();
    
    body.appendParagraph(title).setHeading(DocumentApp.ParagraphHeading.TITLE);
    body.appendParagraph("Session Date: " + new Date().toLocaleString()).setHeading(DocumentApp.ParagraphHeading.SUBTITLE);
    body.appendHorizontalRule();
    
    history.forEach(function(turn) {
      var role = turn.role === "user" ? "USER" : (turn.role === "model" ? "AGENT" : "TOOL");
      var text = "";
      
      if (turn.parts) {
        turn.parts.forEach(function(p) {
          if (p.text) text += p.text + "\n";
          if (p.functionCall) text += "[Tool Call: " + p.functionCall.name + "]\n";
          if (p.functionResponse) text += "[Tool Output]\n"; // detailed output skipped for brevity
        });
      }
      
      var section = body.appendParagraph(role + ":");
      section.setHeading(DocumentApp.ParagraphHeading.HEADING3);
      section.setForegroundColor(role === "USER" ? "#4285F4" : (role === "AGENT" ? "#0F9D58" : "#DB4437"));
      
      body.appendParagraph(text || "[Binary/Structured Data]");
      body.appendParagraph(""); // Spacer
    });
    
    return "Success: Chat exported to " + doc.getUrl();
  } catch (e) {
    return "Error exporting chat: " + e.message;
  }
}

// ==========================================
// LIVE STATE MANAGEMENT FOR UI
// ==========================================

function updateAgentState(team, agentRole, status, details, sessionId) {
  var cache = CacheService.getScriptCache();
  var state = {
    timestamp: new Date().getTime(),
    team: team,
    agent: agentRole, // e.g., "RESEARCH_BUILDER"
    status: status,   // e.g., "THINKING", "EXECUTING", "VALIDATING"
    details: details,
    sessionId: sessionId
  };
  cache.put("AGENT_LIVE_STATE", JSON.stringify(state), 21600); // 6 hours
}

function getAgentState() {
  var cache = CacheService.getScriptCache();
  var json = cache.get("AGENT_LIVE_STATE");
  var state = json ? JSON.parse(json) : {};
  
  // Add Mission Details (If active)
  // Use session ID from cache state if available
  var sessionId = state.sessionId || "current_session";
  var mission = loadMissionState(sessionId);
  if (mission) {
    state.mission = {
      groups: mission.groups,
      currentIndex: mission.currentGroupIndex,
      blackboard: mission.blackboard.structured_data // Ensure this matches what index.html expects
    };
  }
  
  // Add real-time metrics
  state.metrics = getSystemMetrics();
  
  return state;
}

/**
 * Calculates real-time system metrics for the UI.
 */
function getSystemMetrics() {
  initCoreRegistry();
  var manifest = getManifest();
  var scopes = CoreRegistry.getScopes();
  
  // 1. Count Unique Departments (e.g., RESEARCH, CONTENT)
  var deptSet = {};
  Object.keys(scopes).forEach(function(role) {
    var prefix = role.split('_')[0];
    deptSet[prefix] = true;
  });
  var depts = Object.keys(deptSet).length;
  
  var tools = manifest.length;
  
  // 2. Quota Tracking (Real Google Data)
  var emailQuota = MailApp.getRemainingDailyQuota();
  var maxQuota = emailQuota > 100 ? (emailQuota > 1500 ? 2000 : 1500) : 100;

  // 2. Parallelism Tracking (Active Group Size)
  var parallelTasks = 0;
  var cache = CacheService.getScriptCache();
  var stateJson = cache.get("AGENT_LIVE_STATE");
  var load = 5;
  
  if (stateJson) {
    var s = JSON.parse(stateJson);
    if (s.status === "EXECUTING" || s.status === "THINKING") load = 85;
    if (s.status === "VALIDATING") load = 45;
    if (s.status === "REFLECTING") load = 60;
  }

  // 3. Log Count Estimate
  var logCount = 0;
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Agent_Logs");
    if (sheet) logCount = sheet.getLastRow();
  } catch(e) {}

  return {
    departments: depts,
    tools: tools,
    logs: logCount,
    load: load,
    quota: {
      email: emailQuota,
      max: maxQuota,
      label: emailQuota > 15 ? "OPTIMAL" : "CRITICAL"
    }
  };
}

function clearAgentState() {
  CacheService.getScriptCache().remove("AGENT_LIVE_STATE");
}

/**
 * Public wrappers for LeadManager functions
 */
function getLeads() { return core_getLeadsFromCrm(); }
function importLeadsFromSource(fileId) { return core_importLeadsFromSourceFile(fileId); }
function updateLead(leadId, updates) { return core_updateCrmLead(leadId, updates); }
function getLeadEmailHistory(email) { return JSON.parse(executeCrmGetEmailHistory({ email: email })); }
function syncCrmInbox() { return executeCrmSyncInbox(); }

/**
 * Direct email sender for Content Engine
 */
function sendDraftEmail(to, subject, body) {
  try {
    GmailApp.sendEmail(to, subject, body);
    return "Success: Email sent to " + to;
  } catch (e) {
    return "Error: " + e.message;
  }
}

/**
 * Fetches recent recipients and contacts for the Content Engine
 */
function getRecentRecipients() {
  try {
    var recipients = {};
    
    // 1. Get Google Contacts (Limit to 100)
    try {
      var contacts = ContactsApp.getContacts();
      var count = 0;
      for (var i = 0; i < contacts.length && count < 100; i++) {
        var c = contacts[i];
        var emails = c.getEmails();
        if (emails && emails.length > 0) {
          var emailAddr = emails[0].getAddress();
          recipients[emailAddr] = c.getFullName() || emailAddr;
          count++;
        }
      }
    } catch (e) {
      console.warn("ContactsApp access failed: " + e.message);
    }

    // 2. Get Recent Sent Emails (Scan more threads)
    try {
      var sentThreads = GmailApp.search("is:sent", 0, 50);
      sentThreads.forEach(function(t) {
        var messages = t.getMessages();
        var msg = messages[messages.length - 1];
        var toField = msg.getTo();
        
        // Handle comma-separated recipients
        var parts = toField.split(",");
        parts.forEach(function(p) {
          var emailMatch = p.match(/<([^>]+)>/) || [null, p.trim()];
          var email = emailMatch[1].trim();
          if (email && email.indexOf("@") !== -1 && !recipients[email]) {
            recipients[email] = email;
          }
        });
      });
    } catch (e) {
      console.warn("GmailApp access failed: " + e.message);
    }

    // Convert to array of objects and sort by name
    var result = Object.keys(recipients).map(function(email) {
      return { email: email, name: recipients[email] };
    });
    
    result.sort(function(a, b) {
      return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
    });

    return result;
  } catch (e) {
    console.error("Critical error in getRecentRecipients: " + e.message);
    return [];
  }
}

