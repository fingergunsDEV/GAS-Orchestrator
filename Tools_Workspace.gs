/**
 * Tools_Workspace.gs
 * Gmail, Drive, Sheets, Docs, Slides, Calendar, Forms, Tasks, Contacts.
 */

function registerWorkspaceTools() {
  var tools = [
    {
      name: "gmail_search",
      description: "Searches for email threads in Gmail. Returns snippets of matching emails.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string" },
          count: { type: "integer" }
        },
        required: ["query"]
      }
    },
    {
      name: "gmail_get_unread_count",
      description: "Returns the number of unread email threads in the inbox.",
      parameters: {
        type: "object",
        properties: {},
        required: []
      }
    },
    {
      name: "gmail_check_sent",
      description: "Checks the 'Sent' folder for the most recent emails. Use this to verify if an email was successfully sent.",
      parameters: {
        type: "object",
        properties: {
          count: { type: "integer", description: "Number of sent threads to retrieve (default 1)." }
        },
        required: []
      }
    },
    {
      name: "gmail_check_sent_delayed",
      description: "Waits 10 seconds and then checks the 'Sent' folder for the most recent emails. Use this to verify if an email was actually sent without relying on search indexes.",
      parameters: {
        type: "object",
        properties: {
          subject: { type: "string", description: "The subject line to look for." }
        },
        required: ["subject"]
      }
    },
    {
      name: "gmail_bulk_send",
      description: "Sends multiple personalized emails using a Google Sheet for data and a Google Doc as a template. Variables in the Doc should be in {{ColumnName}} format.",
      parameters: {
        type: "object",
        properties: {
          spreadsheetId: { type: "string", description: "The ID of the Google Sheet containing recipient data." },
          range: { type: "string", description: "The range of data (e.g., 'Sheet1!A1:D10'). First row must be headers." },
          templateDocId: { type: "string", description: "The ID of the Google Doc to use as the email body template." },
          subjectTemplate: { type: "string", description: "The subject line (can include {{Variables}})." }
        },
        required: ["spreadsheetId", "range", "templateDocId", "subjectTemplate"]
      }
    },
    {
      name: "drive_create_doc",
      description: "Creates a new Google Doc.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string" },
          content: { type: "string" }
        },
        required: ["title", "content"]
      }
    },
    {
      name: "drive_create_folder",
      description: "Creates a new folder in Google Drive.",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string" }
        },
        required: ["name"]
      }
    },
    {
      name: "slides_create",
      description: "Creates a new Google Slide presentation.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string" }
        },
        required: ["title"]
      }
    },
    {
      name: "drive_export_pdf",
      description: "Exports a Google Doc or Slide as a PDF file.",
      parameters: {
        type: "object",
        properties: {
          fileId: { type: "string" },
          outputName: { type: "string" }
        },
        required: ["fileId"]
      }
    },
    {
      name: "calendar_manage",
      description: "Manages the user's calendar. Can list, create, or delete events.",
      parameters: {
        type: "object",
        properties: {
          action: { type: "string", enum: ["list", "create", "delete"] },
          title: { type: "string" },
          startTime: { type: "string", description: "ISO date string or relative time." },
          endTime: { type: "string" }
        },
        required: ["action"]
      }
    },
    {
      name: "sheets_operation",
      description: "Read, append, or update data in a Google Sheet. You can provide a 'spreadsheetId' to connect to a specific sheet, otherwise it uses the active one.",
      parameters: {
        type: "object",
        properties: {
          spreadsheetId: { type: "string", description: "The ID of the spreadsheet (from the URL)." },
          range: { type: "string", description: "e.g. 'Sheet1!A1:B10'" },
          action: { type: "string", enum: ["read", "append", "update"] },
          values: { type: "array", items: { type: "array", items: { type: "string" } } }
        },
        required: ["action", "range"]
      }
    },
    {
      name: "sheets_get_info",
      description: "Returns metadata about a spreadsheet, including names of all sheets (tabs). Use this to explore a sheet by ID.",
      parameters: {
        type: "object",
        properties: {
          spreadsheetId: { type: "string" }
        },
        required: ["spreadsheetId"]
      }
    },
    {
      name: "gmail_create_draft",
      description: "Creates a draft email in Gmail.",
      parameters: {
        type: "object",
        properties: {
          to: { type: "string" },
          subject: { type: "string" },
          body: { type: "string" }
        },
        required: ["to", "subject", "body"]
      }
    },
    {
      name: "gmail_send",
      description: "Sends an email immediately. Use this ONLY if the user explicitly asks to 'send' something or after receiving approval for a draft.",
      parameters: {
        type: "object",
        properties: {
          to: { type: "string" },
          subject: { type: "string" },
          body: { type: "string" }
        },
        required: ["to", "subject", "body"]
      }
    },
    {
      name: "drive_find_files",
      description: "Searches for files in Google Drive.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "The search query." },
          mimeType: { type: "string", description: "Optional MIME type filter." }
        },
        required: ["query"]
      }
    },
    {
      name: "drive_move_file",
      description: "Moves a file to a specific folder.",
      parameters: {
        type: "object",
        properties: {
          fileId: { type: "string" },
          destinationFolderId: { type: "string" }
        },
        required: ["fileId", "destinationFolderId"]
      }
    },
    {
      name: "drive_share_file",
      description: "Shares a file with a specific email address.",
      parameters: {
        type: "object",
        properties: {
          fileId: { type: "string" },
          email: { type: "string" },
          role: { type: "string", enum: ["viewer", "commenter", "editor"] }
        },
        required: ["fileId", "email", "role"]
      }
    },
    {
      name: "doc_summarize",
      description: "Reads a Google Doc and returns its content for summarization.",
      parameters: {
        type: "object",
        properties: {
          documentId: { type: "string" }
        },
        required: ["documentId"]
      }
    },
    {
      name: "contacts_manager",
      description: "Manages Google Contacts. Can create new contacts or search for existing ones.",
      parameters: {
        type: "object",
        properties: {
          action: { type: "string", enum: ["create", "search"] },
          firstName: { type: "string" },
          lastName: { type: "string" },
          email: { type: "string" },
          query: { type: "string", description: "For search: name or email to find." }
        },
        required: ["action"]
      }
    },
    {
      name: "forms_manager",
      description: "Manages Google Forms. Can create new forms or read responses from an existing form.",
      parameters: {
        type: "object",
        properties: {
          action: { type: "string", enum: ["create", "get_responses"] },
          title: { type: "string", description: "Title for the new form." },
          questions: { type: "array", items: { type: "string" }, description: "List of text questions to add." },
          formId: { type: "string", description: "ID of the form to read responses from." }
        },
        required: ["action"]
      }
    },
    {
      name: "tasks_manager",
      description: "Manages Google Tasks. Can create tasks or list them.",
      parameters: {
        type: "object",
        properties: {
          action: { type: "string", enum: ["create", "list"] },
          title: { type: "string", description: "Title of the task." },
          notes: { type: "string", description: "Details or description." },
          listId: { type: "string", description: "Optional: ID of the task list (defaults to primary)." }
        },
        required: ["action"]
      }
    },
    {
      name: "drive_list_assets",
      description: "Lists files and folders in a specific Google Drive folder (or root) to map out available assets.",
      parameters: {
        type: "object",
        properties: {
          folderId: { type: "string", description: "Optional: Folder ID to list. Defaults to root." },
          limit: { type: "integer", description: "Max items to return (default 50)." }
        }
      }
    },
    {
      name: "drive_get_content",
      description: "Reads the content of a file from Google Drive for learning or analysis. Supports Docs, Sheets (as CSV), and Text files.",
      parameters: {
        type: "object",
        properties: {
          fileId: { type: "string", description: "The ID of the file to read." }
        },
        required: ["fileId"]
      }
    },
    {
      name: "patch_doc_content",
      description: "Modifies an existing Google Doc by replacing text or appending content. Better than creating new docs.",
      parameters: {
        type: "object",
        properties: {
          documentId: { type: "string" },
          targetText: { type: "string", description: "Text to find (for replacement)." },
          replacementText: { type: "string", description: "New text." },
          mode: { type: "string", enum: ["replace_all", "append"] }
        },
        required: ["documentId", "mode"]
      }
    }
  ];

  var implementations = {
    "gmail_search": executeGmailSearch,
    "gmail_get_unread_count": executeGmailGetUnreadCount,
    "gmail_check_sent": executeGmailCheckSent,
    "gmail_check_sent_delayed": executeGmailCheckSentDelayed,
    "gmail_bulk_send": executeGmailBulkSend,
    "drive_create_doc": executeCreateDoc,
    "drive_create_folder": executeCreateFolder,
    "slides_create": executeSlidesCreate,
    "drive_export_pdf": executeDriveExportPdf,
    "calendar_manage": executeCalendarManage,
    "sheets_operation": executeSheetsOperation,
    "sheets_get_info": executeSheetsGetInfo,
    "gmail_create_draft": executeGmailDraft,
    "gmail_send": executeGmailSend,
    "drive_find_files": executeDriveFind,
    "drive_move_file": executeDriveMove,
    "drive_share_file": executeDriveShare,
    "doc_summarize": executeDocSummarize,
    "contacts_manager": executeContactsManager,
    "forms_manager": executeFormsManager,
    "tasks_manager": executeTasksManager,
    "drive_list_assets": executeDriveListAssets,
    "drive_get_content": executeDriveGetContent,
    "patch_doc_content": executePatchDoc
  };

  var scopes = {
    "CONTENT_BUILDER": ["drive_create_doc", "patch_doc_content", "slides_create", "drive_export_pdf", "drive_find_files"],
    "CONTENT_VALIDATOR": ["drive_find_files", "doc_summarize"],
    "OPS_BUILDER": ["calendar_manage", "tasks_manager", "contacts_manager", "gmail_get_unread_count", "gmail_create_draft", "gmail_send", "gmail_bulk_send", "forms_manager", "drive_find_files"],
    "OPS_VALIDATOR": ["calendar_manage", "tasks_manager", "contacts_manager", "gmail_search", "gmail_get_unread_count", "gmail_check_sent", "gmail_check_sent_delayed"],
    "OUTREACH_BUILDER": ["gmail_create_draft", "gmail_send", "gmail_bulk_send", "contacts_manager"],
    "OUTREACH_VALIDATOR": ["gmail_search", "contacts_manager", "gmail_check_sent", "gmail_check_sent_delayed"],
    "DATA_BUILDER": ["drive_create_doc", "drive_find_files", "sheets_operation", "sheets_get_info"],
    "DATA_VALIDATOR": ["sheets_get_info", "drive_find_files"],
    "COMMS_BUILDER": ["gmail_search", "gmail_get_unread_count", "gmail_create_draft", "gmail_send", "gmail_bulk_send", "contacts_manager", "doc_summarize", "drive_create_doc"],
    "COMMS_VALIDATOR": ["gmail_search", "gmail_get_unread_count", "gmail_check_sent", "gmail_check_sent_delayed", "drive_find_files"],
    "PM_BUILDER": ["tasks_manager", "calendar_manage", "drive_create_folder", "drive_create_doc", "patch_doc_content", "drive_move_file", "drive_share_file", "drive_find_files"],
    "PM_VALIDATOR": ["tasks_manager", "drive_find_files", "calendar_manage"]
  };

  CoreRegistry.register("Workspace", tools, implementations, scopes);
}

