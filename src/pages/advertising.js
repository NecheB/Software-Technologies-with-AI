import { shell, message } from "../components/shell.js";
import { session, checked } from "../services/session.js";
import { fields, values } from "../components/forms.js";
import { escapeHtml } from "../utils/html.js";
shell("Advertising");
const status = document.querySelector("#status");
try {
  const { db, user } = await session();
  const businesses = await checked(
    db.from("businesses").select("id,name").eq("owner_id", user.id),
  );
  const form = document.querySelector("form");
  form.innerHTML =
    `<label class="form-label" for="business_id">Business</label><select class="form-select" id="business_id" name="business_id" required>${businesses.map((b) => `<option value="${b.id}">${escapeHtml(b.name)}</option>`).join("")}</select>` +
    fields([
      ["title", "Headline"],
      ["body", "Offer description", "textarea"],
      ["ends_at", "Offer expires", "datetime-local"],
    ]) +
    '<button class="btn btn-dark mt-4">Submit promotion</button>';
  form.onsubmit = async (e) => {
    e.preventDefault();
    try {
      const data = values(form);
      data.ends_at = new Date(data.ends_at).toISOString();
      await checked(
        db.from("advertisements").insert({ ...data, owner_id: user.id }),
      );
      message(status, "Promotion submitted for review.");
      form.reset();
    } catch (error) {
      message(status, error.message, true);
    }
  };
} catch (error) {
  message(status, error.message, true);
}
