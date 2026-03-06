/**
 * GoogleSearchConsolePlugin.gs
 * Comprehensive GSC management (Sitemaps, Inspection, Sites).
 * Complements the basic regex plugin.
 */

function initGscAdvancedPlugin() {
  if (typeof PluginManager === 'undefined') return;

  PluginManager.register({
    name: "GSC Advanced Manager",
    version: "1.0.0",
    description: "Manage sitemaps and inspect sites.",
    tools: [
      {
        name: "gsc_list_sites",
        description: "Lists all verified sites in Search Console.",
        parameters: { type: "object", properties: {}, required: [] }
      },
      {
        name: "gsc_get_sitemaps",
        description: "Lists sitemaps submitted for a site.",
        parameters: {
          type: "object",
          properties: { siteUrl: { type: "string" } },
          required: ["siteUrl"]
        }
      },
      {
        name: "gsc_submit_sitemap",
        description: "Submits a new sitemap URL.",
        parameters: {
          type: "object",
          properties: {
            siteUrl: { type: "string" },
            sitemapUrl: { type: "string" }
          },
          required: ["siteUrl", "sitemapUrl"]
        }
      },
      {
        name: "gsc_page_performance",
        description: "Fetches impressions and clicks for the top pages of a site.",
        parameters: {
          type: "object",
          properties: {
            siteUrl: { type: "string" },
            startDate: { type: "string", description: "YYYY-MM-DD" },
            endDate: { type: "string", description: "YYYY-MM-DD" },
            limit: { type: "number", description: "Default 10" }
          },
          required: ["siteUrl"]
        }
      },
      {
        name: "gsc_url_trend",
        description: "Fetches daily performance trends for a specific page URL.",
        parameters: {
          type: "object",
          properties: {
            siteUrl: { type: "string" },
            pageUrl: { type: "string", description: "The specific URL to track." },
            dateRange: { type: "string", enum: ["7d", "28d", "3m"] }
          },
          required: ["siteUrl", "pageUrl"]
        }
      }
    ],
    scopes: {
      "SEO_BUILDER": ["gsc_list_sites", "gsc_get_sitemaps", "gsc_submit_sitemap", "gsc_page_performance", "gsc_url_trend"]
    },
    team: {
      name: "Search Console Deep Diver",
      description: "Manages technical SEO aspects like indexing and sitemaps.",
      handlerName: "runGscDeepDiver"
    }
  }, {
    "gsc_list_sites": executeGscListSites,
    "gsc_get_sitemaps": executeGscGetSitemaps,
    "gsc_submit_sitemap": executeGscSubmitSitemap,
    "gsc_page_performance": executeGscPagePerformance,
    "gsc_url_trend": executeGscUrlTrend,
    "runGscDeepDiver": runGscDeepDiver
  });
}

/**
 * Exposed functions for google.script.run
 */
function gsc_url_trend(args) { return executeGscUrlTrend(args); }

function executeGscUrlTrend(args) {
  try {
    var siteUrl = args.siteUrl;
    console.log("[executeGscUrlTrend] Initial siteUrl: " + siteUrl);

    // AUTO-DISCOVERY FALLBACK
    if (!siteUrl || siteUrl === "null" || siteUrl === "/") {
      var verifiedSites = executeGscListSitesInternal();
      if (verifiedSites.length > 0) {
        // Prefer a domain property if possible, otherwise use the first one
        siteUrl = verifiedSites[0].siteUrl;
        console.log("[executeGscUrlTrend] Auto-discovered siteUrl: " + siteUrl);
      }
    }

    if (!siteUrl) return { status: "error", message: "No siteUrl provided or discovered." };

    var site = encodeURIComponent(siteUrl);
    var url = "https://www.googleapis.com/webmasters/v3/sites/" + site + "/searchAnalytics/query";
    
    console.log("[executeGscUrlTrend] Fetching for URL: " + args.pageUrl + " on site: " + siteUrl);
    
    var endDate = new Date().toISOString().split('T')[0];
    var startObj = new Date();
    
    var range = args.dateRange || '28d';
    if (range === '7d') startObj.setDate(startObj.getDate() - 7);
    else if (range === '28d') startObj.setDate(startObj.getDate() - 28);
    else if (range === '3m') startObj.setDate(startObj.getDate() - 90);
    else startObj.setDate(startObj.getDate() - 30);
    
    var startDate = startObj.toISOString().split('T')[0];
    
    var payload = {
      startDate: startDate,
      endDate: endDate,
      dimensions: ["date"],
      dimensionFilterGroups: [{
        filters: [{
          dimension: "page",
          operator: "equals",
          expression: args.pageUrl
        }]
      }],
      rowLimit: 500
    };

    var response = UrlFetchApp.fetch(url, {
      method: "post",
      contentType: "application/json",
      headers: { Authorization: "Bearer " + ScriptApp.getOAuthToken() },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    });

    var json = JSON.parse(response.getContentText());
    if (response.getResponseCode() !== 200) {
      return { status: "error", message: json.error ? json.error.message : response.getContentText() };
    }
    
    if (!json.rows) return { status: "no_data", rows: [] };

    return {
      status: "success",
      rows: json.rows.map(function(row) {
        return {
          date: row.keys[0],
          clicks: row.clicks,
          impressions: row.impressions,
          position: row.position
        };
      })
    };
  } catch (e) {
    return { status: "error", message: e.message };
  }
}