// Implementations (Extracted from Skills.gs)

function executeCalendarManage(args) {
  var calendar = CalendarApp.getDefaultCalendar();
  if (args.action === "create") {
    var event = calendar.createEvent(args.title, new Date(args.startTime), new Date(args.endTime));
    return "Success: Event created - " + event.getId();
  } else if (args.action === "list") {
    var events = calendar.getEvents(new Date(args.startTime || Date.now()), new Date(args.endTime || (Date.now() + 86400000)));
    return events.map(function(e) { return e.getTitle() + " (" + e.getStartTime() + ")"; }).join("\n");
  } else if (args.action === "delete") {
    return "Delete action requested (Not fully implemented for safety)";
  }
  return "Error: Invalid action.";
}

function executeSheetsOperation(args) {
  try {
    var ss = args.spreadsheetId ? SpreadsheetApp.openById(args.spreadsheetId) : SpreadsheetApp.getActiveSpreadsheet();
    if (!ss) return "Error: Could not find or access spreadsheet.";
    var range = ss.getRange(args.range);
    if (!range) return "Error: Range '" + args.range + "' not found.";
    if (args.action === "read") return JSON.stringify(range.getValues());
    if (args.action === "append") { range.getSheet().appendRow(args.values[0]); return "Success: Data appended."; }
    if (args.action === "update") { range.setValues(args.values); return "Success: Data updated."; }
    return "Error: Invalid action.";
  } catch (e) { return "Error: " + e.message; }
}

