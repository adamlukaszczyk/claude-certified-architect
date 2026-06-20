---
name: pr-description
description: Generate a detailed and informative pull request description based on the changes made in the code.
allowed-tools: Read, Bash
model: sonnet
---

This uses https://agentskills.io/ standard.

- Write PR description in Markdown format in code formatter. do not format the text. 
- Provide general purpose of the PR. 
- Include a list of files with very short overview of changes in each file. Don't use table format, just bullet points.
- Provide short test plan.

When asked about architecture load [references/architecture.md](references/architecture.md).