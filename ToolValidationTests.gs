/**
 * ToolValidationTests.gs
 * Comprehensive test suite to verify all registered tools.
 */

function runAllToolTests() {
  var report = "TOOL VALIDATION REPORT\n";
  report += "========================\n";
  report += "Timestamp: " + new Date().toLocaleString() + "\n\n";

  var tests = [
    { name: "Workspace: Gmail Unread", func: testWorkspaceGmailUnread },
    { name: "Workspace: Gmail Search", func: testWorkspaceGmailSearch },
    { name: "Workspace: Drive Search", func: testWorkspaceDriveSearch },
    { name: "Workspace: Sheets Info", func: testWorkspaceSheetsInfo },
    { name: "GSC: List Sites", func: testGscListSites },
    { name: "GSC: Get Sitemaps", func: testGscGetSitemaps },
    { name: "GSC: Query Data", func: testGscQuery },
    { name: "GA4: List Properties", func: testGa4ListProperties },
    { name: "GA4: Realtime Check", func: testGa4Realtime },
    { name: "GA4: Pulse Data (UI)", func: testGa4PulseData },
    { name: "Social: Multiplatform Review", func: testSocialMultiplatformReview },
    { name: "Social: YT Analytics", func: testSocialYoutubeAnalytics },
    { name: "Social: FB Analytics", func: testSocialFacebookAnalytics },
    { name: "Social: LinkedIn Analytics", func: testSocialLinkedInAnalytics }
  ];

  var passed = 0;
  tests.forEach(function(t) {
    report += "Testing [" + t.name + "]... ";
    try {
      var res = t.func();
      if (res.status === "PASS") {
        report += "✅ PASS\n";
        passed++;
      } else {
        report += "❌ FAIL\n";
        report += "   Details: " + res.message + "\n";
      }
    } catch (e) {
      report += "💥 CRASHED\n";
      report += "   Error: " + e.message + "\n";
    }
  });

  report += "\n========================\n";
  report += "SUMMARY: " + passed + " / " + tests.length + " Passed.\n";
  
  console.log(report);
  return report;
}

// --- WORKSPACE TESTS ---

function testWorkspaceGmailUnread() {
  var res = dispatchToolCall("gmail_get_unread_count", {});
  if (res.indexOf("Unread count:") !== -1) return { status: "PASS" };
  return { status: "FAIL", message: res };
}

function testWorkspaceGmailSearch() {
  var res = dispatchToolCall("gmail_search", { query: "is:inbox", count: 1 });
  if (res.indexOf("Error") === -1) return { status: "PASS" };
  return { status: "FAIL", message: res };
}

function testWorkspaceDriveSearch() {
  var res = dispatchToolCall("drive_find_files", { query: "GAS_", count: 1 });
  if (res.indexOf("Error") === -1) return { status: "PASS" };
  return { status: "FAIL", message: res };
}

function testWorkspaceSheetsInfo() {
  var res = dispatchToolCall("sheets_get_info", { spreadsheetId: "INVALID_ID" });
  if (res.indexOf("Error") !== -1 || res.indexOf("not found") !== -1) return { status: "PASS", message: "Error handled correctly." };
  return { status: "FAIL", message: "Expected error for invalid ID but got: " + res };
}

// --- GSC TESTS ---

function testGscListSites() {
  var res = dispatchToolCall("gsc_list_sites", {});
  if (res.indexOf("GSC Error") === -1 && res.indexOf("Error") === -1) return { status: "PASS" };
  return { status: "FAIL", message: res };
}

function testGscGetSitemaps() {
  var res = dispatchToolCall("gsc_get_sitemaps", { siteUrl: "https://example.com" });
  if (res.indexOf("GSC Error") === -1 && res.indexOf("Error") === -1) return { status: "PASS" };
  if (res.indexOf("not verified") !== -1 || res.indexOf("No sitemaps") !== -1) return { status: "PASS" };
  return { status: "FAIL", message: res };
}

function testGscQuery() {
  var res = dispatchToolCall("gsc_query", { siteUrl: "https://example.com", startDate: "2024-01-01", endDate: "2024-01-07" });
  if (res.indexOf("Error") === -1 || res.indexOf("No data") !== -1 || res.indexOf("not verified") !== -1) return { status: "PASS" };
  return { status: "FAIL", message: res };
}

// --- GA4 TESTS ---

function testGa4ListProperties() {
  var res = dispatchToolCall("ga4_get_all_properties", {});
  if (res.indexOf("GOOGLE_ANALYTICS_PROPERTIES") !== -1) return { status: "PASS" };
  return { status: "FAIL", message: res };
}

function testGa4Realtime() {
  var res = dispatchToolCall("ga4_realtime_check", {});
  if (res.indexOf("Realtime Active Users") !== -1 || res.indexOf("0 Active Users") !== -1) return { status: "PASS" };
  return { status: "FAIL", message: res };
}

function testGa4PulseData() {
  try {
    var res = getGeoPulseData();
    if (res.error) {
       if (res.error.indexOf("GA4_PROPERTY_ID") !== -1) return { status: "PASS", message: "Function reached, ID missing as expected." };
       return { status: "FAIL", message: res.error };
    }
    if (res.timestamp && res.realtime) return { status: "PASS" };
    return { status: "FAIL", message: "Malformed response: " + JSON.stringify(res) };
  } catch (e) {
    return { status: "FAIL", message: e.message };
  }
}

// --- SOCIAL TESTS ---

function testSocialMultiplatformReview() {
  var res = dispatchToolCall("social_multiplatform_analytics_review", {});
  if (res.indexOf("Error") === -1 && res.length > 50) return { status: "PASS" };
  return { status: "FAIL", message: res };
}

function testSocialYoutubeAnalytics() {
  var res = dispatchToolCall("youtube_analytics_report", { channelId: "MINE" });
  if (res.indexOf("YouTube Report") !== -1 || res.indexOf("Simulated") !== -1) return { status: "PASS" };
  return { status: "FAIL", message: res };
}

function testSocialFacebookAnalytics() {
  var res = dispatchToolCall("social_export_analytics_facebook", { pageId: "me" });
  if (res.indexOf("Facebook Analytics") !== -1 || res.indexOf("Reach") !== -1) return { status: "PASS" };
  return { status: "FAIL", message: res };
}

function testSocialLinkedInAnalytics() {
  var res = dispatchToolCall("social_export_analytics_linkedin", { pageId: "me" });
  if (res.indexOf("LinkedIn Analytics") !== -1 || res.indexOf("Impressions") !== -1) return { status: "PASS" };
  return { status: "FAIL", message: res };
}
