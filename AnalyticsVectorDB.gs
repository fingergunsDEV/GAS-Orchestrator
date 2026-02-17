/**
 * AnalyticsVectorDB.gs
 * Specialized Vector Database for Analytics Data (GA4, GSC, GTM).
 * Uses a separate Google Sheet to store embedding-searchable analytics insights.
 */

var AnalyticsVectorDB = (function() {
  var DB_SHEET_NAME = "GAS_ANALYTICS_VECTOR_DB";

  function getOrCreateSheet() {
    var files = DriveApp.getFilesByName(DB_SHEET_NAME);
    var ss;
    if (files.hasNext()) {
      ss = SpreadsheetApp.open(files.next());
    } else {
      ss = SpreadsheetApp.create(DB_SHEET_NAME);
      var sheet = ss.getSheets()[0];
      // Headers: Timestamp, Source (GA4/GSC/GTM), InsightType (Trend/Alert/Summary), Content, VectorJSON
      sheet.appendRow(["Timestamp", "Source", "Type", "Content", "VectorJSON"]);
      sheet.setFrozenRows(1);
      sheet.hideColumns(5); // Hide vector column
    }
    return ss.getSheets()[0];
  }

  return {
    /**
     * Stores an analytics insight with a vector embedding.
     * @param {Object} args { source: "GA4"|"GSC", type: "Trend", content: "..." }
     */
    saveInsight: function(args) {
      try {
        var sheet = getOrCreateSheet();
        var vector = generateEmbedding(args.content);
        
        var row = [
          new Date().toISOString(),
          args.source || "General",
          args.type || "Insight",
          args.content,
          JSON.stringify(vector)
        ];
        
        sheet.appendRow(row);
        return "Success: Analytics insight saved to vector DB.";
      } catch (e) {
        return "Error saving analytics vector: " + e.message;
      }
    },

    /**
     * Searches for similar analytics insights.
     * @param {string} query The natural language query (e.g., "traffic drop causes")
     */
    searchInsights: function(query) {
      try {
        var sheet = getOrCreateSheet();
        var data = sheet.getDataRange().getValues();
        if (data.length < 2) return "No analytics memories stored yet.";
        
        var queryVector = generateEmbedding(query);
        var matches = [];

        for (var i = 1; i < data.length; i++) {
          var row = data[i];
          var vectorJson = row[4];
          if (vectorJson) {
            try {
              var docVector = JSON.parse(vectorJson);
              var score = getCosineSimilarity(queryVector, docVector);
              if (score > 0.45) { // Slightly higher threshold for data precision
                matches.push({ score: score, text: "[" + row[1] + "] " + row[3] });
              }
            } catch (e) { console.warn("Vector parse error row " + i); }
          }
        }
        
        matches.sort(function(a, b) { return b.score - a.score; });
        var top = matches.slice(0, 5);
        
        if (top.length > 0) {
          return top.map(function(m) { return m.text; }).join("\n");
        } else {
          return "No matching analytics insights found.";
        }
      } catch (e) {
        return "Error searching analytics DB: " + e.message;
      }
    }
  };
})();

/**
 * Re-export cosine similarity helper if not globally available.
 */
function getCosineSimilarity(vecA, vecB) {
  var dotProduct = 0.0;
  var normA = 0.0;
  var normB = 0.0;
  for (var i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  return (normA === 0 || normB === 0) ? 0 : dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

function initAnalyticsDbPlugin() {
  if (typeof PluginManager === 'undefined') return;
  
  PluginManager.register({
    name: "Analytics Vector DB",
    version: "1.0.0",
    description: "Specialized vector storage for GA4/GSC insights.",
    tools: [
      {
        name: "analytics_store_insight",
        description: "Saves a key analytics finding to the Vector DB.",
        parameters: {
          type: "object",
          properties: {
            source: { type: "string", enum: ["GA4", "GSC", "GTM", "General"] },
            type: { type: "string", description: "Category (e.g. Trend, Anomaly)" },
            content: { type: "string", description: "The insight text." }
          },
          required: ["source", "content"]
        }
      },
      {
        name: "analytics_search_history",
        description: "Searches past analytics insights.",
        parameters: {
          type: "object",
          properties: {
            query: { type: "string" }
          },
          required: ["query"]
        }
      }
    ],
    scopes: {
      "DATA_BUILDER": ["analytics_store_insight", "analytics_search_history"],
      "SEO_BUILDER": ["analytics_store_insight", "analytics_search_history"]
    }
  }, {
    "analytics_store_insight": AnalyticsVectorDB.saveInsight,
    "analytics_search_history": function(args) { return AnalyticsVectorDB.searchInsights(args.query); }
  });
}

initAnalyticsDbPlugin();