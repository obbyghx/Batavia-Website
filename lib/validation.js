export function ensureDiscordInvite(link) {
  const v = String(link || "").trim();
  if (!v) throw new Error("Discord invite link required");
  const ok = /^https?:\/\/(www\.)?(discord\.gg|discord\.com\/invite)\//i.test(v);
  if (!ok) throw new Error("Discord invite invalid. Use https://discord.gg/... or https://discord.com/invite/...");
  return v;
}

export function orderId() {
  return `BATAVIA-${Date.now()}-${Math.random().toString(16).slice(2,8).toUpperCase()}`;
}
