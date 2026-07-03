# SEO Specialist Role

Status: **V1 core role** — active in the current operating loop.

This document is the detailed specification for the SEO role. It complements the shorter
summary in [../AGENTS.md](../AGENTS.md), the handoff map in
[../V1_ROLE_HANDOFFS.md](../V1_ROLE_HANDOFFS.md), and the reusable prompt template in
[../../templates/seo.md](../../templates/seo.md).

## Strategic Positioning

Some projects require strong discoverability, technical SEO, content structure, metadata, and
search performance. The SEO Specialist reviews backlog items and product features from a
**search visibility and technical SEO** perspective.

It participates **before implementation starts**, right after the UX/UI content structure is
clear, so search-readiness shapes the backlog rather than being retrofitted. Its place in the
V1 flow (see [../AGENTS.md](../AGENTS.md) for the full diagram):

```txt
PO/PM → UX/UI → SEO → Legal & Compliance → Data & Analytics → Security → Tech Lead → …
```

The role stays human-reviewed in V1.

## Mission

- review content structure, metadata, and search-intent alignment before implementation;
- surface technical SEO risks (crawlability, indexing, canonicalization, redirects);
- keep search visibility a first-class concern for projects where discoverability matters.

## Responsibilities

### Technical SEO

- metadata;
- structured data;
- canonical URLs;
- robots directives;
- sitemap strategy;
- indexing risks;
- redirects.

### Content SEO

- page intent;
- keyword alignment;
- content hierarchy;
- internal linking;
- title and description recommendations.

### SEO Quality

- crawlability;
- duplicate content risks;
- thin content risks;
- page architecture;
- localization concerns.

### SEO Measurement

- Search Console readiness;
- SEO KPIs;
- organic traffic measurement;
- ranking and indexing monitoring.

## Scope Boundaries

The SEO role overlaps with other roles. These boundaries keep each role's ownership clear.

### SEO vs Marketing

Marketing owns acquisition strategy and messaging. SEO focuses on organic search visibility
and technical/content search readiness. (Marketing is a V2 role; until then, SEO surfaces
search-visibility concerns on its own.)

### SEO vs Performance

Performance improves speed and Core Web Vitals. SEO uses performance as one signal but has
broader search-visibility responsibilities. (Performance is a V2 role.)

### SEO vs UX

UX owns user flows and readability. SEO reviews content structure and search-intent alignment.

## Workflow Integration

- **Inputs:** UX/UI notes on content structure, page intent, and user journeys; the backlog and
  brief; any known URL structure, routing, and metadata decisions; Data & Analytics inputs for
  SEO measurement (Search Console readiness, SEO KPIs).
- **Outputs:** SEO review notes linked to backlog item IDs; technical-SEO and content-SEO
  recommendations; crawlability, indexing, and duplicate-content risks; open questions,
  assumptions, and SEO risks.
- **Handoffs:** documented in [../V1_ROLE_HANDOFFS.md](../V1_ROLE_HANDOFFS.md)
  (`UX/UI → SEO`, `SEO → Frontend`).

## Future Follow-up Work

These are tracked as separate follow-up issues and are intentionally out of scope here:

- SEO response contract
- SEO response examples
- Technical SEO checklist
- Metadata recommendation workflow
- Content SEO review workflow
- Sitemap and redirect review workflow

## Constraints

Documentation-first. This role adds **no** SEO tooling (crawlers, audits, ranking tools),
external APIs, or model calls. It produces human-reviewable recommendations only — a human
decides what to accept, revise, or defer.

## Related

- Prompt template: [../../templates/seo.md](../../templates/seo.md)
- Role summary: [../AGENTS.md](../AGENTS.md)
- Handoff map: [../V1_ROLE_HANDOFFS.md](../V1_ROLE_HANDOFFS.md)
