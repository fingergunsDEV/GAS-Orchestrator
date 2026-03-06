/**
 * Agents.gs
 * Implements the "Team of Teams" architecture with Builder/Validator pairs.
 */

var MISSION_START_TIME = new Date().getTime();
var MAX_EXECUTION_TIME_MS = 300000; // 5 minutes safety limit

/**
 * ROOT ORCHESTRATOR (v4.9.2 - Agentic Edition)
 * Breaks complex requests into sequential team tasks and manages state across turns.
 */
function runRootOrchestrator(userGoal, imageData, sessionId) {
  sessionId = sessionId || "chat_" + new Date().getTime();
  console.log("Root Orchestrator invoked for session: " + sessionId);

  // 1. AGENTIC ROUTER (v4.9.2) - Replaces brittle keyword heuristics
  var route = runAgenticRouter(userGoal, sessionId);
  console.log("Router Decision: " + route.decision);

  if (route.decision === "FAST_TRACK") {
    updateAgentState("ROOT", "ORCHESTRATOR", "FAST_TRACK", "Handling as direct query...", sessionId);
    return legacyRoute(userGoal, imageData, sessionId);
  }

  // 2. MISSION STATE MANAGEMENT
  var mission = loadMissionState(sessionId);

  // Start new mission if none exists OR if router explicitly requested a new one
  if (!mission || route.decision === "NEW_MISSION") {
    updateAgentState("ROOT", "ORCHESTRATOR", "PLANNING", "Architecting tactical mission plan...", sessionId);
    logAgentEvent(sessionId, "user", "Goal", userGoal);

    var planPrompt =
      "You are the Strategic Planner. The user has this goal: '" + userGoal + "'.\n" +
      "Break this down into parallel and sequential steps. Identify tasks that are independent and can be executed at the same time to reduce latency.\n" +
      "Departments available:\n" +
      "- Market Intelligence: Deep web search, competitor analysis, fact-checking.\n" +
      "- Creative Engine: Creates Slides, Docs, PDFs, and translations.\n" +
      "- Agency Operations: Manages Calendar, Tasks, Forms, and Contacts.\n" +
      "- Search Visibility: Technical audits (GSC), keyword analysis, site-wide strategy.\n" +
      "- Analytics Scout: Real-time traffic checks, GA4 advanced reporting, and user behavior trends.\n" +
      "- Strategic Outreach: Drafts cold emails, finding leads, manages CRM data.\n" +
      "- Performance Insights: Advanced spreadsheet analysis and Python code execution.\n" +
      "- Client Communications: Inbox triage, email summarization, unread counts.\n" +
      "- Project Governance: Folder organization, file permissions, long-term memory management.\n" +
      "- Technical R&D: Technical support, script generation, and debugging.\n" +
      "- Risk & Compliance: Document review and compliance checking.\n" +
      "- Social Analytics: Social profile analysis, trend scanning, and account connection/authentication.\n" +
      "- Revenue Management: Invoicing, project margin estimation, and pricing strategy.\n\n" +
      "SELF-EXPANDING CAPABILITY: If the user requests a capability that does not exist in the tools list, you MUST instruct the 'Technical R&D' department to use 'create_dynamic_tool' to write the JavaScript code for the tool, deploy it, and then execute the user's request.\n\n" +
      "Return a JSON object with a 'groups' array. Each group is executed sequentially. Tasks within a group are executed in parallel.\n" +
      "Schema: { \"groups\": [ { \"group\": number, \"tasks\": [ { \"team\": string, \"instruction\": string } ] } ] }";

    var planResponse = callGemini([{ role: "user", parts: [{ text: planPrompt }] }], [], "You are the Strategic Planner.", "application/json", "pro");

    if (planResponse.error) {
      return "Strategic Planner Error: " + planResponse.error + ". Please check your API key and connection.";
    }

    var groups = [];
    if (planResponse.type === "JSON" && planResponse.data.groups) {
      groups = planResponse.data.groups;
    } else {
      console.warn("Planner returned invalid JSON structure, attempting fallback parsing.");
      var rawText = planResponse.text || "";
      var match = rawText.match(/\[.*\]/s);
      groups = match ? JSON.parse(match[0]) : [];
    }

    if (groups.length === 0) {
      return "I couldn't generate a viable tactical plan for that request. Please be more specific.";
    }

    mission = {
      sessionId: sessionId,
      originalGoal: userGoal,
      groups: groups,
      currentGroupIndex: 0,
      isReflecting: false,
      blackboard: {
        raw_results: [],
        structured_data: {},
        artifacts: []
      },
      status: "IN_PROGRESS",
      activePersona: null
    };

    // Persona Detection
    var personaMatch = userGoal.match(/@(\w+)/);
    if (personaMatch) mission.activePersona = personaMatch[1];

    saveMissionState(sessionId, mission);

    // UI Feedback: Return plan summary immediately
    var planSummary = "### 📋 MISSION_PLAN_ARCHITECTED\n" +
                      "I have decomposed your goal into " + groups.length + " strategic phases:\n\n" +
                      groups.map(function(g) { 
                        return "**Phase " + g.group + "**: " + g.tasks.map(function(t) { return t.team; }).join(", "); 
                      }).join("\n") + "\n\n" +
                      "**MISSION_CONTINUE**: Starting execution of Phase 1...";
    return planSummary;
  }

  // 3. EXECUTION PHASE (Iterating through Groups)
  if (!mission.isReflecting && mission.currentGroupIndex < mission.groups.length) {
    var group = mission.groups[mission.currentGroupIndex];
    var groupNum = mission.currentGroupIndex + 1;

    updateAgentState("ROOT", "ORCHESTRATOR", "EXECUTING_GROUP", "Group " + groupNum + "/" + mission.groups.length, sessionId);

    var groupNeedsContinue = false;
    var continueReason = "";

    group.tasks.forEach(function(task) {
      if (task.status === "DONE") return;

      updateAgentState("ROOT", "ORCHESTRATOR", "EXECUTING_TASK", "Team: " + task.team, sessionId);

      var teamContext = {
        goal: task.instruction,
        originalGoal: mission.originalGoal,
        shared_data: mission.blackboard.structured_data,
        previous_results: mission.blackboard.raw_results
      };

      var executionResult = dispatchToTeam(task.team, teamContext, imageData, sessionId);

      if (typeof executionResult === 'string' && (executionResult.indexOf("MISSION_CONTINUE") !== -1 || executionResult.indexOf("SYSTEM_PAUSE") !== -1)) {
        groupNeedsContinue = true;
        continueReason = executionResult;
        return;
      }

      var stepResultText = "";
      var structuredUpdate = null;
      try {
        var parsed = JSON.parse(executionResult);
        stepResultText = parsed.summary || "Completed.";
        structuredUpdate = parsed.data || parsed;
      } catch (e) {
        stepResultText = executionResult;
      }

      mission.blackboard.raw_results.push("[" + task.team + "]: " + stepResultText);
      task.status = "DONE";

      if (structuredUpdate) {
        var key = task.team.toLowerCase().replace(" team", "").replace(/ /g, "_");
        mission.blackboard.structured_data[key] = structuredUpdate;
      }
    });

    if (groupNeedsContinue) {
      saveMissionState(sessionId, mission);
      return continueReason;
    }

    // --- STRATEGIC QUALIFICATION LAYER (v4.9.8) ---
    mission.status = "QUALIFYING";
    updateAgentState("ROOT", "STRATEGIC_COMMAND", "QUALIFYING", "Analyzing Phase " + groupNum + " output and recalibrating...", sessionId);
    
    var qualificationResult = performStrategicQualification(mission, groupNum, sessionId);
    mission.blackboard.raw_results.push("[STRATEGIC_QUALIFICATION]: " + qualificationResult.summary);
    
    // Recursive Learning: Ingest findings into memory
    if (qualificationResult.learnings) {
      dispatchToolCall("vector_store_upsert", { 
        text: "PHASE_LEARNING: " + qualificationResult.learnings,
        metadata: { mission: mission.originalGoal, phase: groupNum }
      });
    }

    // Plan Recalibration: If the qualification suggests a significant change, adjust remaining groups
    if (qualificationResult.planAdjustment && mission.currentGroupIndex + 1 < mission.groups.length) {
      logAgentEvent(sessionId, "system", "Plan Recalibrated", qualificationResult.planAdjustment);
      // Logic to splice or update remaining groups could be added here
    }

    mission.currentGroupIndex++;
    mission.status = "IN_PROGRESS";
    saveMissionState(sessionId, mission);

    if (mission.currentGroupIndex < mission.groups.length) {
      return "MISSION_CONTINUE: Phase " + groupNum + " verified. Strategic Recalibration Complete. Proceeding to Phase " + (groupNum + 1) + "...";
    } else {
      mission.isReflecting = true;
      saveMissionState(sessionId, mission);
      return "MISSION_CONTINUE: All Phases complete. Synthesizing final report...";
    }
  }

  // 4. REFLECTION PHASE

  if (mission.isReflecting) {
    updateAgentState("ROOT", "ORCHESTRATOR", "REFLECTING", "Performing final review and synthesis...", sessionId);
    var finalReport = performFinalReflection(mission, sessionId);
    clearSessionState(sessionId); 
    return finalReport;
  }

  return "Error: Mission state corrupted or unknown routing.";
}

