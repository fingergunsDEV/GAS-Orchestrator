/**
 * TESTS.gs
 * Automated evaluation and unit tests for the GAS Orchestrator.
 */

function runSystemSuite() {
  var results = {
    manifest: testManifestIntegrity(),
    routing: testDispatcherRouting(),
    api: testApiConnection(),
    gmailTools: testGmailTools(),
    humanApproval: testHumanApprovalSignal(),
    timestamp: new Date().toLocaleString()
  };
  console.log("System Suite Results:", JSON.stringify(results, null, 2));
  return results;
}

/**
 * Ensures all tools in the Manifest exist in the Dispatcher.
 */
function testManifestIntegrity() {
  try {
    var manifest = getManifest();
    var registry = TOOL_REGISTRY;
    var missing = [];
    
    manifest.forEach(function(tool) {
      if (!registry.hasOwnProperty(tool.name)) {
        missing.push(tool.name);
      }
    });
    
    if (missing.length > 0) {
      return { status: "FAIL", message: "Missing tools in Dispatcher: " + missing.join(", ") };
    }
    return { status: "PASS", message: "All " + manifest.length + " tools mapped correctly." };
  } catch (e) {
    return { status: "ERROR", message: e.message };
  }
}

/**
 * Tests Dispatcher routing logic.
 */
function testDispatcherRouting() {
  try {
    // Test a simple tool call
    var result = dispatchToolCall("drive_find_files", { query: "NonExistentFile_12345" });
    if (typeof result === 'string' && result.indexOf("Error") !== -1 && result.indexOf("Missing") === -1) {
       // Only fail if it's a hard error, not a "Missing param" or logical error
       return { status: "FAIL", message: "Dispatcher returned unexpected error: " + result };
    }
    
    // Test invalid tool
    var errorResult = dispatchToolCall("invalid_tool_name", {});
    if (errorResult !== "Error: Tool not found.") {
      return { status: "FAIL", message: "Dispatcher failed to catch invalid tool." };
    }
    
    return { status: "PASS", message: "Routing logic verified." };
  } catch (e) {
    return { status: "ERROR", message: e.message };
  }
}

function testApiConnection() {
  var res = verifyGeminiConnection();
  return { 
    status: res.success ? "PASS" : "FAIL", 
    message: res.message 
  };
}

/**
 * Tests Gmail Tools (Search, Unread Count).
 * Note: Does not actually send emails to avoid spamming.
 */
function testGmailTools() {
  try {
    // 1. Unread Count
    var countRes = dispatchToolCall("gmail_get_unread_count", {});
    if (countRes.indexOf("unread emails") === -1) {
      return { status: "FAIL", message: "gmail_get_unread_count failed: " + countRes };
    }
    
    // 2. Search (Empty Query Test)
    var searchRes = dispatchToolCall("gmail_search", { query: "subject:NONEXISTENT_UNIQUE_STRING_123456789" });
    if (searchRes.indexOf("No email threads found") === -1 && searchRes.indexOf("No emails found") === -1) {
      return { status: "FAIL", message: "gmail_search did not return 'No results' for empty query. Got: " + searchRes };
    }
    
    return { status: "PASS", message: "Gmail tools verified." };
  } catch (e) {
    return { status: "ERROR", message: e.message };
  }
}

/**
 * Tests the SYSTEM_PAUSE mechanism for Human Approval.
 */
function testHumanApprovalSignal() {
  try {
    // We mock the execution by calling the tool directly
    var args = { action: "TEST_ACTION", context: "TEST_CONTEXT" };
    var result = dispatchToolCall("request_human_approval", args);
    
    if (result.indexOf("SYSTEM_PAUSE") !== -1) {
      return { status: "PASS", message: "System correctly signaled pause." };
    } else {
      return { status: "FAIL", message: "System did not return PAUSE signal. Got: " + result };
    }
  } catch (e) {
    return { status: "ERROR", message: e.message };
  }
}

/**
 * Tests the Root Orchestrator's Routing Logic.
 */
function testRootRouting() {
  console.log("Testing Root Orchestrator Routing...");
  
  var testPrompt = "Check my email for things that are due";
  var result = runRootOrchestrator(testPrompt, null, "test_session");
  
  console.log("Result: " + result);
  
  if (result.indexOf("Team Comms Team") !== -1 || result.indexOf("Inbox triage") !== -1) {
    return { status: "PASS", message: "Successfully routed to Comms Team." };
  } else {
    return { status: "FAIL", message: "Routing failed. Received: " + result };
  }
}

/**
 * Evaluates the LLM's reasoning for a specific prompt.
 * Usage: evalPrompt("Draft an email to test@example.com about a meeting.")
 */
function evalPrompt(prompt) {
  var history = [{ role: "user", parts: [{ text: prompt }] }];
  var res = runAgentTurn(history);
  
  console.log("Eval for: " + prompt);
  console.log("Type: " + res.type);
  if (res.toolCalled) console.log("Tool Called: " + res.toolCalled);
  if (res.content) console.log("Text Response: " + res.content);
  
  return res;
}
