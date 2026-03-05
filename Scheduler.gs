/**
 * SCHEDULER.gs
 * Handles background execution of agent missions via Time-Driven Triggers.
 */

/**
 * Runs a specific mission string in the background (Headless Mode).
 * Intended to be triggered by a ClockTrigger.
 */
function executeScheduledMission(missionPrompt, isBackground) {
  var missionPrompt = missionPrompt || "Check for any urgent emails from 'Client' and summarize them.";
  var sessionId = "auto_" + new Date().getTime();
  
  if (isBackground !== false) isBackground = true; // Default to true for scheduled tasks
  
  console.log("Starting Scheduled Mission: " + missionPrompt + " (Background: " + isBackground + ")");
  logAgentEvent(sessionId, "system", "Mission Start (Background)", missionPrompt);
  
  var props = PropertiesService.getScriptProperties();
  if (isBackground) {
    props.setProperty("IS_BACKGROUND_TASK", "true");
  }
  
  try {
    var chatHistory = [{
      "role": "user",
      "parts": [{ "text": missionPrompt }]
    }];
    
    // Run the loop synchronously for up to 5 minutes (GAS limit is 6, we stay safe)
    var startTime = new Date().getTime();
    var maxTime = 5 * 60 * 1000; 
    var turnCount = 0;
    var maxTurns = 10;
    
    while (turnCount < maxTurns) {
      // Check time limit
      if ((new Date().getTime() - startTime) > maxTime) {
        logAgentEvent(sessionId, "system", "Timeout", "Mission timed out.");
        break;
      }
  
      var result = runAgentTurn(chatHistory, sessionId);
      
      if (result.status === "AWAITING_APPROVAL") {
        logAgentEvent(sessionId, "system", "Paused", "Mission paused for human approval: " + result.toolCalled);
        
        var scriptUrl = ScriptApp.getService().getUrl();
        var approvalLink = scriptUrl + "?action=approve_tool&sessionId=" + sessionId + "&toolName=" + encodeURIComponent(result.toolCalled || "unknown");
        
        var emailHtml = "<h3>Agent Requesting Approval</h3>" +
                        "<p>Your proactive agent wants to run a protected action: <strong>" + result.toolCalled + "</strong></p>" +
                        "<p>Context: " + (result.thought || "No additional context provided.") + "</p>" +
                        "<br/>" +
                        "<a href='" + approvalLink + "' style='padding: 10px 20px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 5px;'>Approve & Continue</a>" +
                        "<p><small>If you do not want to approve this, simply ignore this email.</small></p>";
        
        GmailApp.sendEmail(Session.getActiveUser().getEmail(), "Action Required: Approve Agent Action", "", { htmlBody: emailHtml });
        break;
      }
      
      if (result.type === "TEXT") {
        // Mission Complete
        logAgentEvent(sessionId, "model", "Mission Complete", result.content);
        // Email the final report to the user
        GmailApp.sendEmail(Session.getActiveUser().getEmail(), "Agent Mission Report", result.content);
        break;
      }
      
      // If tool was called and auto-executed (not sensitive), the loop continues with updated history
      chatHistory = result.history;
      turnCount++;
    }
  } finally {
    // Always cleanup the economy mode flag
    if (isBackground) {
      props.deleteProperty("IS_BACKGROUND_TASK");
    }
  }
}

/**
 * Setup a daily morning trigger.
 */
function setDailyBriefing() {
  // Clear existing triggers to avoid duplicates
  var triggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === "runDailyBriefing") {
      ScriptApp.deleteTrigger(triggers[i]);
    }
  }
  
  ScriptApp.newTrigger("runDailyBriefing")
    .timeBased()
    .everyDays(1)
    .atHour(8)
    .create();
    
  return "Daily briefing scheduled for 8 AM.";
}

/**
 * The actual function called by the trigger.
 */
function runDailyBriefing() {
  var prompt = "Perform the Morning Brief: 1. Scan GA4/GSC for traffic anomalies. 2. Check the CRM for 'NEW' leads that haven't been audited. 3. Triage Inbox for high-priority client requests. Send a comprehensive 'Strategic Agenda' to my email.";
  executeScheduledMission(prompt);
}

/**
 * Wrapper for the dynamic scheduler.
 */
function runScheduledMissionWrapper() {
  var prompt = PropertiesService.getScriptProperties().getProperty("SCHEDULED_MISSION_PROMPT");
  if (prompt) {
    executeScheduledMission(prompt);
  } else {
    console.error("No scheduled mission prompt found.");
  }
}

/**
 * AUTO-RESUME SYSTEM (v3.5 - Deep-Drill Autonomy)
 * Schedules a one-time trigger to resume a mission that was checkpointed due to time limits.
 */
function scheduleAutoResume(sessionId) {
  console.log("Scheduling Auto-Resume for session: " + sessionId);
  
  // Create a specific property for this session's resume trigger
  PropertiesService.getScriptProperties().setProperty("RESUME_SESSION_" + sessionId, "true");
  
  // Schedule a one-time trigger for 1 minute from now
  ScriptApp.newTrigger("resumeAutoMission")
    .timeBased()
    .after(60000) // 1 minute buffer
    .create();
}

/**
 * Entry point for the Auto-Resume trigger.
 * It finds the session that needs resuming and calls the Orchestrator.
 */
function resumeAutoMission() {
  var props = PropertiesService.getScriptProperties();
  var allProps = props.getProperties();
  
  // Find sessions marked for resume
  for (var key in allProps) {
    if (key.indexOf("RESUME_SESSION_") === 0) {
      var sessionId = key.replace("RESUME_SESSION_", "");
      console.log("Resuming session: " + sessionId);
      
      // Cleanup the trigger property
      props.deleteProperty(key);
      
      // Cleanup the actual trigger to avoid clutter
      var triggers = ScriptApp.getProjectTriggers();
      for (var i = 0; i < triggers.length; i++) {
        if (triggers[i].getHandlerFunction() === "resumeAutoMission") {
          ScriptApp.deleteTrigger(triggers[i]);
        }
      }
      
      // Resume via Root Orchestrator (with empty goal as it loads from state)
      runRootOrchestrator("Continue", null, sessionId);
      break; // Process one at a time per trigger run
    }
  }
}