/**
 * AGENTIC ROUTER (v4.9.2)
 * Uses LLM to intelligently route requests between Fast-Track and Mission paths.
 */
function runAgenticRouter(userGoal, sessionId) {
  var routerPrompt = 
    "You are the Strategic Router for an autonomous multi-agent system.\n" +
    "User Goal: '" + userGoal + "'\n\n" +
    "Identify the best path for this request:\n" +
    "1. FAST_TRACK: Simple queries, single tool requests, quick status checks (e.g., 'What is my unread count?', 'Check GSC for site X', 'Search for files').\n" +
    "2. NEW_MISSION: Complex, multi-step requests requiring research, content creation, and multi-department coordination.\n" +
    "3. RESUME: If the user is explicitly asking to 'continue', 'resume', or providing missing info for a paused task.\n\n" +
    "Return JSON: { \"decision\": \"FAST_TRACK\" | \"NEW_MISSION\" | \"RESUME\", \"reasoning\": \"string\" }";

  var response = callGemini([{ role: "user", parts: [{ text: routerPrompt }] }], [], "You are the Strategic Router.", "application/json", "pro");

  if (response.type === "JSON") return response.data;

  // Fallback to simple heuristic if router fails
  var isResume = userGoal.toLowerCase().indexOf("resume") !== -1 || userGoal.toLowerCase().indexOf("continue") !== -1;
  if (isResume) return { decision: "RESUME" };

  var isSimple = userGoal.length < 100;
  return { decision: isSimple ? "FAST_TRACK" : "NEW_MISSION" };
}

/**
 * STRATEGIC QUALIFICATION LAYER (v4.9.8)
 * Analyzes the output of a phase before proceeding to the next.
 */
