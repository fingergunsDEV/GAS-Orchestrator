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
      }
    ],
    scopes: {
      "SEO_BUILDER": ["gsc_list_sites", "gsc_get_sitemaps", "gsc_submit_sitemap"]
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
    "runGscDeepDiver": runGscDeepDiver
  });
}

function executeGscListSites() {
  try {
    var url = "https://www.googleapis.com/webmasters/v3/sites";
    var response = UrlFetchApp.fetch(url, {
      headers: { Authorization: "Bearer " + ScriptApp.getOAuthToken() },
      muteHttpExceptions: true
    });

    var json = JSON.parse(response.getContentText());
    if (!json.siteEntry) return "No verified sites found.";

    return json.siteEntry.map(function(s) {
      return "- " + s.siteUrl + " (" + s.permissionLevel + ")";
    }).join("\n");
  } catch (e) {
    return "GSC Error: " + e.message;
  }
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