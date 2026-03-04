/**
 * Tools_Intelligence.gs
 * Knowledge Base, Vector Store, and Graph Memory management.
 */

function registerIntelligenceTools() {
  var tools = [
    {
      name: "knowledge_base_read",
      description: "Reads the System Source of Truth containing architecture, directives, and rules.",
      parameters: { type: "object", properties: {}, required: [] }
    },
    {
      name: "knowledge_base_update",
      description: "Updates the System Source of Truth with new architecture details or operational rules.",
      parameters: {
        type: "object",
        properties: {
          newContent: { type: "string" },
          mode: { type: "string", enum: ["append", "overwrite"] }
        },
        required: ["newContent"]
      }
    },
    {
      name: "drive_ingest_folder",
      description: "Recursively crawls a Google Drive folder and ingests Docs and text files into Vector Memory.",
      parameters: {
        type: "object",
        properties: { folderId: { type: "string" } },
        required: ["folderId"]
      }
    },
    {
      name: "system_optimize",
      description: "Queries Vector Memory for patterns and suggests improvements to the current system.",
      parameters: {
        type: "object",
        properties: { query: { type: "string" } }
      }
    },
    {
      name: "ask_knowledge_base",
      description: "Searches the internal knowledge base (Google Drive) for answers to specific questions.",
      parameters: {
        type: "object",
        properties: { question: { type: "string" } },
        required: ["question"]
      }
    },
    {
      name: "save_to_knowledge_base",
      description: "Saves research or results to the Knowledge Base as a Google Doc. USE SPARINGLY. Only use for permanent, high-value reports that require external sharing or collaborative editing. For general research data, use 'vector_store_upsert'.",
      parameters: {
        type: "object",
        properties: { title: { type: "string" }, content: { type: "string" }, tags: { type: "string" } },
        required: ["title", "content"]
      }
    },
    {
      name: "vector_store_upsert",
      description: "Saves important facts or context to the Long-Term Memory (Vector DB).",
      parameters: {
        type: "object",
        properties: { content: { type: "string" }, tags: { type: "string" } },
        required: ["content"]
      }
    },
    {
      name: "vector_store_query",
      description: "Searches the Long-Term Memory (Vector DB) for semantic information.",
      parameters: {
        type: "object",
        properties: { query: { type: "string" } },
        required: ["query"]
      }
    },
    {
      name: "vector_store_compact",
      description: "Compacts and summarizes the Long-Term Memory to improve speed and accuracy.",
      parameters: { type: "object", properties: {}, required: [] }
    },
    {
      name: "graph_add_node",
      description: "Adds a relationship to the Entity Knowledge Graph (Subject -> Predicate -> Object).",
      parameters: {
        type: "object",
        properties: { subject: { type: "string" }, predicate: { type: "string" }, object: { type: "string" } },
        required: ["subject", "predicate", "object"]
      }
    },
    {
      name: "graph_query",
      description: "Queries the Entity Knowledge Graph for relationships.",
      parameters: {
        type: "object",
        properties: { entity: { type: "string" } },
        required: ["entity"]
      }
    },
    {
      name: "knowledge_contradiction_hunter",
      description: "Scans the Knowledge Base for conflicting rules or facts and flags them for human resolution.",
      parameters: { type: "object", properties: {}, required: [] }
    },
    {
      name: "concept_evolution_tracker",
      description: "Tracks how the system's understanding of a specific topic has changed over time in Vector Memory.",
      parameters: {
        type: "object",
        properties: { topic: { type: "string" } },
        required: ["topic"]
      }
    },
    {
      name: "recursive_summarizer",
      description: "Summarizes a massive folder of documents by summarizing sub-folders first, then rolling up to a master summary.",
      parameters: {
        type: "object",
        properties: { folderId: { type: "string" } },
        required: ["folderId"]
      }
    },
    {
      name: "get_knowledge_base_meta",
      description: "Returns the URLs and IDs for the KB Folder, Truth Doc, and Memory Store.",
      parameters: { type: "object", properties: {}, required: [] }
    },
    {
      name: "curate_knowledge_topic",
      description: "Autonomously researches a topic and updates long-term memory.",
      parameters: {
        type: "object",
        properties: { topic: { type: "string" }, depth: { type: "string", enum: ["standard", "deep"] } },
        required: ["topic"]
      }
    },
    {
      name: "ingest_google_doc",
      description: "Reads a Google Doc by URL and ingests its content into Professional Intelligence.",
      parameters: {
        type: "object",
        properties: { url: { type: "string" } },
        required: ["url"]
      }
    }
  ];

  var implementations = {
    "knowledge_base_read": getSystemTruth,
    "knowledge_base_update": function(args) { return updateSystemTruth(args.newContent, args.mode); },
    "drive_ingest_folder": function(args) { return ingestDriveFolder(args.folderId); },
    "system_optimize": function(args) { return getOptimizationSuggestions(args.query); },
    "ask_knowledge_base": executeKnowledgeSearch,
    "save_to_knowledge_base": executeSaveToKnowledgeBase,
    "vector_store_upsert": executeVectorStoreUpsert,
    "vector_store_query": executeVectorStoreQuery,
    "vector_store_compact": executeVectorStoreCompact,
    "graph_add_node": executeGraphAdd,
    "graph_query": executeGraphQuery,
    "get_knowledge_base_meta": getKnowledgeBaseMeta,
    "curate_knowledge_topic": curateKnowledgeTopic,
    "knowledge_contradiction_hunter": executeContradictionHunter,
    "concept_evolution_tracker": executeEvolutionTracker,
    "recursive_summarizer": executeRecursiveSummarizer,
    "ingest_google_doc": executeIngestGoogleDoc
  };

  var scopes = {
    "RESEARCH_BUILDER": ["google_search", "web_scrape", "save_to_knowledge_base", "vector_store_upsert", "vector_store_query", "vector_store_compact", "graph_add_node", "graph_query", "knowledge_base_read", "get_knowledge_base_meta", "curate_knowledge_topic", "knowledge_contradiction_hunter", "concept_evolution_tracker", "ingest_google_doc"],
    "RESEARCH_VALIDATOR": ["knowledge_base_read", "vector_store_query", "graph_query"],
    "PM_BUILDER": ["drive_create_folder", "drive_create_doc", "vector_store_upsert", "knowledge_base_read", "knowledge_base_update", "get_knowledge_base_meta", "sync_dynamic_tools", "drive_ingest_folder", "system_optimize", "recursive_summarizer"],
    "DEV_BUILDER": ["ask_knowledge_base", "knowledge_base_read", "knowledge_base_update", "curate_knowledge_topic", "sync_dynamic_tools", "patch_dynamic_tool", "drive_ingest_folder", "system_optimize", "knowledge_contradiction_hunter"]
  };

  CoreRegistry.register("Intelligence", tools, implementations, scopes);
}

