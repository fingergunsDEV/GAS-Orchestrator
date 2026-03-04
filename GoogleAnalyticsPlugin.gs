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
        description: "Runs a complex GA4 report with multiple dimensions and metrics. Supports comparisons via custom date ranges.",
        parameters: {
          type: "object",
          properties: {
            propertyId: { type: "string", description: "Optional. Uses default if omitted." },
            startDate: { type: "string", description: "e.g. '7daysAgo', '2023-01-01'" },
            endDate: { type: "string", description: "e.g. 'today', '2023-01-07'" },
            dimensions: { type: "array", items: { type: "string" }, description: "e.g. ['city', 'browser']" },
            metrics: { type: "array", items: { type: "string" }, description: "e.g. ['activeUsers', 'sessions']" }
          },
          required: []
        }
      },
      {
        name: "ga4_realtime_check",
        description: "Checks realtime active users on the site right now.",
        parameters: {
          type: "object",
          properties: {
            propertyId: { type: "string", description: "Optional. Uses default if omitted." }
          },
          required: []
        }
      },
      {
        name: "ga4_get_all_properties",
        description: "Lists all Google Analytics properties and their IDs.",
        parameters: { type: "object", properties: {}, required: [] }
      }
    ],
    scopes: {
      "ANALYTICS_BUILDER": ["ga4_advanced_report", "ga4_realtime_check", "ga4_get_all_properties", "drive_create_doc"],
      "ANALYTICS_VALIDATOR": ["ga4_advanced_report", "doc_summarize"],
      "DATA_BUILDER": ["ga4_advanced_report", "ga4_realtime_check", "ga4_get_all_properties"],
      "SEO_BUILDER": ["ga4_advanced_report", "ga4_get_all_properties"],
      "CONTENT_BUILDER": ["ga4_advanced_report"],
      "CONTENT_VALIDATOR": ["ga4_advanced_report"],
      "COMMS_BUILDER": ["ga4_advanced_report"],
      "COMMS_VALIDATOR": ["ga4_advanced_report"]
    },
    team: {
      name: "Analytics Scout",
      description: "Specialized in mining GA4 for user behavior trends, traffic comparisons, and anomalies.",
      handlerName: "runAnalyticsScout"
    }
  }, {
    "ga4_advanced_report": executeGa4Advanced,
    "ga4_realtime_check": executeGa4Realtime,
    "ga4_get_all_properties": executeGa4ListProperties,
    "runAnalyticsScout": runAnalyticsScout
  });
}

/**
 * Tool: List all GA4 Properties
 */
function executeGa4ListProperties() {
  try {
    var url = "https://analyticsadmin.googleapis.com/v1alpha/accountSummaries";
    var options = {
      headers: { Authorization: "Bearer " + ScriptApp.getOAuthToken() },
      muteHttpExceptions: true
    };
    var response = UrlFetchApp.fetch(url, options);
    var json = JSON.parse(response.getContentText());
    
    if (response.getResponseCode() !== 200) return "Error listing properties: " + response.getContentText();
    
    var output = "### 📊 GOOGLE_ANALYTICS_PROPERTIES\n";
    var summaries = json.accountSummaries || [];
    summaries.forEach(function(acc) {
      output += "\n**Account: " + acc.displayName + "**\n";
      if (acc.propertySummaries) {
        acc.propertySummaries.forEach(function(prop) {
          var id = prop.property.split("/")[1];
          output += "- " + prop.displayName + " (`" + id + "`)\n";
        });
      }
    });
    return output;
  } catch (e) {
    return "Error: " + e.message;
  }
}

/**
 * UI Support: Fetches Geo-Pulse Data for the Map View
 */
