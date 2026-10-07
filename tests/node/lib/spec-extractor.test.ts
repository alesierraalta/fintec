import {
  parseSpecMarkdown,
  toAngleCandidates,
} from '@/lib/content/spec-extractor';

const CANONICAL_SPEC = `# Delta Spec: sample

Sample capability summary sentence.

## ADDED Requirements

### Requirement: REQ-SM-01 First requirement title

The system MUST do the first thing. This description
spans two source lines.

#### Scenario: First scenario

- GIVEN an initial state
- GIVEN a secondary precondition
- AND a third precondition
- WHEN the action runs
- THEN the outcome is observed
- AND a side effect is recorded

#### Scenario: Second scenario

- GIVEN another state
- WHEN something else happens
- THEN a different outcome is observed
- NOTE this bullet has no recognized keyword

## MODIFIED Requirements

### Requirement: Second requirement without an identifier

Short description.

#### Scenario: Third scenario

- GIVEN a precondition
- WHEN an action occurs
- THEN a result is produced
`;

// Same semantic content as CANONICAL_SPEC, only whitespace and line wrapping
// differ: trailing spaces, extra blank lines, and reflowed bullet text.
const REFLOWED_SPEC = `# Delta Spec: sample

Sample capability summary sentence.


## ADDED Requirements


### Requirement: REQ-SM-01 First requirement title

The system MUST do the first thing. This description spans two source lines.


#### Scenario:    First scenario

-  GIVEN   an initial state
- GIVEN a secondary
  precondition
- AND a third precondition
- WHEN the action
  runs
- THEN the outcome is observed
- AND a side effect is recorded


#### Scenario: Second scenario

- GIVEN another state
- WHEN something else happens
- THEN a different outcome is observed
- NOTE this bullet has no recognized keyword


## MODIFIED Requirements

### Requirement: Second requirement without an identifier

Short description.

#### Scenario: Third scenario

- GIVEN a precondition
- WHEN an action occurs
- THEN a result is produced
`;

const REWORDED_SPEC = CANONICAL_SPEC.replace(
  '- THEN the outcome is observed\n- AND a side effect is recorded',
  '- THEN the outcome is NOT observed\n- AND a side effect is recorded'
);

const SOURCE_PATH = 'openspec/specs/sample/spec.md';

describe('parseSpecMarkdown', () => {
  it('parses a multi-requirement, multi-scenario spec into the expected shape', () => {
    const spec = parseSpecMarkdown(CANONICAL_SPEC, 'sample');

    expect(spec.capability).toBe('sample');
    expect(spec.summary).toBe('Sample capability summary sentence.');
    expect(spec.requirements).toHaveLength(2);
    expect(spec.requirements[0].scenarios.map((s) => s.title)).toEqual([
      'First scenario',
      'Second scenario',
    ]);
    expect(spec.requirements[1].scenarios.map((s) => s.title)).toEqual([
      'Third scenario',
    ]);
  });

  it('splits the requirement identifier out of the heading when present', () => {
    const spec = parseSpecMarkdown(CANONICAL_SPEC, 'sample');

    expect(spec.requirements[0].id).toBe('REQ-SM-01');
    expect(spec.requirements[0].title).toBe('First requirement title');
  });

  it('keeps the whole heading as the title when no identifier is present', () => {
    const spec = parseSpecMarkdown(CANONICAL_SPEC, 'sample');

    expect(spec.requirements[1].id).toBeNull();
    expect(spec.requirements[1].title).toBe(
      'Second requirement without an identifier'
    );
  });

  it('captures requirement prose and excludes scenario content from it', () => {
    const [requirement] = parseSpecMarkdown(
      CANONICAL_SPEC,
      'sample'
    ).requirements;

    expect(requirement.description).toContain(
      'The system MUST do the first thing.'
    );
    expect(requirement.description).not.toContain('Scenario');
    expect(requirement.description).not.toContain('GIVEN');
  });

  it('retains every GIVEN/WHEN/THEN step of a scenario in order', () => {
    const [scenario] = parseSpecMarkdown(CANONICAL_SPEC, 'sample')
      .requirements[0].scenarios;

    expect(scenario.steps.map((step) => step.keyword)).toEqual([
      'GIVEN',
      'GIVEN',
      'GIVEN',
      'WHEN',
      'THEN',
      'THEN',
    ]);
    expect(scenario.steps.map((step) => step.text)).toEqual([
      'an initial state',
      'a secondary precondition',
      'a third precondition',
      'the action runs',
      'the outcome is observed',
      'a side effect is recorded',
    ]);
  });

  it('routes an unrecognized bullet to the OTHER bucket instead of dropping it', () => {
    const scenario = parseSpecMarkdown(CANONICAL_SPEC, 'sample').requirements[0]
      .scenarios[1];
    const other = scenario.steps.filter((step) => step.keyword === 'OTHER');

    expect(other).toEqual([
      { keyword: 'OTHER', text: 'NOTE this bullet has no recognized keyword' },
    ]);
  });

  it('carries the requirements section onto each requirement', () => {
    const spec = parseSpecMarkdown(CANONICAL_SPEC, 'sample');

    expect(spec.requirements.map((requirement) => requirement.section)).toEqual(
      ['ADDED', 'MODIFIED']
    );
  });

  it('returns an empty requirement list for empty or heading-only input', () => {
    expect(parseSpecMarkdown('', 'sample').requirements).toEqual([]);
    expect(
      parseSpecMarkdown(
        '# Delta Spec: sample\n\n## ADDED Requirements\n',
        'sample'
      ).requirements
    ).toEqual([]);
  });
});

