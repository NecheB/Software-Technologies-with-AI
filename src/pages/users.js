import { shell, message } from "../components/shell.js";
import { staff } from "../components/staff.js";
import { checked } from "../services/session.js";
import { escapeHtml as e } from "../utils/html.js";
shell("People & permissions");
const status = document.querySelector("#status");
let page = 0,
  restrictionPage = 0,
  revision = 0;
try {
  const { db, user } = await staff("users.manage");
  const admin = await checked(db.rpc("is_admin"));
  const list = document.querySelector("#people");
  async function load() {
    const current = ++revision;
    document.querySelector("#people-prev").disabled = true;
    document.querySelector("#people-next").disabled = true;
    try {
      let query = db
        .from("profiles")
        .select("id,full_name,city,created_at,user_roles!inner(role)", {
          count: "exact",
        });
      const term = document.querySelector("#member-query").value.trim(),
        role = document.querySelector("#member-role").value;
      if (term)
        query = /^[0-9a-f-]{36}$/i.test(term)
          ? query.eq("id", term)
          : query.ilike("full_name", `%${term}%`);
      if (role) query = query.eq("user_roles.role", role);
      const { data, error, count } = await query
        .order("created_at", { ascending: false })
        .order("id")
        .range(page * 20, page * 20 + 19);
      if (current !== revision) return;
      if (error) throw error;
      list.innerHTML =
        data
          .map(
            (p) =>
              `<tr><td><div class="table-identity"><span class="identity-icon">${e((p.full_name || "M").slice(0, 2).toUpperCase())}</span><div><strong>${e(p.full_name || "Unnamed member")}${p.id === user.id ? ' <span class="you-tag">You</span>' : ""}</strong><details class="member-id"><summary>Member ID</summary><code>${p.id}</code></details></div></div></td><td>${e(p.city || "Not provided")}</td><td><span class="role-badge role-${p.user_roles.role}">${e(p.user_roles.role)}</span></td><td>${e(new Date(p.created_at).toLocaleDateString())}</td><td>${admin && p.id !== user.id ? `<div class="member-actions"><label class="visually-hidden" for="role-${p.id}">Role for ${e(p.full_name || "member")}</label><select class="form-select form-select-sm" id="role-${p.id}">${["user", "owner", "moderator", "admin"].map((r) => `<option ${r === p.user_roles.role ? "selected" : ""}>${r}</option>`).join("")}</select><button class="btn btn-sm btn-outline-dark" data-action="role" data-user="${p.id}">Save</button>${p.user_roles.role !== "admin" ? `<button class="btn btn-sm btn-link" data-action="restrict" data-user="${p.id}">Restrict</button>` : ""}</div>` : '<span class="text-muted">' + (p.id === user.id ? "Current account" : "View only") + "</span>"}</td></tr>`,
          )
          .join("") ||
        '<tr><td colspan="5"><div class="designed-empty compact"><i class="bi bi-search"></i><h3>No members found</h3><p>Try another name, member ID or role.</p></div></td></tr>';
      document.querySelector("#people-count").textContent = count
        ? `${page * 20 + 1}-${Math.min((page + 1) * 20, count)} of ${count} members`
        : "0 members";
      document.querySelector("#people-prev").disabled = page === 0;
      document.querySelector("#people-next").disabled =
        (page + 1) * 20 >= count;
    } catch (error) {
      message(status, error.message, true);
    }
  }
  list.onclick = async (event) => {
    const b = event.target.closest("button[data-action]");
    if (!b) return;
    if (b.dataset.action === "restrict") {
      document.querySelector("#restriction-panel").open = true;
      document.querySelector("#restrict").elements.user_id.value =
        b.dataset.user;
      document
        .querySelector("#restrict")
        .scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    b.disabled = true;
    try {
      await checked(
        db
          .from("user_roles")
          .update({
            role: document.getElementById(`role-${b.dataset.user}`).value,
          })
          .eq("user_id", b.dataset.user)
          .select("user_id")
          .single(),
      );
      message(status, "Member role updated.");
      await load();
    } catch (error) {
      message(status, error.message, true);
      b.disabled = false;
    }
  };
  async function restrictions() {
    const { data, error, count } = await db
      .from("restrictions")
      .select("*", { count: "exact" })
      .is("revoked_at", null)
      .order("created_at", { ascending: false })
      .order("id")
      .range(restrictionPage * 10, restrictionPage * 10 + 9);
    if (error) throw error;
    document.querySelector("#restrictions").innerHTML =
      data
        .map(
          (r) =>
            `<div class="restriction-row"><div><strong>${e(r.permission)}</strong><p>${e(r.reason)}</p><small>Member ${r.user_id}<br>${r.expires_at ? "Expires " + e(new Date(r.expires_at).toLocaleString()) : "Permanent restriction"}</small></div>${admin ? `<button class="btn btn-sm btn-outline-dark" data-revoke="${r.id}">Revoke</button>` : ""}</div>`,
        )
        .join("") ||
      '<p class="text-muted py-3">No restrictions to display.</p>';
    document.querySelector("#restriction-count").textContent =
      `${count} unrevoked restrictions`;
    document.querySelector("#restriction-prev").disabled =
      restrictionPage === 0;
    document.querySelector("#restriction-next").disabled =
      (restrictionPage + 1) * 10 >= count;
  }
  document.querySelector("#restrictions").onclick = async (event) => {
    const b = event.target.closest("[data-revoke]");
    if (!b) return;
    b.disabled = true;
    try {
      await checked(
        db
          .from("restrictions")
          .update({ revoked_at: new Date().toISOString() })
          .eq("id", b.dataset.revoke)
          .select("id")
          .single(),
      );
      await restrictions();
      message(status, "Restriction revoked.");
    } catch (error) {
      message(status, error.message, true);
      b.disabled = false;
    }
  };
  const runRestrictions = () =>
    restrictions().catch((error) => message(status, error.message, true));
  document
    .querySelector("#restriction-panel")
    .addEventListener("toggle", () => {
      if (document.querySelector("#restriction-panel").open) runRestrictions();
    });
  document.querySelector("#restriction-prev").onclick = () => {
    restrictionPage--;
    runRestrictions();
  };
  document.querySelector("#restriction-next").onclick = () => {
    restrictionPage++;
    runRestrictions();
  };
  document.querySelector("#people-search").onsubmit = (event) => {
    event.preventDefault();
    page = 0;
    load();
  };
  document.querySelector("#member-role").onchange = () => {
    page = 0;
    load();
  };
  document.querySelector("#people-prev").onclick = () => {
    page--;
    load();
  };
  document.querySelector("#people-next").onclick = () => {
    page++;
    load();
  };
  const form = document.querySelector("#restrict");
  form.hidden = !admin;
  form.onsubmit = async (event) => {
    event.preventDefault();
    const button = form.querySelector("button");
    button.disabled = true;
    try {
      const data = Object.fromEntries(new FormData(form));
      data.expires_at = data.expires_at
        ? new Date(data.expires_at).toISOString()
        : null;
      data.created_by = user.id;
      await checked(db.from("restrictions").insert(data));
      form.reset();
      message(status, "Restriction applied.");
      restrictionPage = 0;
      await restrictions();
    } catch (error) {
      message(status, error.message, true);
    } finally {
      button.disabled = false;
    }
  };
  await load();
} catch (error) {
  message(status, error.message, true);
}
