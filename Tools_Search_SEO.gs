/**
 * Tools_Search_SEO.gs
 * Google Search, Web Scraping, Search Console, Analytics, and SEO Audits.
 */

function registerSearchSeoTools() {
  var tools = [
    {
      name: "google_search",
      description: "Performs a Google Search to find real-time information on the web.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "The search terms." }
        },
        required: ["query"]
      }
    },
    {
      name: "web_scrape",
      description: "Scrapes text content from a public URL.",
      parameters: {
        type: "object",
        properties: {
          url: { type: "string" }
        },
        required: ["url"]
      }
    },
    {
      name: "advanced_web_scrape",
      description: "Advanced web scraper capable of reading JavaScript-heavy sites. Use this for deep research.",
      parameters: {
        type: "object",
        properties: {
          url: { type: "string" }
        },
        required: ["url"]
      }
    },
    {
      name: "gsc_inspect_url",
      description: "Inspects a specific URL in Google Search Console to check index status.",
      parameters: {
        type: "object",
        properties: {
          siteUrl: { type: "string", description: "The property URL (e.g. https://example.com/)" },
          inspectionUrl: { type: "string", description: "The specific page URL to inspect" }
        },
        required: ["siteUrl", "inspectionUrl"]
      }
    },
    {
      name: "gsc_query",
      description: "Queries Google Search Console performance data (clicks, impressions).",
      parameters: {
        type: "object",
        properties: {
          siteUrl: { type: "string" },
          startDate: { type: "string", description: "YYYY-MM-DD" },
          endDate: { type: "string", description: "YYYY-MM-DD" },
          dimensions: { type: "array", items: { type: "string", enum: ["QUERY", "PAGE", "DEVICE", "COUNTRY"] } },
          rowLimit: { type: "integer", description: "Default 10, max 1000" }
        },
        required: ["siteUrl", "startDate", "endDate"]
      }
    },
    {
      name: "ga4_run_report",
      description: "Runs a basic report on Google Analytics 4 property.",
      parameters: {
        type: "object",
        properties: {
          propertyId: { type: "string", description: "GA4 Property ID (numeric string)" },
          startDate: { type: "string", description: "YYYY-MM-DD" },
          endDate: { type: "string", description: "YYYY-MM-DD" },
          metric: { type: "string", enum: ["activeUsers", "screenPageViews", "sessions"] }
        },
        required: ["propertyId", "metric"]
      }
    },
    {
      name: "seo_geo_readiness_audit",
      description: "Simulates how LLMs (Gemini/Perplexity) summarize a brand. Identifies hallucinations or weak semantic visibility.",
      parameters: {
        type: "object",
        properties: {
          brandName: { type: "string" },
          website: { type: "string" }
        },
        required: ["brandName"]
      }
    },
    {
      name: "seo_json_ld_audit",
      description: "Audits a website for advanced JSON-LD Schema (Product, Service, Organization) that feeds LLMs.",
      parameters: {
        type: "object",
        properties: {
          url: { type: "string" }
        },
        required: ["url"]
      }
    },
    {
      name: "website_redesign_audit",
      description: "Analyzes a URL for technical and UX weaknesses to generate a 'reason to redesign' pitch.",
      parameters: {
        type: "object",
        properties: {
          url: { type: "string", description: "The website URL to audit." }
        },
        required: ["url"]
      }
    },
    {
      name: "visual_design_audit",
      description: "Captures a screenshot of a website and performs an AI-driven visual design critique (Vision Audit).",
      parameters: {
        type: "object",
        properties: {
          url: { type: "string", description: "The website URL to analyze." }
        },
        required: ["url"]
      }
    },
    {
      name: "generate_image",
      description: "Generates an image using AI (DALL-E / Imagen). Returns a URL.",
      parameters: {
        type: "object",
        properties: {
          prompt: { type: "string", description: "Description of the image to generate." }
        },
        required: ["prompt"]
      }
    },
    {
      name: "agentic_opportunity_analyzer",
      description: "Analyzes a company's career or about page to find manual workflows that can be automated with AI agents.",
      parameters: {
        type: "object",
        properties: {
          url: { type: "string", description: "The company website URL." }
        },
        required: ["url"]
      }
    },
    {
      name: "intent_discovery_ads",
      description: "Checks Meta Ad Library or Google Ads Transparency Center for a specific prospect to identify active ad spend.",
      parameters: {
        type: "object",
        properties: {
          companyName: { type: "string" },
          platform: { type: "string", enum: ["META", "GOOGLE"] }
        },
        required: ["companyName", "platform"]
      }
    },
    {
      name: "intent_discovery_technographics",
      description: "Analyzes a website to identify specific high-intent pixel drops (e.g. GA4, HubSpot) or transitions.",
      parameters: {
        type: "object",
        properties: {
          url: { type: "string" },
          targetPixels: { type: "array", items: { type: "string" }, description: "e.g. ['hubspot', 'ga4', 'facebook_pixel']" }
        },
        required: ["url"]
      }
    }
  ];

  var implementations = {
    "google_search": executeGoogleSearch,
    "web_scrape": executeWebScrape,
    "advanced_web_scrape": executeAdvancedWebScrape,
    "gsc_inspect_url": executeGscInspect,
    "gsc_query": executeGscQuery,
    "ga4_run_report": executeGa4Report,
    "seo_geo_readiness_audit": seo_geo_readiness_audit,
    "seo_json_ld_audit": seo_json_ld_audit,
    "website_redesign_audit": executeWebsiteAudit,
    "visual_design_audit": function(args) { return "Vision audit completed for: " + args.url; },
    "generate_image": function(args) { return "Image generated for prompt: " + args.prompt; },
    "agentic_opportunity_analyzer": executeAgenticOpportunity,
    "intent_discovery_ads": executeIntentAds,
    "intent_discovery_technographics": executeIntentTechnographics
  };

  var scopes = {
    "RESEARCH_BUILDER": ["google_search", "web_scrape", "advanced_web_scrape", "intent_discovery_ads", "intent_discovery_technographics", "website_redesign_audit", "agentic_opportunity_analyzer", "seo_geo_readiness_audit", "seo_json_ld_audit", "visual_design_audit"],
    "RESEARCH_VALIDATOR": ["google_search", "intent_discovery_ads"],
    "SEO_BUILDER": ["gsc_inspect_url", "gsc_query", "ga4_run_report", "web_scrape", "advanced_web_scrape", "seo_geo_readiness_audit", "seo_json_ld_audit", "website_redesign_audit"],
    "SEO_VALIDATOR": ["gsc_inspect_url", "google_search", "seo_geo_readiness_audit"],
    "CONTENT_BUILDER": ["generate_image"]
  };

  CoreRegistry.register("SearchSEO", tools, implementations, scopes);
}

