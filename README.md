# GAS Orchestrator (HGM Agentic Swarm v4.16.0)

A high-performance, serverless agentic framework built on Google Apps Script (GAS) and powered by Gemini 2.0.

## Overview
This system transforms your Google Workspace into an autonomous digital agency. It utilizes a **"Team of Departments"** architecture to orchestrate 12 specialized departments across your entire digital office—from lead generation and technical audits to invoicing and social media analysis. 

With the **HGM Agentic Swarm** upgrade, the system now features real-time inter-agent communication monitoring, integrated CI/CD automation, and a robust suite of core agentic memory and tracking tools.

## Core Pillars

### 🧠 Intelligence & Memory
- **Campaign Knowledge Base:** Structured shared memory for high-fidelity data passing between departments.
- **Vector Memory Store:** Long-term semantic recall using Google Sheets as a database.
- **Mulch (Expertise Management):** Persistent structured expertise management for agentic conventions and patterns.
- **Canopy (Prompt Management):** Version-controlled prompt template management system.
- **Universal API Ingestion:** Token-efficient ingestion and cleaning for any external API endpoint, accessible via the Research UI.

### ⚙️ Autonomy & Resiliency
- **Deep-Drill Autonomy:** Automatic checkpointing and resumption of missions that exceed Google's 6-minute execution limit.
- **Self-Healing Tools:** Hot-load new capabilities via Drive and allow "Technical R&D" to patch bugs autonomously.
- **Seeds (Issue Tracking):** Integrated agentic issue and task tracking workflow.
- **Sandbox Guardrails:** Strict protocol enforcement to prevent destructive actions or unauthorized branching during rapid prototyping.

### 🚀 CI/CD & Automated Deployment
- **GitHub Integration:** Full bi-directional sync between Google Apps Script and GitHub.
- **Automated Pipeline:** Real-time GitHub Actions (Lint, Typecheck, Test) triggered from the UI.
- **Unit Test Automation (Mock GAS Runner):** A robust Node.js 'vm' module testing harness that executes `.gs` files offline by mocking the GAS global environment.
- **Zero-Downtime Redeployment:** Automated `clasp` deployment that updates the existing Web App version, keeping the public `/exec` URL static while pushing live code.

### 🎯 UI/UX & Real-Time Monitoring
- **HGM Growth Engine:** A futuristic terminal interface for real-time mission monitoring and knowledge management.
- **GitHub Commit Log:** Integrated "COMMITS" sub-tab in the Coding view to track repository changes in real-time.
- **Geo-Intel Interface:** Streamlined geographic visitor telemetry and neural map visualization.
- **Dynamic Context:** Real-time display of system time, strategic context, and logged-in user identity.

## Setup Instructions

### 1. Prerequisites
- A Google Apps Script project.
- A [Google AI Studio](https://aistudio.google.com/) API Key.
- (Recommended) A GitHub Personal Access Token for Version Control features.
- (For CI/CD) A GitHub Secret named `CLASPRC_JSON` and `DEPLOYMENT_ID`.

### 2. Configuration
Set the following **Script Properties** in your project settings:
1.  `GEMINI_API_KEY`: Your Gemini API key.
2.  `GITHUB_TOKEN`: Your GitHub Personal Access Token.
3.  `KNOWLEDGE_BASE_FOLDER_ID`: (Auto-generated on first run) The folder for system documents.

### 3. Usage
Deploy as a Web App to access the **HGM Growth Engine**. Use the **CODING** tab to monitor pipelines and commits, or the **RESEARCH** tab to ingest and curate market intelligence.

---
**Version:** 4.16.0 (HGM Agentic Swarm Edition)
**Last Updated:** March 5, 2026
**Author:** Gemini CLI Agent
---
