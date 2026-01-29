## Agent Skills

This repository can host reusable agent skills that follow the Agent Skills specification
and work across different tools (Codex, Claude Code, etc.). A skill is a small bundle of
instructions + optional references/scripts to guide the agent on a focused task.

## Structure

```
.agents/skills/<skill-name>/SKILL.md
```

Each skill folder contains a `SKILL.md` file with YAML frontmatter and markdown instructions.

## Creating a Skill

1. Create `.agents/skills/<skill-name>/SKILL.md`
2. Add YAML frontmatter (see below)
3. Write clear, concise instructions in markdown
4. If your tooling requires an allowlist, add the skill there (optional)

## Frontmatter

Required:
- `name` (kebab-case, 1-64 chars)
- `description` (up to 1024 chars, include trigger keywords)

Optional:
- `model` (tool-specific)
- `allowed-tools` (space-delimited, tool-specific)
- `license`
- `compatibility` (environment requirements, max 500 chars)

Example:
```yaml
---
name: example-skill
description: What this skill does and when to use it. Include trigger keywords.
model: sonnet
allowed-tools: Read Grep Glob Bash
---

# Example Skill

Instructions for the agent.
```

## Tips

- Keep SKILL.md concise; move large docs into `references/`.
- Use `scripts/` for deterministic or repeated steps.
- Use `assets/` for templates or files to be copied into outputs.

## References

- Agent Skills Spec: https://agentskills.io/specification
