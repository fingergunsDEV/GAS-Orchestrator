/**
 * DISPATCHER.gs
 */

function dispatchToolCall(toolName, toolArgs) {
  // Ensure registry is initialized
  initCoreRegistry();
  
  console.log("[Dispatcher] Calling: " + toolName);
  var args = toolArgs || {};

  // 1. Check Core Registry (Modular Built-in Tools)
  var coreImplementations = CoreRegistry.getImplementations();
  if (coreImplementations.hasOwnProperty(toolName)) {
    try {
      var result = coreImplementations[toolName](args);
      return typeof result === 'string' ? result : JSON.stringify(result);
    } catch (e) {
      return "Error: " + e.message;
    }
  }

  // 2. Check Plugin Registry
  if (typeof PluginManager !== 'undefined') {
    var pluginFunc = PluginManager.getPluginFunction(toolName);
    if (pluginFunc) {
      try {
        var result = pluginFunc(args);
        return typeof result === 'string' ? result : JSON.stringify(result);
      } catch (e) {
        return "Plugin Tool Error: " + e.message;
      }
    }
  }

  // 3. Check Dynamic Registry
  var dynamicKey = "DYNAMIC_TOOL_" + toolName.toUpperCase();
  var dynamicTool = PropertiesService.getScriptProperties().getProperty(dynamicKey);
  
  if (dynamicTool) {
    try {
      var toolDef = JSON.parse(dynamicTool);
      var func = new Function("args", toolDef.code);
      var result = func(args);
      return typeof result === 'string' ? result : JSON.stringify(result);
    } catch (e) {
      return "Dynamic Tool Error: " + e.message;
    }
  }

  return "Error: Tool not found.";
}

