# GAS Agentic Orchestrator - Operational User Guide

Welcome to the **GAS Agentic Orchestrator**, a serverless, multi-department "Strategic Intelligence Layer" built on Google Apps Script and powered by Gemini 1.5/2.0. This guide provides the necessary instructions and commands to operate the system effectively.

---

## 1. System Overview
The Orchestrator follows a hierarchical "Team of Departments" architecture. When you issue a command, the **Strategic Core** creates a tactical mission plan, delegates tasks to specialized departments, and finally synthesizes the results via an **Agentic Reflection** layer.

### Core Components
*   **Command Center**: Your primary interface for issuing natural language missions and viewing agency insights.
*   **Intel Stream**: A diagnostic view showing the internal processing layers and live market feeds.
*   **Campaign Pipeline**: A real-time strategic navigator showing the active campaign execution phases and the **Campaign Knowledge Base**.
*   **System Vitality**: A HUD element tracking bot load and remaining Google API quotas.

---

## 2. Operating Instructions

### Starting a Mission
Simply type your goal into the bottom chat bar and press **LAUNCH**.
*   **Example**: "Research OpenAI's latest Sora updates and draft a 3-slide presentation summary."
*   **Multimodal**: Click the **[+]** button to attach an asset (like a spreadsheet screenshot or a UI mockup) for the agents to analyze.

### Monitoring Progress
Switch to the **[[ CAMPAIGN_PIPELINE ]]** tab during a mission to see:
1.  **Strategic Execution Phases**: Which groups of tasks are completed, active, or queued.
2.  **Campaign Knowledge Base**: Real-time data being "learned" by the agents (e.g., extracted URLs, contact info, or analysis scores).

### Resuming Missions
Google Apps Script has a 6-minute execution limit. If a mission is complex, the system will save a **Checkpoint**. You will see a `▶ RESUME_MISSION` button in the terminal—click it to continue the autonomous loop.

---

## 3. Slash Commands
Slash commands allow you to manage system state and security directly from the command center.

| Command | Description |
| :--- | :--- |
| `/help` | Displays the system help menu and version information. |
| `/list` | Enumerates all currently loaded tools, including active plugins. |
| `/apis` | Checks the connection status of external APIs (Gemini, Search, etc.) and GAS quotas. |
| `/dryrun` | Toggles **Dry Run Mode**. When enabled, the system simulates tool calls without actually modifying data (Safe for testing). |
| `/sensitive` | Manages the list of tools that require explicit human approval (e.g., `gmail_send`). |
| `/guide` | Displays a quick-start operational manual within the terminal. |
| `/reset` | **Emergency Purge**: Clears all session memory and stops any active mission chains. |
| `/clear` | Clears the local message history (does not affect mission state). |

---

## 4. Specialized Departments & Roles
The system deploys 12 specialized departments, each consisting of a **Builder** (execution) and a **Validator** (quality control).

1.  **Market Intelligence**: Web intelligence, competitor deep-dives, and fact-checking.
2.  **Creative Engine**: Generates Slides, Docs, PDFs, and translations.
3.  **Agency Operations**: Manages your Calendar, Tasks, Forms, and Contacts.
4.  **Search Visibility**: Technical audits (GSC), keyword analysis, and content gap matrices.
5.  **Strategic Outreach**: Drafts personalized emails, synthesizes voice messages, and manages CRM data.
6.  **Performance Insights**: Advanced spreadsheet analysis and Python-based logic execution.
7.  **Client Communications**: Inbox triage, email summarization, and deliverability testing.
8.  **Project Governance**: Folder organization, project setup, and system dependency mapping.
9.  **Technical R&D**: Script generation, GitHub synchronization, and performance profiling.
10. **Risk & Compliance**: Document review, compliance checking, and contract generation.
11. **Social Analytics**: Profile analysis, trend scanning, and LinkedIn network visualization.
12. **Revenue Management**: Invoicing, margin calculation, and project estimation.

---

## 5. Advanced Features

### Dynamic Tool Loading
You can extend the system's capabilities without modifying the core code:
1.  Open the `GAS_Dynamic_Tools` folder in your Google Drive.
2.  Upload a `.js` file with standard JSDoc headers (e.g., `@tool`, `@description`).
3.  The system will automatically hot-load the new tool during the next mission.

### Agentic Reflection
Before any final report is delivered, a **Reflection Agent** reviews all department outputs. It ensures that the Performance Insights numbers match the Market Intelligence findings and that the final report is professional and contradiction-free.

---
**Version:** 4.8.0
**Last Updated:** February 20, 2026
**Environment**: Google Apps Script (V8)