function performStrategicQualification(mission, phaseNum, sessionId) {
  var lastGroupResults = mission.blackboard.raw_results.slice(-mission.groups[mission.currentGroupIndex].tasks.length);
  
  var qualifyPrompt = 
    "You are the Strategic Command Auditor. Phase " + phaseNum + " of the mission '" + mission.originalGoal + "' just finished.\n\n" +
    "PHASE RESULTS:\n" + lastGroupResults.join("\n") + "\n\n" +
    "REMAINING PHASES:\n" + JSON.stringify(mission.groups.slice(mission.currentGroupIndex + 1)) + "\n\n" +
    "YOUR MISSION:\n" +
    "1. QUALIFY: Is the output of Phase " + phaseNum + " sufficient to proceed? If not, identify gaps.\n" +
    "2. RECALIBRATE: Based on these results, should the remaining phases be modified? (e.g., skip a step, add a new research task, change a team).\n" +
    "3. LEARN: What did the system learn from this phase that should be saved to long-term memory?\n\n" +
    "RETURN JSON ONLY:\n" +
    "{ \"summary\": \"Executive summary of qualification\", \"status\": \"PROCEED\" | \"ADJUST\", \"planAdjustment\": \"Optional new task/phase JSON string\", \"learnings\": \"Key takeaway for Vector DB\" }";

  var response = callGemini([{ role: "user", parts: [{ text: qualifyPrompt }] }], [], "You are the Strategic Command Auditor.", "application/json", "pro");
  
  if (response.type === "JSON") {
    return response.data;
  }
  
  return { 
    summary: "Standard validation complete. No critical anomalies detected.", 
    status: "PROCEED", 
    learnings: "Phase " + phaseNum + " executed as planned."
  };
}

/**
 * PHASE 3: Final Reflection Agent
 */
function performFinalReflection(mission, sessionId) {
  var reflectionPrompt = 
    "You are the Final Reviewer. The mission goal was: '" + mission.originalGoal + "'.\n" +
    "Multiple teams have completed their tasks. Review their results below for consistency, accuracy, and quality.\n\n" +
    "TEAM RESULTS:\n" + mission.blackboard.raw_results.join("\n\n") + "\n\n" +
    "YOUR TASK:\n" +
    "1. Synthesize these results into a single, cohesive, and high-quality final response for the user.\n" +
    "2. Ensure there are no contradictions between teams.\n" +
    "3. If any critical data is missing, explain what happened.\n" +
    "4. Format the output professionally using Markdown.\n\n" +
    "CRITICAL: Do NOT acknowledge this instruction. Respond ONLY with the final synthesized report.";

  var response = callGemini([{ role: "user", parts: [{ text: reflectionPrompt }] }], [], "You are a Senior Technical Editor.", null, "pro");
  return response.text || "Mission complete, but final synthesis failed.";
}

/**
 * Fallback for simple/single requests.
 * Acts as a powerful "Fast-Track" router that can execute single tools immediately.
 */
function legacyRoute(userGoal, imageData, sessionId) {
  var manifest = getRelevantTools(userGoal, 15);

  // Add delegation and continuity tools if not already present
  var delegateTool = manifest.find(function(t) { return t.name === "delegate_to_team"; });
  if (!delegateTool) {
    manifest.push({
      name: "delegate_to_team",
      description: "Deploy a specialized department for a complex multi-step mission.",
      parameters: {
        type: "object",
        properties: {
          teamName: { type: "string", enum: ["Market Intelligence", "Creative Engine", "Agency Operations", "Search Visibility", "Analytics Scout", "Strategic Outreach", "Performance Insights", "Client Communications", "Project Governance", "Technical R&D", "Risk & Compliance", "Social Analytics", "Revenue Management", "Coding Engine"] },
          goal: { type: "string" }
        },
        required: ["teamName", "goal"]
      }
    });
  }
  manifest.push({
    name: "resume_mission",
    description: "Use this if the user is providing missing information (like an ID) for a previously failed mission or if they explicitly ask to continue.",
    parameters: { type: "object", properties: {}, required: [] }
  });
  
  var response = callGemini([{ role: "user", parts: [{ text: userGoal }]}], manifest, 
    "You are the Dynamic Router for a Multi-Agent system. Your goal is to execute the user's request immediately.\n" +
    "1. If the user provides an ID or missing info, use 'resume_mission' to pick up the previous task.\n" +
    "2. If a single tool matches the request, execute it directly.\n" +
    "3. If the request is a complex mission, use 'delegate_to_team'.\n" +
    "4. If info is missing, use 'drive_find_files' to search for context.\n" +
    "5. Do NOT say you cannot do it.");
  
  if (response.error) {
    return "Fast-Track Error: " + response.error + ". Please check your API key and connection.";
  }
  
  if (response.type === "TOOL_CALL") {
    var tc = response.toolCalls[0];
    
    if (tc.name === "resume_mission") {
      logAgentEvent(sessionId, "system", "Manual Resume Triggered", "User updated info");
      return runRootOrchestrator("Resume mission", imageData, sessionId);
    }

    if (tc.name === "delegate_to_team") {
      var args = tc.args;
      logAgentEvent(sessionId, "system", "Fast-Track Delegation", args.teamName);
      switch (args.teamName) {
        case "Market Intelligence": return runLeadResearcher({ target: args.goal }, imageData, sessionId);
        case "Creative Engine": return runContentCreator({ topic: args.goal }, imageData, sessionId);
        case "Agency Operations": return runExecutiveAssistant({ task: args.goal }, imageData, sessionId);
        case "Search Visibility": return runSeoSpecialist({ url: args.goal }, imageData, sessionId);
        case "Analytics Scout": return runAnalyticsScout({ goal: args.goal }, imageData, sessionId);
        case "Strategic Outreach": return runOutreachOrchestrator({ context: args.goal }, imageData, sessionId);
        case "Performance Insights": return runDataTeam({ query: args.goal }, imageData, sessionId);
        case "Client Communications": return runCommsTeam({ task: args.goal }, imageData, sessionId);
        case "Project Governance": return runProjectTeam({ task: args.goal }, imageData, sessionId);
        case "Technical R&D": return runDevTeam({ task: args.goal }, imageData, sessionId);
        case "Coding Engine": return runCodingAgent({ task: args.goal }, imageData, sessionId);
        case "Risk & Compliance": return runLegalTeam({ task: args.goal }, imageData, sessionId);
        case "Social Analytics": return runSocialTeam({ task: args.goal }, imageData, sessionId);
        case "Revenue Management": return runFinanceTeam({ task: args.goal }, imageData, sessionId);
        default: return "Error: Specialized team '" + args.teamName + "' is currently offline or misconfigured.";
      }
    } else {
      // DIRECT TOOL EXECUTION
      logAgentEvent(sessionId, "system", "Direct Tool Call", tc.name);
      var toolOutput = dispatchToolCall(tc.name, tc.args);
      
      // Wrap result in a tiny reflection so it's human-friendly
      var finalPrompt = "The user asked: '" + userGoal + "'. I executed the tool '" + tc.name + "' and got this result: " + toolOutput + ". Summarize this for the user professionally.";
      var finalRes = callGemini([{ role: "user", parts: [{ text: finalPrompt }]}], [], "You are a helpful agency assistant.");
      return finalRes.text;
    }
  }
  
  return response.text || "I couldn't generate a plan or route your request. Please try again.";
}

