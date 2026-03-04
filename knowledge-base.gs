/**
 * KNOWLEDGE-BASE.gs
 * The "Source of Truth" for the GAS Agentic Orchestrator.
 * Stores system architecture, agent directives, and skill mappings.
 */

var TRUTH_DOC_NAME = "SYSTEM_SOURCE_OF_TRUTH";

/**
 * Returns the current System Source of Truth.
 * If the Doc doesn't exist, it initializes it from the static template below.
 */
function getSystemTruth() {
  try {
    var docId = PropertiesService.getScriptProperties().getProperty("SYSTEM_TRUTH_DOC_ID");
    var doc;
    
    if (docId) {
      try {
        doc = DocumentApp.openById(docId);
      } catch (e) {
        console.warn("Stored Truth Doc ID invalid, searching by name...");
      }
    }
    
    if (!doc) {
      var files = DriveApp.getFilesByName(TRUTH_DOC_NAME);
      if (files.hasNext()) {
        doc = DocumentApp.openById(files.next().getId());
      } else {
        // Initialize the Truth
        doc = DocumentApp.create(TRUTH_DOC_NAME);
        doc.getBody().setText(getInitialTruthTemplate());
      }
      PropertiesService.getScriptProperties().setProperty("SYSTEM_TRUTH_DOC_ID", doc.getId());
    }
    
    return doc.getBody().getText();
  } catch (e) {
    return "Error accessing Knowledge Base: " + e.message;
  }
}

/**
 * RECURSIVE DRIVE INGESTION (v4.3)
 * Crawls a folder and its subfolders, reading all Docs and text files 
 * into the Vector Memory Store for system learning.
 */
function ingestDriveFolder(folderId, currentDepth) {
  var depth = currentDepth || 0;
  var maxDepth = 3; // Safety limit
  if (depth > maxDepth) return "Depth limit reached.";

  try {
    var folder = DriveApp.getFolderById(folderId);
    var files = folder.getFiles();
    var ingestedCount = 0;

    while (files.hasNext()) {
      var file = files.next();
      var mime = file.getMimeType();
      var content = "";

      try {
        if (mime === MimeType.GOOGLE_DOCS) {
          content = DocumentApp.openById(file.getId()).getBody().getText();
        } else if (mime === MimeType.PLAIN_TEXT || mime.indexOf("script") !== -1) {
          content = file.getBlob().getDataAsString();
        } else if (mime === MimeType.PDF) {
          // Use OCR via Skills.gs executeKnowledgeSearch logic if available
          // For now, skip or use a placeholder if PDF reading is complex
          content = "[PDF File: " + file.getName() + " - Content ingestion requires OCR]";
        }

        if (content && content.length > 100) {
          // Upsert to Vector Store
          if (typeof executeVectorStoreUpsert !== 'undefined') {
            executeVectorStoreUpsert({
              content: "Knowledge Ingestion [" + file.getName() + "]: " + content.substring(0, 5000),
              tags: "drive_ingest, " + folder.getName()
            });
            ingestedCount++;
          }
        }
      } catch (e) {
        console.warn("Failed to ingest file: " + file.getName() + " - " + e.message);
      }
    }

    // Recursive subfolders
    var subfolders = folder.getFolders();
    while (subfolders.hasNext()) {
      ingestDriveFolder(subfolders.next().getId(), depth + 1);
    }

    return "Success: Ingested " + ingestedCount + " files from folder: " + folder.getName();
  } catch (e) {
    return "Ingestion Error: " + e.message;
  }
}

/**
 * SYSTEM OPTIMIZER (v4.3)
 * Queries the Vector Memory for architectural patterns and past projects
 * to suggest optimizations to the current system.
 */
function getOptimizationSuggestions(query) {
  try {
    var searchQuery = query || "system architecture process optimization improvements";
    var context = "";
    
    if (typeof executeVectorStoreQuery !== 'undefined') {
      context = executeVectorStoreQuery({ query: searchQuery });
    }

    var prompt = "You are the System Architect. Based on the following knowledge from past projects and internal documentation, suggest 3-5 high-impact optimizations for the GAS Agentic Orchestrator (Architecture, Processes, or Features).\n\n" +
                 "INTERNAL CONTEXT:\n" + context + "\n\n" +
                 "Provide actionable, technical recommendations.";

    if (typeof callGemini !== 'undefined') {
      var response = callGemini([{ role: "user", parts: [{ text: prompt }] }], [], "You are a Senior Solutions Architect.");
      return response.text;
    }
    
    return "Error: Gemini Service not available for optimization analysis.";
  } catch (e) {
    return "Optimization Error: " + e.message;
  }
}

/**
 * Updates the System Source of Truth with new insights or architectural changes.
 */