function executeSheetsGetInfo(args) {
  try {
    var ss = SpreadsheetApp.openById(args.spreadsheetId);
    return JSON.stringify({ title: ss.getName(), tabs: ss.getSheets().map(function(s) { return s.getName(); }), url: ss.getUrl() });
  } catch (e) { return "Error: " + e.message; }
}

function executeGmailDraft(args) {
  try {
    var draft = GmailApp.createDraft(args.to, args.subject, args.body);
    return "Success: Draft created. ID: " + draft.getId();
  } catch (e) { return "Error: " + e.message; }
}

function executeGmailSend(args) {
  try {
    GmailApp.sendEmail(args.to, args.subject, args.body);
    return "Success: Email sent to " + args.to;
  } catch (e) { return "Error: " + e.message; }
}

function executeGmailBulkSend(args) {
  try {
    var ss = SpreadsheetApp.openById(args.spreadsheetId);
    var data = ss.getRange(args.range).getValues();
    if (data.length < 2) return "Error: No data found.";
    var templateText = DocumentApp.openById(args.templateDocId).getBody().getText();
    var headers = data[0];
    var sentCount = 0;
    for (var i = 1; i < data.length; i++) {
      var row = data[i];
      var email = "";
      var body = templateText;
      var subject = args.subjectTemplate;
      for (var j = 0; j < headers.length; j++) {
        var placeholder = "{{" + headers[j] + "}}";
        if (headers[j].toLowerCase() === "email") email = row[j];
        body = body.split(placeholder).join(row[j]);
        subject = subject.split(placeholder).join(row[j]);
      }
      if (email) { GmailApp.sendEmail(email, subject, body); sentCount++; }
    }
    return "Success: Sent " + sentCount + " personalized emails.";
  } catch (e) { return "Error: " + e.message; }
}

