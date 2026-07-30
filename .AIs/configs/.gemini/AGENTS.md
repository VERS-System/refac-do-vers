# Gemini Agent Configuration

This file contains the agent configuration for Gemini.

## Instructions

- **Primary Instructions**: Located in `.AIs/AGENTS.md`.
- **Session Context**: A new context file should be created for each session in `.AIs/docs/contexts/`.

## Policies

- **Approval**: Required for all file modifications and shell commands.
- **Sandbox**: Operations are restricted to the workspace.
- **Environment Files**: Access to `.env` files is denied.
- **Test-First**: A test-first development approach is encouraged.
