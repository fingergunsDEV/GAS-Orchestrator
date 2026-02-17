# GAS Orchestrator (Agency Edition v4.0)

A high-performance, serverless agentic framework built on Google Apps Script (GAS) and powered by Gemini 2.0.

## Overview
This system transforms your Google Workspace into an autonomous digital agency. It utilizes a **"Team of Teams"** architecture to orchestrate 12 specialized departments across your entire digital office—from lead generation and technical audits to invoicing and social media analysis.

## Core Pillars

### 🧠 Intelligence & Memory
- **Neural Blackboard:** Structured shared memory for high-fidelity data passing between teams.
- **Vector Memory Store:** Long-term semantic recall using Google Sheets as a database.
- **Persona Engine:** Activate specialized professional voices (e.g., @Architect) for brand-consistent output.

### ⚙️ Autonomy & Resiliency
- **Deep-Drill Autonomy:** Automatic checkpointing and resumption of missions that exceed Google's 6-minute execution limit.
- **Self-Healing Tools:** Hot-load new capabilities via Drive and allow the "Dev Team" to patch bugs autonomously.
- **Builder / Validator Loop:** Rigorous quality control on every task attempt.

### 🎯 Lead Generation Suite
- **Intent Radar:** Scans social platforms for active business problems.
- **Vision Audit:** multimodal design critiques using Gemini Vision.
- **Semantic Scoring:** Mathematically ranks leads against your Ideal Customer Profile (ICP).

## Setup Instructions

### 1. Prerequisites
- A Google Apps Script project.
- A [Google AI Studio](https://aistudio.google.com/) API Key.
- (Recommended) A [ScreenshotOne](https://screenshotone.com/) API Key for visual audits.

### 2. Configuration
Set the following **Script Properties** in your project settings:
1.  `GEMINI_API_KEY`: Your Gemini API key.
2.  `SCREENSHOTONE_API_KEY`: (Optional) For vision audits.
3.  `KNOWLEDGE_BASE_FOLDER_ID`: (Auto-generated on first run) The folder for system documents.

### 3. Usage
Deploy as a Web App to access the **Nexus Dashboard**, a futuristic terminal interface for real-time mission monitoring and knowledge management.

---
**Version:** 4.0 (Agency Edition)
**Last Updated:** February 4, 2026
**Author:** Gemini CLI Agent