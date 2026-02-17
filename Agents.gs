/**
 * Agents.gs
 * Implements the "Team of Teams" architecture with Builder/Validator pairs.
 */

var MISSION_START_TIME = new Date().getTime();
var MAX_EXECUTION_TIME_MS = 300000; // 5 minutes safety limit

/**
 * ROOT ORCHESTRATOR (v3.2 - Performance Edition)
 * Breaks complex requests into sequential team tasks and manages state across turns.
 */
function runRootOrchestrator(userGoal, imageData, sessionId) {
  sessionId = sessionId || "chat_" + new Date().getTime();
  console.log("Root Orchestrator invoked for session: " + sessionId);
  
  // 1. Check for existing Mission State (The Neural Blackboard)
  var mission = loadMissionState(sessionId);
  
  if (!mission) {
    // START NEW MISSION
    updateAgentState("ROOT", "ORCHESTRATOR", "PLANNING", "Architecting tactical mission plan...");
    logAgentEvent(sessionId, "user", "Goal", userGoal);

    // PERSONA DETECTION
    var activePersona = null;
    var personaMatch = userGoal.match(/@(\w+)/);
    if (personaMatch) activePersona = personaMatch[1];

    var planPrompt = 
      "You are the Strategic Planner. The user has this goal: '" + userGoal + "'.\n" +
      "Break this down into parallel and sequential steps. Identify tasks that can be done at the same time.\n" +
      "Teams available: Research, Content, Ops, SEO, Outreach, Data, Comms, PM, Dev, Legal, Social, Finance.\n\n" +
      "Return ONLY a JSON array of 'Groups'. Each group is executed sequentially. Tasks within a group are executed in parallel.\n" +
      "Example:\n" +
      "[\n" +
      "  { \"group\": 1, \"tasks\": [{ \"team\": \"Research Team\", \"instruction\": \"Research topic X\" }, { \"team\": \"SEO Team\", \"instruction\": \"Audit site Y\" }] },\n" +
      "  { \"group\": 2, \"tasks\": [{ \"team\": \"Content Team\", \"instruction\": \"Write report based on research and audit\" }] }\n" +
      "]";
      
    var history = [{ role: "user", parts: [{ text: planPrompt }] }];
    var planResponse = callGemini(history, [], "You are a JSON-only planning engine.");
    
    try {
      var jsonText = planResponse.text.replace(/```json/g, "").replace(/```/g, "").trim();
      var groups = JSON.parse(jsonText);
      
      mission = {
        sessionId: sessionId,
        userGoal: userGoal,
        activePersona: activePersona,
        groups: groups,
        currentGroupIndex: 0,
        blackboard: {
          raw_results: [],
          structured_data: {},
          artifacts: []
        },
        metadata: {
          startTime: new Date().getTime(),
          totalGroups: groups.length
        }
      };
      saveMissionState(sessionId, mission);
    } catch (e) {
      return legacyRoute(userGoal, imageData, sessionId);
    }
  }

  // 2. EXECUTION PHASE (Iterating through Groups)
  while (mission.currentGroupIndex < mission.groups.length) {
    var elapsed = new Date().getTime() - MISSION_START_TIME;
    if (elapsed > MAX_EXECUTION_TIME_MS) {
      saveMissionState(sessionId, mission);
      scheduleAutoResume(sessionId);
      return "MISSION_CONTINUE: Parallel state saved. System will resume automatically.";
    }

    var group = mission.groups[mission.currentGroupIndex];
    var groupNum = mission.currentGroupIndex + 1;
    
    updateAgentState("ROOT", "ORCHESTRATOR", "EXECUTING_GROUP", "Group " + groupNum + "/" + mission.groups.length);

    // PARALLEL EXECUTION OF TASKS IN GROUP
    var groupResults = [];
    
    // In Google Apps Script, we don't have true multithreading, 
    // but we can execute them sequentially here or use a batch mechanism if tools supported it.
    // For now, we simulate parallel intent by processing all tasks in the group.
    
    for (var i = 0; i < group.tasks.length; i++) {
      var task = group.tasks[i];
      updateAgentState("ROOT", "ORCHESTRATOR", "EXECUTING_TASK", "Task: " + task.team);
      
      var teamContext = {
        goal: task.instruction,
        originalGoal: mission.userGoal,
        shared_data: mission.blackboard.structured_data,
        previous_results: mission.blackboard.raw_results
      };

      var executionResult = dispatchToTeam(task.team, teamContext, imageData, sessionId);
      
      // Update Blackboard immediately for next tasks (Pseudo-parallel with shared state)
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
      if (structuredUpdate) {
        var key = task.team.toLowerCase().replace(" team", "");
        mission.blackboard.structured_data[key] = structuredUpdate;
      }
    }

    mission.currentGroupIndex++;
    saveMissionState(sessionId, mission);
  }

  updateAgentState("ROOT", "ORCHESTRATOR", "FINISHED", "Mission complete.");
  var finalReport = "Mission Complete.\n\n" + mission.blackboard.raw_results.join("\n\n");
  clearSessionState(sessionId); 
  return finalReport;
}


