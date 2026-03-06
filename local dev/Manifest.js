/**
 * MANIFEST.gs
 */

var manifestCache = {};

function getManifest(role) {
  // Initialize Core Registry if not already done
  initCoreRegistry();

  if (role && manifestCache[role]) return manifestCache[role];

  // 1. Gather all available tools
  var allTools = CoreRegistry.getTools();
  if (typeof PluginManager !== 'undefined') {
    // concat returns a new array, preserving CoreRegistry
    allTools = allTools.concat(PluginManager.getPluginTools());
  }

  // Deduplicate tools by name (CoreRegistry + Plugins)
  var dedupedTools = [];
  var seenTools = {};
  allTools.forEach(function(tool) {
    if (!seenTools[tool.name]) {
      seenTools[tool.name] = true;
      dedupedTools.push(tool);
    }
  });

  // If no role provided, return the deduplicated list
  if (!role) return dedupedTools;

  // 2. Gather allowed tool names for this role
  var coreScopes = CoreRegistry.getScopes();
  var pluginScopes = (typeof PluginManager !== 'undefined') ? PluginManager.getPluginScopes() : {};
  
  var allowedNames = (coreScopes[role] || []).concat(pluginScopes[role] || []);

  // Fallback: If role is unknown but contains BUILDER or VALIDATOR, try to infer or return all
  if (allowedNames.length === 0) {
    if (role.indexOf("BUILDER") !== -1 || role.indexOf("VALIDATOR") !== -1) {
       console.warn("[Manifest] Role '" + role + "' has no tools defined. Falling back to global manifest.");
       return dedupedTools;
    }
    return dedupedTools;
  }

  // 3. Filter and Deduplicate (already handled by dedupedTools, but role filtering needed)
  var filtered = dedupedTools.filter(function(tool) {
    return allowedNames.indexOf(tool.name) !== -1;
  });
  
  manifestCache[role] = filtered;
  return filtered;
}

/**
 * TOOL RAG OPTIMIZATION
 * Dynamically selects the most relevant tools for a given prompt to reduce token context window.
 */
function getRelevantTools(prompt, maxTools) {
  var allTools = getManifest(); // Get the deduplicated global list
  maxTools = maxTools || 15;

  if (allTools.length <= maxTools) return allTools;

  var catalog = allTools.map(function(t) { return "- " + t.name + ": " + t.description; }).join("\n");
  
  var sysPrompt = "You are a Tool Selector RAG component. Review the user prompt and the available tools. Identify the most likely tools needed to fulfill the request. Return ONLY a JSON array of strings containing the exact tool names (maximum " + maxTools + " tools). No markdown formatting, just the array.";
  var userMessage = "User Request: " + prompt + "\n\nAvailable Tools:\n" + catalog;
  
  try {
    var response = callGemini([{ role: "user", parts: [{ text: userMessage }] }], [], sysPrompt, "application/json", "flash");
    if (response.error) throw new Error(response.error);
    
    var jsonText = response.text.replace(/```json/g, "").replace(/```/g, "").trim();
    var toolNames = JSON.parse(jsonText);
    
    if (!Array.isArray(toolNames)) throw new Error("LLM did not return an array.");
    
    var filteredTools = allTools.filter(function(t) { return toolNames.indexOf(t.name) !== -1; });
    
    // Fallback: if LLM fails to return any, return top N
    if (filteredTools.length === 0) return allTools.slice(0, maxTools);
    
    // Always append baseline safety tools just in case
    var baseline = ["request_human_approval", "delegate_to_team"];
    baseline.forEach(function(bName) {
      if (toolNames.indexOf(bName) === -1) {
        var bTool = allTools.find(function(t) { return t.name === bName; });
        if (bTool) filteredTools.push(bTool);
      }
    });

    return filteredTools;
  } catch (e) {
    console.warn("Tool RAG Selection failed, falling back to full manifest: " + e.message);
    return allTools; // Fallback to all tools to prevent crashing
  }
}
