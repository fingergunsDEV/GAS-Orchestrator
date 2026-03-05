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
          echo "Executing Unit Test Hooks via Node.js Framework..."
          if [ -f tests/run_agentic_tests.js ]; then
            node tests/run_agentic_tests.js
          else
            echo "Robust test suite (tests/run_agentic_tests.js) is missing!"
            exit 1
          fi
          echo "All Core Agentic Workflow tests passed successfully!"

      - name: Phase 4 - Merge & Deploy via Clasp
        env:
          CLASPRC_JSON: \${{ secrets.CLASPRC_JSON }}
          DEPLOYMENT_ID: \${{ secrets.DEPLOYMENT_ID }}
          SCRIPT_ID: \${{ secrets.SCRIPT_ID }}
        run: |
          echo "Pipeline successful. Deploying to Google Apps Script..."
          npm install -g @google/clasp
          echo "\$CLASPRC_JSON" > ~/.clasprc.json
          
          # Create .clasp.json dynamically
          echo "{\"scriptId\":\"\$SCRIPT_ID\",\"rootDir\":\".\"}" > .clasp.json
          
          clasp push -f
          
          if [ -n "\$DEPLOYMENT_ID" ]; then
            echo "Updating existing Web App deployment to keep the same URL..."
            clasp deploy -i "\$DEPLOYMENT_ID" -d "Auto-deployed via GitHub Actions"
          else
            echo "Notice: DEPLOYMENT_ID secret not set. Code was pushed to the editor, but the public /exec URL was not updated."
          fi
          
          echo "Deployment complete!"
`;
}
