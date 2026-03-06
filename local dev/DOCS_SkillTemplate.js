/**
 * DOCS_SkillTemplate.gs
 * Documentation and code structure for creating new specialized skills and tools.
 * 
 * ===========================================================================
 * GAS Agentic Orchestrator - Skill/Tool Documentation
 * ===========================================================================
 * 
 * 1. TOOL MANIFEST DEFINITION
 * Describes the tool's interface to the LLM using JSON Schema format.
 * 
 * var MyNewSkillManifest = {
 *   name: "tool_name_in_snake_case",
 *   description: "Description of what the tool does and when to use it.",
 *   parameters: {
 *     type: "object",
 *     properties: {
 *       param1: { type: "string", description: "Description of param 1" },
 *       action: { type: "string", enum: ["list", "create"] }
 *     },
 *     required: ["param1", "action"]
 *   }
 * };
 * 
 * 2. IMPLEMENTATION FUNCTION
 * Contains the GAS logic. Must take an 'args' object and return a string.
 * 
 * function executeMyNewTool(args) {
 *   try {
 *     var param1 = args.param1;
 *     var action = args.action;
 *     // GAS Service Operations (DriveApp, GmailApp, etc.)
 *     if (action === "create") {
 *       // Logic...
 *       return "Success: Created item.";
 *     }
 *     return "Error: Unsupported action.";
 *   } catch (e) {
 *     return "Error: " + e.message;
 *   }
 * }
 * 
 * 3. REGISTRATION (Module-Based)
 * Registering with CoreRegistry.gs for built-in modules.
 * 
 * function registerMyModuleTools() {
 *   CoreRegistry.register("MyModule", [MyNewSkillManifest], 
 *     { "tool_name_in_snake_case": executeMyNewTool }, 
 *     { "OPS_BUILDER": ["tool_name_in_snake_case"] }
 *   );
 * }
 * 
 * 4. REGISTRATION (Plugin-Based)
 * Registering with 0_PluginManager.gs for standalone plugins.
 * 
 * function initMyPlugin() {
 *   PluginManager.register({
 *     name: "My Plugin",
 *     tools: [ MyNewSkillManifest ],
 *     scopes: { "EXPERT_TEAM": ["tool_name_in_snake_case"] }
 *   }, { "tool_name_in_snake_case": executeMyNewTool });
 * }
 * 
 * ===========================================================================
 * CODE TEMPLATE (BOOTSTRAP)
 * ===========================================================================
 */

/**
 * Tool Manifest: [Skill Name]
 */
var MyNewSkillManifest = {
  name: "my_new_tool",
  description: "A specialized tool that [Describe Goal].",
  parameters: {
    type: "object",
    properties: {
      action: { 
        type: "string", 
        enum: ["list", "create", "update", "delete"],
        description: "The action to perform." 
      },
      title: { type: "string", description: "Title of the item." },
      content: { type: "string", description: "Body of the item." }
    },
    required: ["action", "title"]
  }
};

/**
 * Implementation: my_new_tool
 */
function executeMyNewTool(args) {
  try {
    var action = args.action;
    var title = args.title;
    var content = args.content || "";

    if (action === "create") {
      var file = DriveApp.getRootFolder().createFile(title, content, MimeType.PLAIN_TEXT);
      return "Success: Created file. ID: " + file.getId();
    } 
    
    // Add more action logic here...
    
    return "Error: Action '" + action + "' is not supported.";
  } catch (e) {
    console.error("Error in my_new_tool: " + e.message);
    return "Error performing my_new_tool: " + e.message;
  }
}

/**
 * Registration: my_new_tool
 */
function registerMyNewPlugin() {
  var manifest = {
    name: "My New Plugin",
    version: "1.0.0",
    tools: [ MyNewSkillManifest ],
    scopes: {
      "RESEARCH_BUILDER": ["my_new_tool"],
      "OPS_BUILDER": ["my_new_tool"]
    }
  };

  var implementations = {
    "my_new_tool": executeMyNewTool
  };

  if (typeof PluginManager !== 'undefined') {
    PluginManager.register(manifest, implementations);
  } else if (typeof CoreRegistry !== 'undefined') {
    CoreRegistry.register("MyModule", [MyNewSkillManifest], implementations, manifest.scopes);
  }
}