function executeDriveFind(args) {
  var query = "title contains '" + args.query + "'";
  if (args.mimeType) query += " and mimeType = '" + args.mimeType + "'";
  var files = DriveApp.searchFiles(query);
  var res = [];
  while (files.hasNext()) { var f = files.next(); res.push(f.getName() + " (" + f.getUrl() + ")"); }
  return res.length > 0 ? res.join("\n") : "No files found.";
}

function executeDriveMove(args) {
  try {
    var file = DriveApp.getFileById(args.fileId);
    file.moveTo(DriveApp.getFolderById(args.destinationFolderId));
    return "Success: File moved.";
  } catch (e) { return "Error: " + e.message; }
}

function executeDriveShare(args) {
  try {
    var file = DriveApp.getFileById(args.fileId);
    if (args.role === "editor") file.addEditor(args.email);
    else if (args.role === "commenter") file.addCommenter(args.email);
    else file.addViewer(args.email);
    return "Success: Shared with " + args.email;
  } catch (e) { return "Error: " + e.message; }
}

function executeDocSummarize(args) {
  try {
    var text = DocumentApp.openById(args.documentId).getBody().getText();
    if (text.length > 10000) text = text.substring(0, 10000);
    return "Document Content: " + text;
  } catch (e) { return "Error: " + e.message; }
}

