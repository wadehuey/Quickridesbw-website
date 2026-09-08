import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from "./supabase-config.js";

const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
const ADMIN_EMAIL = "waronajobs@gmail.com";
const $ = (id) => document.getElementById(id);

async function isAdmin(user) {
  if (!user || user.email?.toLowerCase() !== ADMIN_EMAIL) return false;
  const { data } = await supabase.rpc("is_admin");
  return data === true;
}

async function loadDashboard() {
  const since = new Date(Date.now() - 7 * 86400000).toISOString();
  const [visitsResult, eventsResult] = await Promise.all([
    supabase.from("website_visits").select("visitor_id,session_id,path,device_type,browser,created_at").gte("created_at", since).order("created_at", { ascending: false }),
    supabase.from("analytics_events").select("event_name,created_at").gte("created_at", since).order("created_at", { ascending: false }),
  ]);
  if (visitsResult.error || eventsResult.error) throw new Error(visitsResult.error?.message || eventsResult.error?.message);
  const visits = visitsResult.data || [];
  const events = eventsResult.data || [];
  $("visitors").textContent = new Set(visits.map(v => v.visitor_id)).size;
  $("views").textContent = visits.length;
  $("sessions").textContent = new Set(visits.map(v => v.session_id)).size;
  $("events").textContent = events.length;
  renderCounts("pages", visits.map(v => v.path));
  renderCounts("devices", visits.map(v => v.device_type || "Unknown"));
  renderCounts("browsers", visits.map(v => v.browser || "Unknown"));
  renderCounts("eventList", events.map(e => e.event_name));
}

function renderCounts(id, values) {
  const counts = {};
  values.forEach(v => counts[v] = (counts[v] || 0) + 1);
  const rows = Object.entries(counts).sort((a,b) => b[1] - a[1]).slice(0, 10);
  $(id).innerHTML = rows.length ? rows.map(([name,count]) => `<div class="row"><span>${escapeHtml(name)}</span><b>${count}</b></div>`).join("") : '<p class="muted">No data yet.</p>';
}
function escapeHtml(value) { const div = document.createElement("div"); div.textContent = value; return div.innerHTML; }

async function start() {
  const { data: { session } } = await supabase.auth.getSession();
  if (session && await isAdmin(session.user)) {
    $("login").classList.add("hidden"); $("dashboard").classList.remove("hidden");
    await loadDashboard();
  }
}

$("loginBtn").onclick = async () => {
  $("loginError").textContent = "";
  const { error } = await supabase.auth.signInWithPassword({ email: $("email").value.trim(), password: $("password").value });
  if (error) { $("loginError").textContent = error.message; return; }
  const { data: { user } } = await supabase.auth.getUser();
  if (!await isAdmin(user)) { await supabase.auth.signOut(); $("loginError").textContent = "This account is not authorized as an administrator."; return; }
  $("login").classList.add("hidden"); $("dashboard").classList.remove("hidden"); await loadDashboard();
};
$("refresh").onclick = () => loadDashboard().catch(e => alert(e.message));
$("logout").onclick = async () => { await supabase.auth.signOut(); location.reload(); };
start().catch(e => { $("loginError").textContent = e.message; });
