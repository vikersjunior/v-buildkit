'use strict';

// Which other-vendor CLIs may review the host agent's work (plan v3.2). Only launchers verified
// read-only are listed: gemini and claude CLIs are not supported until theirs are.
const CRITICS = Object.freeze({
  codex: { vendor: 'openai', gate: true },
  // agy can run Google web searches that no permission setting disables, so it never runs from a
  // gate and needs an explicit opt-in even when the user starts the run.
  agy: { vendor: 'google', gate: false }
});

const AGENT_VENDORS = Object.freeze({ claude: 'anthropic', codex: 'openai', antigravity: 'google', gemini: 'google' });

function hostVendor(agent) {
  return AGENT_VENDORS[agent] || null;
}

// Returns { hostVendor, picked: [{ id, vendor }], skipped: [{ id, reason }] }. isPresent(id) says
// whether that CLI is installed; gate runs are the unattended ones triggered by a lifecycle policy.
function selectCritics({ host, gate = false, vendors = [], allowWeb = false, isPresent }) {
  const hv = hostVendor(host);
  const picked = [];
  const skipped = [];
  for (const [id, c] of Object.entries(CRITICS)) {
    let reason = null;
    if (hv && c.vendor === hv) reason = 'same vendor as the host agent';
    else if (gate && !c.gate) reason = 'never runs from a gate (its web search cannot be disabled)';
    else if (gate && !vendors.includes(c.vendor)) reason = `vendor ${c.vendor} is not listed in crosscheck.vendors`;
    else if (!c.gate && !allowWeb && !vendors.includes(c.vendor)) reason = `needs "${c.vendor}" in crosscheck.vendors or --allow-web (it can run Google web searches BuildKit cannot disable)`;
    else if (!isPresent(id)) reason = 'CLI not found';
    if (reason) skipped.push({ id, reason });
    else picked.push({ id, vendor: c.vendor });
  }
  return { hostVendor: hv, picked, skipped };
}

module.exports = { CRITICS, AGENT_VENDORS, hostVendor, selectCritics };
