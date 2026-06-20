---
name: pr-description
description: Generate a detailed and informative pull request description based on the changes made in the code.
allowed-tools: Read, Bash
model: sonnet
---

This uses https://agentskills.io/ standard.

- Write PR description in Markdown format. 
- Provide general purpose of the PR. 
- Include a list of files with very short overview of changes in each file. 
- Provide short test plan.

When asked about architecture load [references/architecture.md](references/architecture.md).