/**
 * Helper: Structured Dispatcher
 */
function dispatchToTeam(teamName, context, imageData, sessionId) {
  var goalString = "GLOBAL_MISSION_GOAL: " + context.originalGoal + "\n" +
                   "YOUR_TASK: " + context.goal + "\n\n" +
                   "NEURAL_BLACKBOARD_DATA:\n" + JSON.stringify(context.shared_data, null, 2);

  switch (teamName) {
    case "Research Team": return runLeadResearcher({ target: goalString }, imageData, sessionId);
    case "Content Team": return runContentCreator({ topic: goalString }, imageData, sessionId);
    case "Ops Team": return runExecutiveAssistant({ task: goalString }, imageData, sessionId);
    case "SEO Team": return runSeoSpecialist({ url: goalString }, imageData, sessionId);
    case "Outreach Team": return runOutreachOrchestrator({ context: goalString }, imageData, sessionId);
    case "Data Team": return runDataTeam({ query: goalString }, imageData, sessionId);
    case "Comms Team": return runCommsTeam({ task: goalString }, imageData, sessionId);
    case "PM Team": return runProjectTeam({ task: goalString }, imageData, sessionId);
    case "Dev Team": return runDevTeam({ task: goalString }, imageData, sessionId);
    case "Legal Team": return runLegalTeam({ task: goalString }, imageData, sessionId);
    case "Social Team": return runSocialTeam({ task: goalString }, imageData, sessionId);
    case "Finance Team": return runFinanceTeam({ task: goalString }, imageData, sessionId);
    default: 
      if (typeof PluginManager !== 'undefined') {
        var pluginResult = PluginManager.dispatch(teamName, context, imageData, sessionId);
        if (pluginResult) return pluginResult;
      }
      return "Error: Unknown team: " + teamName;
  }
}


/**
 * Fallback for simple/single requests (or if JSON parsing fails).
 */
