# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Purpose

Six standalone labs for the Claude Certified Architect (CCA) Foundations certification. Each lab is a working implementation that maps to the 5 exam domains and 30 task statements in the official exam guide. Labs are ordered by complexity and can be run independently.

The repo also contains `90_mcp_workshop/` — a hands-on workshop subproject (separate from the numbered certification labs) for building an MCP client and server from scratch. See [MCP Workshop](#mcp-workshop-90_mcp_workshop) below.

## Lab Commands

Each lab directory contains a `manage.py` script:

```bash
python manage.py restart   # Reset to starter files with TODO placeholders
python manage.py solve     # Apply the completed solution
```

To run a lab:

```bash
cd <lab_directory>
cp .env.example .env       # Add ANTHROPIC_API_KEY
pip install -r requirements.txt
python main.py
```

## Lab Platforms & Dependencies


| Lab    | Platform         | Key dependency          |
| ------ | ---------------- | ----------------------- |
| 01, 06 | Claude API       | `anthropic>=0.45.0`     |
| 03, 04 | Claude Agent SDK | `claude-agent-sdk`      |
| 02, 05 | Claude Code CLI  | `anthropic`, `mcp[cli]` |

## Architecture Patterns

**All labs follow these conventions (also documented in per-lab CLAUDE.md files):**

- `main.py` — entry point and core agentic logic
- `config.py` — constants: model name, thresholds, console color codes
- `data.py` — mock/test data (never inline in main logic)
- `requirements.txt` + `.env.example` — dependency and secrets management
- Prompt templates stored as `.txt` files, loaded and formatted at runtime — never as inline strings or f-strings

**Tool definitions:** Each tool is a Python function paired with a `_schema` dict. Tool descriptions are detailed and specify when to use the tool vs. alternatives. Error responses always include `error`, `errorCategory`, `isRetryable`, and `message` fields.

**Prompts:** Use XML tags for dynamic sections (e.g., `<case_facts>{case_facts}</case_facts>`). Load with `.format()`. Examples are stored as separate files when used for few-shot learning.

## Coding Conventions

These apply across all labs:

- No inline return structures or function calls as arguments — assign to a variable first, then use it
- File headers: `# filename.py - Short description`
- Functions over classes
- Comments only to explain exam concepts (not implementation details)
- Constants in `config.py`, never hardcoded inline

## Key Concepts by Lab

**Lab 01 (Customer Support Agent):** Manual agentic loop using `stop_reason == "tool_use"` / `"end_turn"`. PostToolUse hooks for policy enforcement. Prerequisite gate pattern.

**Lab 02 (Code Generation):** CLAUDE.md hierarchy with `@import` directives. Path-specific rules. Custom MCP server via FastMCP (`mcp_server/inventory_server.py`). Config in `.mcp.json`.

**Lab 03 (Multi-Agent Research):** Coordinator-subagent pattern via Agent SDK `query()`. Task decomposition, context passing through prompts, error propagation.

**Lab 04 (Developer Productivity):** Custom skills in `.claude/commands/` with `context:fork` isolation and `allowed-tools` restrictions. Shared conventions via `.claude/conventions.md`.

**Lab 05 (CI/CD Integration):** Non-interactive Claude Code via `-p` flag. Multi-pass PR review (per-file, then cross-file). Structured output via `review_schema.json`.

**Lab 06 (Structured Extraction):** Forced `tool_choice` for schema compliance. Nullable fields with `["type", "null"]`. Validation-retry loop with error feedback. Batch processing with `custom_id` correlation.

## Exam Domain Mapping

`LAB_REFERENCE.md` in the repo root contains the full mapping from each lab/file to the 5 exam domains and 30 task statements. Check it when adding or modifying lab content to ensure coverage is preserved.

## MCP Workshop (`90_mcp_workshop`)

A standalone, hands-on workshop for building an **MCP (Model Context Protocol) client and server** practical exercise — separate from the numbered certification labs. It implements "MCP Chat", a command-line application that connects an Anthropic-powered chat loop to an MCP server, demonstrating the three core MCP primitives end to end: **tools**, **resources**, and **prompts**.

**Purpose:** give learners a working, minimal MCP stack they can read, run, and extend — to internalize how a host application discovers and invokes server-side capabilities over the MCP protocol.

**Architecture:**

- `mcp_server.py` — a FastMCP server (`DocumentMCP`) exposing document operations: `read_doc_contents` / `edit_document` **tools**, `docs://documents` and `docs://documents/{doc_id}` **resources**, and a `format` **prompt**. Runs over the `stdio` transport.
- `mcp_client.py` — an MCP client (`MCPClient`) that manages the server connection lifecycle via `AsyncExitStack` and wraps `list_tools` / `call_tool` / `list_prompts` / `get_prompt` / `read_resource`.
- `core/` — the chat application: `claude.py` (Anthropic API wrapper), `tools.py` (tool dispatch between Claude and MCP servers), `chat.py` / `cli_chat.py` (chat loop, `@document` retrieval, `/command` prompts), and `cli.py` (prompt-toolkit CLI with resource/command auto-completion).
- `main.py` — entry point wiring the Anthropic client, MCP client(s), and CLI together.

**Conventions:** this workshop is an independent teaching artifact and does **not** follow the numbered-lab conventions documented above (no `config.py`, no `manage.py` restart/solve flow, prompts as inline strings, `raise ValueError` for tool errors). Treat it on its own terms; do not "fix" it to match the lab conventions unless explicitly asked.

**Setup & run** (uses `uv` and `pyproject.toml`, not `requirements.txt`):

```bash
cd 90_mcp_workshop
uv venv && source .venv/bin/activate
uv pip install -e .          # or: pip install anthropic python-dotenv prompt-toolkit "mcp[cli]==1.8.0"
echo 'ANTHROPIC_API_KEY="..."' > .env   # add your Anthropic API key
uv run main.py
```

Parts of the server (e.g. the `summarize` prompt) are intentionally left as `# TODO` for workshop participants to implement.
