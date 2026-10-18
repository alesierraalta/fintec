/**
 * OpenSpec spec parser and angle-candidate extractor.
 *
 * First stage of the content pipeline: it turns `openspec/specs/<capability>/spec.md`
 * files into a flat, deduplicable list of "angle candidates" — one per scenario.
 * No LLM, no filesystem access, no third-party dependency: the parsing functions
 * are pure so they can be unit-tested against inline fixtures and reused from a
 * CLI, a server route, or a build step.
 *
 * The repository's real specs do NOT all share one layout. Three shapes exist
 * today and the parser handles all of them:
 *   1. Canonical OpenSpec: `## ADDED Requirements` / `### Requirement: <ID> <title>`
 *      / `#### Scenario: <title>` with `- GIVEN|WHEN|THEN` bullets.
 *   2. Legacy delta specs: `## 1. <title>` with `### Requirements` bullet lists and
 *      `### Scenarios` holding bold `**Scenario: <title>**` lines and
 *      `- **Given** ...` bullets.
 *   3. Long-form specs: a document-level `## Scenarios` section holding
 *      `### Scenario N: <title>` headings with `* **Given** ...` bullets.
 *
 * Rather than special-casing each, the parser tracks a heading stack and treats
 * "Requirements"/"Scenarios" headings as containers, so the nearest meaningful
 * heading above a scenario becomes its requirement.
 */

import { createHash } from 'node:crypto';

export type ScenarioStepKeyword = 'GIVEN' | 'WHEN' | 'THEN' | 'OTHER';

export interface ScenarioStep {
  keyword: ScenarioStepKeyword;
  text: string;
}

export interface SpecScenario {
  title: string;
  steps: ScenarioStep[];
}

export interface SpecRequirement {
  /** Leading identifier token such as `REQ-FB-01`, or null when absent. */
  id: string | null;
  title: string;
  description: string;
  /** Requirements section word: `ADDED`, `MODIFIED`, ... or `UNSPECIFIED`. */
  section: string;
  scenarios: SpecScenario[];
}

export interface ParsedSpec {
  capability: string;
  summary: string;
  requirements: SpecRequirement[];
}

export interface AngleCandidate {
  /** Stable 16-char sha256 prefix used to deduplicate across runs. */
  fingerprint: string;
  capability: string;
  requirementId: string | null;
  requirementTitle: string;
  section: string;
  scenarioTitle: string;
  given: string[];
  when: string[];
  then: string[];
  other: string[];
  sourcePath: string;
}

/** Section assigned when a spec has no `## <WORD> Requirements` heading. */
export const UNSPECIFIED_SECTION = 'UNSPECIFIED';

