# Test plan — <app / module>

Created: <date> · Last updated: <date> · Plan path: `docs/testing/test-plan.md` · Sandbox: <worktree / container / scratchpad> · Findings precision: <confirmed+fixed> / <rows with a verdict>
Baseline: `<git rev>` · untracked files: <count> · fingerprint: `<assets/fingerprint.sh output>` (a change is anything that differs from this fingerprint, not raw `git status`)

## Inventory

| Surface | Entry points | Owner module | Notes |
| ------- | ------------ | ------------ | ----- |

## Ranked targets

Rows are never removed by budget; budget changes order and status only. Rows contributed by a
sibling in the layer sweep name that sibling in "Sibling skill".

| Target | Blast radius | Churn / past fixes | Consequence class | Existing evidence | Altitude | Target rung | Sibling skill | Verdict | Status | Run |
| ------ | ------------ | ------------------ | ----------------- | ----------------- | -------- | ----------- | ------------- | ------- | ------ | --- |

Verdicts: probe · pin · none. Statuses: pending · in progress · done · blocked · n/a.
A `none` verdict is created with status `n/a`; the execution ratio excludes `n/a` rows.

## Real-run recipes

How each critical journey is driven for real (`real-run-validation`), so EXECUTE never rediscovers it.

| Journey | Start command | Data setup | Sample requests | Expected observable |
| ------- | ------------- | ---------- | --------------- | ------------------- |

## Layer matrix

The `Run` column identifies which bounded run owns each layer and target row; leave it blank for unscoped work.

| Layer                      | Skill                          | Scope                                              | Status  | Run |
| -------------------------- | ------------------------------ | -------------------------------------------------- | ------- | --- |
| Security                   | `appsec-adversarial-auditor`   | auth boundaries, untrusted input, secrets          | pending |     |
| Runtime and faults         | `runtime-reliability-testing`  | load, latency, fault injection, smoke              | pending |     |
| Persistence and migrations | `database-persistence-testing` | migration naming/order/idempotency, isolation, N+1 | pending |     |
| Architecture conformance   | `clean-architecture-audit`     | layer purity, targeted mutation                    | pending |     |
| Critical e2e journeys      | `real-run-validation`          | <journey 1>, <journey 2>, <journey 3>              | pending |     |
| Sandbox                    | `docker-test-containers`       | ephemeral DB/cache, environment proof              | pending |     |

Statuses: pending · in progress · done · blocked · n/a. `plan gaps` counts a row as swept when its
status cell reads `done`, `fixed` or `closed`, and drops `n/a`, `na`, `none` and `skipped` from the
denominator entirely; the `Skill` cell only labels the rows still owed. In a plan that declares
`Light:`, every `n/a` row also states its reason in the `Scope` cell.

## Not testing, on purpose

| Target | Reason |
| ------ | ------ |

## Characterization (legacy)

| Test | Behavior pinned | Believed correct? | Promote or delete after the change |
| ---- | --------------- | ----------------- | ---------------------------------- |

## Execution log

| Date | Target | Rung reached | Findings (path:line) | Promoted tests | Evidence (ledger id) | Notes |
| ---- | ------ | ------------ | -------------------- | -------------- | -------------------- | ----- |

## Findings

A rejected or wontfix finding is a known non-issue: it is never re-proposed unless the fingerprint
of its cited files changed; when a run skips it, it cites the row. Severity is the consequence class
(`references/prioritization.md`); always state whether data is safe. A `confirmed` or `fixed`
finding names the promoted test that asserts the promised behaviour, so it is red on the current
code and green once fixed (rule 13); a test written the other way round is a characterization
test and says so in its name. A finding that never got a test stays `open`, reason `not pinned`.

| Id  | Finding (path:line, one line) | Severity (consequence class) | Data safe? | Evidence id | Pinning test (suite path :: test name) | Status | Verdict by / date | Reason | Cited-files fingerprint at verdict |
| --- | ----------------------------- | ---------------------------- | ---------- | ----------- | -------------------------------------- | ------ | ----------------- | ------ | ---------------------------------- |

Statuses: open · confirmed · fixed · rejected · wontfix.

## Evidence ledger

One row per `observado` conclusion (`references/evidence.md`). `razonado` items go under
"Hypotheses" below, never here.

`Admit` holds ONE bare shell command, with no backticks and no placeholders, because `Executed` is
prose a human reads and `Admit` is the command the binary runs. `Digest` holds the `sha256:` digest of the
canonical output, written by `rdd-plus plan admit --execute --record <id>` rather than by hand.

A pin only means something over output that holds still, so `--execute` runs each admitted command twice:
the second run is the probe, and a row whose two observations disagree is refused as unstable instead of
pinned. `Normalize` is the escape hatch for the part of an output that legitimately moves, such as an
elapsed time: it holds a Go regular expression whose every match becomes `X` before hashing. Leave it empty
the first time and fill it only when the probe names what moves, keeping it as narrow as that part — a
pattern broad enough to swallow the output turns the pin into decoration. `plan check` requires none of
these columns; `plan admit` refuses a row whose `Admit` is absent, whose `Digest` is unpinned, or whose
output does not hold still.

`Mode` says where the observation was taken, and a pin is only comparable inside the mode it was taken in,
because the same command digests differently in a container than on this machine. An empty cell means `host`,
which is where every pin taken before the column existed was taken. `--sandbox` runs each command in a
container with the tree mounted read-only and no network, and a row that tries to write is refused instead
of admitted. `--record` writes both cells, so recording is how a row's mode gets set; a row pinned in one mode
and checked in the other is refused as a mode mismatch, rather than as a digest mismatch that would say
nothing about why the digests disagree. Only a pin has a mode: a row that carries no digest is refused for the
missing pin, not told it was pinned somewhere.

`Mutate` is the machine half of a falsifiability claim: `<old> => <new> @ <path>:<line>`, one textual edit whose
old text must occur exactly once in that file and on that line, naming a file inside the tree. It is a value and
not a command because a replay has to be able to undo exactly what it did, and an edit admits an exact inverse
while a command does not. A row that declares one is claiming its own command goes red under the edit and green
without it, so the claim is checked rather than believed: `plan admit` refuses a mutation it cannot parse, find,
or tell apart from another, and under `--sandbox` it replays the claim — the edit lands on a copy of the tree git
knows, the command must fail there, the file is put back and its bytes verified, and the command must pass again.
A row whose command survives the edit, or whose restored half fails, is refused; outside `--sandbox` there is no
copy to edit and put back, so the claim is refused rather than admitted unchecked. `Mutation or negative control →
result` stays prose for a human to read; `Mutate` is the part a binary can act on and undo.

| Id  | Claim | Executed | Admit | Inputs and parameters | Observed | Digest | Normalize | Mode | Mutate | Mutation or negative control → result | Reproduction | Label (`observado` / `razonado`, literal) |
| --- | ----- | -------- | ----- | --------------------- | -------- | ------ | --------- | ---- | ------ | ------------------------------------- | ------------ | ----------------------------------------- |

### Hypotheses (razonado)

| Hypothesis | Probe that would settle it |
| ---------- | -------------------------- |

## Calibration history

One row per calibration run (`references/calibration.md`); never overwritten.

| Date | Skill version | K   | Found | Recall | Misses (file:line operator, why) | False positives |
| ---- | ------------- | --- | ----- | ------ | -------------------------------- | --------------- |

## Blocked by testability

| Target | Rung | Why | Minimal change that opens it |
| ------ | ---- | --- | ---------------------------- |

## Remaining, in order

1. <target — target rung — sibling>
