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

  // If no role provided, return the full list
  if (!role) return allTools;

  // 2. Gather allowed tool names for this role
  var coreScopes = CoreRegistry.getScopes();
  var pluginScopes = (typeof PluginManager !== 'undefined') ? PluginManager.getPluginScopes() : {};
  
  var allowedNames = (coreScopes[role] || []).concat(pluginScopes[role] || []);

  // Fallback: If role is unknown or has no tools, return ALL tools (as per original logic)
  if (allowedNames.length === 0) {
    return allTools;
  }

  // 3. Filter and Deduplicate
  var seen = {};
  var filtered = allTools.filter(function(tool) {
    if (allowedNames.indexOf(tool.name) !== -1 && !seen[tool.name]) {
      seen[tool.name] = true;
      return true;
    }
    return false;
  });
  
  manifestCache[role] = filtered;
  return filtered;
}
