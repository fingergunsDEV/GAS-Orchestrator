/**
 * GEMINISERVICE.gs
 */

// Define constants
var API_KEY_PROPERTY = "GEMINI_API_KEY";
var API_VERSION = "v1beta";

/**
 * Core function to call Gemini API with automatic model failover.
 */
function callGemini(history, toolsManifest, systemInstruction, responseMimeType, modelTier) {
  var scriptProperties = PropertiesService.getScriptProperties();
  var apiKey = scriptProperties.getProperty(API_KEY_PROPERTY);
  
  if (!apiKey || apiKey === "YOUR_GEMINI_API_KEY_HERE") {
    throw new Error("Gemini API Key is missing or invalid.");
  }
  apiKey = apiKey.trim();

  // 1. Get prioritized list of models for this tier
  var models = getPrioritizedModels(modelTier);
  var lastError = null;
  var triedModels = [];

  // 2. Iterate through models until one works
  for (var m = 0; m < models.length; m++) {
    var activeModel = models[m];
    triedModels.push(activeModel);
    try {
      return executeGeminiRequest(activeModel, history, toolsManifest, systemInstruction, responseMimeType, apiKey);
    } catch (e) {
      lastError = e.message;
      console.warn("Model " + activeModel + " failed: " + e.message + ". Trying fallback...");
      // If it's a 404 (Not Found) or 429 (Quota), try next model
      if (e.message.indexOf("404") !== -1 || e.message.indexOf("429") !== -1) {
        continue;
      }
      // For other errors, maybe stop? For now, we continue to maximize availability
      continue;
    }
  }

  return { error: "All available models failed. Tried: " + triedModels.join(", ") + ". Last error: " + lastError };
}

/**
 * Discovers and prioritizes models based on tier.
 * Caches results for performance.
 */
function getPrioritizedModels(tier) {
  var cache = CacheService.getScriptCache();
  var cacheKey = "DISCOVERED_MODELS_" + (tier || "flash");
  var cached = cache.get(cacheKey);
  if (cached) return JSON.parse(cached);

  var allModels = listModelsInternal();
  var prioritized = [];

  if (tier === 'pro') {
    prioritized = allModels.filter(function(m) { return (m.includes("pro") || m.includes("2.0-flash")) && !m.includes("vision"); });
    // Sort: 2.0 > 1.5, latest > stable
    prioritized.sort(function(a, b) {
      if (a.includes("2.0") && !b.includes("2.0")) return -1;
      if (!a.includes("2.0") && b.includes("2.0")) return 1;
      if (a.includes("latest") && !b.includes("latest")) return -1;
      if (a.includes("002") && !b.includes("002")) return -1;
      return 0;
    });
    // Add hardcoded fallbacks just in case discovery failed or is missing modern models
    var fallbacks = [
      "models/gemini-1.5-pro-002",
      "models/gemini-1.5-pro-latest",
      "models/gemini-1.5-pro",
      "models/gemini-2.0-flash-exp",
      "models/gemini-2.0-flash"
    ];
    fallbacks.forEach(function(f) {
      if (prioritized.indexOf(f) === -1) prioritized.push(f);
    });
  } else {
    prioritized = allModels.filter(function(m) { return m.includes("flash") && !m.includes("8b"); });
    // Sort: 2.0 > 1.5, latest > stable
    prioritized.sort(function(a, b) {
      if (a.includes("2.0") && !b.includes("2.0")) return -1;
      if (!a.includes("2.0") && b.includes("2.0")) return 1;
      if (a.includes("latest") && !b.includes("latest")) return -1;
      return 0;
    });
    // Add hardcoded fallbacks
    var fallbacks = [
      "models/gemini-2.0-flash",
      "models/gemini-1.5-flash-latest",
      "models/gemini-1.5-flash-002",
      "models/gemini-1.5-flash"
    ];
    fallbacks.forEach(function(f) {
      if (prioritized.indexOf(f) === -1) prioritized.push(f);
    });
  }

  // Final sanitization: ensure 'models/' prefix
  prioritized = prioritized.map(function(m) { return m.startsWith("models/") ? m : "models/" + m; });

  cache.put(cacheKey, JSON.stringify(prioritized), 3600); // Cache for 1 hour
  return prioritized;
}

/**
 * Internal model listing
 */
