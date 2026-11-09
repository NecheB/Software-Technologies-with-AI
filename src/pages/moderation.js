import { shell, message } from "../components/shell.js";
import { session, checked } from "../services/session.js";
import { escapeHtml as e } from "../utils/html.js";
import {
  moderationAccess,
  pendingCounts,
  filterQueue,
} from "../services/moderation.js";
shell("Staff workspace");
const status = document.querySelector("#status"),
  list = document.querySelector("#queue");
const kind = document.querySelector("#kind"),
  state = document.querySelector("#state"),
  search = document.querySelector("#search"),
  order = document.querySelector("#order");
let rows = [],
  limit = 50,
  revision = 0,
  loading = false;
try {
  const { db } = await session();
  const types = await moderationAccess(db);
  if (!types.length)
    throw new Error("Your account does not have moderation access.");
  document.querySelector("#staff-nav").innerHTML =
    '<a aria-current="page" href="/moderation.html">Overview</a><a href="/users.html">People</a><a href="/taxonomy.html">Categories</a><a href="/settings.html">Settings</a><a href="/audit.html">Action history</a>';
  for (const t of types) kind.add(new Option(t.label, t.table));
  const requested = new URLSearchParams(location.search).get("type");
  if (types.some((t) => t.table === requested)) kind.value = requested;
  function render() {
    const visible = filterQueue(rows, search.value, order.value);
    document.querySelector("#result-count").textContent =
      `${visible.length} shown from ${rows.length} loaded submissions`;
    list.innerHTML =
      visible
        .map((r) => {
          const key = `${r.type.table}-${r.id}`;
          const title =
            r.name ||
            r.title ||
            (r.type.table === "reviews"
              ? `${r.rating}/5 star review`
              : "Community reply");
          return `<article class="review-card" data-key="${key}"><div class="review-top"><span class="content-tag">${r.type.label}</span><span class="status-pill status-${r.status}">${r.status}</span><time datetime="${r.created_at}">${e(new Date(r.created_at).toLocaleString())}</time></div><h2>${e(title)}</h2>${r.city ? `<p class="text-muted">${e(r.city)} / ${e(r.address)}</p>` : ""}<p class="review-body">${e(r.description || r.body || r.tagline || "")}</p>${r.type.table === "businesses" ? `<a href="/editor.html?id=${r.id}">Edit business details</a>` : ""}<details class="review-details"><summary>Record details</summary><p>Record: <code>${r.id}</code></p><p>Submitted by: <code>${e(r.owner_id || r.author_id)}</code></p>${r.business_id ? `<p>Business: <code>${r.business_id}</code></p>` : ""}</details><label class="form-label" for="note-${key}">Feedback for the contributor</label><textarea class="form-control" rows="2" maxlength="1000" id="note-${key}" placeholder="Explain what needs changing, or leave an approval note.">${e(r.moderation_note || "")}</textarea><div class="review-actions">${r.status !== "approved" ? `<button class="btn btn-dark" data-key="${key}" data-decision="approved">Approve</button>` : ""}${r.status !== "rejected" ? `<button class="btn btn-outline-danger" data-key="${key}" data-decision="rejected">Reject</button>` : ""}</div></article>`;
        })
        .join("") ||
      '<div class="queue-empty"><h2>Nothing to review here.</h2><p>Try another filter, or check back when a new submission arrives.</p></div>';
  }
  async function load() {
    const current = ++revision;
    loading = true;
    document.querySelector("#refresh").disabled = true;
    message(status, "Loading submissions...");
    try {
      const selected = types.filter(
        (t) => kind.value === "all" || kind.value === t.table,
      );
      const [counts, groups] = await Promise.all([
        pendingCounts(db, types),
        Promise.all(
          selected.map(async (type) => {
            const { data, error, count } = await db
              .from(type.table)
              .select("*", { count: "exact" })
              .eq("status", state.value)
              .order("created_at", { ascending: order.value === "oldest" })
              .order("id")
              .range(0, limit - 1);
            if (error) throw error;
            return { rows: data.map((r) => ({ ...r, type })), count };
          }),
        ),
      ]);
      if (current !== revision) return;
      rows = groups.flatMap((g) => g.rows);
      document.querySelector("#more").hidden = !groups.some(
        (g) => g.count > limit,
      );
      document.querySelector("#summary").innerHTML =
        `<button class="summary-card summary-total" data-type="all"><span>All pending</span><strong>${counts.reduce((s, t) => s + t.count, 0)}</strong><small>Across your review queues</small></button>` +
        counts
          .map(
            (t) =>
              `<button class="summary-card" data-type="${t.table}"><span>${t.label}</span><strong>${t.count}</strong><small>${t.count ? "Waiting for a decision" : "Up to date"}</small></button>`,
          )
          .join("");
      render();
      message(status, `Updated ${new Date().toLocaleTimeString()}`);
    } catch (error) {
      if (current === revision) message(status, error.message, true);
    } finally {
      if (current === revision) {
        loading = false;
        document.querySelector("#refresh").disabled = false;
      }
    }
  }
  list.onclick = async (event) => {
    const button = event.target.closest("button[data-decision]");
    if (!button || loading) return;
    const row = rows.find(
      (r) => `${r.type.table}-${r.id}` === button.dataset.key,
    );
    if (!row) return;
    const card = button.closest("article");
    card.querySelectorAll("button").forEach((b) => (b.disabled = true));
    try {
      await checked(
        db
          .from(row.type.table)
          .update({
            status: button.dataset.decision,
            moderation_note: document.getElementById(
              `note-${button.dataset.key}`,
            ).value,
          })
          .eq("id", row.id)
          .eq("status", row.status)
          .select("id")
          .single(),
      );
      await load();
      message(
        status,
        `${row.type.label}: ${button.dataset.decision}. Decision saved.`,
      );
      window.dispatchEvent(new Event("borough:moderated"));
    } catch (error) {
      message(status, error.message, true);
      card.querySelectorAll("button").forEach((b) => (b.disabled = false));
    }
  };
  document.querySelector("#summary").onclick = (event) => {
    const button = event.target.closest("[data-type]");
    if (!button) return;
    kind.value = button.dataset.type;
    state.value = "pending";
    limit = 50;
    load();
  };
  document.querySelector("#filters").onsubmit = (event) =>
    event.preventDefault();
  search.oninput = render;
  for (const input of [kind, state, order])
    input.onchange = () => {
      limit = 50;
      load();
    };
  document.querySelector("#refresh").onclick = load;
  document.querySelector("#more").onclick = () => {
    limit += 50;
    load();
  };
  await load();
} catch (error) {
  message(status, error.message, true);
  document.querySelector("#refresh").disabled = true;
}
