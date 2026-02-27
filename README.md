# P23 Market (Frontend)

## Project Scope
P23 Market is a frontend-first e-commerce project focused on building a complete, production-style UI with an AI-driven workflow.

### Goals
- Build a responsive e-commerce frontend.
- Use AI for planning, implementation, testing, and documentation.
- Keep code quality high with linting, typing, and tests.

### Core Features (Phase 1)
- Home page
- Product listing page (filter/sort/pagination)
- Product detail page
- Cart page
- Checkout mock flow (no real payment)

### Non-Functional Requirements
- Mobile-first responsive design
- Accessibility basics (semantic HTML, labels, keyboard support)
- Performance basics (optimized assets, lazy loading where relevant)
- Clean and maintainable component structure

## Suggested Tech Stack
- Framework: Next.js (or Vite + React)
- Language: TypeScript
- Styling: Tailwind CSS (or CSS Modules)
- State: React Context / Zustand
- Data: Mock API first, real API integration later
- Testing: Vitest + React Testing Library (or Jest)

## AI-First Development Workflow
1. Define one feature clearly.
2. Ask AI to implement only that feature.
3. Ask AI to add loading/error/empty states.
4. Ask AI to add tests.
5. Run lint/typecheck/tests and fix all issues.
6. Update docs after each milestone.

### Prompt Template
"Implement [FEATURE] in this codebase. Keep existing behavior intact. Include responsive UI, loading/error/empty states, accessibility labels, and tests. Then run lint, typecheck, and tests, and fix any failures."

## Milestones
- M1: Project setup and base layout
- M2: Product list and product detail
- M3: Cart and checkout mock
- M4: Polish (a11y/performance/SEO)
- M5: Final QA and deployment

## Definition of Done
- All scoped pages/features are implemented.
- App is responsive on mobile/tablet/desktop.
- Lint, typecheck, and tests pass.
- Documentation is updated.

## Next Step
Initialize the frontend app scaffold (Next.js or Vite) and implement Milestone M1.
