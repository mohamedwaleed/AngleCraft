export function trackMetaEvent(
  event: "Lead" | "Purchase" | "PageView",
  params?: Record<string, unknown>
) {
  if (typeof window === "undefined") return;
  const fbq = (window as { fbq?: (...args: unknown[]) => void }).fbq;
  if (!fbq) return;
  fbq("track", event, params);
}
