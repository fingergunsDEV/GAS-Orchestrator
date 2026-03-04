/**
 * Canopy.gs
 * Prompt Management System (os-eco integration).
 */

function getCanopyData() {
  var props = PropertiesService.getScriptProperties();
  var data = props.getProperty("CANOPY_DATA");
  if (!data) return {};
  try {
    return JSON.parse(data);
  } catch (e) {
    return {};
  }
}

function saveCanopyData(canopyObj) {
  var props = PropertiesService.getScriptProperties();
  props.setProperty("CANOPY_DATA", JSON.stringify(canopyObj));
}

function executeCanopySave(args) {
  var name = args.name;
  var content = args.content;
  var version = args.version || "1.0.0";
  
  var canopy = getCanopyData();
  
  canopy[name] = {
    name: name,
    content: content,
    version: version,
    timestamp: new Date().toISOString()
  };
  
  saveCanopyData(canopy);
  
  if (typeof logSwarmMessage !== 'undefined') {
    logSwarmMessage(args.sessionId, "CORE_MEMORY", "ALL_AGENTS", "CANOPY_SAVED", "Saved prompt template: " + name);
  }
  
  return JSON.stringify({ success: true, message: "Prompt template successfully saved to Canopy." });
}

function executeCanopyLoad(args) {
  var name = args.name;
  var canopy = getCanopyData();
  
  if (!canopy[name]) {
    return JSON.stringify({ success: false, message: "Prompt template not found: " + name });
  }
  
  return JSON.stringify({ success: true, template: canopy[name] });
}

function registerCanopyTools() {
  if (typeof CoreRegistry === 'undefined') return;

  var tools = [
    {
      name: "canopy_save",
      description: "Saves a new prompt template to the Canopy management system.",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string", description: "Name of the prompt template." },
          content: { type: "string", description: "The template text." },
          version: { type: "string", description: "Version string (e.g., '1.0.0')." }
        },
        required: ["name", "content"]
      }
    },
    {
      name: "canopy_load",
      description: "Loads a prompt template from Canopy.",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string", description: "Name of the prompt template to load." }
        },
        required: ["name"]
      }
    }
  ];

  var implementations = {
    "canopy_save": executeCanopySave,
    "canopy_load": executeCanopyLoad
  };

  var scopes = {
    "ORCHESTRATOR": ["canopy_save", "canopy_load"],
    "DEV_BUILDER": ["canopy_load"],
    "CODE_BUILDER": ["canopy_load"]
  };

  var team = {
    name: "Canopy",
    description: "Prompt Management System."
  };

  CoreRegistry.register("Canopy", tools, implementations, scopes, team);
}