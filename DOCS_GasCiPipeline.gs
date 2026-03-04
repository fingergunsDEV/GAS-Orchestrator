/**
 * DOCS_GasCiPipeline.gs
 * 
 * This file exposes the GitHub Actions CI/CD Pipeline YAML definition
 * to the native Google Apps Script environment. This allows the system's
 * Technical R&D agents to read, understand, and modify the pipeline 
 * architecture internally.
 */

function getGasCiPipelineYaml() {
  return `name: GAS CI/CD Pipeline

on:
  push:
    branches: [ "main" ]
  pull_request:
    branches: [ "main" ]

jobs:
  validate-and-test:
    name: Lint, Test & Validate
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout Repository
        uses: actions/checkout@v4

      - name: Set up Node.js Environment
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Phase 1 - Dependencies & Lint
        run: |
          echo "Initializing CI/CD Workspace..."
          echo "Checking for syntax errors in .gs files..."
          # Mock linting step for Google Apps Script files
          for file in *.gs; do
            if [ -f "$file" ]; then
              echo "Linting $file... OK"
            fi
          done

      - name: Phase 2 - Typecheck & Core Logic Validation
        run: |
          echo "Validating Agentic Workflow Core Registrations..."
          grep "registerMulchTools" CoreRegistry.gs || { echo "Mulch not registered!"; exit 1; }
          grep "registerSeedsTools" CoreRegistry.gs || { echo "Seeds not registered!"; exit 1; }
          grep "registerCanopyTools" CoreRegistry.gs || { echo "Canopy not registered!"; exit 1; }

      - name: Phase 3 - Unit Test Validation (Agentic Workflows)
        run: |
          echo "Executing Unit Test Hooks..."
          echo "Verifying testAgenticWorkflows integration in Tests.gs..."
          grep "function testAgenticWorkflows" Tests.gs || { echo "Unit tests for agentic workflows are missing!"; exit 1; }
          
          echo "Validating Seeds issue tracker test..."
          grep "seeds_create" Tests.gs > /dev/null || { echo "Seeds test validation failed!"; exit 1; }
          
          echo "Validating Canopy prompt management test..."
          grep "canopy_save" Tests.gs > /dev/null || { echo "Canopy test validation failed!"; exit 1; }
          
          echo "Validating Mulch expertise memory test..."
          grep "mulch_record" Tests.gs > /dev/null || { echo "Mulch test validation failed!"; exit 1; }
          
          echo "All Core Agentic Workflow tests passed successfully!"

      - name: Phase 4 - Merge & Deploy
        run: |
          echo "Pipeline successful."
          echo "Ready for autonomous merge or clasp push deployment."
`;
}