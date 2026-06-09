# ADR-0001: Documentation First

## Status

Accepted

## Context

The project vision is larger than the first implementation step. If code starts before the operating model is clear, the repository will likely accumulate unstable abstractions, unclear agent boundaries, and accidental product decisions.

## Decision

The first repository milestone is documentation first.

This means:

- define the problem and target users first
- define agent roles before implementing agent runners
- define backlog and workflow contracts before adding APIs
- keep V1 manual where trust and behavior are still unclear

## Consequences

Positive:

- lower risk of building the wrong orchestration layer
- easier onboarding for collaborators
- clearer boundary between V1 and later automation

Trade-offs:

- no immediate demo of autonomous behavior
- more upfront product thinking before coding

## Follow-Up

The recommended next implementation step is a local, file-based manual runner for the PO/PM flow only.
