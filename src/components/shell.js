import { workspace } from "./workspace.js";
import "bootstrap-icons/font/bootstrap-icons.css";
import { staffNotifications } from "./notifications.js";
import "bootstrap/dist/css/bootstrap.min.css";
import "../styles/main.css";
export function shell(title) {
  document.title = `${title} · Borough`;
  document.querySelector("#header").innerHTML =
    `<a class="skip" href="#main">Skip to content</a><nav class="container nav-bar" aria-label="Main navigation"><a class="brand" href="/">borough<span>®</span></a><div class="nav-links"><a href="/directory.html">Explore places</a><a href="/community.html">Community</a><a href="/account.html">My account</a><span id="staff-access" class="staff-access"></span><a id="sign-in-link" class="btn btn-dark" href="/signin.html">Sign in ↗</a></div></nav>`;
  document.querySelector("#footer").innerHTML =
    '<div class="container footer-row"><a class="brand" href="/">borough.</a><span>Good places. Closer to home.</span></div>';
  workspace();
  staffNotifications();
}
export function message(target, text, error = false) {
  target.textContent = text;
  target.className = error ? "alert alert-warning" : "status";
}
