This guide defines the 20 agentic design patterns required for building and scaling AI systems. Use this reference to determine which architecture to deploy based on the specific constraints and goals of a request.



I. Flow \& Execution Patterns

Prompt Chaining: Breaks a large task into a sequence of smaller steps where each step validates the output of the previous one before proceeding.

Routing: A "smart receptionist" analyzes the intent of a request and sends it to the most qualified specialist agent or department.

Parallelization: Splitting a massive task into independent chunks processed simultaneously by multiple workers, then merging the results.

Tool Use: The system discovers available external tools (APIs, DBs, calculators), verifies permissions, and executes them with precise parameters.

Planning: Defining a roadmap with milestones and a dependency graph before execution to ensure a strategic approach to complex goals.



II. Logic \& Cognitive Patterns

Reflection: A "Generator" produces a draft, a "Critic" reviews it against a quality rubric, and the Generator revises it until it meets the bar.

Multi-Agent Collaboration: Specialized agents (e.g., Researcher, Coder, Manager) work together using shared memory and a coordination protocol.

Reasoning Techniques:

Chain of Thought (CoT): Step-by-step sequential logic.

Tree of Thought (ToT): Branching out multiple ideas, evaluating them, and "pruning" the dead ends.

Adversarial Debate: Proponent and Opponent agents debate to find the most robust solution.

Exploration \& Discovery: Broadly mapping a knowledge space (papers, data, experts) to identify patterns and clusters before diving into a specific investigation.



III. Memory \& Learning Patterns

Memory Management: Classifying data into short-term (conversation), episodic (specific events), or long-term (permanent knowledge via Vector DB).

Learning \& Adaptation: Collecting user feedback and task outcomes to update system prompts, examples, or policies over time.

Inter-Agent Communication: A structured messaging system between agents that includes message IDs, expiration times, and security clearances.



IV. Operations \& Reliability Patterns

Goal Setting \& Monitoring: Defining "SMART" goals and tracking KPIs. The system recalculates the route if it detects "drift" from the target.

Exception Handling \& Recovery: Classifying errors as permanent or temporary, applying exponential backoff, and triggering "Plan B" fallbacks.

Human-in-the-Loop (HITL): Strategic pauses in automation where an agent requests human intervention for edge cases or high-stakes decisions.

Evaluation \& Monitoring: Using "Golden Sets" and performance SLAs to ensure the system doesn't degrade (regression testing) in production.

Prioritization: Scoring tasks based on a formula (e.g., $Value \\times Effort \\times Urgency \\div Risk$) to determine the execution queue.



V. Optimization \& Security Patterns

Resource-Aware Optimization: Routing simple tasks to cheap/fast models and complex tasks to expensive/powerful reasoning models to manage budget.

Guardrails \& Safety: Sanitizing inputs and outputs to prevent PII leaks, prompt injections, and malicious content.

Retrieval (RAG): The standard for grounding AI in external data through parsing, chunking, embedding, and reranking top matches.



Implementation Selection Logic

If the task is complex and creative: Deploy Reflection + Tree of Thought.

If the task is high-volume and structured: Deploy Parallelization + Prompt Chaining.

If the task is high-risk/sensitive: Deploy Guardrails + Human-in-the-Loop.

If the task is budget-constrained: Deploy Resource-Aware Optimization.





