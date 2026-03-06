/**
 * Skill_CodingEngine.gs
 * Specialized tools for the Coding Engine to manage the GAS-Orchestrator repository.
 */

/**
 * Manifest: Coding Engine
 */
var CodingEngineManifest = [
  {
    name: "coding_engine_status",
    description: "Returns technical health and structure status of the GAS-Orchestrator codebase.",
    parameters: {
      type: "object",
      properties: {},
      required: []
    }
  },
  {
    name: "coding_engine_sync",
    description: "Performs a dual-format synchronization: Saves code as .gs in root and .js in 'local dev/'.",
    parameters: {
      type: "object",
      properties: {
        fileName: { type: "string", description: "The base name of the file (e.g., 'Orchestrator')." },
        content: { type: "string", description: "The full source code to sync." },
        message: { type: "string", description: "The commit message." }
      },
      required: ["fileName", "content", "message"]
    }
  }
];

/**
 * Implementation: coding_engine_status
 */
function executeCodingEngineStatus(args) {
  try {
    var files = DriveApp.getFiles(); // Simplified codebase scan
    var gsCount = 0;
    var jsCount = 0;
    var totalSize = 0;
    
    // In a real repo interaction, we'd use the GitHub tree, 
    // but for status we can summarize the local project view.
    var repoTreeRes = github_read_repo_tree({ owner: "fingergunsDEV", repo: "GAS-Orchestrator" });
    var tree = JSON.parse(repoTreeRes);
    
    if (tree.tree) {
      tree.tree.forEach(function(item) {
        if (item.path.endsWith(".gs")) gsCount++;
        if (item.path.endsWith(".js")) jsCount++;
        if (item.size) totalSize += item.size;
      });
    }

    return JSON.stringify({
      summary: "Coding Engine Operational",
      stats: {
        gs_files: gsCount,
        js_files: jsCount,
        approx_size_kb: Math.round(totalSize / 1024),
        branch: "main"
      },
      environment: "Google Apps Script Agentic Orchestrator"
    }, null, 2);
  } catch (e) {
    return "Error fetching status: " + e.message;
  }
}

/**
 * Implementation: coding_engine_sync
 */
function executeCodingEngineSync(args) {
  try {
    var owner = "fingergunsDEV";
    var repo = "GAS-Orchestrator";
    var branch = "main";
    var results = [];

    // 1. Root .gs Commit
    var gsRes = github_commit_file({
      owner: owner,
      repo: repo,
      path: args.fileName + ".gs",
      content: args.content,
      message: args.message,
      branch: branch
    });
    results.push("Root .gs: " + gsRes);

    // 2. Local Dev .js Commit
    var jsRes = github_commit_file({
      owner: owner,
      repo: repo,
      path: "local dev/" + args.fileName + ".js",
      content: args.content,
      message: args.message + " (local dev sync)",
      branch: branch
    });
    results.push("Local Dev .js: " + jsRes);

    return "Sync Complete: " + results.join(" | ");
  } catch (e) {
    return "Error during sync: " + e.message;
  }
}

/**
 * Registration
 */
function registerCodingEngineSkill() {
  var implementations = {
    "coding_engine_status": executeCodingEngineStatus,
    "coding_engine_sync": executeCodingEngineSync
  };

  if (typeof PluginManager !== 'undefined') {
    PluginManager.register({
      name: "Coding Engine",
      version: "1.0.0",
      tools: CodingEngineManifest,
      scopes: { "Technical R&D": ["coding_engine_status", "coding_engine_sync"] }
    }, implementations);
  } else if (typeof CoreRegistry !== 'undefined') {
    CoreRegistry.register("CodingEngine", CodingEngineManifest, implementations, {
      "Technical R&D": ["coding_engine_status", "coding_engine_sync"],
      "OPS_BUILDER": ["coding_engine_status", "coding_engine_sync"]
    });
  }
}