function getGeoPulseData(propertyId, dateRange) {
  console.log("[getGeoPulseData] Starting fetch... Range: " + dateRange);
  if (!propertyId) {
    propertyId = PropertiesService.getScriptProperties().getProperty("GA4_PROPERTY_ID");
  }
  
  if (!propertyId) {
    console.error("[getGeoPulseData] Missing GA4_PROPERTY_ID");
    return { error: "No GA4_PROPERTY_ID configured." };
  }

  // Map incoming range to GA4 format
  var rangeMap = { '24h': 'yesterday', '7d': '7daysAgo', '28d': '28daysAgo', '3m': '90daysAgo' };
  var ga4StartDate = rangeMap[dateRange] || '7daysAgo';

  try {
    var options = {
      method: "post",
      contentType: "application/json",
      headers: { Authorization: "Bearer " + ScriptApp.getOAuthToken() },
      muteHttpExceptions: true
    };

    // 1. REALTIME DATA (Locations + Pages)
    // ... (Keep existing realtime logic)
    console.log("[getGeoPulseData] Fetching Realtime data for: " + propertyId);
    var rtUrl = "https://analyticsdata.googleapis.com/v1beta/properties/" + propertyId + ":runRealtimeReport";
    var rtPayload = {
      metrics: [{ name: "activeUsers" }],
      dimensions: [
        { name: "city" }, 
        { name: "country" },
        { name: "unifiedScreenName" }
      ]
    };
    
    options.payload = JSON.stringify(rtPayload);
    var rtResponse = UrlFetchApp.fetch(rtUrl, options);
    var rtCode = rtResponse.getResponseCode();
    var rtJson = JSON.parse(rtResponse.getContentText());
    
    if (rtCode !== 200) {
      console.error("[getGeoPulseData] Realtime Error: " + rtResponse.getContentText());
      return { error: "Realtime API Error (HTTP " + rtCode + "): " + (rtJson.error ? rtJson.error.message : rtResponse.getContentText()) };
    }

    var realtime = [];
    if (rtJson.rows) {
      realtime = rtJson.rows.map(function(row) {
        var city = row.dimensionValues[0].value;
        var country = row.dimensionValues[1].value;
        var coords = GeocodingService_getCoordinates(city, country);

        return {
          city: city,
          country: country,
          pageTitle: row.dimensionValues[2].value, // unifiedScreenName
          pagePath: "",
          users: parseInt(row.metricValues[0].value),
          lat: coords ? coords.lat : "0",
          lng: coords ? coords.lng : "0"
        };
      });
    }
    console.log("[getGeoPulseData] Realtime Success: " + realtime.length + " rows.");

    // 2. HISTORICAL DATA (Dynamic Range - Pages & Duration)
    console.log("[getGeoPulseData] Fetching Historical data for: " + propertyId + " | Start: " + ga4StartDate);
    var histUrl = "https://analyticsdata.googleapis.com/v1beta/properties/" + propertyId + ":runReport";
    var histPayload = {
      dateRanges: [{ startDate: ga4StartDate, endDate: "today" }],
      dimensions: [
        { name: "pagePath" },
        { name: "pageTitle" },
        { name: "city" },
        { name: "country" }
      ],
      metrics: [
        { name: "sessions" },
        { name: "averageSessionDuration" },
        { name: "activeUsers" },
        { name: "engagementRate" },
        { name: "screenPageViews" }
      ]
    };

    options.payload = JSON.stringify(histPayload);
    var histResponse = UrlFetchApp.fetch(histUrl, options);
    var histCode = histResponse.getResponseCode();
    var histJson = JSON.parse(histResponse.getContentText());

    if (histCode !== 200) {
      console.error("[getGeoPulseData] Historical Error: " + histResponse.getContentText());
      return { error: "7D Historical API Error (HTTP " + histCode + "): " + (histJson.error ? histJson.error.message : histResponse.getContentText()) };
    }

    var historical = [];
    var totalDuration = 0;
    var totalUsers = 0;
    var totalEngagement = 0;
    var totalViews = 0;
    var rowCount = 0;

    if (histJson.rows) {
      historical = histJson.rows.map(function(row) {
        var sessions = parseInt(row.metricValues[0].value);
        var duration = parseFloat(row.metricValues[1].value);
        var users = parseInt(row.metricValues[2].value);
        var engRate = parseFloat(row.metricValues[3].value);
        var views = parseInt(row.metricValues[4].value);

        totalDuration += duration;
        totalUsers += users;
        totalEngagement += engRate;
        totalViews += views;
        rowCount++;

        var city = row.dimensionValues[2].value;
        var country = row.dimensionValues[3].value;
        var coords = GeocodingService_getCoordinates(city, country);

        return {
          pagePath: row.dimensionValues[0].value,
          pageTitle: row.dimensionValues[1].value,
          city: city,
          country: country,
          lat: coords ? coords.lat : "0",
          lng: coords ? coords.lng : "0",
          sessions: sessions,
          duration: duration,
          users: users,
          engagementRate: engRate,
          views: views
        };
      });
    }
    console.log("[getGeoPulseData] Historical Success: " + historical.length + " rows.");

    var avgDuration = rowCount > 0 ? (totalDuration / rowCount) : 0;
    var minutes = Math.floor(avgDuration / 60);
    var seconds = Math.floor(avgDuration % 60);
    var formattedDuration = minutes + "m " + seconds + "s";
    
    var avgEngRate = rowCount > 0 ? (totalEngagement / rowCount * 100).toFixed(1) + "%" : "0%";

    // 2.5 DAILY VOLUME (For Line Charts)
    var volume = [];
    try {
      var volPayload = {
        dateRanges: [{ startDate: ga4StartDate, endDate: "today" }],
        dimensions: [{ name: "date" }],
        metrics: [
          { name: "sessions" },
          { name: "engagementRate" }
        ]
      };
      options.payload = JSON.stringify(volPayload);
      var volResponse = UrlFetchApp.fetch(histUrl, options);
      var volJson = JSON.parse(volResponse.getContentText());
      if (volJson.rows) {
        volume = volJson.rows.map(function(row) {
          return { 
            date: row.dimensionValues[0].value, 
            sessions: parseInt(row.metricValues[0].value),
            engagement: parseFloat(row.metricValues[1].value)
          };
        });
        // Sort by date string YYYYMMDD
        volume.sort(function(a, b) { return a.date.localeCompare(b.date); });
      }
    } catch(ve) { console.error("Volume fetch failed: " + ve.message); }

    // 3. GSC TRENDS (Impressions & Clicks per URL)
    var trends = [];
    var gscStatus = "CHECK_SETTINGS";
    var props = PropertiesService.getScriptProperties();
    var gscSite = props.getProperty("GSC_SITE_URL");
    console.log("[getGeoPulseData] GSC_SITE_URL from props: " + gscSite);
    
    // Fuzzy Matching / Auto-discovery
    try {
      var verifiedSites = executeGscListSitesInternal();
      if (verifiedSites && verifiedSites.length > 0) {
        var siteUrls = verifiedSites.map(function(s) { return s.siteUrl; });
        
        if (!gscSite) {
          gscSite = siteUrls[0];
          props.setProperty("GSC_SITE_URL", gscSite);
        } else {
          var cleanSite = gscSite.replace(/^https?:\/\//, "").replace(/\/$/, "").toLowerCase();
          var foundMatch = null;
          
          // Prioritize sc-domain matching
          for (var i = 0; i < siteUrls.length; i++) {
            var vSite = siteUrls[i];
            if (vSite.indexOf("sc-domain:" + cleanSite) !== -1) {
              foundMatch = vSite;
              break;
            }
          }
          
          // Fallback to contains matching
          if (!foundMatch) {
            for (var i = 0; i < siteUrls.length; i++) {
              var vSite = siteUrls[i];
              var vClean = vSite.replace(/^https?:\/\//, "").replace(/\/$/, "").toLowerCase();
              if (vSite === gscSite || vClean === cleanSite || vSite.indexOf(cleanSite) !== -1) {
                foundMatch = vSite;
                break;
              }
            }
          }
          
          if (foundMatch) {
            if (foundMatch !== gscSite) {
              console.log("[getGeoPulseData] Auto-correcting GSC Site to: " + foundMatch);
              gscSite = foundMatch;
              props.setProperty("GSC_SITE_URL", foundMatch);
            }
          }
        }
      }
    } catch (ae) { console.error("GSC Site Matching failed: " + ae.message); }

    if (gscSite) {
      try {
        var gscResult = executeGscPagePerformance({ siteUrl: gscSite, limit: 10, dateRange: dateRange });
        if (Array.isArray(gscResult)) {
          trends = gscResult;
          gscStatus = "OK";
        } else {
          gscStatus = gscResult; // This will now be a truncated error string
        }
      } catch (ge) {
        gscStatus = "Fetch Failed";
      }
    }

    return {
      propertyId: propertyId,
      gscSite: gscSite || "NOT_CONFIGURED",
      gscStatus: gscStatus,
      realtime: realtime,
      historical: historical,
      trends: trends,
      volume: volume,
      totalRealtime: realtime.reduce(function(sum, r){ return sum + r.users; }, 0),
      avgSessionDuration: formattedDuration,
      total7DUsers: totalUsers,
      avgEngagementRate: avgEngRate,
      total7DViews: totalViews,
      timestamp: new Date().getTime()
    };

  } catch (e) {
    console.error("[getGeoPulseData] Fatal Error: " + e.message);
    return { error: e.message };
  }
}

/**
 * Tool: Advanced GA4 Report
 */
function executeGa4Advanced(args) {
  try {
    var dim = args.dimensions ? args.dimensions.map(function(d){ return { name: d }; }) : [{ name: "date" }];
    var met = args.metrics ? args.metrics.map(function(m){ return { name: m }; }) : [{ name: "activeUsers" }];
    
    // Parse date range (Unified logic)
    var startDate = args.startDate || "30daysAgo";
    var endDate = args.endDate || "today";
    
    var propertyId = args.propertyId || PropertiesService.getScriptProperties().getProperty("GA4_PROPERTY_ID");
    if (!propertyId) return "Error: No GA4 Property ID provided or configured.";

    var url = "https://analyticsdata.googleapis.com/v1beta/properties/" + propertyId + ":runReport";
    var payload = {
      dateRanges: [{ startDate: startDate, endDate: endDate }],
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
    
    if (!json.rows || json.rows.length === 0) return "No data returned for period " + startDate + " to " + endDate;
    
    // Format output
    var output = "GA4 DATA (" + startDate + " to " + endDate + "):\n";
    output += json.rows.map(function(row) {
      var dVals = row.dimensionValues.map(function(v){ return v.value; }).join(" | ");
      var mVals = row.metricValues.map(function(v){ return v.value; }).join(", ");
      return dVals + ": " + mVals;
    }).slice(0, 20).join("\n");
    
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
    var propertyId = args.propertyId || PropertiesService.getScriptProperties().getProperty("GA4_PROPERTY_ID");
    if (!propertyId) return "Error: No GA4 Property ID provided or configured.";

    var url = "https://analyticsdata.googleapis.com/v1beta/properties/" + propertyId + ":runRealtimeReport";
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
  if (typeof executeTeamWorkflow !== 'undefined') {
    return executeTeamWorkflow(
      "Analytics Scout",
      "ANALYTICS_BUILDER",
      "ANALYTICS_VALIDATOR",
      "Perform a deep technical audit of GA4 and GSC for: " + context.goal + ".\n\n" +
      "CRITICAL CONSTRAINTS:\n" +
      "1. COORDINDATION: First, check CAMPAIGN_KNOWLEDGE_BASE_DATA for any previously discovered Property IDs or Site URLs.\n" +
      "2. DISCOVERY: If IDs are missing, you MUST call 'ga4_get_all_properties' (for GA4) and 'run_seo_diagnostics' (for GSC) to find properties matching the target website.\n" +
      "3. VALIDATION: Before running reports, confirm the Property ID is correct. If no matching property is found, report this clearly and suggest the user verify their GSC/GA4 permissions.\n" +
      "4. COMPARISON: Always compare current data to the previous 30-day period to identify trends.\n" +
      "5. NO PLACEHOLDERS: Summarize based on actual content. If data is missing, report the specific metric that is null.",
      imageData,
      sessionId
    );
  }
  return "Error: Team Workflow Engine not found.";
}

initGoogleAnalyticsPlugin();
/**
 * GeocodingService.gs
 * Manages autonomous coordinate lookup and persistent memory for locations.
 */

function GeocodingService_getCoordinates(city, country) {
  var locationKey = (city + ", " + country).trim();
  if (locationKey === "(not set), (not set)" || locationKey === ", ") return null;

  // 1. Check Memory first
  var cached = GeocodingService_lookupFromMemory(locationKey);
  if (cached) {
    console.log("[Geocoding] Memory Hit: " + locationKey);
    return cached;
  }

  // 2. Not in memory, use Google Maps Geocoder
  console.log("[Geocoding] Memory Miss. Searching Google Maps: " + locationKey);
  try {
    var response = Maps.newGeocoder().geocode(locationKey);
    if (response.status === 'OK' && response.results.length > 0) {
      var result = response.results[0].geometry.location;
      var coords = {
        lat: result.lat,
        lng: result.lng
      };
      
      // 3. Store in Memory for future use
      GeocodingService_saveToMemory(locationKey, coords);
      return coords;
    }
  } catch (e) {
    console.error("[Geocoding] Error: " + e.message);
  }
  
  return null;
}

function GeocodingService_lookupFromMemory(locationKey) {
  try {
    var cache = PersistentState.get("GEO_COORDS_CACHE") || {};
    return cache[locationKey] || null;
  } catch (e) { return null; }
}

function GeocodingService_saveToMemory(locationKey, coords) {
  try {
    var cache = PersistentState.get("GEO_COORDS_CACHE") || {};
    cache[locationKey] = coords;
    
    // Limit cache size - Now safe to increase to 2,000+ due to Drive spillover
    var keys = Object.keys(cache);
    if (keys.length > 2000) {
      delete cache[keys[0]];
    }
    
    PersistentState.set("GEO_COORDS_CACHE", cache);
    
    // Optional: Ingest into Long-Term Memory if KnowledgeBase exists
    try {
      if (typeof KnowledgeBase !== 'undefined' && KnowledgeBase.ingestFact) {
        KnowledgeBase.ingestFact("Coordinates for " + locationKey + " are " + JSON.stringify(coords), "GEO_INTEL");
      }
    } catch(err) {}
    
  } catch (e) {
    console.error("[Geocoding] Save Error: " + e.message);
  }
}
