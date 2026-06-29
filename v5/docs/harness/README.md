# V5 Harness

Harness documents describe executable checks for important V5 invariants.

Harnesses should be added for rules that are:

- easy for AI to accidentally bypass;
- hard to verify manually;
- high-impact if broken;
- repeatedly at risk during iteration.

Examples:

- UI cannot import chart internals.
- Features cannot import the bars API client.
- Initial FX Replay display cannot include future bars.
- Session setup cannot preload the full date range.

