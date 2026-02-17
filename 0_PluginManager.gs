/**
 * PluginManager.gs
 * Standardized registry for extending the GAS Orchestrator with new tools and agents.
 * Designed to be load-order independent.
 */

var PluginManager = (function() {
  var plugins = [];
  var pluginTools = [];
  var pluginFunctions = {};
  var pluginScopes = {};
  var teamRegistry = {};

  return {
    /**
     * Registers a new plugin/agent into the system.
     */
    register: function(manifest, implementations) {
      console.log("[PluginManager] Registering: " + manifest.name);
      
      plugins.push(manifest);

      // 1. Store Tools
      if (manifest.tools) {
        manifest.tools.forEach(function(tool) {
          pluginTools.push(tool);
        });
      }

      // 2. Store Functions
      if (implementations) {
        for (var toolName in implementations) {
          pluginFunctions[toolName] = implementations[toolName];
        }
      }

      // 3. Store Scopes
      if (manifest.scopes) {
        for (var role in manifest.scopes) {
          if (!pluginScopes[role]) pluginScopes[role] = [];
          pluginScopes[role] = pluginScopes[role].concat(manifest.scopes[role]);
        }
      }

      // 4. Store Team (Agent)
      if (manifest.team) {
        var teamName = manifest.team.name;
        teamRegistry[teamName] = {
          handler: manifest.team.handler || implementations[manifest.team.handlerName],
          description: manifest.team.description
        };
      }
      
      // Clear Global Manifest Cache if it exists
      if (typeof manifestCache !== 'undefined') {
        manifestCache = {};
      }
      
      return "Plugin '" + manifest.name + "' registered successfully.";
    },

    getPluginTools: function() { return pluginTools; },
    
    getPluginFunction: function(name) { return pluginFunctions[name]; },
    
    getPluginScopes: function() { return pluginScopes; },

    getTeamDefinitions: function() {
      var defs = [];
      for (var name in teamRegistry) {
        defs.push("- " + name + ": " + teamRegistry[name].description);
      }
      return defs.join("\n");
    },

    dispatch: function(teamName, context, imageData, sessionId) {
      if (teamRegistry[teamName]) {
        var handler = teamRegistry[teamName].handler;
        if (typeof handler === 'function') {
          return handler(context, imageData, sessionId);
        }
      }
      return null;
    },

    listPlugins: function() {
      return plugins.map(function(p) { return p.name + " (v" + (p.version || "1.0") + ")"; }).join(", ");
    }
  };
})();