function legacyRoute(userGoal, imageData, sessionId) {
  // We re-use the original specialized routing logic but simplified for direct calls
  // Since we removed the original switch-case from runRootOrchestrator, we reconstruct a mini-router here.
  
  // Quick heuristic or a second LLM call could go here. 
  // For safety, let's just ask Gemini one more time to pick a single tool from the manifest.
  
  var routerManifest = [
    {
      name: "delegate_to_team",
      description: "Pick the best team.",
      parameters: {
        type: "object",
        properties: {
          teamName: { type: "string", enum: ["Research Team", "Content Team", "Ops Team", "SEO Team", "Outreach Team", "Data Team", "Comms Team", "PM Team", "Dev Team", "Legal Team", "Social Team", "Finance Team"] },
          goal: { type: "string" }
        },
        required: ["teamName", "goal"]
      }
    }
  ];
  
  var response = callGemini([{ role: "user", parts: [{ text: userGoal }]}], routerManifest, "Route this request to one team.");
  
  if (response.type === "TOOL_CALL") {
    var tc = response.toolCalls[0]; // Legacy route only expects one tool call usually
    if (tc.name === "delegate_to_team") {
      var args = tc.args;
      logAgentEvent(sessionId, "system", "Legacy Route", args.teamName);
      // Map to function calls (same switch as above)
      switch (args.teamName) {
        case "Research Team": return runLeadResearcher({ target: args.goal }, imageData, sessionId);
        case "Content Team": return runContentCreator({ topic: args.goal }, imageData, sessionId);
        case "Ops Team": return runExecutiveAssistant({ task: args.goal }, imageData, sessionId);
        case "SEO Team": return runSeoSpecialist({ url: args.goal }, imageData, sessionId);
        case "Outreach Team": return runOutreachOrchestrator({ context: args.goal }, imageData, sessionId);
        case "Data Team": return runDataTeam({ query: args.goal }, imageData, sessionId);
        case "Comms Team": return runCommsTeam({ task: args.goal }, imageData, sessionId);
        case "PM Team": return runProjectTeam({ task: args.goal }, imageData, sessionId);
        case "Dev Team": return runDevTeam({ task: args.goal }, imageData, sessionId);
        case "Legal Team": return runLegalTeam({ task: args.goal }, imageData, sessionId);
        case "Social Team": return runSocialTeam({ task: args.goal }, imageData, sessionId);
        case "Finance Team": return runFinanceTeam({ task: args.goal }, imageData, sessionId);
      }
    }
  }
  
  return "I couldn't generate a plan or route your request. Please try again.";
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
  updateAgentState(teamName, "ORCHESTRATOR", "INITIALIZING", "Task received: " + goal);
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
  var isSimpleQuery = goal.length < 100 && (goal.toLowerCase().indexOf("what") !== -1 || goal.toLowerCase().indexOf("list") !== -1 || goal.toLowerCase().indexOf("search") !== -1);
  var fastMode = goal.toLowerCase().indexOf("--fast") !== -1;

  while (currentTry <= maxRetries) {
    // 1. BUILDER PHASE
    updateAgentState(teamName, builderRole, "WORKING", "Builder is attempting the task... (Attempt " + (currentTry + 1) + ")");
    
    var builderPrompt = "You are the BUILDER for the " + teamName + ". " +
      "Your Goal: " + goal + "\n" +
      memoryContext + "\n" +
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

    // 2. VALIDATOR PHASE
    if (isSimpleQuery || fastMode) {
      updateAgentState(teamName, "ORCHESTRATOR", "SUCCESS", "Fast-tracked.");
      return "Team " + teamName + " Result (Fast): " + builderOutput;
    }

    updateAgentState(teamName, validatorRole, "REVIEWING", "Validator checking work...");

    var validatorPrompt = "You are the VALIDATOR for the " + teamName + ". " +
      "The Builder has just attempted this goal: " + goal + "\n" +
      "Builder's Output: " + builderOutput + "\n" +
      "Your Job: Verify if the work is actually done and meets quality standards.\n" +
      "CRITICAL: If the Builder claims they failed, verify artifacts first.\n" +
      "OUTPUT: If good, reply EXACTLY 'APPROVED'. If bad, you MUST return a JSON 'FIX-IT' object.\n" +
      "Example: { \"status\": \"REJECTED\", \"errorType\": \"MISSING_DATA\", \"targetField\": \"email\", \"hint\": \"Check the 'Contacts' sheet instead\" }";
      
    var validatorOutput = runAgentLoop(validatorPrompt, validatorRole, teamName, null, sessionId);
    
    if (validatorOutput.indexOf("MISSION_CONTINUE") !== -1) {
      return validatorOutput;
    }

    if (validatorOutput.indexOf("APPROVED") !== -1) {
      updateAgentState(teamName, "ORCHESTRATOR", "SUCCESS", "Task approved.");
      return "Team " + teamName + " Success: " + builderOutput;
    } else {
      feedback = validatorOutput; // This is now a structured JSON or detailed string
      currentTry++;
      updateAgentState(teamName, "ORCHESTRATOR", "RETRYING", "Validation failed. Retry " + currentTry);
      logAgentEvent(sessionId, "system", "Team Retry: " + teamName, feedback);
    }
  }
  
  updateAgentState(teamName, "ORCHESTRATOR", "FAILED", "Max retries exceeded.");
  return "Team " + teamName + " Failed. Final Feedback: " + feedback;
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
  
  // PERSONA INJECTION (v3.6)
  var personaVoice = "";
  var mission = loadMissionState(sessionId);
  if (mission && mission.activePersona) {
    var personaJson = PropertiesService.getScriptProperties().getProperty("SYSTEM_PERSONAS");
    if (personaJson) {
      var personas = JSON.parse(personaJson);
      if (personas[mission.activePersona]) {
        personaVoice = "\nACTING PERSONA DIRECTIVE [" + mission.activePersona + "]:\n" + personas[mission.activePersona].voice;
      }
    }
  }

  var systemInstruction = "You are a specialized agent with role: " + role + ". Only use the tools provided." + personaVoice;

  for (var i = 0; i < 10; i++) { // Max 10 turns per sub-agent (Increased from 6)
    // Safety check: If we are close to the global GAS timeout, exit and checkpoint
    var elapsed = new Date().getTime() - MISSION_START_TIME;
    if (elapsed > MAX_EXECUTION_TIME_MS - 30000) { // 30s buffer
      return "MISSION_CONTINUE: Mission execution limit approaching. Saving state for auto-resume.";
    }

    updateAgentState(teamName, role, "THINKING", "Analyzing next step... (Turn " + (i+1) + "/10)");
    
    var response = callGemini(history, manifest, systemInstruction);
    
    if (response.error) {
      logAgentEvent(sessionId, "system", "Error (" + role + ")", response.error);
      return "Error: " + response.error;
    }
    
    if (response.type === "TEXT") {
      updateAgentState(teamName, role, "RESPONDING", "Finalizing response.");
      logAgentEvent(sessionId, role, "Thought", response.text);
      return response.text;
    }
    
    if (response.type === "TOOL_CALL") {
      updateAgentState(teamName, role, "EXECUTING", "Executing " + response.toolCalls.length + " tool(s)...");
      
      // Add all model's parts to history
      history.push({ 
        role: "model", 
        parts: response.toolCalls.map(function(tc) { return tc.part; }) 
      });

      // Execute all tool calls
      var functionResponses = [];
      var shouldPause = false;
      var pauseResult = "";

      response.toolCalls.forEach(function(tc) {
        logAgentEvent(sessionId, role, "Tool Call: " + tc.name, tc.args);
        
        var toolOutput = dispatchToolCall(tc.name, tc.args);
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

        functionResponses.push({
          role: "function",
          parts: [{
            functionResponse: {
              name: tc.name,
              response: { result: finalResult }
            }
          }]
        });
      });

      if (shouldPause) return pauseResult;

      // Add all results back to history
      history = history.concat(functionResponses);
      continue; // Next turn in agent loop
    }
  }
  return "Agent timed out.";
}



