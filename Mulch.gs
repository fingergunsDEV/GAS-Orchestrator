/**
 * Mulch.gs (v4.15.0)
 * Structured Expertise Management (os-eco integration).
 * Agents record conventions, patterns, and decisions as they work,
 * then retrieve them at the start of each session.
 */

/**
 * Initializes the Mulch database. 
 * For GAS, we store this in PropertiesService to ensure fast retrieval,
 * but it could be migrated to a dedicated "Expertise" Google Sheet or JSON file on Drive.
 */
function getMulchExpertise() {
  var props = PropertiesService.getScriptProperties();
  var data = props.getProperty("MULCH_EXPERTISE");
  if (!data) return [];
  try {
    return JSON.parse(data);
  } catch (e) {
    return [];
  }
}

function saveMulchExpertise(expertiseArray) {
  var props = PropertiesService.getScriptProperties();
  props.setProperty("MULCH_EXPERTISE", JSON.stringify(expertiseArray));
}

/**
 * tool: mulch_record
 * Records a new piece of expertise (pattern, convention, or decision).
 */
function executeMulchRecord(args) {
  var type = args.type; // 'convention', 'pattern', 'decision'
  var description = args.description;
  var context = args.context || "";
  
  var expertise = getMulchExpertise();
  
  // Basic deduplication
  var exists = expertise.find(function(e) { return e.description === description; });
  if (exists) {
    return JSON.stringify({ success: true, message: "Expertise already recorded." });
  }

  var newEntry = {
    id: "ml-" + new Date().getTime().toString(36),
    type: type,
    description: description,
    context: context,
    timestamp: new Date().toISOString()
  };

  expertise.push(newEntry);
  saveMulchExpertise(expertise);

  if (typeof logSwarmMessage !== 'undefined') {
    logSwarmMessage(args.sessionId, "CORE_MEMORY", "ALL_AGENTS", "MULCH_RECORDED", "[" + type.toUpperCase() + "] " + description);
  }

  return JSON.stringify({ success: true, message: "Expertise successfully recorded to Mulch.", entry: newEntry });
}

/**
 * tool: mulch_prime
 * Retrieves relevant expertise based on the current context/task.
 * In a more advanced version, this would do semantic search. For now, it returns all or filters by type.
 */
function executeMulchPrime(args) {
  var filterType = args.type; // Optional
  var expertise = getMulchExpertise();
  
  if (expertise.length === 0) {
    return JSON.stringify({ success: true, expertise: [], message: "No expertise recorded yet." });
  }

  var filtered = expertise;
  if (filterType) {
    filtered = expertise.filter(function(e) { return e.type === filterType; });
  }

  // Format into a readable string for the agent context
  var formatted = "--- MULCH EXPERTISE OVERLAY ---\n";
  filtered.forEach(function(e) {
    formatted += "- [" + e.type.toUpperCase() + "] " + e.description + (e.context ? " (Context: " + e.context + ")" : "") + "\n";
  });
  
  return JSON.stringify({ success: true, count: filtered.length, formattedContext: formatted });
}

/**
 * Registers Mulch tools with CoreRegistry.
 */
function registerMulchTools() {
  if (typeof CoreRegistry === 'undefined') return;

  var tools = [
    {
      name: "mulch_record",
      description: "Records a critical convention, codebase pattern, or architectural decision to the global expertise memory. Use this whenever you learn how the system 'wants' things to be done.",
      parameters: {
        type: "object",
        properties: {
          type: { type: "string", description: "The type of expertise: 'convention', 'pattern', or 'decision'." },
          description: { type: "string", description: "A clear, actionable description of the rule or pattern (e.g., 'Always use UrlFetchApp.fetch instead of fetch')." },
          context: { type: "string", description: "Optional context on why this rule exists." }
        },
        required: ["type", "description"]
      }
    },
    {
      name: "mulch_prime",
      description: "Retrieves the established project expertise (conventions, patterns, decisions). Run this at the start of a complex coding task to ensure you follow project rules.",
      parameters: {
        type: "object",
        properties: {
          type: { type: "string", description: "Optional filter by type: 'convention', 'pattern', or 'decision'." }
        }
      }
    }
  ];

  var implementations = {
    "mulch_record": executeMulchRecord,
    "mulch_prime": executeMulchPrime
  };

  var scopes = {
    // All coding and logic agents should have access to Mulch
    "CODE_BUILDER": ["mulch_record", "mulch_prime"],
    "DEV_BUILDER": ["mulch_record", "mulch_prime"],
    "CODE_VALIDATOR": ["mulch_prime"],
    "ORCHESTRATOR": ["mulch_record", "mulch_prime"]
  };

  var team = {
    name: "Mulch",
    handlerName: "runCodingAgent", // Or a dedicated handler if needed
    description: "Expertise Management System."
  };

  CoreRegistry.register("Mulch", tools, implementations, scopes, team);
}