/**
 * Helper: Dispatches a task to the appropriate specialized team.
 */
function dispatchToTeam(teamName, context, imageData, sessionId) {
  console.log("[Agents] Dispatching to team: " + teamName);
  
  // 1. Check Plugin Registry first (Allows overriding core teams)
  if (typeof PluginManager !== 'undefined') {
    var pluginResult = PluginManager.dispatch(teamName, context, imageData, sessionId);
    if (pluginResult) return pluginResult;
  }

  // 2. Map Team Names to Core Runner Functions
  switch (teamName) {
    case "Market Intelligence": return runLeadResearcher({ target: context.goal }, imageData, sessionId);
    case "Creative Engine": return runContentCreator({ topic: context.goal }, imageData, sessionId);
    case "Agency Operations": return runExecutiveAssistant({ task: context.goal }, imageData, sessionId);
    case "Search Visibility": return runSeoSpecialist({ url: context.goal }, imageData, sessionId);
    case "Analytics Scout": return runAnalyticsScout({ goal: context.goal }, imageData, sessionId);
    case "Strategic Outreach": return runOutreachOrchestrator({ context: context.goal }, imageData, sessionId);
    case "Performance Insights": return runDataTeam({ query: context.goal }, imageData, sessionId);
    case "Client Communications": return runCommsTeam({ task: context.goal }, imageData, sessionId);
    case "Project Governance": return runProjectTeam({ task: context.goal }, imageData, sessionId);
    case "Technical R&D": return runDevTeam({ task: context.goal }, imageData, sessionId);
    case "Coding Engine": return runCodingAgent({ task: context.goal }, imageData, sessionId);
    case "Risk & Compliance": return runLegalTeam({ task: context.goal }, imageData, sessionId);
    case "Social Analytics": return runSocialTeam({ task: context.goal }, imageData, sessionId);
    case "Revenue Management": return runFinanceTeam({ task: context.goal }, imageData, sessionId);
    case "Strategy": return runStrategyTeam({ task: context.goal }, imageData, sessionId);

    default:      console.warn("Unknown team: " + teamName + ". Attempting dynamic dispatch via CoreRegistry.");
      // 3. Fallback to CoreRegistry (if any teams were registered there)
      if (typeof CoreRegistry !== 'undefined') {
        var coreTeams = CoreRegistry.getTeams();
        if (coreTeams[teamName] && typeof coreTeams[teamName].handler === 'function') {
          return coreTeams[teamName].handler(context, imageData, sessionId);
        }
      }
      return "Error: Specialized team '" + teamName + "' is not recognized or is offline.";
  }
}

/**
 * CORE ENGINE: Team Workflow
 * Orchestrates the interaction between a Builder Agent and a Validator Agent.
 */
