# GAS Agentic Orchestrator (Gemini Powered)

## Overview
The **GAS Agentic Orchestrator** is a serverless, hierarchical multi-agent system built entirely within the Google Apps Script (GAS) ecosystem. It transforms a standard Google Workspace environment into an intelligent "Operating System" where users can issue natural language commands (text or multimodal) to control their digital office.

Unlike simple chatbots, this system is an **Agentic Framework** that utilizes **Gemini 1.5/2.0** models to reason, plan, and actively manipulate data across Gmail, Drive, Docs, Sheets, Calendar, Tasks, and external APIs.

## Key Features

### 1. Multi-Agent "Team of Teams" Architecture
Instead of a single generalist agent, the system deploys **12 Specialized Teams** to handle specific domains. Each team consists of a **Builder** (who does the work) and a **Validator** (who checks the work).

*   **Research Team:** Deep web search, competitor analysis, fact-checking.
*   **Content Team:** Creates Slides, Docs, PDFs, and translations.
*   **Ops Team:** Manages Calendar, Tasks, Forms, and Contacts.
*   **SEO Team:** Technical audits (GSC), keyword analysis, traffic reports (GA4).
*   **Outreach Team:** Drafts cold emails, finding leads, manages CRM data.
*   **Data Team:** Advanced spreadsheet analysis (formulas, pivot tables) and Python code execution.
*   **Comms Team:** Inbox triage, email summarization, unread counts, and VIP communication.
*   **PM Team:** Project folder organization, file permissions, long-term memory management.
*   **Dev Team:** Technical support, script generation, and debugging.
*   **Legal Team:** Document review and compliance checking.
*   **Social Team:** Social profile analysis, trend scanning, and inbound authority building.
*   **Finance Team:** Invoicing, project margin estimation, and pricing strategy.

### 2. "Enterprise-Grade" Capabilities
*   **Neural Blackboard (Shared State):** A high-fidelity structured JSON memory layer that allows agents to share machine-readable data across mission steps.
*   **Deep-Drill Autonomy:** An "Infinite Loop" model that bypasses the 6-minute GAS limit via automatic checkpointing and auto-resume triggers.
*   **Dependency-Aware Planning (New):** The Root Orchestrator now decomposes goals into sequential "Task Groups" where independent tasks are executed in parallel.
*   **Self-Healing Feedback Loops (New):** Validators return structured JSON "FIX-IT" objects to Builders, enabling precision retries.
*   **Proactive Memory Retrieval (New):** Agents automatically query the Long-Term Memory for "Golden Parameters" from past similar missions before starting.
*   **Vision Audit:** AI-powered visual critiques of websites using ScreenshotOne API and Gemini Vision.
*   **Long-Term Memory (Vector Store):** Uses a hidden Google Sheet (`GAS_MEMORY_STORE`) as a zero-cost Vector Database with Cosine Similarity.

## UI Design System (Lux-Cyberpunk Aesthetic)

### 1. Visual Principles
- **Glassmorphism:** Semi-transparent backgrounds with backdrop-blur.
- **Data Density:** High-information terminal patterns with small typography.
- **Knowledge Nexus:** A dedicated panel for managing System Truth and Vector Memory.

## Latest Upgrades (v4.5.3 - Recovery Edition)
*   **Frontend Restoration:** Fully rebuilt `js.html` to restore missing reactive state and methods required by the `index.html` v3.1 interface.
    *   Added support for `currentView` (Terminal vs Neural Monitor).
    *   Restored `simMode` and `teamNodes` for Neural Topology visualization.
    *   Implemented `recentFiles` and `knowledgeMeta` data syncing with GAS backend.
*   **System Stability Fixes (v4.5.3):**
    *   **Absolute Script Failsafe:** Added a non-Vue script to `index.html` to force-hide the boot overlay after 12 seconds in case of Vue initialization failure.
    *   **Manual Override:** Added a `[[ FORCE_UPLINK ]]` button to the boot screen for emergency manual access.
    *   **Global Error Tracking:** Integrated `window.onerror` for improved client-side diagnostic visibility.
