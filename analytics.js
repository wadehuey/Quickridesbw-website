import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from "./supabase-config.js";

const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
const VISITOR_KEY = "quickrides_website_visitor";
const SESSION_KEY = "quickrides_website_session";

function idFor(key) {
  let value = localStorage.getItem(key);
  if (!value) {
    value = crypto.randomUUID();
    localStorage.setItem(key, value);
  }
  return value;
}
function sessionId() {
  let value = sessionStorage.getItem(SESSION_KEY);
  if (!value) {
    value = crypto.randomUUID();
    sessionStorage.setItem(SESSION_KEY, value);
  }
  return value;
}
function browser() {
  const ua = navigator.userAgent;
  if (/Edg\//.test(ua)) return "Edge";
  if (/Chrome\//.test(ua)) return "Chrome";
  if (/Firefox\//.test(ua)) return "Firefox";
  if (/Safari\//.test(ua)) return "Safari";
  return "Other";
}
function os() {
  const ua = navigator.userAgent;
  if (/Android/.test(ua)) return "Android";
  if (/iPhone|iPad|iPod/.test(ua)) return "iOS";
  if (/Windows/.test(ua)) return "Windows";
  if (/Mac OS/.test(ua)) return "macOS";
  if (/Linux/.test(ua)) return "Linux";
  return "Other";
}
function deviceType() {
  return /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent) ? "mobile" : "desktop";
}

async function trackPageView() {
  try {
    await supabase.from("website_visits").insert({
      session_id: sessionId(),
      visitor_id: idFor(VISITOR_KEY),
      path: window.location.pathname.slice(0, 500),
      referrer: document.referrer?.slice(0, 1000) || null,
      user_agent: navigator.userAgent.slice(0, 1000),
      device_type: deviceType(),
      browser: browser(),
      os: os(),
    });
  } catch (_) {}
}

async function trackEvent(eventName, metadata = {}) {
  try {
    await supabase.from("analytics_events").insert({
      session_id: sessionId(),
      visitor_id: idFor(VISITOR_KEY),
      event_name: String(eventName).slice(0, 100),
      path: window.location.pathname.slice(0, 500),
      metadata,
    });
  } catch (_) {}
}

trackPageView();

document.addEventListener("click", (event) => {
  const link = event.target.closest?.("a");
  if (!link) return;
  const text = (link.textContent || "").trim().replace(/\s+/g, " ").slice(0, 100);
  const href = link.href || "";
  if (/facebook/i.test(href)) trackEvent("facebook_click", { text });
  else if (/mediafire/i.test(href) || /download/i.test(text)) trackEvent("app_download_click", { text, href });
  else if (/driver/i.test(text)) trackEvent("driver_link_click", { text });
  else if (/passenger|rider/i.test(text)) trackEvent("rider_link_click", { text });
  else if (/contact|whatsapp/i.test(text)) trackEvent("contact_click", { text, href });
});

window.QuickRidesAnalytics = { trackEvent };