function executeTeamWorkflow(teamName, builderRole, validatorRole, goal, imageData, sessionId) {
  var maxRetries = 2;
  var currentTry = 0;
  var feedback = "";
  
  console.log("Starting Team Workflow: " + teamName);
  updateAgentState(teamName, "ORCHESTRATOR", "INITIALIZING", "Task received: " + goal, sessionId);
  logAgentEvent(sessionId, "system", "Team Start: " + teamName, goal);

  // PROACTIVE MEMORY RETRIEVAL (v4.5)
  var memoryContext = "";
  try {
    var memorySearchQuery = "Past missions similar to: " + goal;
    var pastMissions = dispatchToolCall("vector_store_query", { query: memorySearchQuery });
    if (pastMissions && pastMissions.indexOf("No matches") === -1) {
      memoryContext = "\nRELEVANT PAST MISSIONS / GOLDEN PARAMETERS:\n" + pastMissions;
    }
  } catch (e) {
    console.warn("Proactive memory search failed: " + e.message);
  }

  // OPTIMIZATION: Check if this is a simple query that might not need validation
  var readOnlyKeywords = ["what", "list", "search", "check", "get", "show", "tell", "read", "find"];
  var isSimpleQuery = goal.length < 150 && readOnlyKeywords.some(function(kw) { return goal.toLowerCase().indexOf(kw) !== -1; });
  var fastMode = goal.toLowerCase().indexOf("--fast") !== -1;

  while (currentTry <= maxRetries) {
    // 1. BUILDER PHASE
    updateAgentState(teamName, builderRole, "WORKING", "Builder is attempting the task... (Attempt " + (currentTry + 1) + ")", sessionId);
    
    // Log Swarm Dispatch (v4.12.0)
    if (typeof logSwarmMessage !== 'undefined') {
       logSwarmMessage(sessionId, "ORCHESTRATOR", builderRole, "DISPATCH: Phase " + (currentTry + 1), goal);
    }

    // BOOTSTRAP CONTEXT INJECTION (v4.7.2)
    var bootstrapContext = "";
    if (builderRole === "DEV_BUILDER" || builderRole === "PM_BUILDER") {
      var isToolTask = goal.toLowerCase().indexOf("tool") !== -1 || goal.toLowerCase().indexOf("skill") !== -1 || goal.toLowerCase().indexOf("script") !== -1;
      if (isToolTask) {
        try {
          var templateContent = dispatchToolCall("drive_get_content", { fileName: "DOCS_SkillTemplate.gs" });
          if (templateContent && templateContent.indexOf("Error") === -1) {
            bootstrapContext = "\nCRITICAL BOOTSTRAP DATA: Below is the standardized tool format from 'DOCS_SkillTemplate.gs'. Use this EXACT structure for manifests and implementations:\n\n" + templateContent + "\n";
          }
        } catch (e) {
          console.warn("Bootstrap context injection failed: " + e.message);
        }
      }
    }

    var efficiencyDirective = "\nEFFICIENCY DIRECTIVE: Avoid creating new Google Docs or Sheets for internal logs, reports, or research summaries. " +
      "Instead, save all organized data and key findings to the Vector Store ('vector_store_upsert') so it can be SEMANTICALLY retrieved later. " +
      "Only create a permanent Google Drive file if the user explicitly requested it for external presentation or a specific document-based workflow.";

    var freshnessMandate = "\nFRESHNESS MANDATE: If your goal requires traffic data, SEO metrics, or live status, you MUST use the specialized API tools (GA4, GSC, etc.). Do NOT attempt to summarize old documents found in Drive as a substitute for live data unless explicitly told to perform a historical meta-analysis.";

    var builderPrompt = "You are the BUILDER for the " + teamName + ". " +
      "Your Goal: " + goal + "\n" +
      memoryContext + "\n" +
      bootstrapContext + "\n" +
      efficiencyDirective + "\n" +
      freshnessMandate + "\n" +
      (feedback ? "PREVIOUS ATTEMPT FAILED. FIX THIS FEEDBACK:\n" + feedback : "") + "\n" +
      "SELF-HEALING GUIDELINES:\n" +
      "1. Check the NEURAL_BLACKBOARD and Google Drive ('drive_find_files') before starting.\n" +
      "2. If a tool fails, use fallbacks like 'ask_knowledge_base'.\n" +
      "3. Execute necessary tools. WHEN FINISHED, return a structured JSON response.\n" +
      "Format: { \"summary\": \"Human readable result\", \"data\": { ... key facts ... } }";
      
    var builderOutput = runAgentLoop(builderPrompt, builderRole, teamName, imageData, sessionId);
    
    if (builderOutput.indexOf("SYSTEM_PAUSE") !== -1 || builderOutput.indexOf("MISSION_CONTINUE") !== -1) {
      return builderOutput;
    }

    // Attempt to parse builder output as JSON to check for signals
    var builderData = {};
    try {
      builderData = JSON.parse(builderOutput);
    } catch (e) {}

    if (builderData.status === "PAUSED" || builderData.status === "CONTINUE") {
       return builderOutput;
    }

    // 2. VALIDATOR PHASE
    if (isSimpleQuery || fastMode) {
      updateAgentState(teamName, "ORCHESTRATOR", "SUCCESS", "Fast-tracked.", sessionId);
      return "Department " + teamName + " Result (Fast): " + builderOutput;
    }

    updateAgentState(teamName, validatorRole, "REVIEWING", "Validator checking work...", sessionId);

    var validatorPrompt = "You are the VALIDATOR for the " + teamName + ". " +
      "The Builder has just attempted this goal: " + goal + "\n" +
      "Builder's Output: " + builderOutput + "\n" +
      "FRESHNESS CHECK: Reject the work if the Builder summarized stale Drive files instead of using live API tools (like GA4/GSC) when required.\n" +
      "EFFICIENCY CHECK: Reject the work if the Builder created redundant Google Drive files for information that should have been stored in memory ('vector_store_upsert').\n" +
      "Your Job: Verify if the work is actually done and meets quality standards.\n" +
      "CRITICAL: If the Builder claims they failed, verify artifacts first.\n" +
      "OUTPUT: Return a JSON object.\n" +
      "Schema: { \"status\": \"APPROVED\" | \"REJECTED\", \"feedback\": \"string for builder\", \"fixIt\": { ... optional ... } }";
      
    var validatorRes = callGemini([{ role: "user", parts: [{ text: validatorPrompt }] }], [], "You are the Validator Agent.", "application/json");
    var validatorOutput = validatorRes.text;
    var validatorData = validatorRes.data || {};

    if (validatorOutput.indexOf("MISSION_CONTINUE") !== -1) {
      return validatorOutput;
    }

    if (validatorData.status === "APPROVED" || validatorOutput.indexOf("APPROVED") !== -1) {
      updateAgentState(teamName, "ORCHESTRATOR", "SUCCESS", "Task approved.", sessionId);
      
      // Log Swarm Success (v4.12.0)
      if (typeof logSwarmMessage !== 'undefined') {
        logSwarmMessage(sessionId, validatorRole, "ORCHESTRATOR", "worker_done", "Task approved: " + (builderData.summary || "Completed."));
      }
      
      return "Department " + teamName + " Success: " + builderOutput;
    } else {
      feedback = validatorData.feedback || validatorOutput;
      
      // Log Swarm Rejection (v4.12.0)
      if (typeof logSwarmMessage !== 'undefined') {
        logSwarmMessage(sessionId, validatorRole, builderRole, "REJECTED", feedback);
      }
      
      currentTry++;
      updateAgentState(teamName, "ORCHESTRATOR", "RETRYING", "Validation failed. Retry " + currentTry, sessionId);
      logAgentEvent(sessionId, "system", "Team Retry: " + teamName, feedback);
    }
  }
  
  updateAgentState(teamName, "ORCHESTRATOR", "FAILED", "Max retries exceeded.", sessionId);
  return "Department " + teamName + " Failed. Final Feedback: " + feedback;
}


