import { shell, message } from "../components/shell.js";
import { requireClient } from "../services/client.js";
const registering = location.pathname.includes("register");
shell(registering ? "Join Borough" : "Welcome back");
const form = document.querySelector("form");
form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const button = form.querySelector("button");
  button.disabled = true;
  const status = document.querySelector("#status");
  try {
    const db = requireClient();
    const fields = new FormData(form);
    const credentials = {
      email: fields.get("email"),
      password: fields.get("password"),
    };
    const { error } = registering
      ? await db.auth.signUp(credentials)
      : await db.auth.signInWithPassword(credentials);
    if (error) throw error;
    if (registering)
      message(
        status,
        "Registration submitted. Check your email to confirm your account before signing in.",
      );
    else location.assign("/account.html");
  } catch (error) {
    message(status, error.message, true);
  } finally {
    button.disabled = false;
  }
});
