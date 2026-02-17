/**
 * GoogleAnalyticsPlugin.gs
 * Advanced GA4 integration for the GAS Orchestrator.
 */

function initGoogleAnalyticsPlugin() {
  if (typeof PluginManager === 'undefined') return;

  PluginManager.register({
    name: "Google Analytics 4 Advanced",
    version: "1.0.0",
    description: "Deep dive GA4 reporting and realtime checks.",
    tools: [
      {
        name: "ga4_advanced_report",
        description: "Runs a complex GA4 report with multiple dimensions and metrics.",
        parameters: {
          type: "object",
          properties: {
            propertyId: { type: "string" },
            dateRange: { type: "string", description: "e.g. 'last30days', 'yesterday'" },
            dimensions: { type: "array", items: { type: "string" }, description: "e.g. ['city', 'browser']" },
            metrics: { type: "array", items: { type: "string" }, description: "e.g. ['activeUsers', 'conversions']" }
          },
          required: ["propertyId"]
        }
      },
      {
        name: "ga4_realtime_check",
        description: "Checks realtime active users on the site right now.",
        parameters: {
          type: "object",
          properties: {
            propertyId: { type: "string" }
          },
          required: ["propertyId"]
        }
      }
    ],
    scopes: {
      "DATA_BUILDER": ["ga4_advanced_report", "ga4_realtime_check"],
      "SEO_BUILDER": ["ga4_advanced_report"]
    },
    team: {
      name: "Analytics Scout",
      description: "Specialized in mining GA4 for user behavior trends and anomalies.",
      handlerName: "runAnalyticsScout"
    }
  }, {
    "ga4_advanced_report": executeGa4Advanced,
    "ga4_realtime_check": executeGa4Realtime,
    "runAnalyticsScout": runAnalyticsScout
  });
}

/**
 * Tool: Advanced GA4 Report
 */
function executeGa4Advanced(args) {
  try {
    var dim = args.dimensions ? args.dimensions.map(function(d){ return { name: d }; }) : [{ name: "date" }];
    var met = args.metrics ? args.metrics.map(function(m){ return { name: m }; }) : [{ name: "activeUsers" }];
    
    // Parse date range
    var dr = { startDate: "30daysAgo", endDate: "today" };
    if (args.dateRange === "yesterday") dr = { startDate: "yesterday", endDate: "yesterday" };
    
    var url = "https://analyticsdata.googleapis.com/v1beta/properties/" + args.propertyId + ":runReport";
    var payload = {
      dateRanges: [dr],
      dimensions: dim,
      metrics: met
    };
    
    var options = {
      method: "post",
      contentType: "application/json",
      payload: JSON.stringify(payload),
      headers: { Authorization: "Bearer " + ScriptApp.getOAuthToken() },
      muteHttpExceptions: true
    };
    
    var response = UrlFetchApp.fetch(url, options);
    var json = JSON.parse(response.getContentText());
    
    if (response.getResponseCode() !== 200) {
      return "GA4 API Error: " + (json.error ? json.error.message : response.getContentText());
    }
    
    if (!json.rows || json.rows.length === 0) return "No data returned for this query.";
    
    // Format output
    var output = "GA4 Report (" + args.propertyId + "):\n";
    output += json.rows.map(function(row) {
      var dVals = row.dimensionValues.map(function(v){ return v.value; }).join(" | ");
      var mVals = row.metricValues.map(function(v){ return v.value; }).join(", ");
      return dVals + ": " + mVals;
    }).slice(0, 20).join("\n"); // Limit to 20 rows
    
    return output;
  } catch (e) {
    return "Error in GA4 Advanced: " + e.message;
  }
}

/**
 * Tool: Realtime Check
 */
function executeGa4Realtime(args) {
  try {
    var url = "https://analyticsdata.googleapis.com/v1beta/properties/" + args.propertyId + ":runRealtimeReport";
    var payload = {
      metrics: [{ name: "activeUsers" }],
      dimensions: [{ name: "country" }] // Breakdown by country
    };
    
    var options = {
      method: "post",
      contentType: "application/json",
      payload: JSON.stringify(payload),
      headers: { Authorization: "Bearer " + ScriptApp.getOAuthToken() },
      muteHttpExceptions: true
    };
    
    var response = UrlFetchApp.fetch(url, options);
    var json = JSON.parse(response.getContentText());
    
    if (response.getResponseCode() !== 200) return "Error: " + response.getContentText();
    
    if (!json.rows) return "0 Active Users right now.";
    
    var total = 0;
    var breakdown = json.rows.map(function(row) {
      var users = parseInt(row.metricValues[0].value);
      total += users;
      return row.dimensionValues[0].value + ": " + users;
    }).join(", ");
    
    return "Realtime Active Users: " + total + "\nBreakdown: " + breakdown;
  } catch (e) {
    return "Error in Realtime: " + e.message;
  }
}

/**
 * Agent Handler
 */
function runAnalyticsScout(context, imageData, sessionId) {
  // Uses existing orchestrator logic but scoped to Data Team
  // We'll create a synthetic role for this specialized run
  if (typeof executeTeamWorkflow !== 'undefined') {
    return executeTeamWorkflow(
      "Analytics Scout",
      "DATA_BUILDER",
      "DATA_VALIDATOR",
      context.goal,
      imageData,
      sessionId
    );
  }
  return "Error: Team Workflow Engine not found.";
}

initGoogleAnalyticsPlugin();
