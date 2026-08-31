# ADE project setup contract

One versioned source of truth describing what a repository needs in order to be
fully configured for ADE. A consumer — `ade-control-plane` in particular — asks
ADE what is required instead of hard-coding files, labels and workflow
conventions.

Contract version: **`ade.project-setup/v1`**.

## Two objects, two lifetimes

**The contract** states what ADE requires, with no repository involved. It is
versioned with ADE and can be cached for as long as the contract version is
unchanged.

**The evaluation** states how one repository scores against the contract. It is
recomputed on every call and must not be cached.

```bash
ade setup contract --json     # what ADE requires
ade setup check --json        # how this repository scores
```

```js
import { getProjectSetupContract, evaluateProjectSetup } from '@alelouet/ai-delivery-engine';

const contract = getProjectSetupContract();
const evaluation = await evaluateProjectSetup({ projectRoot: '/absolute/path' });
```

## What ADE can and cannot see

ADE is local-first. It has no GitHub API access and **never mutates a
repository or a remote** from this domain.

Requirements are therefore evaluated in **three** states, not two:

| Status | Meaning |
|---|---|
| `satisfied` | Checked locally, present and valid. |
| `unsatisfied` | Checked locally, absent or invalid. |
| `unverifiable` | Out of ADE's reach locally — GitHub labels, remote settings. |

Reporting a label as `unsatisfied` when ADE merely could not look would be a
false negative, and a consumer would create labels that already exist. A caller
that *does* have GitHub access closes the gap by passing what it observed:

```js
const evaluation = await evaluateProjectSetup({
  projectRoot: '/absolute/path',
  observedGithubLabels: ['backlog-refined', 'ready-for-dev', 'in-progress']
});
```

Those requirements then return `satisfied` or `unsatisfied` like any other.
Applying the change on GitHub remains the consumer's job, through its own
GitHub App.

## Readiness verdicts

| Verdict | Meaning |
|---|---|
| `invalid` | The ADE configuration itself fails validation — unknown key, invalid enum, `extends` cycle, stored secret. Readiness cannot be assessed until it is fixed. |
| `incomplete` | Configuration valid, but at least one **required** requirement is unsatisfied. |
| `ready` | Every required requirement is satisfied. Recommended and optional ones may remain open. |

`unverifiable` requirements never make a repository `incomplete`; they are
reported separately in `unverifiableIds` so the consumer decides.

`ade setup check` exits `0` when `ready`, `1` otherwise.

## Requirement shape

```json
{
  "id": "config.ade-config",
  "kind": "config-file",
  "scope": "local",
  "criticality": "required",
  "title": "ADE configuration file",
  "description": "Declares ignore and sensitive globs, tools, rules, profiles and context locations…",
  "path": "ade.config.json",
  "remediation": "Run `ade init`, or write the ADE-provided default configuration to ade.config.json.",
  "template": { "id": "ade.config.json", "description": "Default ADE configuration…" }
}
```

`id` is part of the public contract: consumers key on it, and renaming one is a
breaking change that requires a contract version bump.

`criticality` is `required`, `recommended` or `optional`. `scope` is `local` or
`github`. `kind` is one of `config-file`, `agent-instructions`, `documentation`,
`project-context`, `rule-packs`, `github-label`, `issue-template`,
`environment`.

## Templates stay owned by ADE

When ADE ships content that satisfies a requirement, the requirement carries a
`template` reference rather than the content itself. Fetch the body by id:

```bash
ade setup contract --template ade.config.json
ade setup contract --template .github/ISSUE_TEMPLATE/ade-feature.md
```

```js
import { getSetupTemplate } from '@alelouet/ai-delivery-engine';
const body = getSetupTemplate('ade.config.json');
```

A consumer that copies these defaults into its own codebase will drift from ADE
the first time they change. Fetching them keeps one source.

## Evaluation shape

```json
{
  "version": "ade.project-setup/v1",
  "adeVersion": "0.6.1",
  "generatedAt": "2026-09-01T10:00:00.000Z",
  "projectName": "my-repo",
  "readiness": "incomplete",
  "configurationErrors": [],
  "requirements": [
    {
      "id": "context.generated",
      "kind": "project-context",
      "criticality": "required",
      "status": "unsatisfied",
      "detail": "No project context has been generated.",
      "remediation": "Run `ade context generate`, then `ade context check` to confirm freshness."
    }
  ],
  "missingRequiredIds": ["context.generated"],
  "missingOptionalIds": [],
  "unverifiableIds": ["github.label.backlog-refined"],
  "summaryLines": [],
  "markdown": "# ADE project setup — my-repo…"
}
```

`remediation` and `template` are present only when the requirement is not
satisfied — there is nothing to fix on a satisfied one.

The JSON is stable: two evaluations of an unchanged repository with the same
`generatedAt` produce byte-identical output.

## Reused, not reimplemented

The evaluation delegates to the commands that already own each check:
`resolveConfig` for configuration validity and the `invalid` verdict,
`checkContext` for context freshness, `runDoctor` for the Node version and the
configured tools. This domain adds the catalogue and the verdict, never a second
copy of `ade doctor`.

## From an MCP client

The same contract is reachable from Claude or Codex through the `ade_project_setup`
tool, with `mode: "contract"` or `mode: "check"`. See [MCP.md](./MCP.md).

## Compatibility

Any change to requirement ids, statuses or verdict semantics goes through the
contract version (`ade.project-setup/v1` → `v2`). Adding a requirement to an
existing version is allowed; a consumer must ignore ids it does not know.