*   **Backend Integration:** Verified `getRecentSystemFiles` and `getKnowledgeBaseMeta` availability for UI population.

## Latest Upgrades (v4.5 - Architecture Edition)
*   **System Stability Fixes (v4.5.2):** Resolved "stuck on load screen" issues by implementing a multi-layered boot failsafe:
    *   **Absolute Script Failsafe:** Added a non-Vue script to force-hide the boot overlay after 12 seconds.
    *   **Manual Override:** Added a `[[ FORCE_UPLINK ]]` button to the boot screen for manual access.
    *   **Z-Index Correction:** Re-architected stacking context to ensure the header and interactive elements are never obstructed by background overlays.
    *   **Global Error Handling:** Integrated `window.onerror` and `app.config.errorHandler` for better diagnostic visibility.
*   **System Stability Fixes (v4.5.1):** Patched `SyntaxError` issues caused by invalid multi-line strings and resolved `ReferenceError` in `Dispatcher.gs` by moving initialization logic into function scope.
*   **Modular Registry:** Decentralized `Dispatcher.gs` and `Manifest.gs`. All 60+ tools are now organized into domain-specific modules managed by `CoreRegistry.gs`.
*   **Parallel Execution Groups:** Upgraded Root Orchestrator to identify and execute independent tasks simultaneously within grouped execution phases.
*   **Security Guardrails:**
    *   **Dry Run Mode (`/dryrun`):** System-wide simulation mode for safe testing of complex missions.
    *   **Configurable Sensitive Tools (`/sensitive`):** Dynamic enforcement of Human-in-the-Loop approval for high-stakes actions.
    *   **Security Audit Log:** Automatic recording of all runtime tool creations in `GAS_SECURITY_AUDIT_LOG`.
*   **Structured FIX-IT Objects:** Implemented machine-readable feedback loops between Validators and Builders to reduce retry latency.

## Latest Upgrades (v4.2 - Intelligence Edition)
*   **Event-Based Intent Discovery:** New tools for Ad Transparency (Meta/Google) and Technographic Trigger detection.
*   **Semantic SEO & GEO Audit:** Evaluate brand perception by LLMs and validate search-schema maturity.
*   **Neural Blackboard CRM Bridge:** Autonomous agents sync complete research states directly to the CRM Command Center.

## Architecture & Framework

### The Stack
*   **Runtime:** Google Apps Script (V8 Engine).
*   **AI Model:** Google Gemini 1.5 Pro / 2.0 Flash (via REST API).
*   **Database:** Google Drive (Files), Google Sheets (Vector Store), `PropertiesService` (Config), `CacheService` (State).
*   **Frontend:** HTML5 + Vue.js 3 + Tailwind CSS (served via `doGet`).

## Setup & Configuration

### Slash Commands (New)
| Command | Description |
| :--- | :--- |
| `/dryrun` | Toggle system-wide simulation mode. |
| `/sensitive` | List or manage sensitive tool guardrails (add/remove). |
| `/list` | Enumerate all loaded agentic tools. |
| `/apis` | Verify status of external API uplinks and security status. |
| `/reset` | Emergency purge of session and mission state. |

### Script Properties
Set the following keys in **File > Project Settings > Script Properties**:

| Property | Description | Required? |
| :--- | :--- | :--- |
| `GEMINI_API_KEY` | Your AI Studio API Key. | **YES** |
| `PREFERRED_MODEL` | `gemini-2.0-flash` or `gemini-1.5-pro` | No (Default: Flash) |
| `DRY_RUN_MODE` | Set to `true` for simulation mode. | No |
| `SENSITIVE_TOOLS` | JSON array of tool names requiring approval. | No |

---
**Version:** 4.5.3 (Recovery Edition)
**Last Updated:** February 17, 2026
**Author:** Gemini CLI Agent
