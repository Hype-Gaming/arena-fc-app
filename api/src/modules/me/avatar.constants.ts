// Preset avatar emblems (Phase 2). Keys are stored on User.avatarKey; the web
// renders a matching CSS/SVG emblem per key — no image assets or uploads.
export const AVATAR_KEYS = [
  'ball',
  'flame',
  'crown',
  'shield',
  'rocket',
  'star',
  'bolt',
  'trophy',
] as const;

export type AvatarKey = (typeof AVATAR_KEYS)[number];

export function isAvatarKey(value: string): value is AvatarKey {
  return (AVATAR_KEYS as readonly string[]).includes(value);
}
