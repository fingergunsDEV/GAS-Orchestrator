/**
 * GscRegexPlugin.gs
 * Regex-based GSC Query filtering.
 */

function initGscRegexPlugin() {
  if (typeof PluginManager === 'undefined') return;

  PluginManager.register({
    name: "GSC Regex Filter",
    version: "1.0.0",
    description: "Filters GSC results using custom regex patterns.",
    tools: [
      {
        name: "gsc_regex_search",
        description: "Searches GSC queries using a regex pattern.",
        parameters: {
          type: "object",
          properties: {
            siteUrl: { type: "string" },
            regexPattern: { type: "string" },
            startDate: { type: "string" },
            endDate: { type: "string" },
            rowLimit: { type: "number" }
          },
          required: ["siteUrl", "regexPattern"]
        }
      }
    ],
    scopes: {
      "SEO_BUILDER": ["gsc_regex_search"]
    },
    team: {
      name: "RegEx Analytics Team",
      description: "Advanced pattern matching for SEO keywords.",
      handlerName: "runRegExTeam"
    }
  }, {
    "gsc_regex_search": executeGscRegexSearch,
    "runRegExTeam": runRegExTeam
  });
}

function executeGscRegexSearch(args) {
  try {
    if (typeof executeGscQuery === 'undefined') return "Error: Base GSC Plugin not found.";

    var rawDataStr = executeGscQuery({
      siteUrl: args.siteUrl,
      startDate: args.startDate,
      endDate: args.endDate,
      rowLimit: args.rowLimit || 1000
    });

    if (rawDataStr.indexOf("Error") === 0) return rawDataStr;
    if (rawDataStr.indexOf("No data") === 0) return rawDataStr;

    var nl = String.fromCharCode(10);
    var lines = rawDataStr.split(nl);
    var filtered = [];
    var pattern = args.regexPattern;
    var regex = new RegExp(pattern, "i");

    for (var i = 0; i < lines.length; i++) {
      var line = lines[i];
      if (line.indexOf(" | ") !== -1) {
        var query = line.split(" | ")[0].trim();
        if (regex.test(query)) {
          filtered.push(line);
        }
      }
    }

    if (filtered.length === 0) return "No results matched the regex pattern: " + pattern;

    var header = "GSC Regex Results for '" + pattern + "':" + nl;
    return header + filtered.join(nl);
  } catch (e) {
    return "Regex Error: " + e.message;
  }
}

function runRegExTeam(context, imageData, sessionId) {
  if (typeof executeTeamWorkflow !== 'undefined') {
    return executeTeamWorkflow(
      "RegEx Analytics Team",
      "SEO_BUILDER",
      "SEO_VALIDATOR",
      context.goal,
      imageData,
      sessionId
    );
  }
  return "Error: Workflow Engine missing.";
}

initGscRegexPlugin();
