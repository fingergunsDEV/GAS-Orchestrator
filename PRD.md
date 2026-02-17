Product Requirements Document (PRD): GAS Agentic Orchestrator

Version: 1.0

Status: Draft

Date: January 26, 2026



1\. Executive Summary

The GAS Agentic Orchestrator is a lightweight, serverless agent framework built entirely within the Google Apps Script ecosystem. It leverages a Large Language Model (LLM) as a reasoning engine to dynamically select and execute pre-defined GAS functions ("Tools") to achieve high-level user goals. This system democratizes agentic AI for marketers and SEOs by removing the need for complex Python/Docker infrastructure, utilizing their existing Google Workspace data and quotas.



2\. Target Audience \& Use Cases

Primary Users: Technical SEOs, Growth Engineers, Marketing Operations Managers.

Core Use Case: Automating multi-step workflows that require decision-making (e.g., "Analyze this keyword, check if we have content for it, and if not, draft a brief").

Secondary Use Case: Rapid prototyping of internal business tools without spinning up external servers.



3\. System Architecture

The system follows the ReAct (Reason + Act) pattern. It operates in a loop where the LLM observes the current state, reasons about the next step, selects a tool, executes it, and observes the output.

3.1 High-Level Components

The Brain (LLM Interface): A standardized interface (e.g., GeminiService.gs) that connects to the LLM API. It enforces structured JSON output for tool calling.

The Dispatcher (Router): Parses the LLM's response. If a tool is requested, it routes the request to the specific function in the Tool Belt.

The Tool Belt (Function Library): A modular collection of standalone GAS functions (e.g., gmail\_search, gsc\_inspect\_url, docs\_create) wrapped with metadata (Name, Description, Params).

The State Manager: Handles short-term memory (conversation history) and long-term persistence (PropertyService or Sheets) to manage context across execution limits.

The Frontend (UI): A responsive HTML5/Vue.js web app deployed via HtmlService for user interaction and status visualization.



4\. Functional Requirements

4.1 The "Brain" (LLM Integration)

FR-01: System MUST support swapping LLM providers (Gemini 1.5 Flash/Pro via Vertex AI or Google AI Studio).

FR-02: System MUST use "System Instructions" to strictly define the agent's persona and output format (JSON only).

FR-03: System MUST implement retry logic for failed API calls or malformed JSON responses.

4.2 The Tool Registry

FR-04: Tools MUST be defined in a Manifest.js file containing name, description, and parameter\_schema (JSON Schema compatible).

FR-05: Each tool function MUST return a string or JSON object that is interpretable by the LLM.

FR-06: Tools MUST handle their own errors and return a descriptive error message to the Brain rather than throwing a hard exception (to allow the agent to self-correct).

4.3 The Orchestrator Loop

FR-07: The main loop MUST support a configurable MAX\_ITERATIONS (e.g., 5-10 turns) to prevent infinite loops.

FR-08: The loop MUST log every step (Thought, Action, Observation) to a Google Sheet for auditability.

FR-09: The system MUST handle GAS execution time limits (6 mins) by serializing state and chaining execution triggers if necessary.



5\. Agentic Capabilities (The "Skills")

The initial release will include the following pre-built capabilities tailored for SEO and Marketing:

Capability

Tools Required

Workflow Description

Content Gap Auditor

gsc\_query, serp\_analyze, drive\_search

1\. Identify underperforming keywords.



2\. Search Drive for existing content.



3\. If none exists, flag as "Gap".

Lead Magnet Fulfillment

gmail\_fetch, slides\_create, pdf\_export, gmail\_send

1\. Detect "New Lead" email.



2\. Extract name/industry.



3\. Generate personalized PDF deck.



4\. Email to lead.

Technical SEO Triager

gsc\_inspect, pagespeed\_run, slack\_notify

1\. Inspect URL list.



2\. If not indexed, run live test.



3\. If error persists, alert via Slack.





6\. Technical Implementation Details

6.1 Technology Stack

Runtime: Google Apps Script (V8 Engine).

Database: Google Sheets (for logs) \& PropertiesService (for session tokens).

Frontend: HTML5, CSS3 (Tailwind via CDN or custom CSS), Vue.js (via CDN).

APIs: Google Workspace APIs (Docs, Drive, Gmail), Google Cloud Vertex AI (or Gemini API).

6.2 Data Flow

User Input: "Draft a response to the last email from 'Client X'."

Frontend: Calls google.script.run.handleRequest(input).

Backend:

Agent.run(input) initializes context.

LLM.generate(context, tools) returns {"tool": "gmail\_search", "args": {"q": "from:Client X"}}.

Dispatcher executes GmailApp.search(...).

Agent appends result to context.

LLM sees email body, decides to call docs\_create.

Dispatcher executes DocumentApp.create(...).

Final Output: Agent returns "Draft created: \[Link]" to Frontend.



7\. Guardrails \& Safety

GR-01: API Quota Management: The system must track usage of expensive APIs (e.g., GSC, LLM) and pause execution if quotas are near depletion.

GR-02: Human-in-the-Loop: For high-stakes actions (e.g., sending an email, deleting a file), the agent MUST pause and request explicit user confirmation via the UI.

GR-03: Scope Restriction: The OAuth scopes requested must be minimal. The agent should only have access to specific folders or file types if possible.

GR-04: Data Privacy: No PII (Personally Identifiable Information) should be sent to the LLM unless explicitly authorized. An optional PII-redaction middleware should be available.



8\. Testing Strategy

8.1 Unit Testing

Framework: QUnit for GAS or a custom lightweight assert library.

Scope: Test individual tools (e.g., ensuring gsc\_inspect handles 404s correctly) mocking the API responses.

8.2 Integration Testing

Simulated Agent Loops: Feed the agent a "canned" scenario with mocked LLM responses to ensure the Dispatcher routes correctly.

Live Fire Test: A "Dry Run" mode where write actions (sending emails, creating files) are replaced with log entries.

8.3 User Acceptance Testing (UAT)

Latency Check: Ensure UI updates status at least every 2 seconds.

Failure Recovery: Test what happens when the script times out mid-operation (does it resume or fail gracefully?).



9\. Future Scope

Voice Interface: Integration with Google Meet for real-time meeting assistance.

Multi-Agent Swarm: Spawning sub-agents (e.g., one for Research, one for Writing) that collaborate on a task.

Self-Correction: Ability for the agent to read its own code, identify bugs, and propose fixes.

10. Planned Improvements

10.1 System Observability (Audit Logger)
- Implementation of a persistent logging system (FR-08) that writes every Agent "Thought", "Action", and "Observation" to a dedicated Google Sheet.
- This ensures full auditability of the agent's decision-making process and tool usage.

10.2 Google Search Console (GSC) Integration
- Full implementation of `gsc_query` to retrieve search performance data (clicks, impressions, position).
- Full implementation of `gsc_inspect_url` to diagnose indexing issues.

10.3 Google Analytics 4 (GA4) Integration
- Implementation of `ga4_run_report` to allow the agent to fetch basic traffic and user engagement metrics.

10.4 Content Creation (Slides & PDF)
- Implementation of `slides_create` to generate presentations from templates.
- Implementation of `drive_export_pdf` to convert Docs/Slides into PDFs for external sharing (Lead Magnet flow).