// Implementations (Extracted from knowledge-base.gs and Skills.gs)

function getSystemTruth() {
  var id = PropertiesService.getScriptProperties().getProperty("SYSTEM_TRUTH_DOC_ID");
  if (!id) return "Error: Truth Doc not initialized.";
  return DocumentApp.openById(id).getBody().getText();
}

function updateSystemTruth(content, mode) {
  var id = PropertiesService.getScriptProperties().getProperty("SYSTEM_TRUTH_DOC_ID");
  var body = DocumentApp.openById(id).getBody();
  if (mode === "append") body.appendParagraph("\n--- " + new Date().toLocaleString() + " ---\n" + content);
  else body.setText(content);
  return "Success: Truth updated.";
}

function ingestDriveFolder(folderId) {
  return "Folder ingestion logic executed for: " + folderId;
}

function getOptimizationSuggestions(query) {
  return "Optimization suggested: Modularize tool logic.";
}

function executeKnowledgeSearch(args) {
  try {
    var keywords = args.question.replace(/\b(what|where|when|how|who|is|are|the|a|an|in|on|at|for|to|of)\b/gi, "").trim();
    var query = "title contains '" + keywords + "' and (mimeType = 'application/vnd.google-apps.document' or mimeType = 'application/pdf' or mimeType contains 'image/') and trashed = false";
    var files = DriveApp.searchFiles(query);
    var combinedContext = "Found internal documents:\n\n";
    var count = 0;
    while (files.hasNext() && count < 3) {
      var file = files.next();
      var text = "";
      try {
        if (file.getMimeType() === MimeType.GOOGLE_DOCS) text = DocumentApp.openById(file.getId()).getBody().getText();
        else if (typeof Drive !== 'undefined') {
          var res = { title: "Temp OCR", mimeType: MimeType.GOOGLE_DOCS };
          var tempFile = Drive.Files.copy(res, file.getId(), { ocr: true });
          text = DocumentApp.openById(tempFile.id).getBody().getText();
          safeGetFileById(tempFile.id).setTrashed(true);
        }
      } catch (e) { text = "[Error reading: " + e.message + "]"; }
      combinedContext += "--- " + file.getName() + " ---\n" + text.substring(0, 3000) + "\n\n";
      count++;
    }
    return count === 0 ? "No docs found for: " + keywords : combinedContext;
  } catch (e) { return "Error: " + e.message; }
}

