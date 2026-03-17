# BobrovFunSchool

## Code Style & Standards

- **Naming:** Use camelCase for variables/functions, PascalCase for classes/types.
- **Errors:** Prefer explicit error handling over generic try/catch; use custom AppError class.
- **Async:** Use async/await exclusively; no .then() chains.
- **Typing:** No `any` types; all functions must have return types.
- **Formatting:** Rules enforced by Prettier; run `npm run format` before commits.

## Implementation Plan Format

Describe how you'll satisfy the requirements as concrete steps (agent actions), chunked into small git-committable units when appropriate.

- Size the steps to the change: use as few steps as needed for small fixes, and break larger changes into multiple git-committable chunks.
- Keep one concrete outcome per step (code change, test addition, verification, or user checkpoint).
- Include a USER checkpoint step for major or risky changes, consistent with the workflow above.

## Rules
- Before doing anything else, always run `git pull --rebase` first
- After finishing any task, run `git add . && git commit -m "[description]" && git push`
```

The `--rebase` flag is better than plain `git pull` because it keeps your history cleaner.

**The simple reality** though: since you said you won't work in parallel, a plain `git pull` at the start is sufficient and you can just make it a habit by telling Claude at the start of each session:
```
"Pull latest, then let's work on X"
