/**
 * DailyRoutine.gs
 * Manages the autonomous daily agenda for the agentic system.
 */

var AGENDA_PROPERTY = "DAILY_AGENDA_CONFIG";

/**
 * Configures the daily routine/agenda for the system.
 */
function executeConfigureDailyRoutine(args) {
  var config = {
    enabled: args.enabled !== false, // Default true
    time: args.time || "08:00",
    tasks: args.tasks || [], // Array of strings like "Check GSC", "Email leads"
    timezone: Session.getScriptTimeZone()
  };
  
  PropertiesService.getScriptProperties().setProperty(AGENDA_PROPERTY, JSON.stringify(config));
  
  // Set the trigger
  var triggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === "runDailyAgenda") {
      ScriptApp.deleteTrigger(triggers[i]);
    }
  }
  
  if (config.enabled) {
    var timeParts = config.time.split(":");
    var hour = parseInt(timeParts[0]);
    
    ScriptApp.newTrigger("runDailyAgenda")
      .timeBased()
      .everyDays(1)
      .atHour(hour)
      .create();
      
    return "Success: Daily agenda scheduled for " + config.time + ". Tasks: " + config.tasks.join(", ");
  }
  
  return "Success: Daily agenda disabled.";
}

/**
 * The main entry point for the daily autonomous run.
 * Triggered by the Time-Based Trigger.
 */
function runDailyAgenda() {
  var sessionId = "agenda_" + new Date().getTime();
  console.log("Starting Daily Agenda: " + sessionId);
  
  // 1. Load Config & Context
  var configStr = PropertiesService.getScriptProperties().getProperty(AGENDA_PROPERTY);
  if (!configStr) {
    console.log("No agenda config found.");
    return;
  }
  var config = JSON.parse(configStr);
  
  // 2. Get Context (Calendar & Tasks)
  var context = getAgendaContext();
  
  // 3. Build the Master Prompt
  var prompt = "You are the Autonomous Daily Driver Agent.\n" +
               "CONTEXT:\n" + context + "\n\n" +
               "YOUR AGENDA (Execute these items):\n";
               
  config.tasks.forEach(function(task, index) {
    prompt += (index + 1) + ". " + task + "\n";
  });
  
  prompt += "\nINSTRUCTIONS:\n" +
            "- Analyze the calendar context to ensure no conflicts.\n" +
            "- If a task involves emailing, draft it first unless explicitly told to send.\n" +
            "- Consolidate your report into a single summary at the end.\n" +
            "- Use the 'delegate_' tools to assign complex work to specialized teams.";
            
  // 4. Execute via the Orchestrator
  // We use executeScheduledMission from Scheduler.gs which handles the loop
  executeScheduledMission(prompt);
}

/**
 * Fetches relevant context for the day.
 */
function getAgendaContext() {
  var today = new Date();
  var tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
  var context = "Date: " + today.toDateString() + "\n\n";
  
  // 1. Calendar Events
  try {
    var events = CalendarApp.getDefaultCalendar().getEvents(today, tomorrow);
    if (events.length > 0) {
      context += "SCHEDULED EVENTS:\n";
      events.forEach(function(e) {
        context += "- " + e.getTitle() + " (" + e.getStartTime().toLocaleTimeString() + " - " + e.getEndTime().toLocaleTimeString() + ")\n";
      });
    } else {
      context += "SCHEDULED EVENTS: None (Free Day)\n";
    }
  } catch (e) {
    context += "CALENDAR ERROR: " + e.message + "\n";
  }
  
  // 2. Google Tasks (if available)
  try {
    if (typeof Tasks !== 'undefined') {
      var tasks = Tasks.Tasks.list('@default');
      if (tasks.items && tasks.items.length > 0) {
        context += "\nPENDING GOOGLE TASKS:\n";
        tasks.items.slice(0, 5).forEach(function(t) {
           context += "- " + t.title + "\n";
        });
      }
    }
  } catch (e) {
    // Ignore task errors
  }
  
  return context;
}
