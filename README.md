# GAS Orchestrator (HGM Agentic Swarm v4.15.0)

A high-performance, serverless agentic framework built on Google Apps Script (GAS) and powered by Gemini 2.0.

## Overview
This system transforms your Google Workspace into an autonomous digital agency. It utilizes a **"Team of Departments"** architecture to orchestrate 12 specialized departments across your entire digital office—from lead generation and technical audits to invoicing and social media analysis. 

With the **HGM Agentic Swarm** upgrade, the system now features real-time inter-agent communication monitoring, integrated CI/CD capabilities, and a robust suite of core agentic memory and tracking tools.

## Core Pillars

### 🧠 Intelligence & Memory
- **Campaign Knowledge Base:** Structured shared memory for high-fidelity data passing between departments.
- **Vector Memory Store:** Long-term semantic recall using Google Sheets as a database.
- **Mulch (Expertise Management):** Persistent structured expertise management for agentic conventions and patterns.
- **Canopy (Prompt Management):** Version-controlled prompt template management system.
- **API Ingestion:** Universal, token-efficient API data ingestion and cleaning for agents.

### ⚙️ Autonomy & Resiliency
- **Deep-Drill Autonomy:** Automatic checkpointing and resumption of missions that exceed Google's 6-minute execution limit.
- **Self-Healing Tools:** Hot-load new capabilities via Drive and allow the "Technical R&D" to patch bugs autonomously.
- **Seeds (Issue Tracking):** Integrated agentic issue and task tracking workflow.
- **Sandbox Guardrails:** Strict protocol enforcement to prevent destructive actions or unauthorized branching during rapid prototyping.

### 🚀 CI/CD & Version Control
- **GitHub Integration:** The Coding Engine can sync the GAS codebase directly to GitHub.
- **Automated Pipelines:** Trigger real GitHub Actions workflows (Lint, Typecheck, Test) directly from the UI.
- **Unit Test Automation:** Autonomous pipeline testing for core workflows (Mulch, Seeds, Canopy).

### 🎯 Lead Generation Suite
- **Intent Radar:** Scans social platforms for active business problems.
- **Vision Audit:** multimodal design critiques using Gemini Vision.
- **Semantic Scoring:** Mathematically ranks leads against your Ideal Customer Profile (ICP).

## Setup Instructions

### 1. Prerequisites
- A Google Apps Script project.
- A [Google AI Studio](https://aistudio.google.com/) API Key.
- (Recommended) A GitHub Personal Access Token for Version Control features.

### 2. Configuration
Set the following **Script Properties** in your project settings:
1.  `GEMINI_API_KEY`: Your Gemini API key.
2.  `GITHUB_TOKEN`: Your GitHub Personal Access Token.
3.  `KNOWLEDGE_BASE_FOLDER_ID`: (Auto-generated on first run) The folder for system documents.

### 3. Usage
Deploy as a Web App to access the **HGM Growth Engine**, a futuristic terminal interface for real-time mission monitoring, pipeline tracking, and knowledge management.

---
**Version:** 4.15.0 (HGM Agentic Swarm Edition)
**Last Updated:** March 4, 2026
**Author:** Gemini CLI Agent