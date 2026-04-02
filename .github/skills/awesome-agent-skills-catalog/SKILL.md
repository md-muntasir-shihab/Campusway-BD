---
name: awesome-agent-skills-catalog
description: "Import and organize skills from https://github.com/VoltAgent/awesome-agent-skills. Use when: awesome agent skills list, take all skills from repo, build skill catalog, parse README skill links, group skills by provider, prepare reusable skill index."
argument-hint: "Provide: output format (full list or summary), provider filters, and whether to include only official teams."
user-invocable: true
---

# Awesome Agent Skills Catalog

## Outcome

Create a reliable catalog of skills referenced in the `VoltAgent/awesome-agent-skills` repository and present them in a reusable structure (full list, grouped list, or filtered shortlist).

## When To Use

- User asks to "take all skills" from the awesome-agent-skills repository.
- User wants a provider-wise catalog (Anthropic, Stripe, Vercel, etc.).
- User needs a filtered list (official only, community only, by domain).
- User wants to bootstrap local skill files from external skill references.

## Inputs

- Repository URL (default: `https://github.com/VoltAgent/awesome-agent-skills`)
- Output mode: `full` or `summary`
- Optional filters:
  - Provider names
  - Official-only vs community-included
  - Domain tags (frontend, infra, security, data, agent-framework)

## Procedure

1. Validate source repository availability.
2. Read repository `README.md` and extract skill bullet entries that contain markdown links.
3. Map each skill entry to:
   - `provider`
   - `skill_id`
   - `source_url`
   - `short_purpose`
4. Group entries by top-level section headings in README.
5. Apply requested filters.
6. Return catalog in requested mode:
   - `full`: all parsed items
   - `summary`: grouped providers with counts + highlighted skills

## Decision Points

- If user says "সব স্কিল" / "all skills": choose `full` mode.
- If user asks fast overview: choose `summary` mode.
- If user provides only a niche topic (for example, Terraform): apply provider/domain filtering.

## Quality Checks

- No hallucinated skills: every item must come from a resolvable README entry.
- Preserve original skill link URLs.
- Keep provider grouping aligned with README sections.
- If README format changes, report partial parsing and fallback behavior.

## Output Contract

Return a table with:

- `Provider`
- `Skill`
- `URL`
- `Purpose`

For summary mode, add:

- Total skills parsed
- Providers discovered
- Top suggested skills for the user goal

## References

- [awesome-agent-skills-links](./references/awesome-agent-skills-links.md)

Use the local reference file first for speed. If the user asks for latest updates, refresh from the upstream repository before producing final output.

## Notes

- This skill catalogs references; it does not assume all linked skills are installed locally.
- For local activation, pair with a follow-up workflow that clones selected upstream skill repositories.
