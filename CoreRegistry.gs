/**
 * CoreRegistry.gs
 * Handles registration of built-in system tools in a modular way.
 */

var CoreRegistry = (function() {
  var coreTools = [];
  var coreImplementations = {};
  var coreScopes = {};

  return {
    /**
     * Registers a module of tools.
     * @param {string} moduleName
     * @param {Array} tools - Array of tool manifest objects.
     * @param {Object} implementations - Map of tool names to functions.
     * @param {Object} scopes - Map of roles to arrays of tool names.
     */
    register: function(moduleName, tools, implementations, scopes) {
      console.log("[CoreRegistry] Registering Module: " + moduleName);
      
      if (tools) {
        tools.forEach(function(t) { coreTools.push(t); });
      }
      
      if (implementations) {
        for (var name in implementations) {
          coreImplementations[name] = implementations[name];
        }
      }
      
      if (scopes) {
        for (var role in scopes) {
          if (!coreScopes[role]) coreScopes[role] = [];
          coreScopes[role] = coreScopes[role].concat(scopes[role]);
        }
      }
    },

    getTools: function() { return coreTools; },
    getImplementations: function() { return coreImplementations; },
    getScopes: function() { return coreScopes; }
  };
})();

/**
 * Initialize all core modules.
 * This should be called by Dispatcher or Manifest.
 */
function initCoreRegistry() {
  // If already initialized (length > 0), skip to avoid duplicates
  if (CoreRegistry.getTools().length > 0) return;

  if (typeof registerWorkspaceTools === 'function') registerWorkspaceTools();
  if (typeof registerSearchSeoTools === 'function') registerSearchSeoTools();
  if (typeof registerCrmOutreachTools === 'function') registerCrmOutreachTools();
  if (typeof registerIntelligenceTools === 'function') registerIntelligenceTools();
  if (typeof registerSocialTools === 'function') registerSocialTools();
  if (typeof registerFinanceTools === 'function') registerFinanceTools();
  if (typeof registerSystemTools === 'function') registerSystemTools();
}

