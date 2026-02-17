/**
 * Architect.gs
 * The "Self-Evolution" layer. Analyzes system logs to identify failure patterns
 * and updates the Knowledge Base with new operational rules.
 */

/**
 * Runs a retrospective analysis on recent agent logs.
 */
function executeSystemRetrospective(args) {
  var lookbackHours = args.hours || 24;
  var logs = fetchRecentLogs(lookbackHours);
  
  if (logs.length === 0) return "No logs found for the last " + lookbackHours + " hours.";
  
  // 1. Identify Failures
  var failures = logs.filter(function(log) {
    return log.message.indexOf("Error") !== -1 || log.message.indexOf("FAILED") !== -1;
  });
  
  var successes = logs.filter(function(log) {
    return log.message.indexOf("Success") !== -1 || log.message.indexOf("Mission Complete") !== -1;
  });
  
  var stats = "Analyzed " + logs.length + " events. Found " + failures.length + " errors and " + successes.length + " successes.";
  console.log(stats);
  
  if (failures.length === 0) return "System Health: 100%. No errors to analyze. " + stats;

  // 2. Synthesize Lessons via Gemini
  var prompt = "You are the System Architect. Analyze these error logs from the Agentic System and extract 1-3 critical 'Operational Rules' to prevent future failures.\n" +
               "Focus on tool usage patterns, missing parameters, or logic gaps.\n\n" +
               "FAILURES:\n" + failures.map(function(f) { return "- " + f.message; }).join("\n") + "\n\n" +
               "OUTPUT FORMAT:\n" +
               "Provide ONLY the rules in bullet points. Example: '- Always check for column 'Status' before reading CRM.'";
               
  var history = [{ role: "user", parts: [{ text: prompt }] }];
  var analysis = callGemini(history, [], "You are a Senior Systems Engineer.");
  
  if (analysis.error) return "Architect Error: " + analysis.error;
  
  // 3. Update Knowledge Base
  var updateResult = updateSystemTruth(
    "### [Architect Update: " + new Date().toLocaleDateString() + "]\n" + 
    "**Retrospective Analysis:** " + stats + "\n" +
    "**New Operational Protocols:**\n" + analysis.text + "\n",
    "append"
  );
  
  return "Retrospective Complete. " + stats + "\n\nInsights:\n" + analysis.text + "\n\n" + updateResult;
}

/**
 * Helper: Read logs from Sheet
 */
function fetchRecentLogs(hours) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Agent_Logs");
  if (!sheet) return [];
  
  var data = sheet.getDataRange().getValues();
  var cutoff = new Date().getTime() - (hours * 60 * 60 * 1000);
  var recent = [];
  
  // Skip header, read from bottom up (newest first usually)
  // Assuming standard logging order, but checking timestamps is safer
  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    var ts = new Date(row[0]).getTime();
    if (ts > cutoff) {
      recent.push({ timestamp: row[0], source: row[2], message: row[4] }); // Role, Details
    }
  }
  return recent;
}
