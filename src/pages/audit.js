import { shell, message } from "../components/shell.js";
import { staff } from "../components/staff.js";
import { checked } from "../services/session.js";
import { escapeHtml } from "../utils/html.js";
shell("Action history");
try {
  const { db } = await staff("audit.read");
  const rows = await checked(
    db
      .from("audit_log")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100),
  );
  document.querySelector("#history").innerHTML = rows
    .map(
      (r) =>
        `<tr><td>${escapeHtml(new Date(r.created_at).toLocaleString())}</td><td>${escapeHtml(r.action)}</td><td>${escapeHtml(r.entity_type)}</td><td>${escapeHtml(r.entity_id)}</td><td>${escapeHtml(r.actor_id || "System")}</td></tr>`,
    )
    .join("");
} catch (e) {
  message(document.querySelector("#status"), e.message, true);
}
