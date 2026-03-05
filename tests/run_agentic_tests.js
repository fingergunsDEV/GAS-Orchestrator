const fs = require('fs');
const path = require('path');
const vm = require('vm');

// ============================================
// MOCK GOOGLE APPS SCRIPT (GAS) ENVIRONMENT
// ============================================
global.__MOCK_PROPS__ = {};
global.PropertiesService = {
  getScriptProperties: () => ({
    getProperty: (key) => global.__MOCK_PROPS__[key] || null,
    setProperty: (key, value) => { global.__MOCK_PROPS__[key] = value; }
  })
};

global.__REGISTERED_TOOLS__ = {};
global.CoreRegistry = {
  register: (name, tools, implementations, scopes, team) => {
    global.__REGISTERED_TOOLS__[name] = { tools, implementations, scopes, team };
  }
};

// Mock telemetry / logging
global.logSwarmMessage = (sessionId, from, to, action, message) => {
  // Silent in tests unless debugging
};

// Helper to load .gs files dynamically
const loadScript = (filename) => {
  const filepath = path.join(__dirname, '..', filename);
  if (!fs.existsSync(filepath)) {
    throw new Error(`File not found: ${filepath}`);
  }
  const code = fs.readFileSync(filepath, 'utf8');
  vm.runInThisContext(code, { filename });
};

console.log("🚀 Initializing UNIT_TEST_AUTOMATION Blueprint...");
loadScript('Mulch.gs');
loadScript('Seeds.gs');
loadScript('Canopy.gs');

let passed = 0;
let failed = 0;

const assert = (condition, message) => {
  if (!condition) {
    console.error(`❌ FAIL: ${message}`);
    failed++;
  } else {
    console.log(`✅ PASS: ${message}`);
    passed++;
  }
};

try {
  console.log("\n--- Validating Mulch.gs (Expertise Memory) ---");
  registerMulchTools();
  assert(global.__REGISTERED_TOOLS__["Mulch"] !== undefined, "Mulch should register with CoreRegistry");
  const mulchImpls = global.__REGISTERED_TOOLS__["Mulch"].implementations;
  
  const recordRes = JSON.parse(mulchImpls["mulch_record"]({ type: "convention", description: "Test convention", sessionId: "test-session" }));
  assert(recordRes.success === true, "mulch_record should return success");
  
  const primeRes = JSON.parse(mulchImpls["mulch_prime"]({}));
  assert(primeRes.success === true && primeRes.count === 1, "mulch_prime should retrieve the recorded convention");

  console.log("\n--- Validating Seeds.gs (Issue Tracker) ---");
  registerSeedsTools();
  assert(global.__REGISTERED_TOOLS__["Seeds"] !== undefined, "Seeds should register with CoreRegistry");
  const seedsImpls = global.__REGISTERED_TOOLS__["Seeds"].implementations;
  
  const createSeedRes = JSON.parse(seedsImpls["seeds_create"]({ title: "Test Bug", description: "This is a test bug", sessionId: "test-session" }));
  assert(createSeedRes.success === true, "seeds_create should return success");
  
  const updateSeedRes = JSON.parse(seedsImpls["seeds_update"]({ id: createSeedRes.seed.id, status: "closed", notes: "Fixed", sessionId: "test-session" }));
  assert(updateSeedRes.success === true && updateSeedRes.seed.status === "closed", "seeds_update should correctly modify status");

  const listSeedRes = JSON.parse(seedsImpls["seeds_list"]({ status: "closed" }));
  assert(listSeedRes.success === true && listSeedRes.count === 1, "seeds_list should correctly filter by status");

  console.log("\n--- Validating Canopy.gs (Prompt Management) ---");
  registerCanopyTools();
  assert(global.__REGISTERED_TOOLS__["Canopy"] !== undefined, "Canopy should register with CoreRegistry");
  const canopyImpls = global.__REGISTERED_TOOLS__["Canopy"].implementations;
  
  const saveCanopyRes = JSON.parse(canopyImpls["canopy_save"]({ name: "TestPrompt", content: "You are a test.", sessionId: "test-session" }));
  assert(saveCanopyRes.success === true, "canopy_save should return success");
  
  const loadCanopyRes = JSON.parse(canopyImpls["canopy_load"]({ name: "TestPrompt" }));
  assert(loadCanopyRes.success === true && loadCanopyRes.template.content === "You are a test.", "canopy_load should return the correct content");

  console.log(`\n=== UNIT TEST SUMMARY ===`);
  console.log(`Passed: ${passed} | Failed: ${failed}\n`);
  
  if (failed > 0) {
    process.exit(1);
  }
} catch (e) {
  console.error("💥 Test execution crashed: ", e);
  process.exit(1);
}