function updateSystemTruth(newContent, mode) {
  try {
    var docId = PropertiesService.getScriptProperties().getProperty("SYSTEM_TRUTH_DOC_ID");
    var doc = DocumentApp.openById(docId);
    var body = doc.getBody();
    
    if (mode === "append") {
      body.appendParagraph("\n--- Update: " + new Date().toLocaleString() + " ---\n" + newContent);
    } else {
      // Complete overwrite (Full Sync)
      body.setText(newContent);
    }
    
    return "Success: System Source of Truth updated.";
  } catch (e) {
    return "Error updating Knowledge Base: " + e.message;
  }
}

/**
 * The core architectural blueprint of the system.
 * This is used to reboot the truth if lost.
 */
function getInitialTruthTemplate() {
  return "# SYSTEM SOURCE OF TRUTH: GAS AGENTIC ORCHESTRATOR (v4.9.8)\n\n" +
    "## 1. System Overview\n" +
    "A hierarchical multi-agent command system built on Google Apps Script, utilizing Gemini 1.5/2.0. Operates via a Strategic Command Layer and specialized Builder/Validator teams with a mandatory Strategic Qualification phase between mission groups.\n\n" +
    "## 2. Core Architecture\n" +
    "- Command: Orchestrator.gs (Mission logic & turn management)\n" +
    "- Brain: Agents.gs (Reasoning, Team-of-Teams architecture, Strategic Qualification)\n" +
    "- Registry: CoreRegistry.gs & Manifest.gs (Centralized tool & scope management)\n" +
    "- Execution: Dispatcher.gs (Dynamic tool routing)\n" +
    "- Intelligence: knowledge-base.gs & AnalyticsVectorDB.gs (Truth Doc, Memory Store, Entity Graph)\n\n" +
    "## 3. Specialized Departments (Teams)\n" +
    "- MARKET INTELLIGENCE: Web intelligence, competitor research, and fact-checking.\n" +
    "- CREATIVE ENGINE: Generation of Docs, Slides, PDFs, and Multimodal assets.\n" +
    "- AGENCY OPERATIONS: Calendar management, CRM maintenance, and task automation.\n" +
    "- SEARCH VISIBILITY: SEO strategy, GSC performance audits, and visibility diagnostics.\n" +
    "- ANALYTICS SCOUT: GA4 traffic analysis, user behavior tracking, and ROI reporting.\n" +
    "- STRATEGIC OUTREACH: Lead generation, hyper-personalized icebreakers, and deal staging.\n" +
    "- PERFORMANCE INSIGHTS: Complex data processing, spreadsheet analysis, and Python logic.\n" +
    "- CLIENT COMMUNICATIONS: Inbox triage, email summarization, and engagement monitoring.\n" +
    "- PROJECT GOVERNANCE: Infrastructure support, asset organization, and permission audits.\n" +
    "- TECHNICAL R&D: Script generation, debugging, and system self-evolution.\n" +
    "- RISK & COMPLIANCE: Legal document review and platform policy alignment.\n" +
    "- SOCIAL ANALYTICS: Social trend scanning, profile intelligence, and posting automation.\n" +
    "- REVENUE MANAGEMENT: Project estimation, margin calculation, and invoicing strategy.\n\n" +
    "## 4. Skill Registry & Capabilities\n" +
    "- WORKSPACE: Gmail (Bulk/Individual/Draft), Drive (Full Lifecycle), Calendar, Sheets, Docs, Slides, Forms, Tasks, Contacts.\n" +
    "- INTELLIGENCE: Vector Store (RAG), Entity Knowledge Graph, Semantic Search, Recursive Summarization.\n" +
    "- SEARCH/SEO: Google Search (API), Web Scraping (JS-Heavy), GSC/GA4 Reporting, PageSpeed, GEO Readiness.\n" +
    "- CRM/SALES: Lead Scoring, Intent Classification, Buying Signal Monitoring, Comprehensive SEO/Business Audits.\n" +
    "- CONTENT/MEDIA: Image Generation, Video/Music Generation, Shorts Clipper, Design Critiques.\n" +
    "- SYSTEM: Parallel Execution, Dynamic Code Injection (Sandbox), Proactive Sentinels, Repo Sync.\n\n" +
    "## 5. Operational Mandates & Guardrails\n" +
    "1. STRATEGIC_REFLECTION: Every mission phase MUST be qualified by the Auditor before proceeding.\n" +
    "2. DATA_INTEGRITY: Never wipe, purge, or clear memory, databases, or system files.\n" +
    "3. COMMS_PROTOCOL: Never send emails or invitations without EXPLICIT user approval (via 'request_human_approval').\n" +
    "4. FINANCIAL_SAFETY: Never run tasks exceeding $20 in API costs without confirmation.\n" +
    "5. ASSET_PROTECTION: Never delete or overwrite files in Drive without explicit user approval.\n" +
    "6. CRM_PRIORITY: Use ID '1G02U9okIAE0-btqZes7DiggntMw0md-rDDutAltEHAI' for all lead management operations.";
}
