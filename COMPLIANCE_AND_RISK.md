# Compliance and Risk Management Protocol

## 1. Mission Documentation
All missions executed by the GAS Agentic Orchestrator must be logged in the `Agent_Logs` Google Sheet. Significant missions should be exported to a Google Doc using the `export_chat_to_doc` tool for permanent record-keeping.

## 2. Compliance Procedures
- **Data Privacy**: No PII (Personally Identifiable Information) should be stored in the Vector Store unless encrypted or explicitly required for CRM operations.
- **Tool Guardrails**: Sensitive tools (Gmail send, Drive delete, Sheets clear, Calendar management) require manual human approval via the `request_human_approval` tool.
- **External API Security**: API keys must be stored in `ScriptProperties` and never hardcoded or logged in cleartext.

## 3. Regular Risk Assessments
- **Weekly Audit**: The `drive_permission_auditor` should be run weekly on the root mission folder to ensure no unauthorized external access.
- **System Retrospective**: Run the `run_system_retrospective` tool every 24 hours to analyze failure patterns and update the Knowledge Base with preventative rules.
- **Token Monitoring**: Use `llm_token_estimator` to prevent context window overflows during large data processing tasks.

## 4. Permission Escalation Policy
Tools requiring escalated permissions (Calendar, Forms, CRM) are automatically flagged as SENSITIVE. Any execution of these tools within a department workflow will trigger a `SYSTEM_PAUSE` and require explicit user confirmation.
