/**
 * GEMINISERVICE.gs
 */

// Define constants
var API_KEY_PROPERTY = "GEMINI_API_KEY";
var ACTIVE_MODEL_NAME = "gemini-2.0-flash";
var API_VERSION = "v1beta";

function callGemini(history, toolsManifest, systemInstruction) {
  var manifest = toolsManifest || [];
  var scriptProperties = PropertiesService.getScriptProperties();
  var apiKey = scriptProperties.getProperty(API_KEY_PROPERTY);
  var activeModel = scriptProperties.getProperty("PREFERRED_MODEL") || "gemini-2.0-flash";
  var customInstruction = scriptProperties.getProperty("SYSTEM_INSTRUCTION");
  var userTone = scriptProperties.getProperty("USER_PREFERENCE_TONE") || "professional and concise";
  
  if (!apiKey || apiKey === "YOUR_GEMINI_API_KEY_HERE") {
    throw new Error("Gemini API Key is missing or invalid. Please run 'setApiKey()' in the script editor with your actual key from Google AI Studio.");
  }
  
  apiKey = apiKey.trim();
  
  // Debug: Log the key being used (masked) to verify it's loaded correctly
  var maskedKey = apiKey.length > 5 ? apiKey.substring(0, 5) + "..." + apiKey.substring(apiKey.length - 3) : "(Invalid Length)";
  console.log("Using Gemini API Key: " + maskedKey + " | Model: " + activeModel);

  var endpoint = "https://generativelanguage.googleapis.com/" + API_VERSION + "/models/" + activeModel + ":generateContent?key=" + apiKey;

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
          // Handle Text
          if (part.text) return { text: part.text };
          // Handle Function Calls
          if (part.functionCall) return { functionCall: part.functionCall };
          if (part.functionResponse) return { functionResponse: part.functionResponse };
          // Handle Images (Inline Data)
          if (part.mimeType && part.data) {
            return {
              inlineData: {
                mimeType: part.mimeType,
                data: part.data
              }
            };
          }
          return part;
        })
      };
    }),
    systemInstruction: {
      parts: [{ text: finalInstruction }]
    },
    safetySettings: [
        { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
        { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
        { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
        { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" }
    ]
  };

  if (manifest.length > 0) {
    payload.tools = [{ functionDeclarations: manifest }];
  }

  var options = {
    method: "post",
    contentType: "application/json",
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };

  try {
    var maxRetries = 5;
    var retryCount = 0;
    var response;
    var code;
    var contentText;
    var json;

    while (retryCount <= maxRetries) {
      try {
        response = UrlFetchApp.fetch(endpoint, options);
        code = response.getResponseCode();
        contentText = response.getContentText();
        
        // Success
        if (code === 200) {
          json = JSON.parse(contentText);
          return parseGeminiResponse(json);
        }
        
        // Retryable Errors: 429 (Too Many Requests) or 5xx (Server Errors)
        if (code === 429 || (code >= 500 && code < 600)) {
          if (retryCount === maxRetries) {
            json = JSON.parse(contentText);
            throw new Error("API Error (" + code + ") after " + maxRetries + " retries: " + (json.error ? json.error.message : contentText));
          }
          
          var delay = Math.min(32000, 1000 * Math.pow(2, retryCount));
          console.warn("Gemini API Error (" + code + "). Retrying in " + delay + "ms...");
          Utilities.sleep(delay);
          retryCount++;
          continue;
        }

        // Non-retryable error (e.g., 400 Bad Request)
        json = JSON.parse(contentText);
        throw new Error("API Error (" + code + "): " + (json.error ? json.error.message : contentText));

      } catch (fetchErr) {
        // Handle network errors (e.g. DNS failure) that throw exceptions instead of returning error codes
        if (retryCount === maxRetries) throw fetchErr;
        
        var delay = Math.min(32000, 1000 * Math.pow(2, retryCount));
        console.warn("Network Error: " + fetchErr.message + ". Retrying in " + delay + "ms...");
        Utilities.sleep(delay);
        retryCount++;
      }
    }
  } catch (e) {
    // SELF-CORRECTION: Handle Invalid JSON or API hiccups
    if (e.message.indexOf("Unexpected token") !== -1 || e.message.indexOf("JSON") !== -1) {
      console.warn("Gemini returned invalid JSON. Attempting self-correction...");
      
      // Prevent infinite recursion
      var retryCount = history.filter(function(h) { return h.role === "user" && h.parts[0].text.indexOf("Fix your JSON") !== -1; }).length;
      if (retryCount < 2) {
        history.push({
          role: "user",
          parts: [{ text: "SYSTEM ERROR: You returned invalid JSON. Please fix your previous response and return ONLY valid JSON." }]
        });
        return callGemini(history, toolsManifest, systemInstruction);
      }
    }
    
    console.error("Gemini Request Failed:", e);
    return { error: e.message };
  }
}

function parseGeminiResponse(jsonResponse) {
  if (!jsonResponse.candidates || jsonResponse.candidates.length === 0) {
      console.error("No candidates returned. Response: " + JSON.stringify(jsonResponse));
      return { type: "TEXT", text: "Error: No response generated by the AI." };
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
      text: text.trim()
    };
  }

  return {
    type: "TEXT",
    text: text.trim(),
    rawPart: parts
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
  var scriptProperties = PropertiesService.getScriptProperties();
  var apiKey = scriptProperties.getProperty(API_KEY_PROPERTY);
  
  if (!apiKey) return ["No API Key set"];
  
  var endpoint = "https://generativelanguage.googleapis.com/" + API_VERSION + "/models?key=" + apiKey;
  
  try {
    var response = UrlFetchApp.fetch(endpoint, {muteHttpExceptions: true});
    var json = JSON.parse(response.getContentText());
    
    if (json.models) {
        return json.models.map(function(m) { return m.name; });
    } else {
        return ["Error listing models: " + JSON.stringify(json)];
    }
  } catch (e) {
    return ["Exception listing models: " + e.message];
  }
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

  // text-embedding-004 is current SOTA for Gemini embeddings
  var model = "models/text-embedding-004"; 
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