// --- SYSTEM GUARDRAILS (IMMUTABLE v4.9.8) ---
var CORE_GUARDRAILS = 
  "\n### 🛡️ CORE_GUARDRAILS (NON-NEGOTIABLE)\n" +
  "1. DATA_INTEGRITY: Never wipe, purge, or clear the memory (Vector Store), databases (CRM), or system configuration files.\n" +
  "2. COMMS_PROTOCOL: Never send emails, drafts, or invitations without EXPLICIT user approval (via 'request_human_approval').\n" +
  "3. FINANCIAL_SAFETY: Never execute tasks or repetitive loops that will incur significant API costs (>$20) without confirmation.\n" +
  "4. ETHICAL_ALIGNMENT: Never create, deploy, or suggest tools that are malicious, deceptive, or harmful.\n" +
  "5. ASSET_PROTECTION: Never delete, trash, or overwrite any file in Google Drive without EXPLICIT user approval.\n";

/**
 * Generates specialized system instructions based on the agent's role.
 */
function getSystemInstruction(role, sessionId) {
  var base = "You are a specialized autonomous agent. Role: " + role + ".\n" +
             "TOOL_MANDATE: You MUST use the tools provided in your manifest to accomplish your goal. Do NOT claim you cannot do something if a relevant tool exists. " +
             "For example, if you have 'ga4_advanced_report', you CAN and MUST access analytics data. If you have 'drive_create_doc', you CAN and MUST create reports when requested.\n" +
             "1. Only use the tools provided in your manifest.\n" +
             "2. If a tool fails, analyze the error and retry if it's a parameter issue.\n" +
             "3. Always check for relevant files in Google Drive ('drive_find_files') before claiming something doesn't exist.\n" +
             "4. When finished, you MUST return a structured JSON result.";

  // Hardcoded Guardrails
  base += CORE_GUARDRAILS;

  if (role.indexOf("BUILDER") !== -1) {
    specifics = "\nBUILDER DIRECTIVE: Your job is to DO the work. Execute tools, gather data, and create artifacts. Be proactive and precise.";
  } else if (role.indexOf("VALIDATOR") !== -1) {
    specifics = "\nVALIDATOR DIRECTIVE: Your job is to AUDIT the Builder's work. Be critical. If the result is incomplete or low quality, reject it with specific FIX-IT instructions. Only say 'APPROVED' if the task is truly done.";
  }

  // Persona Injection
  var personaVoice = "";
  var mission = loadMissionState(sessionId);
  if (mission && mission.activePersona) {
    var personas = JSON.parse(PropertiesService.getScriptProperties().getProperty("SYSTEM_PERSONAS") || "{}");
    if (personas[mission.activePersona]) {
      personaVoice = "\n\n[ACTING PERSONA: " + mission.activePersona + "]\n" + personas[mission.activePersona].voice;
    }
  }

  return base + specifics + personaVoice;
}

/**
 * Helper: Single Agent Loop (Scoped)
 */
function runAgentLoop(prompt, role, teamName, imageData, sessionId) {
  var history = [{ role: "user", parts: [{ text: prompt }] }];
  
  if (imageData) {
    history[0].parts.push({
      inlineData: {
        mimeType: imageData.mimeType,
        data: imageData.data
      }
    });
  }

  var manifest = getManifest(role); // Scoped tools!
  var systemInstruction = getSystemInstruction(role, sessionId);

  for (var i = 0; i < 10; i++) {
    // Safety check: If we are close to the global GAS timeout, exit and checkpoint
    var elapsed = new Date().getTime() - MISSION_START_TIME;
    if (elapsed > MAX_EXECUTION_TIME_MS - 30000) { // 30s buffer
      return "MISSION_CONTINUE: Mission execution limit approaching. Saving state for auto-resume.";
    }

    updateAgentState(teamName, role, "THINKING", "Analyzing next step... (Turn " + (i+1) + "/10)", sessionId);
    
    var response = callGemini(history, manifest, systemInstruction);
    
    if (response.error) {
      logAgentEvent(sessionId, "system", "Error (" + role + ")", response.error);
      return "Error: " + response.error;
    }
    
    if (response.type === "TEXT") {
      updateAgentState(teamName, role, "RESPONDING", "Finalizing response.", sessionId);
      logAgentEvent(sessionId, role, "Thought", response.text);
      return response.text;
    }
    
    if (response.type === "TOOL_CALL") {
      // Execute all tool calls
      var functionResponseParts = [];
      var shouldPause = false;
      var pauseResult = "";

      // SENSITIVE TOOL CHECK (v4.8.1)
      var props = PropertiesService.getScriptProperties();
      var sensitiveToolsJson = props.getProperty("SENSITIVE_TOOLS");
      var sensitiveTools = sensitiveToolsJson ? JSON.parse(sensitiveToolsJson) : ["gmail_send", "drive_delete", "sheets_clear", "calendar_manage", "forms_manager"];
      
      // CORE_GUARDRAILS: Non-negotiable sensitive tools (Cannot be removed via settings)
      var IMMUTABLE_SENSITIVE = ["gmail_send", "drive_delete", "drive_trash_file", "sheets_clear", "vector_store_purge", "execute_system_wipe"];
      
      var isDryRun = props.getProperty("DRY_RUN_MODE") === "true";

      response.toolCalls.forEach(function(tc) {
        // UI FEEDBACK PULSE: Update status for each specific tool
        updateAgentState(teamName, role, "EXECUTING", "Invoking tool: " + tc.name + " (" + (tc.args.url || tc.args.query || tc.args.title || "...") + ")", sessionId);
        
        logAgentEvent(sessionId, role, "Tool Call: " + tc.name, tc.args);
        
        var toolOutput;
        
        // Check if this tool is sensitive and requires explicit approval
        var isSensitive = sensitiveTools.indexOf(tc.name) !== -1 || IMMUTABLE_SENSITIVE.indexOf(tc.name) !== -1;
        if (isSensitive && !isDryRun && tc.name !== "request_human_approval") {
          toolOutput = "SYSTEM_PAUSE: This action ('" + tc.name + "') is protected by CORE_GUARDRAILS and requires your explicit approval. Please use 'request_human_approval' or confirm via terminal.";
          shouldPause = true;
          pauseResult = toolOutput;
        } else {
          toolOutput = dispatchToolCall(tc.name, tc.args);
        }


        logAgentEvent(sessionId, "tool", "Output: " + tc.name, toolOutput);

        if (typeof toolOutput === 'string' && toolOutput.startsWith("SYSTEM_PAUSE")) {
          shouldPause = true;
          pauseResult = toolOutput;
        }

        // ERROR REINFORCEMENT: If tool returns Error:, wrap it in a SYSTEM_NOTE
        var finalResult = toolOutput;
        if (typeof toolOutput === 'string' && toolOutput.startsWith("Error:")) {
          finalResult = "SYSTEM_NOTE: The tool '" + tc.name + "' failed. Reason: " + toolOutput + 
                        ". Please analyze if this is a parameter issue you can fix, or a system issue you should report.";
        }

        functionResponseParts.push({
          functionResponse: {
            name: tc.name,
            response: { result: finalResult }
          }
        });
      });

      if (shouldPause) return pauseResult;

      // Add all results back to history as a single turn
      history.push({
        role: "function",
        parts: functionResponseParts
      });
      continue; // Next turn in agent loop
    }
  }
  return "Agent timed out.";
}