function executeGscPagePerformance(args) {
  try {
    var site = encodeURIComponent(args.siteUrl);
    var url = "https://www.googleapis.com/webmasters/v3/sites/" + site + "/searchAnalytics/query";
    
    // GSC REQUIRES YYYY-MM-DD. It does NOT support "7daysAgo" strings.
    var endDate = new Date().toISOString().split('T')[0];
    var startObj = new Date();
    
    var range = args.dateRange || '7d';
    if (range === '24h') startObj.setDate(startObj.getDate() - 1);
    else if (range === '7d') startObj.setDate(startObj.getDate() - 7);
    else if (range === '28d') startObj.setDate(startObj.getDate() - 28);
    else if (range === '3m') startObj.setDate(startObj.getDate() - 90);
    else startObj.setDate(startObj.getDate() - 30);
    
    var startDate = startObj.toISOString().split('T')[0];
    
    var payload = {
      startDate: startDate,
      endDate: endDate,
      dimensions: ["page"],
      rowLimit: args.limit || 10
    };

    var response = UrlFetchApp.fetch(url, {
      method: "post",
      contentType: "application/json",
      headers: { Authorization: "Bearer " + ScriptApp.getOAuthToken() },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    });

    var json = JSON.parse(response.getContentText());
    if (response.getResponseCode() !== 200) {
      var errMsg = json.error ? json.error.message : response.getContentText();
      console.error("GSC API Error: " + errMsg);
      return "GSC Error: " + (errMsg.length > 40 ? errMsg.substring(0, 37) + "..." : errMsg);
    }
    
    if (!json.rows) return "No Data for Period";

    return json.rows.map(function(row) {
      return {
        url: row.keys[0],
        clicks: row.clicks,
        impressions: row.impressions,
        ctr: (row.ctr * 100).toFixed(2) + "%",
        position: row.position.toFixed(1)
      };
    });
  } catch (e) {
    return "GSC Error: " + e.message;
  }
}

function executeGscListSites() {
  try {
    var sites = executeGscListSitesInternal();
    if (sites.length === 0) return "No verified sites found.";

    return sites.map(function(s) {
      return "- " + s.siteUrl + " (" + s.permissionLevel + ")";
    }).join("\n");
  } catch (e) {
    return "GSC Error: " + e.message;
  }
}

/**
 * Internal helper for site listing
 */
function executeGscListSitesInternal() {
  var url = "https://www.googleapis.com/webmasters/v3/sites";
  var response = UrlFetchApp.fetch(url, {
    headers: { Authorization: "Bearer " + ScriptApp.getOAuthToken() },
    muteHttpExceptions: true
  });

  var json = JSON.parse(response.getContentText());
  return json.siteEntry || [];
}

function executeGscGetSitemaps(args) {
  try {
    var site = encodeURIComponent(args.siteUrl);
    var url = "https://www.googleapis.com/webmasters/v3/sites/" + site + "/sitemaps";
    var response = UrlFetchApp.fetch(url, {
      headers: { Authorization: "Bearer " + ScriptApp.getOAuthToken() },
      muteHttpExceptions: true
    });

    var json = JSON.parse(response.getContentText());
    if (!json.sitemap) return "No sitemaps found for " + args.siteUrl;

    return json.sitemap.map(function(s) {
      return "URL: " + s.path + " | Last Download: " + (s.lastDownloaded || "Never") + " | Warnings: " + s.warnings;
    }).join("\n");
  } catch (e) {
    return "GSC Error: " + e.message;
  }
}

function executeGscSubmitSitemap(args) {
  try {
    var site = encodeURIComponent(args.siteUrl);
    var sitemap = encodeURIComponent(args.sitemapUrl);
    var url = "https://www.googleapis.com/webmasters/v3/sites/" + site + "/sitemaps/" + sitemap;    

    var response = UrlFetchApp.fetch(url, {
      method: "put",
      headers: { Authorization: "Bearer " + ScriptApp.getOAuthToken() },
      muteHttpExceptions: true
    });

    if (response.getResponseCode() === 204 || response.getResponseCode() === 200) {
      return "Success: Sitemap submitted.";
    } else {
      return "Error submitting sitemap: " + response.getContentText();
    }
  } catch (e) {
    return "GSC Error: " + e.message;
  }
}

function runGscDeepDiver(context, imageData, sessionId) {
  if (typeof executeTeamWorkflow !== 'undefined') {
    return executeTeamWorkflow(
      "Search Console Deep Diver",
      "SEO_BUILDER",
      "SEO_VALIDATOR",
      context.goal,
      imageData,
      sessionId
    );
  }
  return "Error: Workflow Engine missing.";
}

initGscAdvancedPlugin();