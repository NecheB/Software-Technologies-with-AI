import { shell, message } from "../components/shell.js";
import { requireClient } from "../services/client.js";
shell("My account");
const status = document.querySelector("#status");
const button = document.querySelector("#logout");
try {
  const db = requireClient();
  const { data, error } = await db.auth.getUser();
  if (error) throw error;
  if (!data.user) {
    location.replace("/signin.html");
  } else {
    message(status, `Signed in as ${data.user.email}`);
    button.hidden = false;
    button.onclick = async () => {
      const { error } = await db.auth.signOut();
      if (error) message(status, error.message, true);
      else location.assign("/");
    };
  }
} catch (error) {
  message(status, error.message, true);
}

import { session, checked } from "../services/session.js";
import { fields, values } from "../components/forms.js";
try {
  const { db, user } = await session();
  const profile = await checked(
    db.from("profiles").select("*").eq("id", user.id).single(),
  );
  const form = document.createElement("form");
  form.className = "auth mt-4";
  form.innerHTML =
    "<h2>Your profile</h2>" +
    fields(
      [
        ["full_name", "Full name", "text", false],
        ["bio", "About you", "textarea", false],
        ["phone", "Phone", "tel", false],
        ["city", "Town or city", "text", false],
      ],
      profile,
    ) +
    '<button class="btn btn-dark mt-3">Save profile</button>';
  form.onsubmit = async (e) => {
    e.preventDefault();
    try {
      await checked(
        db
          .from("profiles")
          .update(values(form))
          .eq("id", user.id)
          .select("id")
          .single(),
      );
      message(status, "Profile updated.");
    } catch (e) {
      message(status, e.message, true);
    }
  };
  document.querySelector("#main").append(form);
} catch {
  /* Session errors are displayed above. */
}
