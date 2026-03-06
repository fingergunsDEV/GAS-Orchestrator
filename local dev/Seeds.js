/**
 * Seeds.gs
 * Issue Tracking and Task Management (os-eco integration).
 */

function getSeedsData() {
  var props = PropertiesService.getScriptProperties();
  var data = props.getProperty("SEEDS_DATA");
  if (!data) return [];
  try {
    return JSON.parse(data);
  } catch (e) {
    return [];
  }
}

function saveSeedsData(seedsArray) {
  var props = PropertiesService.getScriptProperties();
  props.setProperty("SEEDS_DATA", JSON.stringify(seedsArray));
}

function executeSeedsCreate(args) {
  var title = args.title;
  var description = args.description;
  var status = args.status || "open";
  
  var seeds = getSeedsData();
  var newId = "seed-" + new Date().getTime().toString(36);
  
  var newSeed = {
    id: newId,
    title: title,
    description: description,
    status: status,
    notes: "",
    timestamp: new Date().toISOString()
  };
  
  seeds.push(newSeed);
  saveSeedsData(seeds);
  
  if (typeof logSwarmMessage !== 'undefined') {
    logSwarmMessage(args.sessionId, "CORE_MEMORY", "ALL_AGENTS", "SEED_CREATED", "[" + newId + "] " + title);
  }
  
  return JSON.stringify({ success: true, message: "Seed successfully created.", seed: newSeed });
}

function executeSeedsList(args) {
  var filterStatus = args.status;
  var seeds = getSeedsData();
  
  if (seeds.length === 0) {
    return JSON.stringify({ success: true, seeds: [], message: "No seeds found." });
  }
  
  var filtered = seeds;
  if (filterStatus) {
    filtered = seeds.filter(function(s) { return s.status === filterStatus; });
  }
  
  var formatted = "--- SEEDS TRACKER ---\n";
  filtered.forEach(function(s) {
    formatted += "- [" + s.id + "] (" + s.status.toUpperCase() + ") " + s.title + "\n";
  });
  
  return JSON.stringify({ success: true, count: filtered.length, formattedContext: formatted });
}

function executeSeedsUpdate(args) {
  var id = args.id;
  var status = args.status;
  var notes = args.notes;
  
  var seeds = getSeedsData();
  var seedIndex = seeds.findIndex(function(s) { return s.id === id; });
  
  if (seedIndex === -1) {
    return JSON.stringify({ success: false, message: "Seed not found: " + id });
  }
  
  if (status) seeds[seedIndex].status = status;
  if (notes) {
    seeds[seedIndex].notes += (seeds[seedIndex].notes ? "\n" : "") + "[" + new Date().toISOString() + "] " + notes;
  }
  
  saveSeedsData(seeds);
  
  if (typeof logSwarmMessage !== 'undefined') {
    logSwarmMessage(args.sessionId, "CORE_MEMORY", "ALL_AGENTS", "SEED_UPDATED", "[" + id + "] Status: " + seeds[seedIndex].status);
  }
  
  return JSON.stringify({ success: true, message: "Seed successfully updated.", seed: seeds[seedIndex] });
}

function registerSeedsTools() {
  if (typeof CoreRegistry === 'undefined') return;

  var tools = [
    {
      name: "seeds_create",
      description: "Creates a new task or issue in the Seeds tracker.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string", description: "Short title of the task." },
          description: { type: "string", description: "Detailed description of the task." },
          status: { type: "string", description: "Initial status: 'open', 'in_progress', 'blocked', 'closed' (default: 'open')." }
        },
        required: ["title", "description"]
      }
    },
    {
      name: "seeds_list",
      description: "Lists existing tasks/issues from the Seeds tracker.",
      parameters: {
        type: "object",
        properties: {
          status: { type: "string", description: "Optional filter by status (e.g., 'open', 'in_progress')." }
        }
      }
    },
    {
      name: "seeds_update",
      description: "Updates an existing task in the Seeds tracker.",
      parameters: {
        type: "object",
        properties: {
          id: { type: "string", description: "The ID of the seed to update (e.g., 'seed-12345')." },
          status: { type: "string", description: "New status." },
          notes: { type: "string", description: "Additional notes to append." }
        },
        required: ["id"]
      }
    }
  ];

  var implementations = {
    "seeds_create": executeSeedsCreate,
    "seeds_list": executeSeedsList,
    "seeds_update": executeSeedsUpdate
  };

  var scopes = {
    "ORCHESTRATOR": ["seeds_create", "seeds_list", "seeds_update"],
    "DEV_BUILDER": ["seeds_list", "seeds_update"],
    "CODE_BUILDER": ["seeds_list", "seeds_update"]
  };

  var team = {
    name: "Seeds",
    description: "Issue Tracking and Task Management System."
  };

  CoreRegistry.register("Seeds", tools, implementations, scopes, team);
}