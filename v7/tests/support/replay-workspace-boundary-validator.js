const UI_FORBIDDEN_CONSTRUCTIONS = Object.freeze([
  'createBarDataRuntime',
  'createLightweightPaneSetAdapter',
  'createReplayRuntime',
  'createWorkspaceStateRuntime',
  'createWorkspaceTransactionRuntime',
]);

const COMPOSITION_REQUIRED_CONSTRUCTIONS = Object.freeze([
  'createBarDataRuntime',
  'createLightweightPaneSetAdapter',
  'createReplayRuntime',
  'createWorkspaceStateRuntime',
  'createWorkspaceTransactionRuntime',
]);

function finding(code, detail) {
  return Object.freeze({ code, detail });
}

/** Validate the production Replay Workspace UI/composition responsibility split. */
export function validateReplayWorkspaceBoundary({
  commandSource,
  compositionSource,
  uiSource,
}) {
  const findings = [];
  for (const factory of UI_FORBIDDEN_CONSTRUCTIONS) {
    if (new RegExp(`\\b${factory}\\s*\\(`).test(uiSource)) {
      findings.push(finding('ui-constructs-runtime-owner', factory));
    }
  }
  if (!/from ['"]\.\.\/replay-workspace-composition\/public\.js['"]/.test(uiSource)
    || !/\bcreateReplayWorkspaceComposition\s*\(/.test(uiSource)) {
    findings.push(finding(
      'ui-missing-public-composition-port',
      'Replay Workspace UI must dispatch through the composition public entry.',
    ));
  }
  if (!/\bpresentation\s*:\s*createWorkspacePresentationPort\s*\(\s*view\s*\)/.test(uiSource)) {
    findings.push(finding(
      'ui-missing-presentation-subscription',
      'Replay Workspace UI must subscribe its DOM view through the presentation port.',
    ));
  }
  if (/\b(?:document|globalThis\.window)\s*\.|\.querySelector\s*\(|\.addEventListener\s*\(/
    .test(`${compositionSource}\n${commandSource}`)) {
    findings.push(finding(
      'composition-touches-dom',
      'Composition and command orchestration must remain DOM-independent.',
    ));
  }
  for (const factory of COMPOSITION_REQUIRED_CONSTRUCTIONS) {
    if (!new RegExp(`\\b${factory}\\s*\\(`).test(compositionSource)) {
      findings.push(finding('composition-missing-runtime-owner', factory));
    }
  }
  if (!/\bcreateReplayWorkspaceCommandPort\s*\(/.test(compositionSource)) {
    findings.push(finding(
      'composition-missing-command-port',
      'Composition must expose commands through one focused command port.',
    ));
  }
  if (/\bcreate(?:BarDataRuntime|LightweightPaneSetAdapter|ReplayRuntime|WorkspaceStateRuntime|WorkspaceTransactionRuntime)\s*\(/
    .test(commandSource)) {
    findings.push(finding(
      'command-port-constructs-owner',
      'The command port may coordinate existing owners but cannot construct them.',
    ));
  }
  return Object.freeze(findings);
}
