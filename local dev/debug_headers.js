function debug_getCRMHeaders() {
  var namesToTry = ["HGM Autonomous CRM", "GAS_CRM_LEADS", "CRM_Leads"];
  var sheetId = null;
  for (var n = 0; n < namesToTry.length; n++) {
    var files = DriveApp.getFilesByName(namesToTry[n]);
    if (files.hasNext()) {
      sheetId = files.next().getId();
      break;
    }
  }
  
  if (!sheetId) {
    var search = DriveApp.searchFiles("title contains 'Autonomous CRM'");
    if (search.hasNext()) {
      sheetId = search.next().getId();
    }
  }
  
  if (!sheetId) return "CRM not found.";
  
  var ss = SpreadsheetApp.openById(sheetId);
  var sheet = ss.getSheetByName("Leads") || ss.getSheets()[0];
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  return JSON.stringify(headers);
}
