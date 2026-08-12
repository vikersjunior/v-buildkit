---
name: slack-gif
description: Use this skill when the user wants a short animated GIF formatted for Slack — reaction GIFs, status GIFs, small looping animations for team communication. Trigger on 'make a slack gif', 'animated reaction for slack', 'gif for our channel'.
---

# Slack-GIF — Slack-Ready Animated GIF Generation

For short, looping animated GIFs sized and formatted for Slack's constraints.

## Slack's practical constraints

- Custom emoji GIFs: keep under ~128x128px and ideally under 64KB for reliable upload — Slack downsamples aggressively above its size caps, which looks worse than starting smaller.
- Regular in-message GIFs: no hard size limit but large files load slowly in-thread — keep under a few MB and a few seconds of loop.
- Loop needs to be seamless — a visible jump-cut at the loop point reads as broken, not stylistic.

## Build approach

1. Design at the target small size from the start rather than downscaling a large animation — fine detail that reads at 512px disappears at 64px.
2. Keep the animation to 1-3 seconds, 8-15 frames — enough to read as motion without bloating file size.
3. Limit the color palette (GIF is palette-indexed, not full color) — 16-64 colors is usually enough for a clean small-scale animation and keeps file size down.
4. For emoji-scale GIFs specifically, one clear readable motion beats a busy multi-element animation that turns to mush at 128px.

## Export checklist

- Confirm actual file size against Slack's emoji upload limit before considering it done.
- Preview at true render size (not zoomed in) — what looks fine at 400% zoom often reads as an unreadable blob at 64px.
