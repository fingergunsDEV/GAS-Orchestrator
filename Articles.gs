/**
 * Articles.gs
 * Manages the Content Database (Articles, Docs, Performance).
 * Stores article metadata in a dedicated Google Sheet.
 */

function pingArticles() {
  return { status: "success", timestamp: new Date().toISOString(), message: "Articles module is online." };
}

var Articles = (function() {
  var DB_SHEET_NAME = "GAS_CONTENT_DATABASE";

  function getOrCreateSheet() {
    var props = PropertiesService.getScriptProperties();
    var targetId = "1CmPOA4dnQ4pWrNMTxSnFYNBK0wim3d45FzGQ_oRgZKc";
    
    try {
      var ss = SpreadsheetApp.openById(targetId);
      if (ss) return ss.getSheets()[0];
    } catch (e) {
      console.warn("Direct ID access failed: " + e.message);
    }

    var files = DriveApp.getFilesByName(DB_SHEET_NAME);
    var ss;
    if (files.hasNext()) {
      ss = SpreadsheetApp.open(files.next());
    } else {
      ss = SpreadsheetApp.create(DB_SHEET_NAME);
      var sheet = ss.getSheets()[0];
      sheet.appendRow(["ID", "Title", "DocURL", "PublishedURL", "PublishDate", "Status", "Keywords", "Notes"]);
      sheet.setFrozenRows(1);
    }
    
    props.setProperty("ARTICLES_SHEET_ID", ss.getId());
    return ss.getSheets()[0];
  }

  return {
    saveArticle: function(args) {
      try {
        var sheet = getOrCreateSheet();
        var data = sheet.getDataRange().getValues();
        var id = args.id || ("ART_" + Utilities.getUuid().substring(0, 8));
        var rowIndex = -1;

        var title = args.title || "";
        var docUrl = args.docUrl || args.docurl || "";
        var publishedUrl = args.publishedUrl || args.publishedurl || "";

        var existingRow = null;
        for (var i = 1; i < data.length; i++) {
          if (data[i][0] === id) {
            rowIndex = i + 1;
            existingRow = data[i];
            break;
          }
        }

        var finalTitle = title || (existingRow ? existingRow[1] : "Untitled Article");
        var finalDocUrl = docUrl || (existingRow ? existingRow[2] : "");
        var finalPublishedUrl = publishedUrl || (existingRow ? existingRow[3] : "");
        var status = finalPublishedUrl ? "Live" : "Draft";
        
        var publishDate = args.publishDate || args.publishdate;
        if (!publishDate && existingRow) publishDate = existingRow[4];
        if (!publishDate && finalPublishedUrl) publishDate = new Date().toLocaleDateString();

        var row = [
          id,
          finalTitle,
          finalDocUrl,
          finalPublishedUrl,
          publishDate || "",
          status,
          args.keywords || (existingRow ? existingRow[6] : ""),
          args.notes || (existingRow ? existingRow[7] : "")
        ];

        if (rowIndex > 0) {
          sheet.getRange(rowIndex, 1, 1, row.length).setValues([row]);
        } else {
          sheet.appendRow(row);
        }

        // Upsert to Vector Store for semantic search
        if (typeof executeVectorStoreUpsert !== 'undefined') {
          executeVectorStoreUpsert({
            content: "Content Intelligence [" + finalTitle + "]: " + (args.notes || "No additional notes."),
            tags: "article, " + status.toLowerCase(),
            partition: "Content Intelligence"
          });
        }

        return { status: "success", id: id };
      } catch (e) {
        return { status: "error", message: e.message };
      }
    },

    getArticles: function() {
      try {
        var sheet = getOrCreateSheet();
        if (!sheet) return { status: "error", error: "Could not locate spreadsheet." };
        
        var ss = sheet.getParent();
        var data = sheet.getDataRange().getValues();
        
        if (data.length < 2) {
          return { status: "success", articles: [], message: "No articles found in sheet.", sourceId: ss.getId(), sourceUrl: ss.getUrl() };
        }

        var headers = data[0];
        var articles = [];

        for (var i = 1; i < data.length; i++) {
          var row = data[i];
          if (!row[0] && !row[1]) continue;

          var obj = {};
          for (var j = 0; j < headers.length; j++) {
            var h = (headers[j] || "").toString().toLowerCase().trim();
            var val = row[j];
            
            if (val instanceof Date) {
              val = val.toLocaleDateString();
            } else if (val === null || val === undefined) {
              val = "";
            } else {
              val = val.toString();
            }

            obj[h] = val;
            if (h === "docurl") obj.docUrl = val;
            if (h === "publishedurl") obj.publishedUrl = val;
            if (h === "publishdate") obj.publishDate = val;
          }
          if (!obj.id) obj.id = "R" + i;
          articles.push(obj);
        }

        return { 
          status: "success", 
          articles: articles, 
          sourceUrl: ss.getUrl(),
          sourceId: ss.getId()
        };
      } catch (e) {
        return { status: "error", error: e.toString() };
      }
    },

    deleteArticle: function(id) {
      try {
        var sheet = getOrCreateSheet();
        var data = sheet.getDataRange().getValues();
        for (var i = 1; i < data.length; i++) {
          if (data[i][0] === id) {
            sheet.deleteRow(i + 1);
            return "Success: Article deleted.";
          }
        }
        return "Error: Article not found.";
      } catch (e) {
        return "Error: " + e.message;
      }
    }
  };
})();

function getArticles() { return Articles.getArticles(); }
function saveArticle(args) { return Articles.saveArticle(args); }
function deleteArticle(id) { return Articles.deleteArticle(id); }

function initArticlesPlugin() {
  if (typeof PluginManager === 'undefined') return;
  PluginManager.register({
    name: "Content Database Manager",
    version: "1.2.0",
    description: "Manages a database of written articles and their performance.",
    tools: [
      {
        name: "save_article",
        description: "Adds or updates an article in the content database.",
        parameters: {
          type: "object",
          properties: {
            title: { type: "string" },
            docUrl: { type: "string" },
            publishedUrl: { type: "string" },
            keywords: { type: "string" }
          },
          required: ["title"]
        }
      },
      {
        name: "get_articles",
        description: "Lists all stored articles.",
        parameters: { type: "object", properties: {}, required: [] }
      }
    ],
    scopes: {
      "CONTENT_BUILDER": ["save_article", "get_articles"],
      "SEO_BUILDER": ["get_articles"]
    }
  }, {
    "save_article": Articles.saveArticle,
    "get_articles": Articles.getArticles
  });
}

initArticlesPlugin();
