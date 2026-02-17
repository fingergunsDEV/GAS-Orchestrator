# Architectural Design: Agentic Layer (v3.1)

## 1. System Philosophy
The **GAS Agentic Orchestrator** is built on the principle of **Hierarchical Specialization**. Rather than using a single monolithic agent, the system employs a "Team of Teams" model where a high-level Strategic Planner coordinates specialized operational units. This reduces context noise, improves tool-calling accuracy, and enforces a rigorous quality control loop.

---

## 2. High-Level Hierarchy

### 2.1 The Strategic Planner (Root Orchestrator)
The **Root Orchestrator** is the system's "Pre-frontal Cortex." Its primary roles are:
1.  **Decomposition:** Breaking a vague user goal (e.g., "Set up a SEO report for Client X") into 1-4 tactical steps.
2.  **Delegation:** Assigning each step to the most qualified specialized team.
3.  **Context Maintenance:** Passing the "Global State" and results from previous steps into the next step's instruction.
4.  **Continuity Management:** Checkpointing the plan state to survive the 6-minute Google Apps Script execution limit.

### 2.2 Specialized Operational Teams
The system currently supports 10 specialized teams, each consisting of a **Builder/Validator** pair:
- **Research Team:** Intel gathering and web search.
- **Content Team:** Artifact creation (Docs, Slides, PDFs).
- **Ops Team:** Administrative management (Calendar, Tasks, Forms).
- **SEO Team:** Technical performance (GSC, GA4).
- **Outreach Team:** CRM management and email drafting.
- **Data Team:** Spreadsheet logic and Python analysis.
- **Comms Team:** Inbox triage and communication.
- **PM Team:** Organization and permissions.
- **Dev Team:** Technical support and scripting.
- **Legal Team:** Compliance and summaries.

---

## 3. The Builder/Validator Loop
Every task assigned to a team follows a recursive validation pattern to ensure high-fidelity outputs.

### 3.1 Builder Agent (Write-Access)
The **Builder** is given a specific goal and access to a "Write-Enabled" toolset. It is instructed to attempt the task and report the specific artifacts produced (e.g., "I created a Doc at URL [X]").

### 3.2 Validator Agent (Read-Only Access)
The **Validator** is the "Quality Gate." It receives the original goal and the Builder's output.
- **Verification:** It uses "Read-Only" tools (e.g., `drive_find_files`, `gmail_search`) to verify the work actually exists.
- **Approval:** If the work meets standards, it returns `APPROVED`.
- **Rejection:** If the work is missing or incorrect, it returns `REJECTED: [Reason]`.

### 3.3 Feedback & Retries
The loop supports up to **2 retries**. If rejected, the Validator's feedback is injected back into the Builder's context as a `SYSTEM_NOTE`, forcing the Builder to correct its previous logic.

---

## 4. Stateful Continuity Engine
To bypass the **6-minute execution limit** of Google Apps Script, the system utilizes a **Checkpoint & Resume** architecture.

### 4.1 Mission Serialization
After every step in a plan, the Orchestrator serializes the following to `PropertiesService` or Google Drive:
- **Plan Steps:** The original JSON array of remaining tasks.
- **Step Index:** The pointer to the current task.
- **Cumulative Context:** All results from completed steps.
- **Start Timestamp:** Used to track elapsed time.

### 4.2 Auto-Checkpointing
If the total execution time exceeds **5 minutes (300,000ms)**, the system triggers a `MISSION_CONTINUE` signal. It halts execution, saves the state, and prompts the UI to show a **RESUME** button. This allows missions to span indefinitely across multiple script runs.

---

## 5. Tool Registry & RBAC
The system enforces **Role-Based Access Control (RBAC)** through the `Manifest.gs` and `Dispatcher.gs` layers.

### 5.1 The Manifest
Tools are defined as JSON Schema objects. Each role (e.g., `SEO_BUILDER`) has a whitelist of allowed tool names defined in `TOOL_SCOPES`.

### 5.2 The Dispatcher
The `dispatchToolCall` function is the only gateway to the `Skills.gs` library. It:
1.  Verifies the tool exists in the `TOOL_REGISTRY`.
2.  Executes the underlying GAS function.
3.  Standardizes the response (String or JSON) for LLM consumption.
4.  **Self-Correction:** If a tool throws a GAS exception, the Dispatcher wraps it in a `TOOL_ERROR` message, which is fed back to the agent to trigger a retry with different parameters.

---

## 6. Memory & Knowledge Base

### 6.1 Short-Term Memory (Context Pruning)
The chat history is pruned to keep the last 15 turns + the original system instruction, ensuring the LLM remains within its context window and token limits.

### 6.2 Long-Term Memory (Vector Store)
- **Database:** A Google Sheet (`GAS_MEMORY_STORE`) stores text and JSON-encoded vectors.
- **Embeddings:** Uses Gemini `text-embedding-004` via REST API.
- **Search:** Performs in-memory **Cosine Similarity** calculations.
- **Compaction:** An LLM-powered compaction tool (`vector_store_compact`) periodically synthesizes multiple rows into singular high-density facts to prevent database bloat.

### 6.3 System Source of Truth (SSoT)
A dedicated `knowledge_base_read` tool allows agents to read a core architectural document (stored in Drive). This ensures agents always follow current system rules, even as the codebase evolves.

---

## 7. Interaction Signals
The agentic layer communicates state to the UI via specific string signals:
- `SYSTEM_PAUSE`: Halts for human approval (sensitive tools).
- `MISSION_CONTINUE`: Triggers a checkpoint resume.
- `SIGNAL_EXPORT_CHAT`: Triggers a document generation of the session.
- `TOOL_ERROR`: Prompts an autonomous retry.

---
**Document Status:** Final (v3.1)
**Architect:** Gemini CLI Agent
