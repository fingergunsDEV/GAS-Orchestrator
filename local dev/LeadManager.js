/**
 * LeadManager.gs
 * Handles CRM lead management, spreadsheet operations, and Excel syncing.
 */

var MAPPING_SHEET_NAME = "SYSTEM_MAPPING";

/**
 * CORE_CRM_SYNC_ENGINE
 * Fetches all leads from the CRM spreadsheet.
 * Uses a separate mapping sheet to track IDs without duplicating data rows.
 */
function core_getLeadsFromCrm() {
  try {
    var props = PropertiesService.getScriptProperties();
    var sheetId = props.getProperty("CRM_SHEET_ID") || props.getProperty("CRM_Sheet_ID") || props.getProperty("crm_sheet_id");
    
    if (!sheetId) {
      // Robust Auto-discovery
      var namesToTry = ["HGM Autonomous CRM", "GAS_CRM_LEADS", "CRM_Leads"];
      for (var n = 0; n < namesToTry.length; n++) {
        var files = DriveApp.getFilesByName(namesToTry[n]);
        if (files.hasNext()) {
          var f = files.next();
          sheetId = f.getId();
          props.setProperty("CRM_SHEET_ID", sheetId);
          console.log("[LeadManager] Auto-discovered CRM: " + namesToTry[n]);
          break;
        }
      }
      
      // Secondary search if direct name fails
      if (!sheetId) {
        var search = DriveApp.searchFiles("title contains 'Autonomous CRM'");
        if (search.hasNext()) {
          var f = search.next();
          sheetId = f.getId();
          props.setProperty("CRM_SHEET_ID", sheetId);
        }
      }
    }

    if (!sheetId) return [];

    var ss = SpreadsheetApp.openById(sheetId);
    var sheet = ss.getSheetByName("Leads") || ss.getSheets()[0]; 
    var data = sheet.getDataRange().getValues();
    if (data.length < 2) return [];

    var headers = data[0];
    var leads = [];

    // Ensure mapping sheet exists
    var mappingSheet = ss.getSheetByName(MAPPING_SHEET_NAME);
    if (!mappingSheet) {
      mappingSheet = ss.insertSheet(MAPPING_SHEET_NAME);
      mappingSheet.appendRow(["Lead ID", "Original Row", "Identifier (Email/Company)"]);
      mappingSheet.setFrozenRows(1);
    }
    
    var mappingData = mappingSheet.getDataRange().getValues();
    var idMap = {}; // Key: Email/Company, Value: ID
    for (var m = 1; m < mappingData.length; m++) {
      idMap[mappingData[m][2]] = mappingData[m][0];
    }

    var needsMappingUpdate = false;
    var newMappings = [];

    for (var i = 1; i < data.length; i++) {
      var row = data[i];
      var lead = {};
      
      // Basic identifier for mapping (Prefer Email, fallback to Company)
      var emailVal = "";
      var companyVal = "";
      
      for (var j = 0; j < headers.length; j++) {
        var rawHeader = headers[j].toString().trim();
        var key = rawHeader.toLowerCase().replace(/ /g, "_");
        var val = row[j];

        // NORMALIZE KEYS based on screenshot headers
        if (key === "first_name") key = "contact_name";
        if (key === "qualification") key = "status";
        if (key === "buying_signals") key = "budget_intel"; 
        if (key === "seo_score") key = "seo_score";
        if (key === "composite_score") key = "score";
        if (key === "estimated_value" || key === "value" || key === "budget" || key === "deal_value") key = "budget";
        if (key === "website" || key === "url") key = "website";
        if (key === "location" || key === "city" || key === "hq") key = "location";
        if (key === "issues" || key === "audit_results") key = "audit_results";
        
        // Capture identifiers
        if (key === "email") emailVal = val;
        if (key === "company") companyVal = val;

        lead[key] = val;
      }
      
      // Secondary normalization: If audit_results is empty but tech_stack/positives exist, use them
      if (!lead.audit_results && (lead.issues || lead.positives || lead.tech_stack)) {
        lead.audit_results = (lead.issues || "") + " // " + (lead.tech_stack || "");
      }
      
      // COLUMN V (Index 21) OVERRIDE: Primary Budget Source
      if (row.length >= 22) {
        var colV = row[21];
        if (colV !== undefined && colV !== null && colV !== "") {
          lead.budget = colV;
        }
      }
      
      // ASSIGN OR GENERATE ID
      var identifier = (emailVal && emailVal !== "Not Found") ? emailVal : companyVal;
      if (idMap[identifier]) {
        lead.lead_id = idMap[identifier];
      } else {
        var newId = "L-" + Utilities.getUuid().substring(0, 8).toUpperCase();
        lead.lead_id = newId;
        idMap[identifier] = newId;
        newMappings.push([newId, i + 1, identifier]);
        needsMappingUpdate = true;
      }
      
      lead.rowIndex = i + 1; 
      leads.push(lead);
    }

    // Flush new mappings to the sheet in one go
    if (needsMappingUpdate) {
      mappingSheet.getRange(mappingSheet.getLastRow() + 1, 1, newMappings.length, 3).setValues(newMappings);
    }

    return leads;
  } catch (e) {
    console.error("Error in core_getLeads: " + e.message);
    return [];
  }
}