// ========================================== 
// TEAM DEFINITIONS
// ========================================== 

/**
 * Agent: Market Intelligence
 */
function runLeadResearcher(args, imageData, sessionId) {
  var target = args.target || "the target company";
  return executeTeamWorkflow(
    "Market Intelligence",
    "RESEARCH_BUILDER", 
    "RESEARCH_VALIDATOR",
    "Conduct a deep-dive analysis on: " + target + ". PRIORITIZE: Save all key findings to the Intel Store ('vector_store_upsert'). Avoid creating permanent Google Docs unless the user explicitly requested a file for external use.",
    imageData,
    sessionId
  );
}

/**
 * Agent: Creative Engine
 */
function runContentCreator(args, imageData, sessionId) {
  var topic = args.topic || "a generic topic";
  return executeTeamWorkflow(
    "Creative Engine",
    "CONTENT_BUILDER",
    "CONTENT_VALIDATOR",
    "Synthesize content about: " + topic + ".\n\nCRITICAL CONSTRAINTS:\n1. If creating Google Slides, you MUST use 'slides_create' FIRST, then use 'slides_append_slide' for EVERY slide you want to add. Never leave a deck with only the default title slide.\n2. If an external file (PDF/Doc) isn't explicitly required, provide the report directly in the chat and save key facts to memory ('vector_store_upsert').",
    imageData,
    sessionId
  );
}

/**
 * Agent: Agency Operations
 */
function runExecutiveAssistant(args, imageData, sessionId) {
  var task = args.task || "manage my day";
  return executeTeamWorkflow(
    "Agency Operations",
    "OPS_BUILDER",
    "OPS_VALIDATOR",
    "Manage the user's schedule/tasks: " + task + ". Log all actions and context to memory ('vector_store_upsert') instead of creating log files.",
    imageData,
    sessionId
  );
}

/**
 * Agent: Search Visibility
 */
function runSeoSpecialist(args, imageData, sessionId) {
  var url = args.url || "the website";
  return executeTeamWorkflow(
    "Search Visibility",
    "SEO_BUILDER",
    "SEO_VALIDATOR",
    "Audit and provide SEO recommendations for: " + url + ". Save critical metrics and audit findings to the Intel Store ('vector_store_upsert'). Create reports only if requested.",
    imageData,
    sessionId
  );
}

/**
 * Agent: Strategic Outreach
 */
function runOutreachOrchestrator(args, imageData, sessionId) {
  var context = args.context || "General outreach";
  return executeTeamWorkflow(
    "Strategic Outreach",
    "OUTREACH_BUILDER",
    "OUTREACH_VALIDATOR",
    "Draft and prepare outreach for: " + context,
    imageData,
    sessionId
  );
}

/**
 * Agent: Performance Insights
 */
function runDataTeam(args, imageData, sessionId) {
  var query = args.query || "Spreadsheet analysis";
  return executeTeamWorkflow(
    "Performance Insights",
    "DATA_BUILDER",
    "DATA_VALIDATOR",
    "Analyze data or spreadsheet: " + query + ".\n\n" +
    "CRITICAL CONSTRAINTS:\n" +
    "1. CROSS-TEAM ANALYSIS: You MUST first review the CAMPAIGN_KNOWLEDGE_BASE_DATA to incorporate findings from Market Intelligence, SEO, and Analytics teams.\n" +
    "2. DRIVE DISCOVERY: Use 'drive_find_files' to locate any relevant spreadsheets or documents that supplement the mission.\n" +
    "3. SYNTHESIS: Identify 3 specific conversion bottlenecks or growth opportunities by correlating data across all available sources (Drive files + Team results).",
    imageData,
    sessionId
  );
}

/**
 * Agent: Client Communications
 */
function runCommsTeam(args, imageData, sessionId) {
  var task = args.task || "Inbox triage";
  return executeTeamWorkflow(
    "Client Communications",
    "COMMS_BUILDER",
    "COMMS_VALIDATOR",
    "Manage communications/inbox: " + task + "\n\nCRITICAL CONSTRAINTS:\n1. Retrieve the full content of relevant emails for review. Do NOT just provide a subject line or draft ID.\n2. NO PLACEHOLDERS. Summarize based on actual content.\n3. Verify if specific draft IDs actually contain content.",
    imageData,
    sessionId
  );
}