const HEADING_PATTERN = /^(#{1,6})\s+(.*)$/;
const BULLET_PATTERN = /^\s*[-*+]\s+(.*)$/;
/** `**Scenario: X**` used as a pseudo-heading in legacy specs. */
const BOLD_LINE_PATTERN = /^\s*\*\*(.+?)\*\*\s*$/;
/** `## ADDED Requirements`, `## Requirements`, `### Requirements`. */
const SECTION_HEADING_PATTERN = /^(?:([A-Za-z]+)\s+)?requirements?$/i;
const SCENARIOS_CONTAINER_PATTERN = /^scenarios?$/i;
/** `Scenario: X`, `Scenario 1: X`, `Scenario X`. */
const SCENARIO_HEADING_PATTERN = /^scenario\b\s*\d*\s*[:.-]?\s*(.*)$/i;
/** A leading hyphenated all-caps token, e.g. `REQ-FB-01`. */
const REQUIREMENT_ID_PATTERN = /^([A-Z][A-Z0-9]*(?:-[A-Z0-9]+)+)(?:\s+(.*))?$/;
const REQUIREMENT_HEADING_PATTERN = /^requirement\s*:\s*(.*)$/i;
/** Optional emphasis + keyword prefix, e.g. `**Given**`, `GIVEN`, `_and_`. */
const STEP_KEYWORD_PATTERN =
  /^(?:\*\*|__|\*|_)?\s*(given|when|then|and|but)\s*(?:\*\*|__|\*|_)?\s*[:,]?\s+(.*)$/i;

interface HeadingFrame {
  level: number;
  title: string;
  /** True for `Requirements` / `Scenarios` grouping headings. */
  container: boolean;
}

/** Trim, collapse internal whitespace, lowercase. */
function normalize(value: string): string {
  return value.trim().replace(/\s+/g, ' ').toLowerCase();
}

function stripInlineMarkers(value: string): string {
  return value.trim().replace(/\s+/g, ' ');
}

function splitRequirementHeading(heading: string): {
  id: string | null;
  title: string;
} {
  const match = REQUIREMENT_ID_PATTERN.exec(heading);
  if (!match) {
    return { id: null, title: heading };
  }
  const [, id, rest] = match;
  const title = (rest ?? '').trim();
  return { id, title: title.length > 0 ? title : id };
}

function parseStep(
  raw: string,
  previousKeyword: ScenarioStepKeyword | null
): ScenarioStep {
  const match = STEP_KEYWORD_PATTERN.exec(raw);
  if (!match) {
    return { keyword: 'OTHER', text: stripInlineMarkers(raw) };
  }

  const [, keyword, rest] = match;
  const upper = keyword.toUpperCase();
  const text = stripInlineMarkers(rest);

  // `AND` / `BUT` continue whichever bucket the previous step opened. With no
  // previous step there is nothing to continue, so the bullet is kept verbatim
  // in `OTHER` rather than being silently dropped.
  if (upper === 'AND' || upper === 'BUT') {
    return previousKeyword && previousKeyword !== 'OTHER'
      ? { keyword: previousKeyword, text }
      : { keyword: 'OTHER', text: stripInlineMarkers(raw) };
  }

  return { keyword: upper as ScenarioStepKeyword, text };
}

function finalizeDescription(lines: string[]): string {
  return lines
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Parse a single OpenSpec markdown document into requirements and scenarios.
 *
 * Never throws on malformed input: unrecognized content is either attached to
 * the nearest requirement description or, for scenario bullets, kept in the
 * `OTHER` bucket.
 */
export function parseSpecMarkdown(
  source: string,
  capability: string
): ParsedSpec {
  const lines = source.split(/\r?\n/);

  const requirements: SpecRequirement[] = [];
  const headingStack: HeadingFrame[] = [];
  const summaryLines: string[] = [];

  let documentTitle = '';
  let section = UNSPECIFIED_SECTION;
  let collectingSummary = false;

  let requirement: SpecRequirement | null = null;
  let requirementEmitted = false;
  let descriptionLines: string[] = [];
  let scenario: SpecScenario | null = null;

  const flushRequirement = (): void => {
    if (requirement && !requirementEmitted) {
      return;
    }
    if (requirement) {
      requirement.description = finalizeDescription(descriptionLines);
    }
  };

  const closeRequirement = (): void => {
    if (requirement) {
      requirement.description = finalizeDescription(descriptionLines);
    }
    requirement = null;
    requirementEmitted = false;
    descriptionLines = [];
    scenario = null;
  };

  /** Emit the pending requirement into the output list exactly once. */
  const emitRequirement = (): void => {
    if (requirement && !requirementEmitted) {
      requirements.push(requirement);
      requirementEmitted = true;
    }
  };

  const openRequirement = (
    id: string | null,
    title: string,
    explicit: boolean
  ): void => {
    closeRequirement();
    requirement = { id, title, description: '', section, scenarios: [] };
    // Explicit `### Requirement:` headings are part of the contract even with
    // no scenarios; headings inferred from other layouts only earn a slot once
    // they actually carry a scenario.
    if (explicit) {
      emitRequirement();
    }
  };

  const openScenario = (title: string): void => {
    if (!requirement) {
      const inferred = [...headingStack]
        .reverse()
        .find((frame) => !frame.container);
      openRequirement(
        null,
        inferred?.title ?? documentTitle ?? capability,
        false
      );
    }
    emitRequirement();
    scenario = { title: stripInlineMarkers(title), steps: [] };
    requirement?.scenarios.push(scenario);
  };

  for (const line of lines) {
    const headingMatch = HEADING_PATTERN.exec(line);

    if (headingMatch) {
      const level = headingMatch[1].length;
      const heading = stripInlineMarkers(headingMatch[2]);

      while (
        headingStack.length > 0 &&
        headingStack[headingStack.length - 1].level >= level
      ) {
        headingStack.pop();
      }

      if (level === 1) {
        documentTitle = heading;
        collectingSummary = true;
        closeRequirement();
        continue;
      }

      collectingSummary = false;

      const scenarioMatch = SCENARIO_HEADING_PATTERN.exec(heading);
      if (scenarioMatch && !SCENARIOS_CONTAINER_PATTERN.test(heading)) {
        headingStack.push({ level, title: heading, container: false });
        openScenario(scenarioMatch[1] || heading);
        continue;
      }

      const sectionMatch = SECTION_HEADING_PATTERN.exec(heading);
      if (sectionMatch) {
        headingStack.push({ level, title: heading, container: true });
        closeRequirement();
        if (sectionMatch[1]) {
          section = sectionMatch[1].toUpperCase();
        }
        continue;
      }

      if (SCENARIOS_CONTAINER_PATTERN.test(heading)) {
        headingStack.push({ level, title: heading, container: true });
        closeRequirement();
        continue;
      }

      headingStack.push({ level, title: heading, container: false });

      const requirementMatch = REQUIREMENT_HEADING_PATTERN.exec(heading);
      if (requirementMatch) {
        const { id, title } = splitRequirementHeading(
          stripInlineMarkers(requirementMatch[1])
        );
        openRequirement(id, title, true);
        continue;
      }

      openRequirement(null, heading, false);
      continue;
    }

    const boldMatch = BOLD_LINE_PATTERN.exec(line);
    if (boldMatch) {
      const boldScenario = SCENARIO_HEADING_PATTERN.exec(
        stripInlineMarkers(boldMatch[1])
      );
      if (boldScenario) {
        openScenario(boldScenario[1] || boldMatch[1]);
        continue;
      }
    }

    if (collectingSummary) {
      summaryLines.push(line);
      continue;
    }

    const bulletMatch = BULLET_PATTERN.exec(line);

    if (scenario) {
      if (bulletMatch) {
        // @ts-ignore - scenario is SpecScenario here, TS narrow thinks never due to control flow
        const previous =
          (scenario as SpecScenario).steps[
            (scenario as SpecScenario).steps.length - 1
          ] ?? null;
        (scenario as SpecScenario).steps.push(
          parseStep(bulletMatch[1], previous?.keyword ?? null)
        );
        continue;
      }
      if (line.trim().length > 0) {
        // Continuation of the previous bullet (a reflowed line). Appending it
        // keeps the fingerprint stable when a step is re-wrapped.
        // @ts-ignore
        const previous = (scenario as SpecScenario).steps[
          (scenario as SpecScenario).steps.length - 1
        ];
        if (previous) {
          previous.text = stripInlineMarkers(`${previous.text} ${line.trim()}`);
          continue;
        }
      }
      continue;
    }

    if (requirement) {
      descriptionLines.push(line);
    }
  }

  flushRequirement();
  closeRequirement();

  return {
    capability,
    summary: finalizeDescription(summaryLines),
    requirements,
  };
}

function fingerprintFor(
  capability: string,
  requirement: SpecRequirement,
  scenario: SpecScenario
): string {
  const parts = [
    normalize(capability),
    normalize(requirement.id ?? requirement.title),
    normalize(scenario.title),
    ...scenario.steps.map(
      (step) => `${step.keyword.toLowerCase()}:${normalize(step.text)}`
    ),
  ];

  return createHash('sha256')
    .update(parts.join('\n'))
    .digest('hex')
    .slice(0, 16);
}

/** Flatten a parsed spec into one angle candidate per scenario. */
export function toAngleCandidates(
  spec: ParsedSpec,
  sourcePath: string
): AngleCandidate[] {
  const candidates: AngleCandidate[] = [];

  for (const requirement of spec.requirements) {
    for (const scenario of requirement.scenarios) {
      const bucket = (keyword: ScenarioStepKeyword): string[] =>
        scenario.steps
          .filter((step) => step.keyword === keyword)
          .map((step) => step.text);

      candidates.push({
        fingerprint: fingerprintFor(spec.capability, requirement, scenario),
        capability: spec.capability,
        requirementId: requirement.id,
        requirementTitle: requirement.title,
        section: requirement.section,
        scenarioTitle: scenario.title,
        given: bucket('GIVEN'),
        when: bucket('WHEN'),
        then: bucket('THEN'),
        other: bucket('OTHER'),
        sourcePath,
      });
    }
  }

  return candidates;
}
