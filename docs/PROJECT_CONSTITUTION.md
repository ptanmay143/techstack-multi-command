# Project Constitution — TechStack Multi Command Executor

## Core Principles

1. **Documentation is the Single Source of Truth**
   - Code must never diverge from documentation.
   - Any architectural or interface change requires an approved update to documentation before code modification.

2. **Zero Functional Regressions**
   - Refactoring and structural adjustments must never alter existing public command IDs, configuration schema names/defaults, or runtime behaviour unless explicitly documented and approved.

3. **Safety and Preview Guarantees**
   - Destructive or bulk command execution must strictly preserve the preview + confirmation barrier.
   - Files matching exclusion rules (e.g., `.git`, configured `excludedDirectories`) must never be modified or targeted.

4. **Preservation of Open Editors**
   - Workflow execution must never automatically close user-opened documents or silently discard dirty editor state.
   - The previously active editor must be restored after execution completes (best effort).

5. **Approval-Gated Iteration**
   - Work proceeds feature by feature, gated by approval at specification, planning, and verification phases.
