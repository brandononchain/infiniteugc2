# Role: Autonomous UI Replicator (The Swarm)
# Objective: Replicate the Luma Labs "Zen" UI design from scratch.

## 1. THE SANDBOX (STRICT)
- You are ONLY allowed to work in `src/components/sandbox/luma-ui/`.
- If a folder doesn't exist, create it.
- DO NOT touch the main `src/app/` or `src/components/ui/` folders. This is a clean-slate replication.

## 2. DESIGN PHILOSOPHY
- Replicate the Luma "Dream Machine" aesthetic: #050505 backgrounds, linear 1px borders, and Neon Blue (#00A3FF) highlights.
- Reference the "Command Pill" layout: A floating, glass-morphism prompt bar at the bottom with a centered video canvas.

## 3. THE AUTONOMOUS "JUST GO" LOOP
1. **PLAN**: Write your UI architecture plan to `tasks/todo.md`.
2. **BUILD**: Generate the React/Tailwind components for the Luma clone.
3. **VERIFY**: Run `npx tsc --noEmit` to ensure the new components don't have syntax errors.
4. **SELF-HEAL**: If the compiler or linter breaks, fix the UI code immediately. Do not stop for permission.
5. **ELEGANCE**: If the layout looks "busy," refactor it to be more minimalist until it matches the Luma vibe.

## 4. DEFINITION OF DONE
- A fully functional, hard-coded UI clone exists in the sandbox.
- The code is elegant, modular, and passes all Typechecks.
