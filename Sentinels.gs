/**
 * Sentinels.gs
 * Implements "Reactive Autonomy" by monitoring data streams and triggering agents on events.
 */

var SENTINEL_STORE = "SENTINEL_CONFIGS";

/**
 * Creates a new Sentinel (Watcher).
 */
function executeCreateSentinel(args) {
  var sentinels = getSentinels();
  
  var newSentinel = {
    id: "sentinel_" + new Date().getTime(),
    type: args.type, // GMAIL, SHEET, DRIVE
    condition: args.condition, // Query or Cell Logic
    mission: args.mission, // "Summarize and Slack me"
    lastCheck: new Date().getTime(),
    status: "ACTIVE"
  };
  
  sentinels.push(newSentinel);
  saveSentinels(sentinels);
  
  // Ensure the heartbeat trigger is running
  setupSentinelHeartbeat();
  
  return "Success: Sentinel deployed. ID: " + newSentinel.id + ". Watching " + args.type + " for '" + args.condition + "'.";
}

/**
 * Lists active sentinels.
 */
function executeListSentinels() {
  var sentinels = getSentinels();
  if (sentinels.length === 0) return "No active sentinels.";
  
  return sentinels.map(function(s) {
    return "- [" + s.type + "] " + s.condition + " -> " + s.mission + " (Status: " + s.status + ")";
  }).join("\n");
}

/**
 * The Heartbeat: Runs every 10 minutes to check all Sentinels.
 */
function runSentinelHeartbeat() {
  var sentinels = getSentinels();
  if (sentinels.length === 0) return;
  
  console.log("Running Sentinel Heartbeat for " + sentinels.length + " watchers.");
  var triggered = [];
  
  sentinels.forEach(function(s) {
    try {
      if (s.status !== "ACTIVE") return;
      
      var trigger = false;
      var triggerContext = "";
      
      if (s.type === "GMAIL") {
        // Condition is a Gmail Search Query
        // We look for emails received AFTER the last check
        // Note: Gmail search doesn't support milliseconds, so we use a loose "newer_than" or just unread check logic.
        // Better strategy: Search query + check internal date of first result.
        
        var threads = GmailApp.search(s.condition, 0, 1);
        if (threads.length > 0) {
          var msg = threads[0].getMessages()[0];
          var msgTime = msg.getDate().getTime();
          
          // If message is newer than last check (with 1 min buffer)
          if (msgTime > s.lastCheck) {
            trigger = true;
            triggerContext = "New Email: " + msg.getSubject() + " From: " + msg.getFrom();
            // Update last check to avoid loop
            s.lastCheck = new Date().getTime(); 
          }
        }
      }
      else if (s.type === "SHEET") {
        // Condition: "SpreadsheetID!Cell<100"
        // Parse: ID!Cell|Operator|Value
        // Simplified for CLI: We assume condition is a JSON string describing the check
        // e.g. { "id": "...", "range": "C5", "operator": "lt", "value": 5000 }
        try {
          var rule = JSON.parse(s.condition);
          var sheet = SpreadsheetApp.openById(rule.id);
          var val = sheet.getRange(rule.range).getValue();
          
          var isHit = false;
          if (rule.operator === "lt") isHit = val < rule.value;
          if (rule.operator === "gt") isHit = val > rule.value;
          if (rule.operator === "eq") isHit = val == rule.value;
          
          if (isHit) {
            // Rate limit sheet checks to avoid spamming every 10 mins if condition persists
            // Logic: Only trigger if we haven't triggered in 24h OR if we want persistent alerts.
            // For now: Trigger and disable (Single Shot) or rate limit. 
            // We'll update the timestamp and require 6 hours between triggers for the same sheet condition.
            if ((new Date().getTime() - s.lastCheck) > 21600000) {
              trigger = true;
              triggerContext = "Metric Alert: " + rule.range + " is " + val;
              s.lastCheck = new Date().getTime();
            }
          }
        } catch (e) {
          console.error("Sheet Sentinel Error: " + e.message);
        }
      }
      
      if (trigger) {
        console.log("Sentinel Triggered: " + s.id);
        triggered.push({ sentinel: s, context: triggerContext });
      }
      
    } catch (e) {
      console.error("Sentinel Failed: " + s.id + " - " + e.message);
    }
  });
  
  saveSentinels(sentinels);
  
  // Execute Missions for triggered sentinels
  triggered.forEach(function(t) {
    var prompt = "SENTINEL ALERT TRIGGERED!\n" +
                 "SOURCE: " + t.sentinel.type + "\n" +
                 "CONTEXT: " + t.context + "\n" +
                 "MISSION: " + t.sentinel.mission + "\n\n" +
                 "Execute this immediately.";
                 
    // Reuse the Scheduler's background runner
    executeScheduledMission(prompt);
  });
}

/**
 * Helpers
 */
function getSentinels() {
  var json = PropertiesService.getScriptProperties().getProperty(SENTINEL_STORE);
  return json ? JSON.parse(json) : [];
}

function saveSentinels(list) {
  PropertiesService.getScriptProperties().setProperty(SENTINEL_STORE, JSON.stringify(list));
}

function setupSentinelHeartbeat() {
  var triggers = ScriptApp.getProjectTriggers();
  var found = false;
  for (var i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === "runSentinelHeartbeat") {
      found = true;
      break;
    }
  }
  
  if (!found) {
    ScriptApp.newTrigger("runSentinelHeartbeat")
      .timeBased()
      .everyMinutes(10)
      .create();
  }
}