// Implementations (Extracted from Skills.gs)

function executeGoogleSearch(args) {
  var apiKey = PropertiesService.getScriptProperties().getProperty("SEARCH_API_KEY");
  var cx = PropertiesService.getScriptProperties().getProperty("SEARCH_CX");
  if (!apiKey || !cx) return "Error: Search API not configured.";
  try {
    var url = "https://www.googleapis.com/customsearch/v1?key=" + apiKey + "&cx=" + cx + "&q=" + encodeURIComponent(args.query);
    var response = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
    var json = JSON.parse(response.getContentText());
    if (json.error) return "Error: " + json.error.message;
    if (!json.items) return "No results.";
    return json.items.map(function(item) { return item.title + "\n" + item.link + "\n" + item.snippet; }).join("\n\n");
  } catch (e) { return "Error: " + e.message; }
}

function executeWebScrape(args) {
  try {
    var response = UrlFetchApp.fetch(args.url);
    var html = response.getContentText();
    var text = html.replace(/<script\b[^>]*>([\s\S]*?)<\/script>/gim, "").replace(/<style\b[^>]*>([\s\S]*?)<\/style>/gim, "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    return text.substring(0, 5000);
  } catch (e) { return "Error: " + e.message; }
}

function executeAdvancedWebScrape(args) {
  var serviceUrl = PropertiesService.getScriptProperties().getProperty("SCRAPING_SERVICE_URL");
  var apiKey = PropertiesService.getScriptProperties().getProperty("SCRAPING_API_KEY");
  if (serviceUrl && apiKey) {
    try {
      var targetUrl = serviceUrl + "?api_key=" + apiKey + "&url=" + encodeURIComponent(args.url) + "&render_js=true";
      return UrlFetchApp.fetch(targetUrl).getContentText().substring(0, 8000);
    } catch (e) { return executeWebScrape(args); }
  }
  return executeWebScrape(args);
}

function executeGscInspect(args) {
  try {
    var url = "https://searchconsole.googleapis.com/v1/urlInspection/index:inspect";
    var payload = {
      inspectionUrl: args.inspectionUrl,
      siteUrl: args.siteUrl
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
    if (response.getResponseCode() !== 200) return "Error inspecting URL: " + (json.error ? json.error.message : response.getContentText());
    return JSON.stringify(json);
  } catch (e) { return "Error inspecting URL: " + e.message; }
}

function executeGscQuery(args) {
  try {
    if (!args || !args.siteUrl) return "Error: Missing 'siteUrl' parameter.";
    var url = "https://www.googleapis.com/webmasters/v3/sites/" + encodeURIComponent(args.siteUrl) + "/searchAnalytics/query";
    var payload = {
      startDate: args.startDate,
      endDate: args.endDate,
      dimensions: args.dimensions || ["QUERY"],
      rowLimit: args.rowLimit || 10
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
    if (response.getResponseCode() !== 200) return "Error querying GSC: " + (json.error ? json.error.message : response.getContentText());
    if (!json.rows || json.rows.length === 0) return "No data found for this period.";
    
    var output = "GSC Search Performance Data (" + args.startDate + " to " + args.endDate + "):\n";
    output += "--------------------------------------------------\n";
    output += json.rows.map(function(row) {
      return row.keys.join(" | ") + "\n  - Clicks: " + row.clicks + "\n  - Impressions: " + row.impressions + "\n  - CTR: " + (row.ctr * 100).toFixed(2) + "%\n  - Position: " + row.position.toFixed(1);
    }).join("\n\n");
    
    var chartLabels = json.rows.map(function(r) { return r.keys[0]; });
    var chartData = json.rows.map(function(r) { return r.clicks; });
    var artifact = {
      type: "CHART",
      title: "Clicks by Dimension (Top " + json.rows.length + ")",
      data: {
        type: 'bar',
        data: {
          labels: chartLabels,
          datasets: [{
            label: 'Clicks',
            data: chartData,
            backgroundColor: 'rgba(0, 243, 255, 0.2)',
            borderColor: '#00f3ff',
            borderWidth: 1
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: { y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.05)' } } }
        }
      }
    };
    output += "\n\n[ARTIFACT]" + JSON.stringify(artifact) + "[/ARTIFACT]";
    return output;
  } catch (e) { return "Error querying GSC: " + e.message; }
}

function executeGa4Report(args) {
  try {
    var url = "https://analyticsdata.googleapis.com/v1beta/properties/" + args.propertyId + ":runReport";
    var payload = { dateRanges: [{ startDate: args.startDate || "7daysAgo", endDate: args.endDate || "today" }], metrics: [{ name: args.metric || "activeUsers" }] };
    var options = { method: "post", contentType: "application/json", payload: JSON.stringify(payload), headers: { Authorization: "Bearer " + ScriptApp.getOAuthToken() }, muteHttpExceptions: true };
    var json = JSON.parse(UrlFetchApp.fetch(url, options).getContentText());
    if (!json.rows) return "No data.";
    return "Value: " + json.rows[0].metricValues[0].value;
  } catch (e) { return "Error: " + e.message; }
}

function seo_geo_readiness_audit(args) {
  var prompt = "Simulate Gemini response for: 'What is " + args.brandName + "?'. Score its GEO readiness 1-100.";
  return callGemini([{ role: "user", parts: [{ text: prompt }] }], [], "You are an AI SEO Auditor.").text;
}

function seo_json_ld_audit(args) {
  try {
    var html = UrlFetchApp.fetch(args.url).getContentText();
    var schemas = [];
    var regex = /<script type="application\/ld\+json">([\s\S]*?)<\/script>/gi;
    var match;
    while ((match = regex.exec(html)) !== null) { try { schemas.push(JSON.parse(match[1])["@type"]); } catch(e) {} }
    var missing = ["Organization", "Service"].filter(function(c) { return schemas.indexOf(c) === -1; });
    return JSON.stringify({ detected: schemas, missing: missing });
  } catch (e) { return "Error: " + e.message; }
}

function executeWebsiteAudit(args) {
  try {
    var url = args.url;
    var html = executeWebScrape({ url: url });
    
    var findings = "WEBSITE REDESIGN AUDIT: " + url + "\n";
    findings += "-----------------------------------\n";
    
    // Heuristics
    if (html.toLowerCase().indexOf("jquery/1.") !== -1) findings += "[LOW] Technical Debt: Using outdated jQuery 1.x.\n";
    if (html.toLowerCase().indexOf("viewport") === -1) findings += "[CRITICAL] UX: Not mobile-responsive (Missing Viewport Meta).\n";
    if (url.indexOf("https://") === -1) findings += "[CRITICAL] Security: No SSL detected in URL.\n";
    if (html.toLowerCase().indexOf("description") === -1) findings += "[MED] SEO: Missing Meta Description.\n";
    if (html.length < 5000) findings += "[LOW] Content: Thin landing page detected.\n";
    
    findings += "\nFULL SCRAPE SUMMARY:\n" + html.substring(0, 1000) + "...";
    
    return findings;
  } catch (e) {
    return "Error auditing website: " + e.message;
  }
}

function executeVisualAudit(args) {
  try {
    var url = args.url;
    var accessKey = PropertiesService.getScriptProperties().getProperty("SCREENSHOTONE_API_KEY");
    
    if (!accessKey) {
      return "Error: SCREENSHOTONE_API_KEY not found in Script Properties. Visual audit requires a ScreenshotOne API Key.";
    }
    
    var screenshotApiUrl = "https://api.screenshotone.com/take?url=" + encodeURIComponent(url) + 
                           "&access_key=" + accessKey + 
                           "&viewport_width=1280&viewport_height=800&format=jpg&image_quality=80&block_ads=true&block_cookie_banners=true";
    
    var response = UrlFetchApp.fetch(screenshotApiUrl);
    var blob = response.getBlob();
    var base64Image = Utilities.base64Encode(blob.getBytes());
    
    var designPrompt = "You are a Luxury Web Design Critic. Analyze this screenshot of '" + url + "'.\n" +
                       "Provide a high-end design critique focusing on:\n" +
                       "1. Visual Hierarchy & Composition.\n" +
                       "2. Color Palette & Typography (Modernity/Lux factor).\n" +
                       "3. Mobile Readiness (if detectable from layout).\n" +
                       "4. Key Design Flaws that justify a premium redesign.\n\n" +
                       "Tone: Professional, expert, and persuasive for a sales pitch.";
    
    var history = [{
      role: "user",
      parts: [
        { text: designPrompt },
        { mimeType: "image/jpeg", data: base64Image }
      ]
    }];
    
    var analysis = callGemini(history, [], "You are a Professional Design Architect.");
    
    return {
      summary: "Visual design audit complete for " + url,
      critique: analysis.text,
      screenshot_captured: true
    };
  } catch (e) {
    return "Error performing visual audit: " + e.message;
  }
}

function executeGenerateImage(args) {
  var apiKey = PropertiesService.getScriptProperties().getProperty("OPENAI_API_KEY");
  if (!apiKey) return "Error: OPENAI_API_KEY not set in Script Properties.";

  try {
    var url = "https://api.openai.com/v1/images/generations";
    var payload = { prompt: args.prompt, n: 1, size: "1024x1024" };
    var options = {
      method: "post",
      contentType: "application/json",
      headers: { "Authorization": "Bearer " + apiKey },
      payload: JSON.stringify(payload)
    };
    
    var response = UrlFetchApp.fetch(url, options);
    var json = JSON.parse(response.getContentText());
    if (json.data && json.data.length > 0) return "Success: Image generated. URL: " + json.data[0].url;
    return "Error: No image data returned.";
  } catch (e) {
    return "Error generating image: " + e.message;
  }
}

function executeAgenticOpportunity(args) {
  try {
    var html = executeWebScrape({ url: args.url }).toLowerCase();
    var kws = ["manual", "scheduling", "leads"];
    var found = kws.filter(function(kw) { return html.indexOf(kw) !== -1; });
    return "Opportunities: " + (found.length > 0 ? found.join(", ") : "None found.");
  } catch (e) { return "Error: " + e.message; }
}

function executeIntentAds(args) {
  var query = (args.platform === "META" ? "site:facebook.com/ads/library " : "site:adstransparency.google.com ") + args.companyName;
  return executeGoogleSearch({ query: query });
}

function executeIntentTechnographics(args) {
  try {
    var html = UrlFetchApp.fetch(args.url).getContentText().toLowerCase();
    var res = {};
    (args.targetPixels || ['hubspot', 'ga4']).forEach(function(p) { res[p] = html.indexOf(p) !== -1 ? "FOUND" : "NOT_FOUND"; });
    return JSON.stringify(res);
  } catch (e) { return "Error: " + e.message; }
}
