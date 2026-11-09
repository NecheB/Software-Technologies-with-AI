import { shell, message } from "../components/shell.js";
import { staff } from "../components/staff.js";
import { checked } from "../services/session.js";
shell("Platform settings");
const status = document.querySelector("#status");
try {
  const { db } = await staff("admin");
  const form = document.querySelector("#settings");
  const settings = await checked(db.from("settings").select("*").single());
  form.elements.site_name.value = settings.site_name;
  form.elements.announcement.value = settings.announcement;
  form.elements.submissions_open.checked = settings.submissions_open;
  form.onsubmit = async (e) => {
    e.preventDefault();
    try {
      await checked(
        db
          .from("settings")
          .update({
            site_name: form.elements.site_name.value,
            announcement: form.elements.announcement.value,
            submissions_open: form.elements.submissions_open.checked,
          })
          .eq("id", true),
      );
      message(status, "Settings saved.");
    } catch (e) {
      message(status, e.message, true);
    }
  };
  const permissions = [
    "listings.manage",
    "content.manage",
    "users.manage",
    "categories.manage",
    "audit.read",
  ];
  const active = await checked(
    db.from("role_permissions").select("permission").eq("role", "moderator"),
  );
  const area = document.querySelector("#permissions");
  for (const permission of permissions) {
    const label = document.createElement("label");
    label.className = "d-block my-2";
    const input = document.createElement("input");
    input.type = "checkbox";
    input.checked = active.some((p) => p.permission === permission);
    input.onchange = async () => {
      try {
        if (input.checked)
          await checked(
            db
              .from("role_permissions")
              .insert({ role: "moderator", permission }),
          );
        else
          await checked(
            db
              .from("role_permissions")
              .delete()
              .eq("role", "moderator")
              .eq("permission", permission),
          );
        message(status, "Moderator permission updated.");
      } catch (e) {
        input.checked = !input.checked;
        message(status, e.message, true);
      }
    };
    label.append(input, ` ${permission}`);
    area.append(label);
  }
} catch (e) {
  message(status, e.message, true);
}
