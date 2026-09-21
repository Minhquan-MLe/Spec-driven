# Spec-Driven Development with Agentic Coding Assistants

This repository contains the companion code for the DeepLearning.AI Spec-Driven Development course. The video folder holds the complete project state you need to follow along with that video.

## Other DeepLearning.AI Resources
> :mortar_board: **Keep learning** → [Explore all DeepLearning.AI courses](https://www.deeplearning.ai/courses/) — taught by the people building the future of AI. Find your next one.
>
> :computer: **Explore more course artifacts** → [Browse the DeepLearning.AI course artifacts repo](https://github.com/https-deeplearning-ai/deeplearning-ai) to find notebooks, projects, and notes from other courses across the DeepLearning.AI library.

## How to use this repo

The simplest way to take this course is to start at Video 5 and follow along, building the project as you go.

`Video05_Creating_the_Constitution` contains a snapshot of the AgentClinic project as it should look **at the start** of Video 5. If you want to start fresh, just copy that folder into your own working directory:

```bash
cp -r Video05_Creating_the_Constitution/ my-agentclinic/
cd my-agentclinic
npm install
```

## Video overview

The video folder contains the **complete starter code** for that video and **all prompts used** throughout it.

| Folder | Video | What you're starting with |
|--------|-------|--------------------------|
| Video05_Creating_the_Constitution | Creating the Constitution | Empty project scaffold (package.json, tsconfig.json, src/index.ts) |

Videos 2-4 (Why Spec-Driven Development, Workflow Overview, and Setup) are conceptual and do not have starter code. Starter code for Videos 6-14 is no longer included in this copy of the repo.

## Other directories

- **`prompts/`** -- All video prompts in one place. Each file contains the numbered prompts for that video. A copy also lives inside `Video05_Creating_the_Constitution/` as `prompts.md`.
- **`skills/`** -- Reusable agent skills developed during the course (changelog, feature-spec).
- **`example_specs/`** -- Example specification documents referenced in the course.

## Prerequisites

- Node.js (v18+)
- Git
- A coding agent (the course uses Claude Code, but the workflow is agent-agnostic)
- An IDE or editor (the course uses [WebStorm](https://www.jetbrains.com/webstorm/download/))