describe('toAngleCandidates', () => {
  it('emits one candidate per scenario with its steps bucketed', () => {
    const candidates = toAngleCandidates(
      parseSpecMarkdown(CANONICAL_SPEC, 'sample'),
      SOURCE_PATH
    );

    expect(candidates).toHaveLength(3);
    expect(candidates[0]).toMatchObject({
      capability: 'sample',
      requirementId: 'REQ-SM-01',
      requirementTitle: 'First requirement title',
      section: 'ADDED',
      scenarioTitle: 'First scenario',
      given: [
        'an initial state',
        'a secondary precondition',
        'a third precondition',
      ],
      when: ['the action runs'],
      then: ['the outcome is observed', 'a side effect is recorded'],
      other: [],
      sourcePath: SOURCE_PATH,
    });
    expect(candidates[1].other).toEqual([
      'NOTE this bullet has no recognized keyword',
    ]);
  });

  it('produces a stable fingerprint across whitespace and line-wrapping changes', () => {
    const canonical = toAngleCandidates(
      parseSpecMarkdown(CANONICAL_SPEC, 'sample'),
      SOURCE_PATH
    );
    const reflowed = toAngleCandidates(
      parseSpecMarkdown(REFLOWED_SPEC, 'sample'),
      SOURCE_PATH
    );

    expect(reflowed.map((candidate) => candidate.fingerprint)).toEqual(
      canonical.map((candidate) => candidate.fingerprint)
    );
  });

  it('changes the fingerprint when a step is reworded', () => {
    const canonical = toAngleCandidates(
      parseSpecMarkdown(CANONICAL_SPEC, 'sample'),
      SOURCE_PATH
    );
    const reworded = toAngleCandidates(
      parseSpecMarkdown(REWORDED_SPEC, 'sample'),
      SOURCE_PATH
    );

    expect(reworded[0].fingerprint).not.toBe(canonical[0].fingerprint);
    // Unrelated scenarios keep their identity.
    expect(reworded[2].fingerprint).toBe(canonical[2].fingerprint);
  });

  it('emits a 16-character hex fingerprint that is unique per scenario', () => {
    const candidates = toAngleCandidates(
      parseSpecMarkdown(CANONICAL_SPEC, 'sample'),
      SOURCE_PATH
    );
    const fingerprints = candidates.map((candidate) => candidate.fingerprint);

    for (const fingerprint of fingerprints) {
      expect(fingerprint).toMatch(/^[0-9a-f]{16}$/);
    }
    expect(new Set(fingerprints).size).toBe(fingerprints.length);
  });
});
