# Rule pack reference fixtures

Small, illustrative examples of the conventions each V1 rule pack encodes. These
are reference material for humans and AI agents — ADE centralizes project
conventions, orchestrates existing tools (ESLint, tsc, phpcs, …) and only
deterministically enforces what it can (e.g. the service-size rule).

Activate packs in `ade.config`:

```json
{ "packs": ["development", "frontend/next", "backend/java"], "thresholds": { "serviceMaxLines": 250 } }
```

Then:

```bash
ade rules available     # list all built-in packs
ade rules list          # list the rules of the active packs
ade review              # run deterministic pack rules (e.g. service size)
```

| Pack | Fixture | Illustrates |
|---|---|---|
| `development` | [development/payment.service.ts](development/payment.service.ts) | service kept small (size rule) |
| `frontend/next` | [frontend-next/counter.client.tsx](frontend-next/counter.client.tsx) | deliberate client/server boundary |
| `frontend/react` | [frontend-react/Button.tsx](frontend-react/Button.tsx) | component + design-token conventions |
| `frontend/angular` | [frontend-angular/greeting.component.ts](frontend-angular/greeting.component.ts) | presentational component |
| `frontend/wordpress` | [frontend-wordpress/template-part.php](frontend-wordpress/template-part.php) | output escaping |
| `backend/java` | [backend-java/GreetingService.java](backend-java/GreetingService.java) | controller/service/repository layering |

Rule kinds: `deterministic` (ADE checks it), `tool` (ADE orchestrates/references
an external tool), `guidance` (surfaced for humans and AI, not mechanically
enforced). See [../../docs/RULE_PACKS.md](../../docs/RULE_PACKS.md).