function listModelsInternal() {
  var scriptProperties = PropertiesService.getScriptProperties();
  var apiKey = scriptProperties.getProperty(API_KEY_PROPERTY);
  if (!apiKey) return [];
  
  var endpoint = "https://generativelanguage.googleapis.com/" + API_VERSION + "/models?key=" + apiKey;
  try {
    var response = UrlFetchApp.fetch(endpoint, {muteHttpExceptions: true});
    var json = JSON.parse(response.getContentText());
    if (json.models) {
      return json.models
        .filter(function(m) { return m.supportedGenerationMethods.indexOf("generateContent") !== -1; })
        .map(function(m) { return m.name; });
    }
  } catch (e) {
    console.error("ListModels failed: " + e.message);
  }
  return [];
}

/**
 * Execution logic separated for failover retry
 */
function executeGeminiRequest(activeModel, history, toolsManifest, systemInstruction, responseMimeType, apiKey) {
  var manifest = toolsManifest || [];
  var scriptProperties = PropertiesService.getScriptProperties();
  var userTone = scriptProperties.getProperty("USER_PREFERENCE_TONE") || "professional and concise";
  var customInstruction = scriptProperties.getProperty("SYSTEM_INSTRUCTION");

  // Remove 'models/' prefix if present for endpoint construction if needed, 
  // but the API usually expects the full name or just the ID. 
  // The current code uses it in the URL path.
  var modelId = activeModel.replace("models/", "");
  var endpoint = "https://generativelanguage.googleapis.com/" + API_VERSION + "/models/" + modelId + ":generateContent?key=" + apiKey;

  var baseContext = "CORE CONTEXT:\n" +
    "- User Identity: " + Session.getActiveUser().getEmail() + "\n" +
    "- Current Time: " + new Date().toLocaleString() + "\n" +
    "- Preferred Tone: " + userTone + "\n\n";

  var finalInstruction;
  if (systemInstruction) {
    finalInstruction = baseContext + "SPECIALIZED INSTRUCTION:\n" + systemInstruction;
  } else {
    var defaultInstruction = "You are a Multi-Agent Orchestrator. Your job is to route user requests to the correct specialized agent tool. If a user asks to 'activate' or 'deploy' an agent (like 'Lead Researcher', 'Market Watch', etc.), you MUST call the corresponding 'delegate_' tool immediately. Do not say you cannot do it.\n\n" +
      "GUIDELINES:\n" +
      "1. Always check your knowledge base before admitting ignorance.\n" +
      "2. If a tool returns an error, explain the error and propose a solution.\n" +
      "3. Be proactive: if a request is vague, ask clarifying questions or use 'drive_find_files' to get context.";
    
    finalInstruction = baseContext + (customInstruction ? customInstruction + "\n\n" : "") + defaultInstruction;
  }

  var payload = {
    contents: history.map(function(turn) {
      return {
        role: turn.role,
        parts: turn.parts.map(function(part) {
          if (part.text) return { text: part.text };
          if (part.functionCall) return { functionCall: part.functionCall };
          if (part.functionResponse) return { functionResponse: part.functionResponse };
          if (part.mimeType && part.data) {
            return { inlineData: { mimeType: part.mimeType, data: part.data } };
          }
          return part;
        })
      };
    }),
    systemInstruction: { parts: [{ text: finalInstruction }] },
    safetySettings: [
        { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
        { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
        { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
        { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" }
    ]
  };

  if (manifest.length > 0) payload.tools = [{ functionDeclarations: manifest }];
  if (responseMimeType) payload.generationConfig = { response_mime_type: responseMimeType };

  var options = {
    method: "post",
    contentType: "application/json",
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };

  var maxRetries = 3;
  var retryCount = 0;
  
  while (retryCount <= maxRetries) {
    var response = UrlFetchApp.fetch(endpoint, options);
    var code = response.getResponseCode();
    var contentText = response.getContentText();
    
    if (code === 200) {
      var parsed = parseGeminiResponse(JSON.parse(contentText));
      parsed.model = activeModel;
      return parsed;
    }
    
    if (code === 429 || (code >= 500 && code < 600)) {
      if (retryCount === maxRetries) throw new Error("API Error (" + code + ") after retries: " + contentText);
      var delay = Math.min(16000, 1000 * Math.pow(2, retryCount));
      Utilities.sleep(delay);
      retryCount++;
      continue;
    }
    
    throw new Error("API Error (" + code + "): " + contentText);
  }
}

function parseGeminiResponse(jsonResponse) {
  var usage = jsonResponse.usageMetadata || { promptTokenCount: 0, candidatesTokenCount: 0, totalTokenCount: 0 };
  
  if (!jsonResponse.candidates || jsonResponse.candidates.length === 0) {
      var blockReason = jsonResponse.promptFeedback ? jsonResponse.promptFeedback.blockReason : "Unknown";
      console.error("No candidates returned. Block Reason: " + blockReason + " Response: " + JSON.stringify(jsonResponse));
      return { 
        type: "TEXT", 
        text: "Error: No response generated by the AI. (Block Reason: " + blockReason + "). This usually happens if the request triggers a safety filter or the API key has exceeded its free-tier limits.",
        usage: usage
      };
  }

  var candidate = jsonResponse.candidates[0];
  var parts = candidate.content.parts;

  var toolCalls = [];
  var text = "";

  for (var i = 0; i < parts.length; i++) {
    if (parts[i].functionCall) {
      toolCalls.push({
        name: parts[i].functionCall.name,
        args: parts[i].functionCall.args,
        part: parts[i]
      });
    }
    if (parts[i].text) {
      text += parts[i].text + " ";
    }
  }

  if (toolCalls.length > 0) {
    return {
      type: "TOOL_CALL",
      toolCalls: toolCalls,
      text: text.trim(),
      usage: usage
    };
  }

  // Handle possible JSON text response
  var cleanText = text.trim();
  if (cleanText.startsWith("{") && cleanText.endsWith("}")) {
    try {
      var json = JSON.parse(cleanText);
      return {
        type: "JSON",
        data: json,
        text: cleanText,
        usage: usage
      };
    } catch (e) {
      // Fallback to TEXT if it's not valid JSON
    }
  }

  return {
    type: "TEXT",
    text: cleanText,
    rawPart: parts,
    usage: usage
  };
}

function setApiKey(key) {
  // 1. Get your key from: https://aistudio.google.com/app/apikey
  // 2. Run this function with your key: setApiKey("AIzaSy...")
  
  if (!key) {
    // Fallback: Check if user edited the variable below
    var placeholder = "YOUR_GEMINI_API_KEY_HERE";
    if (placeholder !== "YOUR_GEMINI_API_KEY_HERE") {
        key = placeholder;
    }
  }
  
  if (!key || key === "YOUR_GEMINI_API_KEY_HERE") {
    console.error("Error: You must provide a valid API key. Usage: setApiKey('AIzaSy...')");
    return;
  }
  
  PropertiesService.getScriptProperties().setProperty(API_KEY_PROPERTY, key.trim());
  console.log("API Key successfully saved to Script Properties. (Key starts with: " + key.substring(0, 5) + ")");
}

function listModels() {
  var flash = getPrioritizedModels('flash');
  var pro = getPrioritizedModels('pro');
  
  return {
    flash_tier: flash,
    pro_tier: pro,
    advice: "The system automatically tries models in order if one fails or hits a quota."
  };
}

/**
 * Generates vector embeddings for a given text using Gemini's Embedding API.
 * Uses 'text-embedding-004' model.
 * Returns an array of floats (the vector).
 */
function generateEmbedding(text) {
  var scriptProperties = PropertiesService.getScriptProperties();
  var apiKey = scriptProperties.getProperty(API_KEY_PROPERTY);
  
  if (!apiKey) throw new Error("Gemini API Key is missing.");

  // models/embedding-001 is a more stable fallback for older API keys or restricted regions
  var model = "models/embedding-001"; 
  var endpoint = "https://generativelanguage.googleapis.com/" + API_VERSION + "/" + model + ":embedContent?key=" + apiKey;

  var payload = {
    content: {
      parts: [{ text: text }]
    },
    taskType: "RETRIEVAL_DOCUMENT", // optimized for storage
    title: "Memory Artifact"
  };

  var options = {
    method: "post",
    contentType: "application/json",
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };

  try {
    var response = UrlFetchApp.fetch(endpoint, options);
    var json = JSON.parse(response.getContentText());
    
    if (json.embedding && json.embedding.values) {
      return json.embedding.values;
    } else {
      throw new Error("Embedding API Error: " + (json.error ? json.error.message : JSON.stringify(json)));
    }
  } catch (e) {
    console.error("Embedding generation failed:", e);
    throw e;
  }
}