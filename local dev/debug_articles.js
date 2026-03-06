function debug_listArticlesSheets() {
  var files = DriveApp.getFilesByName("GAS_CONTENT_DATABASE");
  var results = [];
  while (files.hasNext()) {
    var f = files.next();
    var ss = SpreadsheetApp.open(f);
    var sheet = ss.getSheets()[0];
    results.push({
      id: f.getId(),
      name: f.getName(),
      rows: sheet.getLastRow(),
      created: f.getDateCreated().toLocaleDateString()
    });
  }
  return JSON.stringify(results);
}