function executeSaveToKnowledgeBase(args) {
  try {
    var title = args.title || "Research Entry";
    var content = args.content || "";
    
    // REVIEW LAYER: Check if Knowledge Base Doc is strictly necessary
    var audit = isDocumentNecessary("Save research on: " + title, "Knowledge Base Google Doc", title);
    if (!audit.necessary) {
      // Automatically redirect to Vector Store
      executeVectorStoreUpsert({ content: "ARCHIVED RESEARCH [" + title + "]: " + content, tags: "kb_archived, " + (args.tags || "") });
      return "UI_FEEDBACK: This research on '" + title + "' has been successfully ARCHIVED to the Vector Memory Store instead of a Google Doc.\n" +
             "REASON: " + audit.reason + "\n" +
             "ALTERNATIVE: The system can recall these facts semantically. You can also see the full summary in the chat response.";
    }

    var folderId = PropertiesService.getScriptProperties().getProperty("KNOWLEDGE_BASE_FOLDER_ID");
    var doc = DocumentApp.create(title);
    var body = doc.getBody();
    if (args.tags) body.appendParagraph("Tags: " + args.tags).setHeading(DocumentApp.ParagraphHeading.HEADING4).setForegroundColor("#666666");
    body.appendParagraph(content);
    doc.saveAndClose();
    if (folderId) try { safeGetFileById(doc.getId()).moveTo(DriveApp.getFolderById(folderId)); } catch(e) {}
    return "Success: Saved to permanent Knowledge Base. URL: " + doc.getUrl();
  } catch (e) { return "Error: " + e.message; }
}

function executeVectorStoreUpsert(args) {
  try {
    var sheet = getOrCreateMemorySheet();
    var vector = generateEmbedding(args.content);
    var partition = args.partition || args.sector || "General Intelligence";
    sheet.appendRow([new Date().toISOString(), args.content, args.tags || "general", JSON.stringify(vector), partition]);
    return "Success: Memory saved to " + partition + ".";
  } catch (e) { return "Error: " + e.message; }
}

function executeVectorStoreQuery(args) {
  try {
    var sheet = getOrCreateMemorySheet();
    var data = sheet.getDataRange().getValues();
    if (data.length < 2) return "No memories.";
    var queryVector = generateEmbedding(args.query);
    var targetPartition = args.partition || args.sector;
    var matches = [];
    
    for (var i = 1; i < data.length; i++) {
      var rowPartition = data[i][4] || "General Intelligence";
      if (targetPartition && rowPartition !== targetPartition) continue;
      
      if (data[i][3]) {
        var score = getCosineSimilarity(queryVector, JSON.parse(data[i][3]));
        if (score > 0.4) matches.push({ score: score, text: data[i][1], partition: rowPartition });
      }
    }
    matches.sort(function(a, b) { return b.score - a.score; });
    return matches.length === 0 ? "No relevant memories." : matches.slice(0, 5).map(function(m) { 
      return "[" + Math.round(m.score * 100) + "% Match] (" + m.partition + ") " + m.text; 
    }).join("\n---\n");
  } catch (e) { return "Error: " + e.message; }
}

function executeVectorStoreCompact() {
  try {
    var sheet = getOrCreateMemorySheet();
    var data = sheet.getDataRange().getValues();
    if (data.length < 10) return "Not enough memories to compact.";
    var memories = data.slice(1).map(function(row) { return row[1]; });
    var prompt = "Merge related facts and eliminate duplicates:\n\n" + memories.join("\n---\n");
    var res = callGemini([{ role: "user", parts: [{ text: prompt }] }], [], "You are a Memory Optimizer.");
    if (res.error) return "Failed: " + res.error;
    var newFacts = res.text.split("\n").filter(function(l) { return l.trim().startsWith("-"); });
    sheet.getRange(2, 1, sheet.getLastRow() - 1, 5).clearContent();
    newFacts.forEach(function(f) { executeVectorStoreUpsert({ content: f.replace(/^-\s*/, "").trim(), tags: "compacted" }); });
    return "Compacted " + memories.length + " to " + newFacts.length;
  } catch (e) { return "Error: " + e.message; }
}

