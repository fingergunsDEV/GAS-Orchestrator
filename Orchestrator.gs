/**
 * Orchestrator.gs
 * Updated for Turn-by-Turn execution to support UI Visualization.
 */

var MAX_ITERATIONS = 10;

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
  
  var manifest = getManifest();
  var response = callGemini(chatHistory, manifest);
  
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
    
    var isDryRun = props.getProperty("DRY_RUN_MODE") === "true";

    var needsApproval = response.toolCalls.some(function(tc) {
      return sensitiveTools.indexOf(tc.name) !== -1;
    });

    if (needsApproval && !isDryRun) {
      turnResult.status = "AWAITING_APPROVAL";
      logAgentEvent(sessionId, "system", "Awaiting Approval", "Multiple/Sensitive tool call");
      return turnResult;
    }

    // Execute all tools
    response.toolCalls.forEach(function(tc) {
      logAgentEvent(sessionId, "model", "Tool Call: " + tc.name, tc.args);
      
      var toolOutput;
      if (isDryRun) {
        toolOutput = "[DRY_RUN] Simulated execution of " + tc.name + " with args: " + JSON.stringify(tc.args);
      } else {
        toolOutput = dispatchToolCall(tc.name, tc.args);
      }
      
      if (typeof toolOutput === 'string' && toolOutput.startsWith("Error:")) {
        toolOutput = "TOOL_ERROR: " + toolOutput;
      }
      
      logAgentEvent(sessionId, "tool", "Output: " + tc.name, toolOutput);
      
      turnResult.history.push({
        "role": "function",
        "parts": [{
          "functionResponse": {
            "name": tc.name,
            "response": { "result": toolOutput }
          }
        }]
      });
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
             "- `/guide`: Operational manual for the Team-of-Teams architecture.\n" +
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
      var props = PropertiesService.getScriptProperties().getProperties();
      var status = "### 🛰 API_UPLINK_STATUS\n";
      var keys = ["GEMINI_API_KEY", "SEARCH_API_KEY", "OPENAI_API_KEY", "SLACK_WEBHOOK_URL", "CRM_SHEET_ID"];
      
      keys.forEach(function(k) {
        var val = props[k];
        var state = val ? "✅ CONNECTED" : "❌ DISCONNECTED";
        var masked = val ? " (" + val.substring(0, 5) + "...)" : "";
        status += "- " + k + ": " + state + masked + "\n";
      });
      
      // Check Services
      status += "\n**Advanced Services:**\n";
      status += "- Gmail/Drive/Calendar: ✅ NATIVE\n";
      status += "- Tasks API: " + (typeof Tasks !== 'undefined' ? "✅ ENABLED" : "⚠️ DISABLED") + "\n";
      status += "- YouTube API: " + (typeof YouTube !== 'undefined' ? "✅ ENABLED" : "⚠️ DISABLED") + "\n";
      
      // Add Dry Run Status
      var dryRun = props["DRY_RUN_MODE"] === "true" ? "ON 🟢" : "OFF ⚪";
      status += "\n**Security Status:**\n- Dry Run Mode: " + dryRun;
      
      return status;

    case "/dryrun":
      var props = PropertiesService.getScriptProperties();
      var current = props.getProperty("DRY_RUN_MODE") === "true";
      props.setProperty("DRY_RUN_MODE", (!current).toString());
      return "🛡 **SECURITY_UPDATE**: Dry Run Mode is now " + (!current ? "ENABLED (Simulation only)" : "DISABLED (Live execution)");

    case "/sensitive":
      var props = PropertiesService.getScriptProperties();
      if (parts.length === 1) {
        var list = props.getProperty("SENSITIVE_TOOLS") || '["gmail_send", "drive_delete", "sheets_clear"]';
        return "🔒 **SENSITIVE_TOOLS_LIST**: " + list + "\n\nUsage: `/sensitive add tool_name` or `/sensitive remove tool_name`";
      }
      var list = JSON.parse(props.getProperty("SENSITIVE_TOOLS") || '["gmail_send", "drive_delete", "sheets_clear"]');
      var action = parts[1].toLowerCase();
      var tool = parts[2];
      if (action === "add" && list.indexOf(tool) === -1) list.push(tool);
      if (action === "remove") list = list.filter(function(t) { return t !== tool; });
      props.setProperty("SENSITIVE_TOOLS", JSON.stringify(list));
      return "🔒 **GUARDRAIL_UPDATED**: Sensitive tools now: " + JSON.stringify(list);

    case "/guide":
      return "### 📘 OPERATIONAL_GUIDE\n" +
             "**1. Architecture**: This system uses a hierarchical multi-agent framework. Your requests are parsed by the **Root Orchestrator**, which generates a tactical plan and delegates steps to specialized teams.\n\n" +
             "**2. Builder/Validator**: Every action is performed by a **Builder** and verified by a **Validator**. If the validator rejects the work, the builder retries with new logic.\n\n" +
             "**3. Continuity**: If a mission is too complex for the 6-minute GAS limit, the system will save a **Checkpoint**. You will see a 'Resume Mission' button to continue.\n\n" +
             "**4. Memory**: Important facts are saved to the **Vector Store**. Use 'Remember that...' to save preferences.";

    case "/reset":
      clearSessionState(sessionId);
      return "⚠️ **SYSTEM_RESET_COMPLETE**: All session memory and active mission chains have been purged.";

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

function doGet() {
  return HtmlService.createTemplateFromFile("index")
      .evaluate()
      .setTitle("GAS Agentic Dashboard")
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
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

function updateAgentState(team, agentRole, status, details) {
  var cache = CacheService.getScriptCache();
  var state = {
    timestamp: new Date().getTime(),
    team: team,
    agent: agentRole, // e.g., "RESEARCH_BUILDER"
    status: status,   // e.g., "THINKING", "EXECUTING", "VALIDATING"
    details: details
  };
  cache.put("AGENT_LIVE_STATE", JSON.stringify(state), 21600); // 6 hours
}

function getAgentState() {
  var cache = CacheService.getScriptCache();
  var json = cache.get("AGENT_LIVE_STATE");
  var state = json ? JSON.parse(json) : {};
  
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
  var teams = Object.keys(scopes).length;
  var tools = manifest.length;
  
  // Estimate log count (last 100 rows of log sheet)
  var logCount = 0;
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Agent_Logs");
    if (sheet) logCount = sheet.getLastRow() - 1;
  } catch(e) {}

  // Calculate Network Load (0-100)
  var cache = CacheService.getScriptCache();
  var state = cache.get("AGENT_LIVE_STATE");
  var load = 5; // Base idle load
  if (state) {
    var s = JSON.parse(state);
    if (s.status === "EXECUTING" || s.status === "THINKING") load = 75;
    if (s.status === "VALIDATING") load = 40;
  }

  return {
    teams: teams,
    tools: tools,
    logs: logCount,
    load: load
  };
}

function clearAgentState() {
  CacheService.getScriptCache().remove("AGENT_LIVE_STATE");
}
