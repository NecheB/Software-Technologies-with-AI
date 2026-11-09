import { shell, message } from "../components/shell.js";
import { requireClient } from "../services/client.js";
shell("Reset password");
const status = document.querySelector("#status");
const db = (() => {
  try {
    return requireClient();
  } catch (e) {
    message(status, e.message, true);
  }
})();
if (db) {
  db.auth.onAuthStateChange((event) => {
    if (event === "PASSWORD_RECOVERY") {
      document.querySelector("#change").hidden = false;
      document.querySelector("#request").hidden = true;
    }
  });
  document.querySelector("#request").onsubmit = async (e) => {
    e.preventDefault();
    const { error } = await db.auth.resetPasswordForEmail(
      e.target.elements.email.value,
      { redirectTo: `${location.origin}/reset.html` },
    );
    message(
      status,
      error
        ? error.message
        : "If that email is registered, a reset link is on its way.",
      !!error,
    );
  };
  document.querySelector("#change").onsubmit = async (e) => {
    e.preventDefault();
    const { error } = await db.auth.updateUser({
      password: e.target.elements.password.value,
    });
    message(
      status,
      error ? error.message : "Password updated. You can now sign in.",
      !!error,
    );
  };
}
