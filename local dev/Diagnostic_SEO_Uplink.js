/**
 * Diagnostic_SEO_Uplink.gs
 * Runs direct connection tests to GSC and GA4 APIs to identify auth or permission errors.
 */

function runSeoDiagnostics() {
  var report = "SEO UPLINK DIAGNOSTIC REPORT\n";
  report += "==============================\n";
  report += "Timestamp: " + new Date().toLocaleString() + "\n\n";

  // 1. Test GSC Sites List
  report += "1. GSC: Listing Sites...\n";
  try {
    var gscRes = executeGscListSites();
    report += "Result: " + (gscRes.indexOf("Error") === -1 && gscRes.indexOf("FAILED") === -1 ? "✅ SUCCESS" : "❌ FAILED") + "\n";
    report += "Details: " + gscRes + "\n\n";
  } catch (e) {
    report += "Result: ❌ CRASHED\nDetails: " + e.message + "\n\n";
  }

  // 2. Test GA4 Discovery (List Accounts and Properties)
  report += "2. GA4: Property Discovery...\n";
  try {
    var url = "https://analyticsadmin.googleapis.com/v1alpha/accountSummaries";
    var options = {
      headers: { Authorization: "Bearer " + ScriptApp.getOAuthToken() },
      muteHttpExceptions: true
    };
    var response = UrlFetchApp.fetch(url, options);
    var code = response.getResponseCode();
    var json = JSON.parse(response.getContentText());

    if (code === 200) {
      report += "Result: ✅ SUCCESS\n";
      var summaries = json.accountSummaries || [];
      report += "Found " + summaries.length + " Google Analytics Accounts.\n";
      
      summaries.forEach(function(acc) {
        report += "\nAccount: " + acc.displayName + " (" + acc.account + ")\n";
        if (acc.propertySummaries) {
          acc.propertySummaries.forEach(function(prop) {
            // GA4 property string is usually 'properties/123456789'
            var propId = prop.property.split("/")[1];
            report += "  - Property: " + prop.displayName + " | ID: " + propId + " | Type: " + prop.propertyType + "\n";
          });
        }
      });
    } else {
      report += "Result: ❌ FAILED (HTTP " + code + ")\n";
      report += "Details: " + (json.error ? json.error.message : response.getContentText()) + "\n";
      if (code === 403) {
        report += "ADVICE: Ensure 'Google Analytics Admin API' is ENABLED in your Google Cloud Console and that you have granted 'Analytics Read' permissions.\n";
      }
    }
  } catch (e) {
    report += "Result: ❌ CRASHED\nDetails: " + e.message + "\n";
  }

  // 3. Test GA4 Data API (Realtime Report)
  report += "\n3. GA4: Realtime Data Fetch Test...\n";
  var propId = PropertiesService.getScriptProperties().getProperty("GA4_PROPERTY_ID");
  if (!propId) {
    report += "Result: ❌ FAILED\nDetails: GA4_PROPERTY_ID is not set in Script Properties.\n";
  } else {
    try {
      var url = "https://analyticsdata.googleapis.com/v1beta/properties/" + propId + ":runRealtimeReport";
      var payload = { metrics: [{ name: "activeUsers" }] };
      var options = {
        method: "post",
        contentType: "application/json",
        payload: JSON.stringify(payload),
        headers: { Authorization: "Bearer " + ScriptApp.getOAuthToken() },
        muteHttpExceptions: true
      };
      var response = UrlFetchApp.fetch(url, options);
      var code = response.getResponseCode();
      var json = JSON.parse(response.getContentText());

      if (code === 200) {
        report += "Result: ✅ SUCCESS\n";
        report += "Active Users Found: " + (json.rows ? json.rows[0].metricValues[0].value : "0") + "\n";
      } else {
        report += "Result: ❌ FAILED (HTTP " + code + ")\n";
        report += "Details: " + (json.error ? json.error.message : response.getContentText()) + "\n";
        if (code === 403) {
          report += "ADVICE: Ensure 'Google Analytics Data API' is ENABLED in your Google Cloud Console.\n";
        }
      }
    } catch (e) {
      report += "Result: ❌ CRASHED\nDetails: " + e.message + "\n";
    }
  }

  report += "\n==============================\n";
  report += "ADVICE FOR USERS:\n";
  report += "1. If GSC returns 'No verified sites', ensure the script user has access in Search Console.\n";
  report += "2. If GA4 returns 'No data', verify that you are using the NUMERIC Property ID (e.g. 123456789), NOT the G-XXXX Measurement ID.\n";
  report += "3. If 403 error persists, check 'Project Settings > Script Properties' and ensure 'GEMINI_API_KEY' is valid, and re-authorize the script.\n";
  report += "==============================\n";
  report += "DIAGNOSTIC COMPLETE.";
  
  console.log(report);
  return report;
}

/**
 * Helper to run the test and save to a log file in Drive for the user to see.
 */
function runAndSaveDiagnostics() {
  var report = runSeoDiagnostics();
  var fileName = "SEO_Diagnostic_Report.txt";

  // REVIEW LAYER: Check if technical diagnostic report is strictly necessary in Drive
  var audit = isDocumentNecessary("Run SEO/GSC diagnostic report", "Technical TXT Report", fileName);
  if (!audit.necessary) {
    executeVectorStoreUpsert({ 
      content: "Market Intelligence [SEO DIAGNOSTIC]: " + report.substring(0, 2000), 
      tags: "diagnostics, seo",
      partition: "Market Intelligence"
    });
    return "UI_FEEDBACK: SEO Diagnostics complete. A physical file was NOT created.\n" +
           "REASON: " + audit.reason + "\n\n" +
           "RESULTS:\n" + report + "\n\n" +
           "Note: These findings have been saved to memory for future reference.";
  }
  
  var folder = DriveApp.getRootFolder();
  // Clean up old report
  var oldFiles = folder.getFilesByName(fileName);
  while (oldFiles.hasNext()) { oldFiles.next().setTrashed(true); }
  
  var file = folder.createFile(fileName, report);
  return "Diagnostic finished. Report saved to: " + file.getUrl() + "\n\nReview this file to find the correct Property IDs and verify your site URLs.";
}
