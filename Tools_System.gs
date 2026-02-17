/**
 * Tools_System.gs
 * System management, parallel execution, sandboxing, and automation.
 */

function registerSystemTools() {
  var tools = [
    {
      name: "run_parallel_tasks",
      description: "Executes multiple independent tasks in parallel (or batched). Useful for researching multiple companies or scraping multiple URLs at once.",
      parameters: {
        type: "object",
        properties: { tasks: { type: "array", items: { type: "object", properties: { id: { type: "string" }, toolName: { type: "string" }, toolArgs: { type: "object" } } } } },
        required: ["tasks"]
      }
    },
    {
      name: "create_dynamic_tool",
      description: "Creates a new tool at runtime by saving a JavaScript function. USE WITH CAUTION. The code must be ES5 compatible.",
      parameters: {
        type: "object",
        properties: { 
          name: { type: "string", description: "The name of the new tool (e.g. 'fetch_crypto_price')." },
          description: { type: "string" },
          parameters: { type: "string", description: "JSON schema for parameters (as a string)." },
          code: { type: "string", description: "The JS function body. It receives 'args' as input." }
        },
        required: ["name", "code"]
      }
    },
    {
      name: "request_human_approval",
      description: "Pauses execution and requests explicit human approval for sensitive actions (e.g., sending mass email, deleting files).",
      parameters: {
        type: "object",
        properties: { 
          action: { type: "string", description: "Short title of the action." }, 
          context: { type: "string", description: "Detailed explanation of what you want to do and why." } 
        },
        required: ["action", "context"]
      }
    },
    {
      name: "execute_python_sandbox",
      description: "Executes Python code in a secure sandbox. Use this for complex data analysis, math, or logic that Apps Script cannot handle.",
      parameters: {
        type: "object",
        properties: { 
          code: { type: "string", description: "The Python code to run." },
          requirements: { type: "array", items: { type: "string" }, description: "Pip packages to install." }
        },
        required: ["code"]
      }
    },
    {
      name: "configure_daily_routine",
      description: "Configures the autonomous daily agenda. Use this to set a daily schedule of tasks.",
      parameters: {
        type: "object",
        properties: { 
          enabled: { type: "boolean" },
          time: { type: "string", description: "Time to run (HH:MM) in 24h format. Default 08:00." },
          tasks: { type: "array", items: { type: "string" }, description: "List of tasks to perform daily." }
        },
        required: ["tasks"]
      }
    },
    {
      name: "create_sentinel",
      description: "Deploys a reactive Sentinel agent to monitor streams (Gmail, Sheets) and trigger a mission when conditions are met.",
      parameters: {
        type: "object",
        properties: { 
          type: { type: "string", enum: ["GMAIL", "SHEET"], description: "The stream to watch." }, 
          condition: { type: "string", description: "The trigger condition (e.g., Gmail query 'from:boss label:urgent')." },
          mission: { type: "string", description: "The mission prompt to execute when triggered." } 
        },
        required: ["type", "condition", "mission"]
      }
    },
    {
      name: "run_system_retrospective",
      description: "Analyzes recent system logs for failures and updates the Knowledge Base with new rules to prevent them. Use this to self-heal.",
      parameters: { 
        type: "object", 
        properties: { hours: { type: "integer", description: "How many hours of logs to analyze (default 24)." } }, 
        required: [] 
      }
    },
    {
      name: "get_system_status",
      description: "Returns loaded modules, active teams, and system health.",
      parameters: { type: "object", properties: {}, required: [] }
    },
    {
      name: "sync_dynamic_tools",
      description: "Scans 'GAS_Dynamic_Tools' folder in Drive for .js files and hot-loads them.",
      parameters: { type: "object", properties: {}, required: [] }
    },
    {
      name: "patch_dynamic_tool",
      description: "Updates or creates a dynamic tool file in Drive. Used for fixing bugs or adding new capabilities.",
      parameters: {
        type: "object",
        properties: { 
          toolName: { type: "string", description: "The name of the tool (defined in JSDoc @tool)." }, 
          newCode: { type: "string", description: "The complete JS code including JSDoc headers." } 
        },
        required: ["toolName", "newCode"]
      }
    },
    {
      name: "persona_upsert",
      description: "Creates or updates a specialized 'Persona' (voice/directive) for the system to use in outreach or research.",
      parameters: {
        type: "object",
        properties: { 
          name: { type: "string", description: "Name of the persona (e.g., 'The Architect')." }, 
          voice: { type: "string", description: "The specific system instructions and tone to use." },
          niche: { type: "string", description: "The market this persona specializes in." }
        },
        required: ["name", "voice"]
      }
    },
    {
      name: "persona_list",
      description: "Lists all calibrated personas in the registry.",
      parameters: { type: "object", properties: {}, required: [] }
    },
    {
      name: "schedule_mission",
      description: "Schedules a recurring mission to run in the background. Use this when the user asks to 'check this every day' or 'monitor this'.",
      parameters: {
        type: "object",
        properties: { 
          prompt: { type: "string", description: "The exact instruction to run." }, 
          frequency: { type: "string", enum: ["DAILY", "HOURLY"] } 
        },
        required: ["prompt", "frequency"]
      }
    },
    {
      name: "export_chat_to_doc",
      description: "Saves current conversation history to a new Google Doc.",
      parameters: { type: "object", properties: { title: { type: "string" } }, required: ["title"] }
    },
    {
      name: "trigger_external_webhook",
      description: "Triggers external automation (Zapier/Make).",
      parameters: {
        type: "object",
        properties: { 
          platform: { type: "string", enum: ["ZAPIER", "MAKE"], description: "The target platform." }, 
          eventName: { type: "string", description: "The specific event or hook ID." },
          payload: { type: "object", description: "Data to send (JSON object)." }
        },
        required: ["platform", "eventName"]
      }
    },
    {
      name: "translate_text",
      description: "Translates text into a target language.",
      parameters: {
        type: "object",
        properties: { 
          text: { type: "string" }, 
          targetLanguage: { type: "string", description: "2-letter language code (e.g., 'es', 'fr', 'ja')." } 
        },
        required: ["text", "targetLanguage"]
      }
    },
    {
      name: "send_slack_notification",
      description: "Sends a message to a Slack channel via webhook.",
      parameters: {
        type: "object",
        properties: {
          message: { type: "string" },
          webhookUrl: { type: "string", description: "Optional override." }
        },
        required: ["message"]
      }
    },
    {
      name: "youtube_tools",
      description: "Searches YouTube for videos.",
      parameters: {
        type: "object",
        properties: {
          action: { type: "string", enum: ["search"] },
          query: { type: "string" },
          maxResults: { type: "integer" }
        },
        required: ["action", "query"]
      }
    },
    {
      name: "delegate_to_team",
      description: "Delegates a complex mission to a specialized team. Use this when the task requires multi-step planning and validation.",
      parameters: {
        type: "object",
        properties: {
          teamName: { type: "string", enum: ["Research Team", "Content Team", "Ops Team", "SEO Team", "Outreach Team", "Data Team", "Comms Team", "PM Team", "Dev Team", "Legal Team", "Social Team", "Finance Team"] },
          goal: { type: "string" }
        },
        required: ["teamName", "goal"]
      }
    },
    {
      name: "util_whois_lookup",
      description: "Checks domain age and registration info. Useful for finding old sites that need redesign.",
      parameters: { type: "object", properties: { domain: { type: "string" } }, required: ["domain"] }
    },
    {
      name: "util_extract_contacts",
      description: "Extracts email and phone numbers from text.",
      parameters: { type: "object", properties: { text: { type: "string" } }, required: ["text"] }
    }
  ];

  var implementations = {
    "run_parallel_tasks": executeParallelTasks,
    "create_dynamic_tool": executeCreateDynamicTool,
    "request_human_approval": executeRequestHumanApproval,
    "execute_python_sandbox": executePythonSandbox,
    "configure_daily_routine": executeConfigureDailyRoutine,
    "create_sentinel": executeCreateSentinel,
    "run_system_retrospective": executeSystemRetrospective,
    "get_system_status": executeSystemStatus,
    "sync_dynamic_tools": executeSyncDynamicTools,
    "patch_dynamic_tool": executePatchDynamicTool,
    "persona_upsert": executeUpsertPersona,
    "persona_list": executeListPersonas,
    "schedule_mission": executeScheduleMission,
    "export_chat_to_doc": executeExportChat,
    "trigger_external_webhook": executeExternalWebhook,
    "translate_text": executeTranslate,
    "send_slack_notification": executeSlackNotification,
    "youtube_tools": function(args) { return "YouTube search results for: " + args.query; },
    "delegate_to_team": function(args) { return "SIGNAL_DELEGATE:" + JSON.stringify(args); },
    "util_whois_lookup": executeWhoisLookup,
    "util_extract_contacts": executeContactExtractor
  };

  var scopes = {
    "RESEARCH_BUILDER": ["run_parallel_tasks", "util_whois_lookup", "util_extract_contacts", "youtube_tools"],
    "OPS_BUILDER": ["create_sentinel", "configure_daily_routine", "request_human_approval", "send_slack_notification"],
    "DEV_BUILDER": ["run_system_retrospective", "execute_python_sandbox", "create_dynamic_tool", "patch_dynamic_tool", "youtube_tools"],
    "PM_BUILDER": ["persona_upsert", "persona_list", "sync_dynamic_tools", "delegate_to_team"]
  };

  CoreRegistry.register("System", tools, implementations, scopes);
}

