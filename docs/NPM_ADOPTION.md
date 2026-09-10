# npm Adoption Measurement

This document records how AI Delivery Engine measures real npm adoption. The
goal is to learn whether clearer package metadata, documentation, examples, and
release communication help users try the package. It is not a target for
artificial downloads.

## Primary metric

Track the npm Downloads API's rolling 30-day total for
`@alelouet/ai-delivery-engine`:

```bash
curl -fsSL 'https://api.npmjs.org/downloads/point/last-month/%40alelouet%2Fai-delivery-engine'
```

The response contains the package name, the inclusive date range, and the
download count. Record all three fields: a count alone is not comparable when
the reporting period differs.

## Baseline

| Recorded on | Reporting period | Downloads | Note |
| --- | --- | ---: | --- |
| 2026-09-10 | 2026-08-08 to 2026-09-06 | 607 | Baseline before the discoverability changes for issue #170. |

## Monthly review

On the first working day of each month:

1. Run the command above and append the result to the baseline table.
2. Compare the rolling 30-day result with the preceding recorded period.
3. Note meaningful distribution actions since the previous entry: release
   notes, an example or documentation update, a community post, or a GitHub
   topic change.
4. Review qualitative signals alongside the count: stars, issues,
   discussions, and reports of successful adoption.
5. Decide whether to keep, improve, or stop a discovery action. Do not infer a
   causal result from downloads alone.

For the initial quarter after a discoverability change, use a directional goal:
increase the rolling 30-day total from the baseline while preserving the
package's local-first, provider-neutral promise. Revisit the target after three
monthly observations rather than optimizing a single noisy interval.

## Distribution guardrails

- Never generate downloads through scripts, CI, or automated installs merely
  to raise the metric.
- Do not claim AI-provider integrations, autonomous execution, or hosted
  features that ADE does not provide.
- Prefer channels where a maintainer can explain the concrete workflow and
  link to the [adoption example](../examples/adopt-existing-project/README.md).
- Keep npm metadata aligned with actual CLI capabilities and supported
  documentation.