function executeGmailSearch(args) {
  var threads = GmailApp.search(args.query, 0, args.count || 5);
  return threads.map(function(t) { return t.getFirstMessageSubject() + " (Snippet: " + t.getMessages()[0].getPlainBody().substring(0, 100) + ")"; }).join("\n");
}

function executeGmailGetUnreadCount() {
  return "Unread count: " + GmailApp.getInboxUnreadCount();
}

function executeGmailCheckSent(args) {
  var threads = GmailApp.search("is:sent", 0, args.count || 1);
  return threads.map(function(t) { return "Sent: " + t.getFirstMessageSubject(); }).join("\n");
}

function executeGmailCheckSentDelayed(args) {
  Utilities.sleep(10000);
  var threads = GmailApp.search("is:sent subject:" + args.subject, 0, 1);
  return threads.length > 0 ? "Confirmed: Email found in sent folder." : "Error: Could not find email in sent folder.";
}

function executeCreateDoc(args) {
  var doc = DocumentApp.create(args.title);
  doc.getBody().setText(args.content);
  return "Success: Doc created. URL: " + doc.getUrl();
}

function executeCreateFolder(args) {
  var folder = DriveApp.createFolder(args.name);
  return "Success: Folder created. ID: " + folder.getId();
}

function executeSlidesCreate(args) {
  var pres = SlidesApp.create(args.title);
  return "Success: Slides created. URL: " + pres.getUrl();
}

function executeDriveExportPdf(args) {
  var file = DriveApp.getFileById(args.fileId);
  var pdf = DriveApp.createFile(file.getAs('application/pdf'));
  if (args.outputName) pdf.setName(args.outputName);
  return "Success: PDF created. URL: " + pdf.getUrl();
}

function executeContactsManager(args) {
  if (args.action === "create") {
    ContactsApp.createContact(args.firstName, args.lastName, args.email);
    return "Success: Contact created.";
  }
  var contacts = ContactsApp.getContactsByName(args.query);
  return contacts.map(function(c) { return c.getFullName() + " (" + c.getEmails()[0].getAddress() + ")"; }).join("\n");
}

function executeFormsManager(args) {
  if (args.action === "create") {
    var form = FormApp.create(args.title);
    args.questions.forEach(function(q) { form.addTextItem().setTitle(q); });
    return "Success: Form created. URL: " + form.getEditUrl();
  }
  var responses = FormApp.openById(args.formId).getResponses();
  return "Total responses: " + responses.length;
}

function executeTasksManager(args) {
  if (args.action === "list") {
    var tasks = Tasks.Tasks.list(args.listId || "@default").items;
    return tasks ? tasks.map(function(t) { return t.title; }).join("\n") : "No tasks found.";
  }
  Tasks.Tasks.insert({title: args.title, notes: args.notes}, args.listId || "@default");
  return "Success: Task created.";
}

function executeDriveListAssets(args) {
  var folder = args.folderId ? DriveApp.getFolderById(args.folderId) : DriveApp.getRootFolder();
  var files = folder.getFiles();
  var res = [];
  while (files.hasNext() && res.length < (args.limit || 50)) res.push(files.next().getName());
  return res.join("\n");
}

function executeDriveGetContent(args) {
  var file = DriveApp.getFileById(args.fileId);
  return file.getBlob().getDataAsString();
}

function executePatchDoc(args) {
  var doc = DocumentApp.openById(args.documentId);
  if (args.mode === "append") doc.getBody().appendParagraph(args.replacementText);
  else doc.getBody().replaceText(args.targetText, args.replacementText);
  return "Success: Doc patched.";
}
