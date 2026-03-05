# GAS Orchestrator (HGM Agentic Swarm v4.17.1)

A high-performance, serverless agentic framework built on Google Apps Script (GAS) and powered by Gemini 2.0.

## Overview
This system transforms your Google Workspace into an autonomous digital agency. It utilizes a **"Team of Departments"** architecture to orchestrate specialized departments across your entire digital office. 

With the **v4.17.1 Architectural Upgrade**, the system has evolved into a self-healing, predictive, and globally accessible agentic loop.

## Core Pillars

### 🧠 Intelligence & Memory
- **Strategy Agent (Predictive BI):** A new high-level persona that analyzes historical CRM and financial data to forecast project timelines and marketing ROI.
- **Automated SEO Scoring:** Real-time merging of GSC and GA4 data to provide actionable "Striking Distance" opportunity scores directly in the UI.
- **Campaign Knowledge Base:** Structured shared memory for high-fidelity data passing.
- **Universal API Ingestion:** Token-efficient ingestion and cleaning for any external API endpoint.

### ⚙️ Autonomy & Resiliency
- **Recursive Tool-Building Engine:** If an agent lacks a capability, the system autonomously dispatches the "Technical R&D" team to scaffold and deploy the missing `.gs` tool.
- **Fail-Safe "Circuit Breakers":** Automated detection of recursive agent loops to prevent quota exhaustion and infinite token drains.
- **Secure Vault:** Encrypted/obfuscated management of third-party API keys within the Google Properties Service.
- **Deep-Drill Autonomy:** Automatic checkpointing and resumption of missions exceeding the 6-minute GAS execution limit.

### 🚀 CI/CD & Self-Evolution
- **Zero-Downtime Redeployment:** Automated `clasp` pipeline that updates existing deployments, keeping your public `/exec` URL static while pushing live code.
- **Robustness Layer:** Automatic cleaning of GitHub secrets (Script/Deployment IDs) to prevent Google API rejection.
- **Unit Test Automation:** Robust Node.js 'vm' module testing harness for offline validation of core logic.

### 🎯 UI/UX & Command Center
- **Floating "Chat-to-Action" Center:** A fixed, mobile-friendly command bar accessible from any dashboard view for instant swarm directives.
- **CI/CD_LINK Indicator:** Real-time deployment status monitoring (PASS/FAIL/RUNNING) integrated into the footer.
- **GitHub Commit History:** Integrated live log of repository changes within the Coding module.
- **Geo-Intel 2.0:** Streamlined geographic visitor telemetry and neural map visualization.

## Setup Instructions

### 1. Prerequisites
- A Google Apps Script project.
- A [Google AI Studio](https://aistudio.google.com/) API Key.
- (Recommended) A GitHub Personal Access Token for Version Control features.
- (For CI/CD) GitHub Secrets: `CLASPRC_JSON`, `SCRIPT_ID`, and `DEPLOYMENT_ID`.

### 2. Configuration
Set the following **Script Properties** in your project settings:
1.  `GEMINI_API_KEY`: Your Gemini API key.
2.  `GITHUB_TOKEN`: Your GitHub Personal Access Token.
3.  `PROJECT_SOURCE_FOLDER_ID`: The Drive folder ID where your standalone `.gs` files are stored for syncing.

### 3. Usage
Deploy as a Web App. Use the floating **Command Center** at the bottom to issue directives, monitor the **PIPELINE** for deployment health, and utilize the **STRATEGY** agent for proactive business management.

---
**Version:** 4.17.1 (HGM Agentic Swarm Edition)
**Last Updated:** March 5, 2026
**Author:** Gemini CLI Agent
---
