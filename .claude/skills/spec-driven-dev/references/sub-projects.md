# Large and multi-track projects

Read this when `Implementation_plan.md` needs independent sub-projects, or when `/implement` is asked to run work in parallel.

## Large / multi-stack projects — splitting into sub-projects

For a project large enough to naturally decompose into genuinely independent deployable units (e.g. a separate infrastructure stack and an application stack, or multiple services with different deploy lifecycles), a single flat `Implementation_plan.md` phase list can become unwieldy. In that case:

- Keep one `PRD.md` and one `architecture.md` at the project root — the overall requirements and system shape are still one coherent story.
- Structure `Implementation_plan.md` around named sub-projects, each with its own phase sequence and explicit dependency on the others (e.g. "Sub-project A: Infrastructure — must complete Phase 2 before Sub-project B: API Service can begin its Phase 1"). This mirrors building genuinely modular, independently testable stacks rather than one monolithic build sequence.
- `Progress.md`'s "Current Phase" should track per sub-project once this split happens, not a single global phase number — otherwise it stops accurately reflecting reality on multi-track work.
- Don't split into sub-projects prematurely — if the whole thing can be reasonably sequenced as one phase list, do that; the split is for genuine independent-deployability cases, not a default structure.

## Parallelizing work with git worktrees (use sparingly, and only when it earns its cost)

Once `Implementation_plan.md` has genuinely independent sub-projects or phases, git worktrees let separate work happen in separate directories on separate branches without constant branch-switching — each worktree checks out its own branch while sharing the same repository history.

**When this is worth it:** two or more phases/sub-projects that are truly independent (don't touch overlapping files) and both need active work right now — not as a default parallelization habit for every project.

**When it isn't:** a monolithic codebase where "independent" phases still touch shared files. Parallel work on a shared monolith produces real merge conflicts on integration, not just theoretical risk — resolve via `git rebase` (not merge, to keep linear history) when it happens, and expect it to happen if file overlap exists between the parallel branches.

**Before starting a worktree, verify these explicitly — this is the actual failure mode, not a hypothetical:**
- A fresh worktree does NOT inherit gitignored files — environment config, `.env` files, local secrets, and installed dependencies all need to be set up again in the new worktree directory. Skipping this produces confusing "why isn't my change showing up" debugging sessions that are actually just "you're running the old worktree/branch."
- Confirm which directory and branch a terminal session or IDE window is actually pointed at before making changes or testing — running the app from the wrong worktree while editing in the right one (or vice versa) is the single most common mistake here.

If `/implement` is invoked on a task that's part of an independent sub-project/phase with other active work in flight elsewhere, it's reasonable to suggest a worktree — but always flag the setup steps above explicitly rather than assuming the environment carries over.