// ========================================== 
// TEAM DEFINITIONS
// ========================================== 

/**
 * Agent: Research Team
 */
function runLeadResearcher(args, imageData, sessionId) {
  var target = args.target || "the target company";
  return executeTeamWorkflow(
    "Research Team",
    "RESEARCH_BUILDER", 
    "RESEARCH_VALIDATOR",
    "Conduct a deep-dive analysis on: " + target + ". Save findings to the Knowledge Base.",
    imageData,
    sessionId
  );
}

/**
 * Agent: Content Team
 */
function runContentCreator(args, imageData, sessionId) {
  var topic = args.topic || "a generic topic";
  return executeTeamWorkflow(
    "Content Team",
    "CONTENT_BUILDER",
    "CONTENT_VALIDATOR",
    "Create high-quality content (Slides or Doc) about: " + topic,
    imageData,
    sessionId
  );
}

/**
 * Agent: Ops Team (Executive Assistant)
 */
function runExecutiveAssistant(args, imageData, sessionId) {
  var task = args.task || "manage my day";
  return executeTeamWorkflow(
    "Ops Team",
    "OPS_BUILDER",
    "OPS_VALIDATOR",
    "Manage the user's schedule/tasks: " + task,
    imageData,
    sessionId
  );
}

/**
 * Agent: SEO Team
 */
