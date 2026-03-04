/**
 * Tools_Legal.gs
 * Document review, compliance checking, and legal summaries.
 */

function registerLegalTools() {
  var tools = [
    {
      name: "legal_document_review",
      description: "Reviews a legal document for specific clauses or risks.",
      parameters: {
        type: "object",
        properties: {
          documentId: { type: "string" },
          focusClauses: { type: "array", items: { type: "string" } }
        },
        required: ["documentId"]
      }
    },
    {
      name: "legal_compliance_check",
      description: "Checks if a proposed action or document complies with stored legal guidelines.",
      parameters: {
        type: "object",
        properties: {
          actionDescription: { type: "string" }
        },
        required: ["actionDescription"]
      }
    }
  ];

  var implementations = {
    "legal_document_review": executeLegalReview,
    "legal_compliance_check": executeLegalCompliance
  };

  var team = {
    name: "Risk & Compliance",
    description: "Evaluates mission plans against legal standards and platform policies (Meta/LinkedIn).",
    handlerName: "runRiskCompliance"
  };

  var scopes = {
    "LEGAL_BUILDER": ["legal_document_review", "legal_compliance_check", "drive_find_files", "doc_summarize", "save_to_knowledge_base", "analytics_store_insight", "social_export_analytics_facebook", "social_export_analytics_linkedin"],
    "LEGAL_VALIDATOR": ["knowledge_base_read", "drive_find_files", "social_read_comments"]
  };

  CoreRegistry.register("Legal", tools, implementations, scopes, team);
}

/**
 * Agent Handler: Risk & Compliance
 */
function runRiskCompliance(context, imageData, sessionId) {
  if (typeof executeTeamWorkflow !== 'undefined') {
    return executeTeamWorkflow(
      "Risk & Compliance",
      "LEGAL_BUILDER",
      "LEGAL_VALIDATOR",
      context.goal + "\n\nCRITICAL CONSTRAINTS:\n1. You MUST use live social API tools (social_export_analytics_facebook/linkedin) to validate current compliance states. Do NOT rely on static document summaries.\n2. You MUST use 'analytics_store_insight' to save your final compliance report to the Vector Store. Do NOT create new Google Drive files for this report.\n3. Ensure the report includes specific API-level data points (e.g., token status, reach metrics) as evidence.",
      imageData,
      sessionId
    );
  }
  return "Error: Team Workflow Engine not found.";
}

// Implementations

function executeLegalReview(args) {
  var content = executeDocSummarize({ documentId: args.documentId });
  var prompt = "Review this legal document, focusing on: " + (args.focusClauses || []).join(", ") + "\n\n" + content;
  return callGemini([{ role: "user", parts: [{ text: prompt }] }], [], "You are a Legal Analyst.").text;
}

function executeLegalCompliance(args) {
  var guidelines = getSystemTruth(); // From Tools_Intelligence.gs
  var prompt = "Check if this action complies with our guidelines: " + args.actionDescription + "\n\nGUIDELINES:\n" + guidelines;
  return callGemini([{ role: "user", parts: [{ text: prompt }] }], [], "You are a Compliance Officer.").text;
}