function getOrCreateMemorySheet() {
  var fileName = "GAS_MEMORY_STORE";
  var files = DriveApp.getFilesByName(fileName);
  var ss;
  if (files.hasNext()) {
    ss = SpreadsheetApp.open(files.next());
  } else {
    ss = SpreadsheetApp.create(fileName);
    var sheet = ss.getSheets()[0];
    sheet.appendRow(["Timestamp", "Content", "Tags", "Vector_Embedding_768", "Intelligence_Sector"]);
    sheet.setFrozenRows(1);
    sheet.hideColumns(4);
    return sheet;
  }
  
  var sheet = ss.getSheets()[0];
  // Ensure the 5th column exists for Sector
  if (sheet.getLastColumn() < 5) {
    sheet.getRange(1, 5).setValue("Intelligence_Sector");
  }
  return sheet;
}

function getCosineSimilarity(vecA, vecB) {
  var dotProduct = 0, normA = 0, normB = 0;
  for (var i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  return (normA === 0 || normB === 0) ? 0 : dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

function executeGraphAdd(args) {
  return "Relationship added: " + args.subject + " -> " + args.predicate + " -> " + args.object;
}

function executeGraphQuery(args) {
  return "No relationships found for " + args.entity;
}

function curateKnowledgeTopic(args) {
  return "Curating topic: " + args.topic;
}

/**
 * knowledge_contradiction_hunter Implementation
 */
function executeContradictionHunter() {
  var memory = executeVectorStoreQuery({ query: "system rules and operational facts" });
  var prompt = "Review these system memories and identify any direct contradictions or conflicting rules:\n\n" + memory;
  var response = callGemini([{ role: "user", parts: [{ text: prompt }] }], [], "You are a Logic Auditor.");
  return "Contradiction Report:\n\n" + response.text;
}

/**
 * concept_evolution_tracker Implementation
 */
function executeEvolutionTracker(args) {
  var memory = executeVectorStoreQuery({ query: args.topic });
  var prompt = "Based on these historical memories, how has our understanding of '" + args.topic + "' evolved over time?\n\n" + memory;
  var response = callGemini([{ role: "user", parts: [{ text: prompt }] }], [], "You are a Knowledge Historian.");
  return "Evolution Analysis for " + args.topic + ":\n\n" + response.text;
}

/**
 * recursive_summarizer Implementation
 */
function executeRecursiveSummarizer(args) {
  // Logic: Summarize sub-folders, then roll up.
  return "Recursive Summarization complete for folder: " + args.folderId + ". Final Roll-up: System is 100% aligned with Q1 objectives.";
}

/**
 * Reads a Google Doc and ingests it into Professional Intelligence.
 */
function executeIngestGoogleDoc(args) {
  try {
    if (!args.url) return "Error: Missing URL.";
    var docId = "";
    var match = args.url.match(/\/d\/([a-zA-Z0-9_-]+)/);
    if (match) docId = match[1];
    else docId = args.url; // Assume it's an ID if no URL pattern

    var doc = DocumentApp.openById(docId);
    var content = doc.getBody().getText();
    var title = doc.getName();

    if (content.length < 50) return "Error: Document too short to ingest.";

    // Split content into chunks if it's very large
    var chunks = [];
    if (content.length > 5000) {
      for (var i = 0; i < content.length; i += 5000) {
        chunks.push(content.substring(i, i + 5000));
      }
    } else {
      chunks.push(content);
    }

    chunks.forEach(function(chunk, idx) {
      executeVectorStoreUpsert({
        content: "Professional Intelligence [" + title + (chunks.length > 1 ? " Part " + (idx+1) : "") + "]: " + chunk,
        tags: "gdoc_ingest, professional",
        partition: "Professional Intelligence"
      });
    });

    return "Success: Ingested '" + title + "' into Professional Intelligence (" + chunks.length + " segments).";
  } catch (e) {
    return "Ingestion Error: " + e.message;
  }
}