function runSeoSpecialist(args, imageData, sessionId) {
  var url = args.url || "the website";
  return executeTeamWorkflow(
    "SEO Team",
    "SEO_BUILDER",
    "SEO_VALIDATOR",
    "Audit and provide SEO recommendations for: " + url,
    imageData,
    sessionId
  );
}

/**
 * Agent: Outreach Team
 */
function runOutreachOrchestrator(args, imageData, sessionId) {
  var context = args.context || "General outreach";
  return executeTeamWorkflow(
    "Outreach Team",
    "OUTREACH_BUILDER",
    "OUTREACH_VALIDATOR",
    "Draft and prepare outreach for: " + context,
    imageData,
    sessionId
  );
}

/**
 * Agent: Data Team
 */
function runDataTeam(args, imageData, sessionId) {
  var query = args.query || "Spreadsheet analysis";
  return executeTeamWorkflow(
    "Data Team",
    "DATA_BUILDER",
    "DATA_VALIDATOR",
    "Analyze data or spreadsheet: " + query,
    imageData,
    sessionId
  );
}

/**
 * Agent: Comms Team
 */
function runCommsTeam(args, imageData, sessionId) {
  var task = args.task || "Inbox triage";
  return executeTeamWorkflow(
    "Comms Team",
    "COMMS_BUILDER",
    "COMMS_VALIDATOR",
    "Manage communications/inbox: " + task,
    imageData,
    sessionId
  );
}

/**
 * Agent: Project Management Team
 */
function runProjectTeam(args, imageData, sessionId) {
  var task = args.task || "Project Setup";
  return executeTeamWorkflow(
    "PM Team",
    "PM_BUILDER",
    "PM_VALIDATOR",
    "Organize project assets and permissions: " + task,
    imageData,
    sessionId
  );
}

/**
 * Agent: Dev Team (New)
 */
function runDevTeam(args, imageData, sessionId) {
  var task = args.task || "Code generation or debugging";
  return executeTeamWorkflow(
    "Dev Team",
    "DEV_BUILDER",
    "DEV_VALIDATOR",
    "Provide technical support/code for: " + task,
    imageData,
    sessionId
  );
}

/**
 * Agent: Legal Team (New)
 */
function runLegalTeam(args, imageData, sessionId) {
  var task = args.task || "Document review";
  return executeTeamWorkflow(
    "Legal Team",
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
  // Uses Research Team
  return runLeadResearcher({ target: "Competitor Analysis: " + args.market });
}

function runProposalArchitect(args) {
  // Uses Content Team
  return runContentCreator({ topic: "Proposal for client: " + args.client });
}

function runDataAnalyst(args) {
  return runDataTeam({ query: args.query });
}

/**
 * Agent: Social Media Team (New)
 */
function runSocialTeam(args, imageData, sessionId) {
  var task = args.task || "Social analysis";
  return executeTeamWorkflow(
    "Social Team",
    "SOCIAL_BUILDER",
    "SOCIAL_VALIDATOR",
    "Analyze social profiles or trends: " + task,
    imageData,
    sessionId
  );
}

/**
 * Agent: Finance Team (New)
 */
function runFinanceTeam(args, imageData, sessionId) {
  var task = args.task || "Invoice or estimate";
  return executeTeamWorkflow(
    "Finance Team",
    "FINANCE_BUILDER",
    "FINANCE_VALIDATOR",
    "Manage financial docs or estimates: " + task,
    imageData,
    sessionId
  );
}