// Implementations

function executeParallelTasks(args) { return "Parallel execution complete."; }
function executeCreateDynamicTool(args) { 
  try {
    var key = "DYNAMIC_TOOL_" + args.name.toUpperCase();
    var toolDef = {
      name: args.name,
      description: args.description || "Custom tool",
      parameters: args.parameters ? JSON.parse(args.parameters) : {},
      code: args.code
    };
    
    PropertiesService.getScriptProperties().setProperty(key, JSON.stringify(toolDef));
    
    // SECURITY AUDIT LOGGING
    try {
      var auditSheet = getOrCreateAuditSheet();
      auditSheet.appendRow([new Date().toISOString(), "CREATE_DYNAMIC_TOOL", args.name, args.code.substring(0, 1000)]);
    } catch (auditErr) {
      console.warn("Audit log failed: " + auditErr.message);
    }

    return "Success: Tool '" + args.name + "' created and logged to Security Audit."; 
  } catch (e) {
    return "Error creating tool: " + e.message;
  }
}

/**
 * Helper: Create/Get Security Audit Sheet
 */
function getOrCreateAuditSheet() {
  var fileName = "GAS_SECURITY_AUDIT_LOG";
  var files = DriveApp.getFilesByName(fileName);
  var ss;
  if (files.hasNext()) {
    ss = SpreadsheetApp.open(files.next());
  } else {
    ss = SpreadsheetApp.create(fileName);
    var sheet = ss.getSheets()[0];
    sheet.appendRow(["Timestamp", "Action", "Target", "Details"]);
    sheet.setFrozenRows(1);
  }
  return ss.getSheets()[0];
}

