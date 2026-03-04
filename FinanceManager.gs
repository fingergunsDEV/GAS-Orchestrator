/**
 * FinanceManager.gs
 * Tracks system costs, token usage, and CRM-linked ROI.
 */

var FinanceManager = (function() {
  var LOG_SHEET_NAME = "GAS_SYSTEM_FINANCE_LOG";
  
  function getOrCreateSheet() {
    var files = DriveApp.getFilesByName(LOG_SHEET_NAME);
    var ss;
    if (files.hasNext()) {
      ss = SpreadsheetApp.open(files.next());
    } else {
      ss = SpreadsheetApp.create(LOG_SHEET_NAME);
      var sheet = ss.getSheets()[0];
      sheet.appendRow(["Timestamp", "Type", "Details", "Tokens_In", "Tokens_Out", "Cost_Est", "Value_Gain"]);
      sheet.setFrozenRows(1);
    }
    return ss.getSheets()[0];
  }

  return {
    /**
     * Logs API usage cost.
     */
    logUsage: function(tokensIn, tokensOut, model) {
      try {
        var sheet = getOrCreateSheet();
        // Estimated costs per 1M tokens (Flash vs Pro)
        var rateIn = model.includes("pro") ? 3.50 : 0.10;
        var rateOut = model.includes("pro") ? 10.50 : 0.40;
        
        var cost = ((tokensIn / 1000000) * rateIn) + ((tokensOut / 1000000) * rateOut);
        
        sheet.appendRow([
          new Date(),
          "API_USAGE",
          model,
          tokensIn,
          tokensOut,
          cost.toFixed(6),
          0
        ]);
      } catch (e) {
        console.error("Finance log failed: " + e.message);
      }
    },

    /**
     * Fetches aggregated metrics for the dashboard.
     */
    getMetrics: function() {
      try {
        var sheet = getOrCreateSheet();
        var data = sheet.getDataRange().getValues();
        var totalCost = 0;
        var totalTokens = 0;
        
        for (var i = 1; i < data.length; i++) {
          totalTokens += (data[i][3] || 0) + (data[i][4] || 0);
          totalCost += parseFloat(data[i][5] || 0);
        }

        // Fetch Pipeline Value from Leads
        var pipelineValue = 0;
        if (typeof getLeads === 'function') {
          var leads = getLeads();
          leads.forEach(function(l) {
            // Clean currency string (e.g. "$5,000.00" -> 5000.00)
            var rawBudget = l.budget ? l.budget.toString().replace(/[$,]/g, "") : "0";
            var leadBudget = parseFloat(rawBudget) || 0;
            
            var status = (l.status || "").toLowerCase();
            
            // PRIORITY 1: Use actual budget if provided
            if (leadBudget > 0) {
              if (status === 'closed') {
                pipelineValue += leadBudget;
              } else if (status === 'hot' || status === 'proposal' || status === 'qualified') {
                pipelineValue += leadBudget; 
              } else if (status === 'warm' || status === 'interested?') {
                pipelineValue += (leadBudget * 0.5); 
              } else if (status === 'nurture' || status === 'audited') {
                pipelineValue += (leadBudget * 0.2); 
              } else {
                pipelineValue += (leadBudget * 0.1); // Default low probability
              }
            } 
            // PRIORITY 2: Fallback to baseline estimates if no budget specified
            else {
              if (status === 'hot' || status === 'proposal') {
                pipelineValue += 5000;
              } else if (status === 'warm' || status === 'interested?') {
                pipelineValue += 2500;
              } else if (status === 'closed') {
                pipelineValue += 10000;
              }
            }
          });
        }

        return {
          totalCost: totalCost.toFixed(2),
          totalTokens: totalTokens,
          pipelineValue: pipelineValue.toFixed(2),
          roiFactor: pipelineValue > 0 ? (pipelineValue / (totalCost || 1)).toFixed(1) : 0,
          lastUpdated: new Date().toLocaleTimeString()
        };
      } catch (e) {
        return { totalCost: 0, pipelineValue: 0, error: e.message };
      }
    }
  };
})();

/**
 * Exposed for UI
 */
function getFinanceMetrics() { return FinanceManager.getMetrics(); }
