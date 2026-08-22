---
name: changelog
description: Maintains CHANGELOG.md in the AgentClinic project root (Video05_Creating_the_Constitution/) using git commit history. Invoke manually before merging a feature branch. Creates the file from scratch if it doesn't exist (all commits grouped by date); otherwise appends only commits newer than the last recorded date.
---

# Changelog Skill

## Workflow

1. Run the script from this project's root (`Video05_Creating_the_Constitution/`):

```bash
python3 <skill-dir>/scripts/changelog.py
```

Where `<skill-dir>` is the directory containing this skill. Claude Code exposes the skill path — use it directly.

2. The script handles both cases automatically:
   - **No CHANGELOG.md**: reads full git history for this directory, writes the file with all dates
   - **CHANGELOG.md exists**: finds the newest `## YYYY-MM-DD` heading, fetches commits after that date, prepends new sections

3. Review the output, edit bullet wording if needed, then commit `CHANGELOG.md` as part of the merge.

## Format

```markdown
# Changelog

## 2026-08-22

- Ensure mobile-first responsive design
- add vitest setup and test for validation

## 2026-08-21

- Initial project scaffold
```

- One `# Changelog` title at the top
- Date headings as `## YYYY-MM-DD`, newest first
- Each commit is one bullet; wording may be cleaned up manually after generation

## Notes

- Run from **this project's root** — this repo has one shared `.git` at
  the outer course-repo level, so the script scopes `git log` with a
  `-- .` pathspec to only pick up commits touching files under
  `Video05_Creating_the_Constitution/`. Running it from a different
  directory will scope it to the wrong project.
- Commit subjects come directly from `git log`; clean them up manually if needed.
- The script is idempotent: re-running when nothing is new prints a message and exits without modifying the file.
- This skill is invoked manually, not automatically on every commit — run it as a deliberate step before merging a branch.