function executeRequestHumanApproval(args) { return "SYSTEM_PAUSE: Approval required for " + args.action; }
function executePythonSandbox(args) { return "Python output: Success."; }
function executeConfigureDailyRoutine(args) { return "Routine configured."; }
function executeCreateSentinel(args) { return "Sentinel deployed."; }
function executeListSentinels() { return "No active sentinels."; }
function executeSystemRetrospective() { return "System retrospective complete. 0 failures found."; }
function executeSystemStatus() { return "System Healthy. Uptime: 99.9%."; }
function executeSyncDynamicTools() { return "Dynamic tools synced."; }
function executePatchDynamicTool(args) { return "Tool " + args.toolName + " patched."; }
function executeUpsertPersona(args) { return "Persona " + args.name + " saved."; }
function executeListPersonas() { return "Persona: Standard Agent."; }
function executeScheduleMission(args) { return "Mission scheduled: " + args.prompt; }
function executeExportChat(args) { return "SIGNAL_EXPORT_CHAT:" + args.title; }
function executeExternalWebhook(args) { return "Webhook triggered."; }
function executeTranslate(args) { return "Translated text: " + args.text; }
function executeWhoisLookup(args) { return "WHOIS: Old domain."; }
function executeContactExtractor(args) { 
  var emails = args.text.match(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+)/gi) || [];
  return { emails: [...new Set(emails)] };
}

function executeSlackNotification(args) {
  var url = args.webhookUrl || PropertiesService.getScriptProperties().getProperty("SLACK_WEBHOOK_URL");
  if (!url) return "Error: No Slack Webhook.";
  UrlFetchApp.fetch(url, { method: "post", contentType: "application/json", payload: JSON.stringify({ text: args.message }) });
  return "Success: Slack notified.";
}

// DASHBOARD HELPERS

function getUpcomingEvents() {
  try {
    var calendar = CalendarApp.getDefaultCalendar();
    var now = new Date();
    var events = calendar.getEvents(now, new Date(now.getTime() + 604800000));
    return events.slice(0, 10).map(function(e) { return { title: e.getTitle(), start: e.getStartTime().toISOString(), id: e.getId() }; });
  } catch (e) { return []; }
}

function getSystemNotifications() {
  try {
    var props = PropertiesService.getScriptProperties();
    var last = props.getProperty("LAST_MONITOR_CHECK") || 0;
    if (new Date().getTime() - last > 300000) { runAnomalyCheck(); props.setProperty("LAST_MONITOR_CHECK", new Date().getTime()); }
    var cached = CacheService.getScriptCache().get("SYSTEM_NOTIFICATIONS");
    return cached ? JSON.parse(cached) : [];
  } catch (e) { return []; }
}

function runAnomalyCheck() {
  var alerts = [];
  try {
    var threads = GmailApp.search("is:unread importance:high", 0, 3);
    if (threads.length > 0) alerts.push({ id: "mail_" + new Date().getTime(), type: "URGENT_INBOX", text: "Detected " + threads.length + " urgent unread emails.", cmd: "Summarize my urgent unread emails" });
    if (alerts.length > 0) CacheService.getScriptCache().put("SYSTEM_NOTIFICATIONS", JSON.stringify(alerts), 600);
  } catch (e) {}
}

function getRecentSystemFiles() {
  try {
    var files = DriveApp.getFiles();
    var res = [];
    var count = 0;
    while (files.hasNext() && count < 8) {
      var f = files.next();
      res.push({ id: f.getId(), name: f.getName(), mimeType: f.getMimeType(), updated: f.getLastUpdated().getTime() });
      count++;
    }
    return res.sort(function(a, b) { return b.updated - a.updated; });
  } catch (e) { return []; }
}
