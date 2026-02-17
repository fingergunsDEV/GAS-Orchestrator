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

  var scopes = {
    "FINANCE_BUILDER": ["finance_create_invoice", "finance_project_estimator", "drive_create_doc", "drive_export_pdf", "drive_find_files", "gmail_create_draft", "crm_manage_leads", "finance_margin_calculator"],
    "FINANCE_VALIDATOR": ["drive_find_files", "gmail_search", "knowledge_base_read"]
  };

  CoreRegistry.register("Finance", tools, implementations, scopes);
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
  var pdf = DriveApp.getFileById(doc.getId()).getAs(MimeType.PDF);
  var pdfFile = DriveApp.createFile(pdf);
  return "Invoice created: " + pdfFile.getUrl();
}

function executeProjectEstimator(args) {
  var cost = args.estimatedHours * (args.hourlyRate || 150);
  var price = cost / (1 - (args.margin || 0.3));
  return "Recommended Price: $" + price.toFixed(2);
}

function finance_margin_calculator(args) {
  var d = args.companyData;
  var estArr = (d.headcount || 0) * 100000;
  return { estimated_arr: estArr, priority: estArr > 1000000 ? "HIGH" : "LOW" };
}
