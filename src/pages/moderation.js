import { shell, message } from "../components/shell.js";
import { staff } from "../components/staff.js";
import { checked } from "../services/session.js";
import { escapeHtml } from "../utils/html.js";
shell("Review queue");
const status = document.querySelector("#status");
const list = document.querySelector("#queue");
try {
  const { db } = await staff("content.manage");
  async function load() {
    const table = document.querySelector("#kind").value;
    const permission =
      table === "businesses" ? "listings.manage" : "content.manage";
    if (!(await checked(db.rpc("has_permission", { required: permission }))))
      throw new Error("You cannot moderate this content.");
    const rows = await checked(
      db
        .from(table)
        .select("*")
        .eq("status", "pending")
        .order("created_at")
        .limit(100),
    );
    list.innerHTML =
      rows
        .map(
          (r) =>
            `<article class="card my-3"><h2>${escapeHtml(r.name || r.title || "Community contribution")}</h2><p class="detail-copy">${escapeHtml(r.description || r.body || "")}</p><label for="note-${r.id}">Moderation note</label><input class="form-control" id="note-${r.id}" maxlength="1000"><div class="d-flex gap-3 mt-3"><button class="btn btn-dark" data-id="${r.id}" data-status="approved">Approve</button><button class="btn btn-outline-danger" data-id="${r.id}" data-status="rejected">Reject</button></div></article>`,
        )
        .join("") || '<p class="status">The queue is clear.</p>';
    list.querySelectorAll("button").forEach(
      (button) =>
        (button.onclick = async () => {
          button.disabled = true;
          try {
            await checked(
              db
                .from(table)
                .update({
                  status: button.dataset.status,
                  moderation_note: document.getElementById(
                    `note-${button.dataset.id}`,
                  ).value,
                })
                .eq("id", button.dataset.id)
                .select("id")
                .single(),
            );
            await load();
            message(status, "Moderation decision saved.");
          } catch (e) {
            message(status, e.message, true);
            button.disabled = false;
          }
        }),
    );
  }
  document.querySelector("#kind").onchange = () =>
    load().catch((e) => message(status, e.message, true));
  await load();
} catch (e) {
  message(status, e.message, true);
}
