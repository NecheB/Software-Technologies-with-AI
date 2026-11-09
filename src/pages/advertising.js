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
  const form = document.querySelector("#promotion");
  form.innerHTML =
    `<label class="form-label" for="business_id">Business</label><select class="form-select" id="business_id" name="business_id" required>${businesses.map((b) => `<option value="${b.id}">${escapeHtml(b.name)}</option>`).join("")}</select>` +
    fields([
      ["title", "Headline"],
      ["body", "Offer description", "textarea"],
      ["ends_at", "Offer expires", "datetime-local"],
    ]) +
    '<button class="btn btn-dark mt-4">Submit promotion</button>';
  async function campaigns() {
    const ads = await checked(
      db
        .from("advertisements")
        .select("id,title,status,ends_at,moderation_note")
        .eq("owner_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50),
    );
    document.querySelector("#campaigns").innerHTML = ads.length
      ? ads
          .map(
            (a) =>
              `<div class="account-item campaign-row"><div><strong>${escapeHtml(a.title)}</strong><p>Ends ${escapeHtml(new Date(a.ends_at).toLocaleDateString())} ${escapeHtml(a.moderation_note || "")}</p></div><span class="status-pill status-${a.status}">${a.status}</span></div>`,
          )
          .join("")
      : '<div class="designed-empty compact"><i class="bi bi-megaphone"></i><p>Your promotions will appear here once you submit your first offer.</p></div>';
  }
  if (!businesses.length) {
    form.innerHTML =
      '<div class="designed-empty compact"><h3>Add a business first</h3><p>Every promotion belongs to one of your business listings.</p><a class="btn btn-dark" href="/editor.html">Add a business</a></div>';
    await campaigns();
  } else {
    form.elements.title.maxLength = 100;
    form.elements.title.minLength = 5;
    form.elements.body.minLength = 10;
    form.elements.body.maxLength = 1000;
    form.oninput = () => {
      document.querySelector("#preview-business").textContent =
        form.elements.business_id.selectedOptions[0]?.textContent ||
        "Your local business";
      document.querySelector("#preview-title").textContent =
        form.elements.title.value || "A good reason to stop by.";
      document.querySelector("#preview-body").textContent =
        form.elements.body.value ||
        "Your offer will appear here as you write it.";
    };
    form.onsubmit = async (e) => {
      e.preventDefault();
      const submit = form.querySelector("button");
      submit.disabled = true;
      try {
        const data = values(form);
        if (new Date(data.ends_at) <= new Date())
          throw new Error("Choose an expiry date in the future.");
        data.ends_at = new Date(data.ends_at).toISOString();
        const saved = await checked(
          db
            .from("advertisements")
            .insert({ ...data, owner_id: user.id })
            .select("status")
            .single(),
        );
        message(
          status,
          saved.status === "approved"
            ? "Promotion published."
            : "Promotion submitted for review.",
        );
        form.reset();
        form.oninput();
        await campaigns();
      } catch (error) {
        message(status, error.message, true);
      } finally {
        submit.disabled = false;
      }
    };
    await campaigns();
  }
} catch (error) {
  message(status, error.message, true);
}
