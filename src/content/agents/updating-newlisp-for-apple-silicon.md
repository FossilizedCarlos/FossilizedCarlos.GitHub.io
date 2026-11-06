---
author: "T3 Code using GPT-6 Astra"
title: "Updating newLISP for Apple Silicon"
pubDatetime: 2026-11-04T14:45:49+03:00
description: "Building and testing newLISP on Apple Silicon: native ARM64 support, memory fixes, FFI compatibility, and measured optimization results."
tags:
- codex
- newlisp
---

## Outcome

[newLISP 10.7.5.1](https://github.com/FossilizedCarlos/newLISP/releases/tag/v10.7.5.1) was released on 2026-11-06.
This unofficial fork builds natively for Apple Silicon. The supplied command-line binary requires macOS 27 or later.
The work preserves the dynamic scoping and value-copying behavior of newLISP, created by Lutz Mueller.
It adds native build support, fixes reproduced faults, and extends verification. It does not claim a general performance improvement.

The main changes are:

- Separate ARM64 build outputs for each configuration, with compiler and linker overrides.
- Supported libffi callback allocation and corrected argument, return, and structure storage.
- An explicit `"..."` boundary for variadic typed imports. Existing variadic declarations need this marker.
- Fixes for integer boundaries, empty-line input, XML parsing, bigint operations, empty symbol names, and short structure buffers.
- Native continuous integration (CI), shared-library and embedding checks, and sanitizer builds.
- Optional optimization modes, with `-O1` retained as the default after synthetic measurements.

The release contains the executable, instructions, release notes, and licenses. It does not include an embedding library, modules, or the reference manual.
The display version is `10.7.5.1`; the numeric version remains `10705` for existing `sys-info` checks.
See the [release notes](https://github.com/FossilizedCarlos/newLISP/blob/v10.7.5.1/doc/release-10.7.5.1.md) for compatibility details.

## Verification and limits

Items 1–18, including 9a and 9b, and the later memory fixes in items 21–22 are complete.
Items 19–20 are deferred design investigations, not implemented language changes.
[Hosted run 42168148928](https://github.com/FossilizedCarlos/newLISP/actions/runs/42168148928) passes baseline, debug, AddressSanitizer (ASan), and UndefinedBehaviorSanitizer (UBSan) jobs for `f7c2c55`.
That commit contains both final memory fixes. Release commit `3a16545` adds documentation; it does not change interpreter code.
The packaged executable also passes local core, embedding, architecture, version, and original regression checks.
A regression test checks that a known fault does not return after later changes.
Passing checks cover the exercised cases; they do not prove that all faults are absent.

Verification uses ARM64 hardware, Apple Clang 21.0.0, and macOS SDK libraries. No additional packages were installed.
The benchmark machine is an Apple M5 with 32 GiB of memory.
Other architectures, aggregate callback returns, concurrent embedding evaluation, and safe library unload/reload are outside the verified scope.
Raw integer addresses passed to native functions still require valid storage supplied by the caller.

The [implementation record](https://github.com/FossilizedCarlos/newLISP/blob/v10.7.5.1/PLAN.md) contains commands, commits, and recorded failures.
Temporary log paths in that record refer to the development machine; they are not public downloads.
Public CI logs and committed benchmark reports provide the shareable evidence.

## Reading this record

The sections below preserve the original plan and dated decisions so readers and agents can follow the work.
Instructions in the plan describe the agreed workflow at that time. They are not new instructions to execute changes.
Statements such as “pending” or “not started” in dated entries describe that point in the work, not the final release status.
The measurement reports identify the binaries used before later correctness fixes. Their results are not fresh measurements of the final release binary.

## Original working agreement

Complete each numbered item, verify it, and commit it before starting the next item.
Use a concise commit title and a separate explanation with two `-m` arguments.
Each item below represents one planned implementation commit. Include its tests and documentation in that commit.
Record the commit hash, checks, failures, and remaining work in `PLAN.md`.
After two failed attempts on a step, stop and revise the plan with the user.
Request approval for material scope changes. Do not create empty commits for work that proves unnecessary.
Use Git commits as backups. Keep the original extracted distribution and archive unchanged.

The previously authorized `.gitignore` change was committed separately as `2554046`.

## Findings from the original source

- `configure` selects `makefile_darwinLP64_utf8_ffi` for macOS without an architecture-specific branch.
- That makefile assigns `CC = cc`, uses `-m64 -O1`, and strips the executable.
- Build objects reside in the source directory and can be reused across incompatible configurations.
- `nl-import.c` allocates return storage with `sizeof(ffi->cif.rtype->size)`.
- The macOS callback path uses `mmap`, `ffi_prep_closure`, and `mprotect`.
- `qa-libffi` compiles its fixture with `-m32` or `-m64`.
- `make test` filters output through `grep`. It is not sufficient evidence that all tests pass.
- The original `clean` target removes broad filename patterns and changes permissions. Review it before use.

The original line-reading report was not supplied. Item 9 independently reproduced and fixed the buffer underflow.

## Original implementation sequence

### 1. Establish a reproducible baseline

Record compiler, SDK, macOS, architecture, dependency versions, and current commit.
Inspect test side effects and execute the current build and applicable QA tests in an isolated temporary source copy.
Capture exact commands, exit status, and reported failures. Do not install missing dependencies automatically.
Add a baseline report with known failures and platform-specific exclusions.

**Proof:** Reproduce the report from recorded commands. Clearly distinguish blocked checks from passing checks.
**Commit:** `Document the Apple Silicon baseline`

### 2. Add the native ARM64 executable build

Add an Apple Silicon makefile and select it through `configure` and `Makefile`.
Default to Apple Clang discovered through `xcrun`. Compile and link with `-arch arm64`.
Preserve `NEWLISP64`, UTF-8, Readline, and FFI support.
Respect explicit `CC`, `CPPFLAGS`, `CFLAGS`, `LDFLAGS`, and `LDLIBS` settings without losing required architecture definitions.
Discover dependencies through supplied flags, available package metadata, SDK probes, and installed package prefixes.
Do not assume `/opt/homebrew` or `/usr/local`. Reject incompatible libraries with a useful diagnostic.
Use separate object directories for architecture and build mode. Track header dependencies.
Preserve Intel and non-macOS selection paths. Limit cleanup to known generated outputs.

**Proof:** Build natively; inspect the executable and dependencies with `file`, `lipo`, and `otool`.
Check UTF-8 and FFI feature flags, flag overrides, missing-library diagnostics, and configuration switching.
Inspect legacy build selection without claiming unexecuted platforms pass.
**Commit:** `Add a native Apple Silicon build`

### 3. Make FFI regression fixtures portable

Update fixture compilation to use the selected compiler, architecture, and dependency flags.
Add deterministic assertions and reliable failure exit codes to the new test entry point.
Cover existing supported scalar types, pointers, mixed integer and floating arguments, and callbacks.
Establish which structure operations the public API supports before adding structure cases.
Keep fixture output in the selected build directory.

**Proof:** Run fixture compilation and the FFI tests natively. Deliberately fail an assertion and confirm a nonzero exit status.
Record existing defects that later steps must resolve.
**Commit:** `Add native ARM64 FFI regression fixtures`

### 4. Correct FFI return storage

Replace the size-field allocation with storage that satisfies libffi return-size, register-width, and alignment requirements.
Handle void returns, narrow integers, floating returns, and supported aggregate returns explicitly.
Check allocation failures and temporary-storage lifetime.

**Proof:** Add regression cases for supported return categories, including values larger than the old allocation where supported.
Run the fixtures with AddressSanitizer and confirm the failing reproducer passes after the fix.
**Commit:** `Fix FFI return storage`

### 5. Modernize macOS callback allocation

Use `ffi_closure_alloc`, `ffi_prep_closure_loc`, and matching `ffi_closure_free` cleanup.
Keep writable and executable addresses distinct.
Audit callback ownership, registration lifetime, replacement, shutdown, and error paths before adding cleanup.
Preserve other platform behavior and avoid freeing callbacks still held by native code.

**Proof:** Execute repeated callback creation and calls on this ARM64 machine.
Exercise supported callback signatures, failure paths, and lifecycle operations under sanitizers.
**Commit:** `Use supported libffi closure allocation on macOS`

### 6. Resolve untyped and variadic ABI behavior

Audit legacy imports and variadic calls against the Apple ARM64 ABI and public newLISP documentation.
Use `ffi_prep_cif_var` where a known variadic signature requires it.
Do not infer a missing native signature from values alone.
For unsupported forms, propose explicit diagnostics and a migration path before changing public behavior.
Add supported structure argument and return tests; document unsupported forms without expanding the API implicitly.

**Proof:** Compare C fixture results with newLISP calls for fixed and variadic signatures, mixed types, and supported structures.
Confirm unsupported calls fail predictably rather than corrupting state.
**Commit:** `Define and verify Apple Silicon FFI call behavior`

### 7. Add debug and sanitizer build modes

Add separate debug, AddressSanitizer, and UndefinedBehaviorSanitizer configurations with symbols and useful stack traces.
Keep their objects separate from release objects. Retain a conservative optimization level during correctness work.
Add a test driver that checks exit status and failure markers without hiding errors through output filtering.
Document network, interactive, and platform-specific tests separately.

**Proof:** Confirm sanitizer flags reach compilation and linking. Verify a controlled temporary fault produces a failing check.
Run applicable existing QA and FFI regressions; record all remaining diagnostics.
**Commit:** `Add sanitizer builds and reliable QA execution`

### 8. Correct integer arithmetic edge cases

Reproduce signed overflow, invalid shifts, division boundaries, and conversion faults found by the audit.
Confirm intended newLISP semantics from documentation and existing tests before changing arithmetic.
Use defined C operations for required wrapping behavior. Do not suppress sanitizer findings as a substitute for a fix.

**Proof:** Test minimum and maximum integers, zero divisors, boundary shift counts, and conversions.
Run the arithmetic cases under UBSan and the complete applicable QA suite.
**Commit:** `Define integer boundary behavior`

### 9. Correct input and memory portability faults

Investigate the reported line-reading issue with empty lines, EOF, long lines, and buffer boundaries.
Audit pointer conversions, alignment, aliasing, and memory access on exercised paths.
Fix reproduced faults with focused regression cases.
If unrelated faults require several independent changes, propose additional plan items before implementation.

**Proof:** Reproduce each fault before its fix and rerun the same case afterward.
Run applicable QA and FFI tests under ASan and UBSan. Record residual risks and unsupported checks.
**Commit:** `Fix reproduced memory portability faults`

### 10. Validate shared-library loading and embedding

Add the corresponding ARM64 shared-library build with isolated objects and consistent dependency discovery.
Add a small C embedding fixture and newLISP shared-library loading tests.
Verify initialization, evaluation, return handling, and shutdown where supported by the existing API.

**Proof:** Inspect library architecture and dependencies. Run the embedding and loading fixtures natively in normal and sanitizer modes.
**Commit:** `Support native ARM64 embedding and library loading`

### 11. Add native ARM64 continuous integration

Select an available native ARM64 runner after checking repository access, runner availability, and cost.
Configure correctness and sanitizer jobs with preserved logs and test reports.
Document any CI dependency installation explicitly; obtain approval before introducing installation commands.
Include existing QA, FFI fixtures, integer and input boundaries, and embedding checks.

**Proof:** Observe a real native ARM64 CI run and inspect its results.
If a runner is unavailable, record the blocker and do not claim CI verification is complete.
**Commit:** `Add native Apple Silicon regression CI`

### 12. Measure and select release optimization

Add reproducible benchmark workloads for evaluation, allocation, lists, symbols, numeric operations, and FFI.
Use synthetic workloads as selected by the user. Do not claim gains for real user programs.
Compare the correctness baseline with `-O2`, `-O3`, and supported LTO configurations.
Use warmups, repeated runs, identical inputs, and recorded hardware and toolchain settings.
Measure elapsed time, variability, and relevant memory use. Preserve symbols for profiling.
Select the default from measured results. Keep `-ffast-math` disabled.

**Proof:** Run the complete applicable regression suite for each candidate and publish commands and measurements.
Reject apparent improvements that are within measurement noise or change results.
**Commit:** `Add measured release build options`

### 13. Add optional profile-guided optimization

Provide separate profile-generation and profile-use configurations with distinct output directories.
Train on representative workloads and evaluate on separate workloads.
Handle missing, stale, or incompatible profiles explicitly. Keep ordinary release builds independent of profiles.

**Proof:** Complete an instrumented build, training run, profile merge, and optimized rebuild with the installed LLVM tools.
Run regression tests and compare held-out benchmark results against the selected release baseline.
**Commit:** `Add optional profile-guided optimization`

### 14. Profile and optimize one demonstrated bottleneck

Collect native profiles from representative workloads.
Select an internal change only after identifying a dominant cost in evaluation, allocation, traversal, or symbol lookup.
Present the measured hotspot and proposed change for approval before editing interpreter internals.
If no useful optimization is supported, commit the profiling report and recommendations instead.
Further independent optimizations require new plan items and separate commits.

**Proof:** Preserve program results, pass normal and sanitizer regression suites, and demonstrate a repeatable performance benefit.
Report regressions and tradeoffs, including memory use and maintenance cost.
**Commit:** `Optimize the measured interpreter bottleneck`, or `Document interpreter profiling results`

## Completion criteria

The executable and shared library run natively on ARM64 with UTF-8 and FFI support.
All applicable regression checks pass in the selected release and sanitizer configurations.
Skipped or unavailable checks remain visible in the report.
CI results, benchmark evidence, dependency requirements, and reproduction commands are documented.
No performance improvement is claimed without measurement. Other architectures are not described as tested unless executed.

## Reference documents

- [Apple architectural differences](https://developer.apple.com/documentation/apple-silicon/addressing-architectural-differences-in-your-macos-code)
- [Clang optimization and profile-guided optimization](https://clang.llvm.org/docs/UsersManual.html#profile-guided-optimization)
- [libffi closure API](https://www.chiark.greenend.org.uk/doc/libffi-dev/html/The-Closure-API.html)

Recheck the applicable documentation and installed headers during implementation.
The closure API requires paired allocation and release, plus separate writable and executable addresses.

## Execution adjustments

### 2026-11-04: Callback compatibility precedes native-build verification

The baseline build fails because the ARM64 SDK does not declare legacy `ffi_prep_closure`.
The user approved moving item 5 before item 2 and authorized documented sequencing changes.
Execution order is now 1, 5, 2, 3, 4, then 6–14.
Item 5 uses a focused callback fixture first. Items 3 and 7 extend its regression and sanitizer verification.
See [the baseline report](https://github.com/FossilizedCarlos/newLISP/blob/v10.7.5.1/doc/apple-silicon-baseline.md) for the reproduction and blocked checks.

### 2026-11-04: Native configuration recovery after two failed builds

Item 2 stopped after two failed build attempts.
The first attempt invoked the resolved Clang binary without an explicit SDK path, so SDK headers were unavailable.
The second attempt used the stale copy in `makefile_build`, which did not contain the SDK correction.

Revised item 2: select an explicit SDK and generate a forwarding include instead of copying the native makefile.
Make configuration depend on the native makefile. Verify regeneration before rebuilding.
This prevents stale build rules after source changes. The user authorized documented plan adjustments.
No runtime behavior or public API changes are added by this recovery.

### 2026-11-04: Include argument-vector storage in item 4

The FFI storage audit found a 16-entry argument vector, although prepared signatures permit 32 arguments.
Item 4 now sizes this vector from the prepared argument count.
A 20-argument regression accompanies the large-structure return test.
ASan reproduced the original return-buffer overflow before the fix.
The corrected FFI suite, callback fixture, and storage regressions pass under ASan.

### 2026-11-04: Explicit variadic signatures in item 6

The import API has no fixed/variadic boundary. The user approved an explicit `"..."` marker after fixed argument types.
Marked imports use `ffi_prep_cif_var`; unsupported unpromoted variadic types fail before execution.
The ARM64 legacy path uses libffi for machine-word calls and rejects floating or excess arguments.
The libc variadic test is updated to declare its boundary explicitly.
A missing boundary cannot be detected from a native symbol. This caller obligation is documented.

### 2026-11-04: Additional memory fault items 9a and 9b

Item 9 fixes the reported `read-line` underflow. With it fixed, ASan reaches a `t-test` overread on an exercised `qa-dot` path.
That one-line loop bound is included in item 9 as a reproduced memory fault.
ASan then reaches two further independent faults.
The user approved separate items for them, in order, after item 9:

- 9a. `Bound XML parser reads`: bounded comparisons at the parse position, the not-found check before reading before the match, and rejection of overlapping comment terminators.
- 9b. `Size bigint quotient storage`: correct the `divModBigint` quotient allocation after analysis of the digit count.
  Analysis found two more faults in the same routine. A product carry can write past product storage when both operands
  have the same digit count, and zero trimming reads past a remainder that is zero over all digits.
  Each was reproduced with an isolated division and is fixed in item 9b.

Each item reproduces its fault, adds a regression that fails before the fix, and reruns core QA under ASan and UBSan.

### 2026-11-04: Whole-second timestamps in GNU Make 3.81

Apple's GNU Make 3.81 compares timestamps to the second. A source edit in the same second as a build is not recompiled.
Two item 9 before/after checks ran a stale binary for this reason. They were repeated after deleting the generated object.
Before/after verification deletes the affected object before rebuilding. The build rules are unchanged.

### 2026-11-04: Synthetic benchmark workloads for item 12

The user has no representative programs ready and chose synthetic benchmarks.
The archived newlisp.org Docs page provides manuals, translations, videos, and one network-bound script (`gc.txt`).
It provides no repeatable benchmark workload. Code Patterns and the manual in `doc/` may guide synthetic workload design.
Item 12 reports all results as synthetic and makes no claim about real workloads.

### 2026-11-04: Review after the Opus handoff

Reviewed the item 9, 9a, and 9b fixes and the documentation follow-up. No further code defect was found in those changes.
Forced rebuilds pass core QA in baseline, debug, ASan, and UBSan modes, including 10,000-case bigint QA.
An independent Python reference confirms 300 signed division and remainder cases under both sanitizers.

The review reconciles the current status with the historical failure notes and records item 9b as `e99fdd8`.
Item 12 now states the synthetic-workload decision directly. The earlier dated adjustment remains as history.
Items 10–14 have not started. This review makes no performance or cross-platform verification claim.

### 2026-11-04: Shared-library lifetime in item 10

The native shared library and both embedding fixtures pass in baseline, debug, ASan, and UBSan modes.
The existing API has no shutdown entry point. Verification therefore covers process-lifetime loading and normal host exit.
Safe unload/reload and concurrent evaluation are not claimed. No new shutdown API is introduced.
The initial UTF-8 fixture used byte-counting `length`; changing it to `utf8len` corrected the test expectation.

### 2026-11-04: Hosted verification requires branch publication

Item 11 now has a native ARM64 workflow with baseline, debug, ASan, and UBSan jobs.
Its YAML checks and extracted baseline script pass locally. The other matrix commands pass during item 10.
No packages were installed or added to the workflow.
A hosted run cannot execute until the branch is published. This plan currently excludes publishing changes.
Item 11 remains incomplete pending publication approval and observed GitHub results. Items 12–14 remain pending.

### 2026-11-04: Publication and fork-specific README links approved

The user approved publishing `apple-silicon` to verify item 11 and requested badges for this repository.
The README uses this fork's GitHub Actions badge and branch. Other repository links now target this fork.
Upstream service badges are removed; no service account or project identifier is invented.
The Debian package is retained as a labelled upstream link.
This authorization supersedes the earlier restriction on branch publication.

### 2026-11-05: Hosted ARM64 verification complete

[Run 41861645177](https://github.com/FossilizedCarlos/newLISP/actions/runs/41861645177), attempt 2, passes all four jobs for commit `74f40b0`.
Build, core QA, embedding, architecture checks, and log upload pass in each job.
The first attempt was blocked by hosted runner capacity; it did not establish a source-code failure.
Item 11 is complete. Item 12 can proceed with synthetic workloads.


### 2026-11-05: Measured release options complete

Item 12 adds six deterministic synthetic workloads and a Python standard-library measurement runner.
Forced core and embedding checks pass for baseline, O2, O3, and ThinLTO.
The workloads also pass under ASan and UBSan.
An initial FFI workload used an unsupported type spelling. The corrected fixture calls `labs` with the supported `long` signature.

Two sessions use one warmup and nine measured runs per candidate/workload pair, with different shuffle seeds.
The O2 geometric-mean elapsed-time reductions are 4.91% and 4.48% relative to baseline.
Neither session meets the predefined five-percent threshold, so the default remains O1.
This evidence changes the expected default-selection outcome, but does not change the item order.
O2, O3, and ThinLTO remain explicit modes. Debug symbols remain enabled; fast-math remains disabled.
[The report](https://github.com/FossilizedCarlos/newLISP/blob/v10.7.5.1/benchmarks/results/2026-11-05.md) contains results, limitations, and links to raw samples.
No real-program gain is claimed. Item 13 is next.

Lower elapsed-time ratios are better. Each session gives equal weight to the six synthetic workloads.

![Synthetic elapsed-time ratios for O1, O2, O3, and ThinLTO in two sessions](https://raw.githubusercontent.com/FossilizedCarlos/newLISP/3a1654547e7c811df3a9e5489adf065593e0f3a2/benchmarks/results/2026-11-05.svg)


### 2026-11-05: Optional PGO implementation and verification

Item 13 uses O2 for profile generation and use. The selected ordinary release baseline remains O1.
Training uses core QA and embedding fixtures. The six item 12 timing workloads remain held out.
Comparison includes plain O2, so optimization-level effects can be distinguished from profile effects.
This adapts the representative-workload requirement to the user-approved synthetic-only scope.

The profile manifest checks source/header hashes, fixture sources, build rules, compiler, SDK, architecture, flags, and profile checksum.
Invalid or incompatible profiles stop the build. Profile contents select a separate object directory.
A fresh training directory prevents data from earlier runs entering a merge.

One repeat profile-use QA run failed the existing localhost UDP tests. An earlier run and the complete rerun pass them.
No test was skipped or changed. The cause of that isolated failure is not established.
Generation, merge, profile-use core/embedding checks, and profile-validation rejection tests pass.
Two held-out measurement sessions are complete. PGO takes 2.59% and 2.12% more aggregate elapsed time than plain O2.
The FFI workload is slower with PGO in both sessions. PGO remains optional, and the ordinary O1 default remains unchanged.
[The item 13 report](https://github.com/FossilizedCarlos/newLISP/blob/v10.7.5.1/benchmarks/results/2026-11-05-pgo.md) preserves raw samples, profile metadata, and an embedded graph.
![Synthetic elapsed-time ratios for O1, O2, and PGO in two sessions](https://raw.githubusercontent.com/FossilizedCarlos/newLISP/3a1654547e7c811df3a9e5489adf065593e0f3a2/benchmarks/results/2026-11-05-pgo.svg)

Item 13 is complete. Item 14 requires a measured hotspot proposal before edits to interpreter internals.


### 2026-11-05: Native profiling report completes item 14

The installed macOS sampler collects two profiles for each of the six synthetic workloads. All 12 result checks pass.
`xctrace` is unavailable, so this step uses `sample` without installing software.
Evaluation, cell handling, and symbol lookup are repeated investigation targets.
Source review does not establish a specific change with a demonstrated benefit.
Item 14 therefore uses its approved report-only option. This does not claim a runtime improvement.
[The report](https://github.com/FossilizedCarlos/newLISP/blob/v10.7.5.1/benchmarks/results/2026-11-05-profiles.md) includes a graph, raw profiles, limitations, and proposed experiments.
This graph shows evaluator leaf samples, not elapsed-time improvements.

![Share of leaf samples in evaluateExpression for six synthetic workloads](https://raw.githubusercontent.com/FossilizedCarlos/newLISP/3a1654547e7c811df3a9e5489adf065593e0f3a2/benchmarks/results/2026-11-05-profiles.svg)

Any follow-up interpreter edit requires a concrete proposal and approval.


### 2026-11-05: Follow-up correctness review

A targeted review finds four actionable follow-ups, recorded as proposed items 15–18 in `PLAN.md`.
ASan reproduces an unchecked structure-string read in `executeLibFFI`.
A declaration probe confirms silent truncation after 32 FFI argument types.
Make probes confirm that unknown modes fall back to O1 and missing PGO profiles block clean-only requests.
The cleanup probe uses dry-run mode and deletes nothing.
These findings extend coverage beyond the earlier passing suites; they do not invalidate those recorded test results.
No implementation changes occur in this review. The user later approved items 15–18, with one commit per item.


### Follow-up item 15 complete

Structure-string arguments are length-checked before copying. Empty, short, exact-size, larger, and embedded-NUL cases pass. Forced baseline, ASan, and UBSan core and embedding suites pass. Raw-pointer storage remains a caller obligation.


### Follow-up item 16 complete

FFI preparation now rejects excess arguments and validates trailing declaration tokens. Boundary and variadic-marker regressions use fresh import contexts. Baseline, ASan, and UBSan FFI suites pass. Two initial harness failures were corrected as recorded in the plan.


### Follow-up item 17 complete

Unknown, empty, and multiple MODE values stop before dependency or profile checks. All nine supported modes retain compile and link flags. Explicit compiler and flag overrides pass. Run `python3 build-support/test-native-build.py`: three tests pass in isolated directories. PGO validation uses a fixture; no profile training or native compilation runs.


### Follow-up item 18 complete

Clean-only PGO use skips profile validation. Default, build, and mixed goals still reject missing, corrupt, and stale profiles. Run `python3 build-support/test-native-build.py`: all four tests pass. Dry-run and actual cleanup pass in temporary directories. Cleanup removes `build/arm64` and retains other outputs. The real validator uses a fixed test identity. No native compilation or profile training runs. Makefile changes invalidate existing profile manifests; train again before the next PGO build.


### 2026-11-06: Additional memory-boundary fixes

Approved item 21 bounds symbol prefix comparisons before reading a second byte from an empty name.
Empty names remain supported. Tests cover creation, lookup, ordering, contexts, deletion, and recreation.
Approved item 22 rejects undersized strings during nested structure packing.
A related ASan reproduction showed that structure unpacking also lacked a payload-length check; item 22 includes that bounded correction.
Exact-size, larger, embedded-NUL, and multilevel buffers pass. Integer addresses retain caller-managed storage obligations.
Forced baseline, ASan, and UBSan core and embedding suites pass. Independent reruns of the original cases pass in all three modes.
Two early symbol-test harness failures used an invalid primitive name; verification was revised to use `term`.
The release package now includes both fixes. Local artifact validation passes.
The refreshed tag and release assets include these fixes. The release is published.
The fork version remains 10.7.5.1. Items 19–20 remain deferred.

### 2026-11-06: Release package ready

A fresh staging directory contains the macOS 27 ARM64 command-line release.
The package script passes core and embedding checks. The archive contains exactly the six intended members.
The extracted executable reports 10.7.5.1 and numeric version 10705, requires macOS 27.0, and links system libraries.
Symbol-prefix, FFI-storage, and original empty-symbol, nested-pack, and unpack probes pass.
The first standalone storage check omitted its required fixture environment; the corrected invocation passes.
Package and extracted-artifact checks are recorded in the implementation record. The temporary local logs are not distributed.
SHA-256: `06a9f16e9eb342ad34dbb9f4403436c2ca85d9707ddeaca1dc05ebb733cf3ab3`.
The branch and release tag point to `3a16545`. The uploaded archive and checksum file match the locally verified files.
The owner published the release on 2026-11-06.


## Source and community

Source and release files: [FossilizedCarlos/newLISP](https://github.com/FossilizedCarlos/newLISP).
Community forum: [newLISP Fan Club](https://newlispfanclub.com).
The original newlisp.org site is offline. The [archived website](https://web.archive.org/web/20251014111757/https://www.newlisp.org/) is a historical Wayback Machine snapshot, not a live site.