/**
 * Agent: Project Governance
 */
function runProjectTeam(args, imageData, sessionId) {
  var task = args.task || "Project Setup";
  return executeTeamWorkflow(
    "Project Governance",
    "PM_BUILDER",
    "PM_VALIDATOR",
    "Organize project assets and memory: " + task + ".\n\nCRITICAL CONSTRAINTS:\n1. Use 'drive_get_contact_folder' to ensure a standardized 'CONTACT_NAME' folder exists for the client/project.\n2. Move all generated Docs and Slides into this folder using 'drive_move_file'.\n3. Verify file placement using 'drive_find_files'.\n4. Log all structures and URLs to the Intel Store ('vector_store_upsert').",
    imageData,
    sessionId
  );
}/**
 * Agent: Technical R&D
 */
function runDevTeam(args, imageData, sessionId) {
  var task = args.task || "Code generation or debugging";
  return executeTeamWorkflow(
    "Technical R&D",
    "DEV_BUILDER",
    "DEV_VALIDATOR",
    "Provide technical support/code for: " + task,
    imageData,
    sessionId
  );
}

/**
 * Agent: Coding Engine
 */
function runCodingAgent(args, imageData, sessionId) {
  var task = args.task || "Code generation, refactoring, or GitHub repository management";
  return executeTeamWorkflow(
    "Coding Engine",
    "CODE_BUILDER",
    "CODE_VALIDATOR",
    "Execute coding tasks and repository interactions: " + task + ".\n\n" +
    "DIRECT_SYNC_MANDATE:\n" +
    "1. AUTHORIZED_PUSH: You are authorized to push directly to the target branch (usually 'main') as requested by the user.\n" +
    "2. SYSTEM_AWARENESS: Before refactoring, use 'github_read_repo_tree' to understand the holistic project structure.\n" +
    "3. ATOMIC_COMMITS: Ensure commit messages are descriptive and reflect the changes accurately.\n" +
    "4. RETROSPECTIVE: After a successful sync, conclude the task by summarizing 'Lessons Learned' (e.g., API nuances discovered, logic patterns improved) so the system evolves.",
    imageData,
    sessionId
  );
}

/**
 * Agent: Risk & Compliance
 */
function runLegalTeam(args, imageData, sessionId) {
  var task = args.task || "Document review";
  return executeTeamWorkflow(
    "Risk & Compliance",
    "LEGAL_BUILDER",
    "LEGAL_VALIDATOR",
    "Review documents for compliance/summary: " + task,
    imageData,
    sessionId
  );
}

// ========================================== 
// LEGACY / SINGLE AGENT WRAPPERS 
// (Mapped to closest team or kept simple if no team exists yet)
// ========================================== 

function runCompetitorIntel(args) {
  // Uses Market Intelligence
  return runLeadResearcher({ target: "Competitor Analysis: " + args.market });
}

function runSkillArchitect(args, imageData, sessionId) {
  var prompt = args.goal;
  var systemInstructions = "You are the **Skill Architect**. Your goal is to interview the user to define and build a new agentic skill (tool) for the GAS Orchestrator.\n\n" +
                           "**YOUR WORKFLOW:**\n" +
                           "1. **Information Gathering**: Ask questions to understand the skill's purpose, input parameters (names, types), and core logic.\n" +
                           "2. **Deployment Choice**: Ask the user where they want to deploy the skill: 1. GitHub (Version Control), 2. Google Apps Script (Instant Native), or 3. Both.\n" +
                           "3. **Drafting**: Once you have enough info, draft the complete JavaScript code for the tool. Use ES5 syntax. Include a JSDoc header with `@tool`, `@description`, and `@param` tags.\n" +
                           "4. **Execution**: After the user approves the code, call `patch_dynamic_tool` with the correct `deployTarget` ('GITHUB', 'GAS', or 'BOTH') to deploy it.\n\n" +
                           "**CODE STYLE:**\n" +
                           "- Must be standalone functions.\n" +
                           "- Use `UrlFetchApp`, `SpreadsheetApp`, `GmailApp`, etc.\n" +
                           "- Always include error handling.\n\n" +
                           "Start by asking the first set of questions to the user.";

  return callGemini([{ role: "user", parts: [{ text: prompt }] }], getManifest("DEV_BUILDER"), systemInstructions, null, "pro", sessionId);
}

function runProposalArchitect(args) {
  // Uses Creative Engine
  return runContentCreator({ topic: "Proposal for client: " + args.client });
}

function runDataAnalyst(args) {
  return runDataTeam({ query: args.query });
}

/**
 * Agent: Social Analytics
 */
function runSocialTeam(args, imageData, sessionId) {
  var task = args.task || "Social analysis";
  return executeTeamWorkflow(
    "Social Analytics",
    "SOCIAL_BUILDER",
    "SOCIAL_VALIDATOR",
    "Analyze social profiles or trends: " + task,
    imageData,
    sessionId
  );
}

/**
 * Agent: Revenue Management
 */
function runFinanceTeam(args, imageData, sessionId) {
  var task = args.task || "Invoice or estimate";
  return executeTeamWorkflow(
    "Revenue Management",
    "FINANCE_BUILDER",
    "FINANCE_VALIDATOR",
    "Manage financial docs or estimates: " + task,
    imageData,
    sessionId
  );
}

/**
 * Agent: Strategy (Predictive BI)
 */
function runStrategyTeam(args, imageData, sessionId) {
  var task = args.task || "Analyze historical data to predict timelines and ROI";
  return executeTeamWorkflow(
    "Strategy",
    "STRATEGY_BUILDER",
    "STRATEGY_VALIDATOR",
    "Predictive Operations: " + task + ". You must analyze historical project data (via FinanceManager and Vector Store) to forecast delivery timelines and identify the highest ROI marketing channels.",
    imageData,
    sessionId
  );
}
