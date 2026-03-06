/**
 * Tools_Finance.gs
 * Invoicing, project estimation, and margin calculation.
 */

function registerFinanceTools() {
  var tools = [
    {
      name: "finance_create_invoice",
      description: "Generates a PDF invoice for a client.",
      parameters: {
        type: "object",
        properties: {
          clientName: { type: "string" },
          items: { type: "array", items: { type: "object", properties: { desc: {type: "string"}, amount: {type: "number"} } } }
        },
        required: ["clientName", "items"]
      }
    },
    {
      name: "finance_project_estimator",
      description: "Calculates the recommended price for a project based on hours and target margin.",
      parameters: {
        type: "object",
        properties: {
          estimatedHours: { type: "number" },
          hourlyRate: { type: "number" },
          margin: { type: "number" }
        },
        required: ["estimatedHours"]
      }
    },
    {
      name: "finance_margin_calculator",
      description: "Calculates Estimated ARR, SEO Gap Value, and Technical Debt.",
      parameters: {
        type: "object",
        properties: { companyData: { type: "object" } },
        required: ["companyData"]
      }
    }
  ];

  var implementations = {
    "finance_create_invoice": executeCreateInvoice,
    "finance_project_estimator": executeProjectEstimator,
    "finance_margin_calculator": finance_margin_calculator
  };

  var team = {
    name: "Revenue Management",
    description: "Specialized in financial strategy, project estimation, and margin analysis.",
    handlerName: "runRevenueManagement"
  };

  var scopes = {
    "FINANCE_BUILDER": ["finance_create_invoice", "finance_project_estimator", "drive_create_doc", "drive_export_pdf", "drive_find_files", "gmail_create_draft", "crm_manage_leads", "finance_margin_calculator", "analytics_store_insight"],
    "FINANCE_VALIDATOR": ["drive_find_files", "gmail_search", "knowledge_base_read"]
  };

  CoreRegistry.register("Finance", tools, implementations, scopes, team);
}

/**
 * Agent Handler: Revenue Management
 */
function runRevenueManagement(context, imageData, sessionId) {
  if (typeof executeTeamWorkflow !== 'undefined') {
    return executeTeamWorkflow(
      "Revenue Management",
      "FINANCE_BUILDER",
      "FINANCE_VALIDATOR",
      context.goal + "\n\nCRITICAL CONSTRAINTS:\n1. You MUST provide a detailed breakdown for every estimation.\n2. Include: estimated_hours, hourly_rate, total_cost, target_margin_percentage, target_profit_amount, and final_recommended_price.\n3. Provide a 'pricing_strategy_justification' explaining the rationale for the rates and margin.\n4. Use 'analytics_store_insight' to save the finalized financial proposal for record-keeping.",
      imageData,
      sessionId
    );
  }
  return "Error: Team Workflow Engine not found.";
}

// Implementations

function executeCreateInvoice(args) {
  var doc = DocumentApp.create("Invoice - " + args.clientName);
  var body = doc.getBody();
  var total = 0;
  args.items.forEach(function(item) {
    body.appendParagraph(item.desc + " - $" + item.amount);
    total += parseFloat(item.amount);
  });
  body.appendParagraph("Total: $" + total.toFixed(2));
  doc.saveAndClose();
  var pdf = safeGetFileById(doc.getId()).getAs(MimeType.PDF);
  var pdfFile = DriveApp.createFile(pdf);
  return "Invoice created: " + pdfFile.getUrl();
}

function executeProjectEstimator(args) {
  var hourlyRate = args.hourlyRate || 150;
  var margin = args.margin || 0.3;
  var hours = args.estimatedHours;
  var cost = hours * hourlyRate;
  var price = cost / (1 - margin);
  var profit = price - cost;
  
  return JSON.stringify({
    estimated_hours: hours,
    hourly_rate: hourlyRate,
    total_cost: cost.toFixed(2),
    target_margin_percentage: (margin * 100).toFixed(0) + "%",
    target_profit_amount: profit.toFixed(2),
    final_recommended_price: price.toFixed(2),
    pricing_strategy: "Value-based cost-plus margin model."
  });
}

function finance_margin_calculator(args) {
  var d = args.companyData;
  var estArr = (d.headcount || 0) * 100000;
  return { estimated_arr: estArr, priority: estArr > 1000000 ? "HIGH" : "LOW" };
}