/**
 * CORE_CRM_IMPORT_ENGINE
 * Refactored to prevent duplication.
 */
function core_importLeadsFromSourceFile(fileIdOrName) {
  try {
    var excelFile = null;
    var isLikelyId = /^[a-zA-Z0-9\-_]{20,60}$/.test(fileIdOrName);
    
    if (isLikelyId) {
      try { excelFile = safeGetFileById(fileIdOrName); } catch (e) {}
    }
    
    if (!excelFile) {
      var files = DriveApp.getFilesByName(fileIdOrName);
      if (files.hasNext()) excelFile = files.next();
    }
    
    if (!excelFile) return "Error: Could not find source file: " + fileIdOrName;
    
    // If the file is already our CRM, we don't "import", we just "sync"
    var props = PropertiesService.getScriptProperties();
    var targetId = props.getProperty("CRM_SHEET_ID");
    if (excelFile.getId() === targetId) {
      core_getLeadsFromCrm(); // This will generate IDs in the mapping sheet
      return "Success: CRM synchronized. No duplicates created.";
    }

    // Traditional Import (from external file)
    // ... logic would go here to carefully merge into main sheet ...
    return "External import active. Please use sync for existing CRM files.";
  } catch (e) {
    return "Error: " + e.message;
  }
}

/**
 * Helper to find a column by name heuristics.
 */
function core_findColumnInHeaders(headers, row, keywords) {
  for (var i = 0; i < headers.length; i++) {
    var h = headers[i].toString().toLowerCase();
    for (var k = 0; k < keywords.length; k++) {
      if (h.indexOf(keywords[k]) !== -1) return row[i];
    }
  }
  return null;
}

/**
 * CORE_CRM_UPDATE_ENGINE
 * Updates a specific lead in the CRM sheet by finding its row from the ID.
 */
function core_updateCrmLead(leadId, updates) {
  try {
    var props = PropertiesService.getScriptProperties();
    var sheetId = props.getProperty("CRM_SHEET_ID");
    var ss = SpreadsheetApp.openById(sheetId);
    var mappingSheet = ss.getSheetByName(MAPPING_SHEET_NAME);
    
    if (!mappingSheet) return "Error: Mapping sheet missing.";
    
    var mappingData = mappingSheet.getDataRange().getValues();
    var rowIndex = -1;
    for (var i = 1; i < mappingData.length; i++) {
      if (mappingData[i][0] === leadId) {
        rowIndex = mappingData[i][1];
        break;
      }
    }
    
    if (rowIndex === -1) return "Error: Lead ID mapping not found.";
    
    var sheet = ss.getSheets()[0];
    var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    
    for (var key in updates) {
      var colIndex = -1;
      // Map internal keys back to sheet headers
      var targetHeaders = [key];
      if (key === "contact_name") targetHeaders.push("first_name", "contact");
      if (key === "status") targetHeaders.push("qualification");
      if (key === "audit_results") targetHeaders.push("issues", "audit intel");
      if (key === "budget") targetHeaders.push("estimated_value", "value", "deal_value");
      
      for (var j = 0; j < headers.length; j++) {
        var h = headers[j].toLowerCase().replace(/ /g, "_");
        var found = false;
        for (var t = 0; t < targetHeaders.length; t++) {
          if (h === targetHeaders[t].toLowerCase().replace(/ /g, "_")) {
            colIndex = j + 1;
            found = true;
            break;
          }
        }
        if (found) break;
      }
      if (colIndex !== -1) {
        sheet.getRange(rowIndex, colIndex).setValue(updates[key]);
      }
    }
    
    return "Success: Lead updated.";
  } catch (e) {
    return "Error: " + e.message;
  }
}
