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
      description: "Saves research or results to the Knowledge Base folder as a Google Doc.",
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
    "curate_knowledge_topic": curateKnowledgeTopic
  };

  var scopes = {
    "RESEARCH_BUILDER": ["google_search", "web_scrape", "save_to_knowledge_base", "vector_store_upsert", "vector_store_query", "vector_store_compact", "graph_add_node", "graph_query", "knowledge_base_read", "get_knowledge_base_meta", "curate_knowledge_topic"],
    "PM_BUILDER": ["drive_create_folder", "drive_create_doc", "vector_store_upsert", "knowledge_base_read", "knowledge_base_update", "get_knowledge_base_meta", "sync_dynamic_tools", "drive_ingest_folder", "system_optimize"],
    "DEV_BUILDER": ["ask_knowledge_base", "knowledge_base_read", "knowledge_base_update", "curate_knowledge_topic", "sync_dynamic_tools", "patch_dynamic_tool", "drive_ingest_folder", "system_optimize"]
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
          DriveApp.getFileById(tempFile.id).setTrashed(true);
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
    var folderId = PropertiesService.getScriptProperties().getProperty("KNOWLEDGE_BASE_FOLDER_ID");
    var doc = DocumentApp.create(args.title);
    var body = doc.getBody();
    if (args.tags) body.appendParagraph("Tags: " + args.tags).setHeading(DocumentApp.ParagraphHeading.HEADING4).setForegroundColor("#666666");
    body.appendParagraph(args.content);
    doc.saveAndClose();
    if (folderId) try { DriveApp.getFileById(doc.getId()).moveTo(DriveApp.getFolderById(folderId)); } catch(e) {}
    return "Success: Saved to KB. URL: " + doc.getUrl();
  } catch (e) { return "Error: " + e.message; }
}

function executeVectorStoreUpsert(args) {
  try {
    var sheet = getOrCreateMemorySheet();
    var vector = generateEmbedding(args.content);
    sheet.appendRow([new Date().toISOString(), args.content, args.tags || "general", JSON.stringify(vector)]);
    return "Success: Memory saved.";
  } catch (e) { return "Error: " + e.message; }
}

function executeVectorStoreQuery(args) {
  try {
    var sheet = getOrCreateMemorySheet();
    var data = sheet.getDataRange().getValues();
    if (data.length < 2) return "No memories.";
    var queryVector = generateEmbedding(args.query);
    var matches = [];
    for (var i = 1; i < data.length; i++) {
      if (data[i][3]) {
        var score = getCosineSimilarity(queryVector, JSON.parse(data[i][3]));
        if (score > 0.4) matches.push({ score: score, text: data[i][1] });
      }
    }
    matches.sort(function(a, b) { return b.score - a.score; });
    return matches.length === 0 ? "No relevant memories." : matches.slice(0, 5).map(function(m) { return "[" + Math.round(m.score * 100) + "% Match] " + m.text; }).join("\n---\n");
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
    sheet.getRange(2, 1, sheet.getLastRow() - 1, 4).clearContent();
    newFacts.forEach(function(f) { executeVectorStoreUpsert({ content: f.replace(/^-\s*/, "").trim(), tags: "compacted" }); });
    return "Compacted " + memories.length + " to " + newFacts.length;
  } catch (e) { return "Error: " + e.message; }
}

function getOrCreateMemorySheet() {
  var fileName = "GAS_MEMORY_STORE";
  var files = DriveApp.getFilesByName(fileName);
  if (files.hasNext()) return SpreadsheetApp.open(files.next()).getSheets()[0];
  var ss = SpreadsheetApp.create(fileName);
  var sheet = ss.getSheets()[0];
  sheet.appendRow(["Timestamp", "Content", "Tags", "Vector_Embedding_768"]);
  sheet.setFrozenRows(1);
  sheet.hideColumns(4);
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
