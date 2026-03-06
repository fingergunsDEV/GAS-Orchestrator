/**
 * Tools_API_Ingest.gs
 * Universal API Ingestion and Data Cleaning Tool.
 * Fetches data from external endpoints, cleans it, and formats it securely for agent consumption.
 */

function executeApiIngest(args) {
  var url = args.url;
  var method = args.method ? args.method.toUpperCase() : "GET";
  var headers = {};
  
  if (args.headers) {
    try {
      headers = JSON.parse(args.headers);
    } catch (e) {
      return JSON.stringify({ success: false, error: "Invalid headers JSON format." });
    }
  }

  var payload = args.payload ? args.payload : null;
  var extractKey = args.extractKey;
  
  var options = {
    method: method,
    headers: headers,
    muteHttpExceptions: true
  };
  
  if (payload && (method === "POST" || method === "PUT" || method === "PATCH")) {
    options.payload = payload;
    if (!options.headers["Content-Type"]) {
      options.headers["Content-Type"] = "application/json";
    }
  }
  
  try {
    var response = UrlFetchApp.fetch(url, options);
    var responseCode = response.getResponseCode();
    var responseText = response.getContentText();
    
    var data;
    try {
      data = JSON.parse(responseText);
    } catch (e) {
      // If it's not JSON, return a truncated text response
      var rawSnippet = responseText.substring(0, 1000);
      if (responseText.length > 1000) rawSnippet += "... [TRUNCATED]";
      
      return JSON.stringify({
        success: responseCode >= 200 && responseCode < 300,
        code: responseCode,
        message: "Response was not JSON.",
        rawData: rawSnippet
      });
    }
    
    // Optional targeted extraction via dot notation
    if (extractKey) {
      var keys = extractKey.split('.');
      var current = data;
      for (var i = 0; i < keys.length; i++) {
        if (current && typeof current === 'object' && keys[i] in current) {
          current = current[keys[i]];
        } else {
          current = null;
          break;
        }
      }
      if (current !== null) {
        data = current;
      }
    }
    
    // Clean and minify JSON to protect context window limits (max 5000 chars)
    var cleanedString = JSON.stringify(data);
    var wasTruncated = false;
    
    if (cleanedString.length > 5000) {
        cleanedString = cleanedString.substring(0, 5000) + "... [TRUNCATED FOR AGENTIC CONTEXT LIMITS]";
        wasTruncated = true;
    }
    
    return JSON.stringify({
      success: responseCode >= 200 && responseCode < 300,
      code: responseCode,
      wasTruncated: wasTruncated,
      data: cleanedString
    });

  } catch (err) {
    return JSON.stringify({
      success: false,
      error: "Request Failed: " + err.toString()
    });
  }
}

function registerApiIngestTools() {
  if (typeof CoreRegistry === 'undefined') return;

  var tools = [
    {
      name: "api_ingest_clean",
      description: "Fetches data from an external API, parses the response, optionally extracts a specific JSON path, and formats it as a clean, token-efficient JSON string for agent consumption.",
      parameters: {
        type: "object",
        properties: {
          url: { type: "string", description: "The full URL of the API endpoint." },
          method: { type: "string", description: "HTTP method (GET, POST, PUT, DELETE). Default is GET." },
          headers: { type: "string", description: "JSON string of headers (e.g., '{\"Authorization\": \"Bearer token\"}')." },
          payload: { type: "string", description: "Stringified payload for POST/PUT requests." },
          extractKey: { type: "string", description: "Optional dot-notation path to extract a specific part of the JSON response (e.g., 'data.results')." }
        },
        required: ["url"]
      }
    }
  ];

  var implementations = {
    "api_ingest_clean": executeApiIngest
  };

  var scopes = {
    "ORCHESTRATOR": ["api_ingest_clean"],
    "DEV_BUILDER": ["api_ingest_clean"],
    "CODE_BUILDER": ["api_ingest_clean"],
    "PERFORMANCE_INSIGHTS": ["api_ingest_clean"]
  };

  var team = {
    name: "API Ingest",
    description: "Universal API Ingestion and Data Formatting System."
  };

  CoreRegistry.register("ApiIngest", tools, implementations, scopes, team);
}