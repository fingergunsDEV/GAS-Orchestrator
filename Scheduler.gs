/**
 * SCHEDULER.gs
 * Handles background execution of agent missions via Time-Driven Triggers.
 */

/**
 * Runs a specific mission string in the background (Headless Mode).
 * Intended to be triggered by a ClockTrigger.
 */
function executeScheduledMission(missionPrompt) {
  var missionPrompt = missionPrompt || "Check for any urgent emails from 'Client' and summarize them.";
  var sessionId = "auto_" + new Date().getTime();
  
  console.log("Starting Scheduled Mission: " + missionPrompt);
  logAgentEvent(sessionId, "system", "Mission Start (Background)", missionPrompt);
  
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
      // In background mode, we can't pop a UI. We could email the user here to ask for approval.
      GmailApp.sendEmail(Session.getActiveUser().getEmail(), "Agent Requesting Approval", "Your agent wants to run: " + result.toolCalled + "\n\nPlease open the dashboard to approve.");
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
  executeScheduledMission("Analyze yesterday's GSC performance and Gmail for urgent items. Send me a summary.");
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
