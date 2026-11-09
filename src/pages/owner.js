import { shell, message } from "../components/shell.js";
import { session, checked } from "../services/session.js";
import { escapeHtml as e } from "../utils/html.js";
shell("My businesses");
const target = document.querySelector("#list");
try {
  const { db, user } = await session();
  const rows = await checked(
    db
      .from("businesses")
      .select("id,name,city,status,moderation_note,updated_at")
      .eq("owner_id", user.id)
      .order("created_at", { ascending: false }),
  );
  document.querySelector("#owner-stats").innerHTML = [
    ["All listings", rows.length, "shop"],
    [
      "Published",
      rows.filter((b) => b.status === "approved").length,
      "check-circle",
    ],
    [
      "Awaiting review",
      rows.filter((b) => b.status === "pending").length,
      "hourglass-split",
    ],
  ]
    .map(
      ([label, count, icon]) =>
        `<div class="metric-card"><i class="bi bi-${icon}"></i><span>${label}</span><strong>${count}</strong></div>`,
    )
    .join("");
  document.querySelector("#listing-count").textContent =
    `${rows.length} listings`;
  target.innerHTML = rows.length
    ? '<div class="table-responsive"><table class="table data-table"><thead><tr><th>Business</th><th>Status</th><th>Updated</th><th>Actions</th></tr></thead><tbody>' +
      rows
        .map(
          (b) =>
            `<tr><td><div class="table-identity"><span class="identity-icon"><i class="bi bi-shop"></i></span><div><strong>${e(b.name)}</strong><small>${e(b.city)}</small>${b.moderation_note ? `<small>${e(b.moderation_note)}</small>` : ""}</div></div></td><td><span class="status-pill status-${b.status}">${b.status}</span></td><td>${e(new Date(b.updated_at).toLocaleDateString())}</td><td><a class="btn btn-sm btn-outline-dark" href="/editor.html?id=${b.id}">Manage</a>${b.status === "approved" ? ` <a class="btn btn-sm btn-link" href="/business.html?id=${b.id}">View</a>` : ""}</td></tr>`,
        )
        .join("") +
      "</tbody></table></div>"
    : '<div class="designed-empty"><i class="bi bi-shop-window"></i><h2>Your next chapter starts here.</h2><p>Add a business, tell its story and help your neighbours discover it.</p><a href="/editor.html" class="btn btn-dark">Create your first listing</a></div>';
} catch (error) {
  message(target, error.message, true);
}
