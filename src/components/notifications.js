import { requireClient } from "../services/client.js";
import { moderationAccess, pendingCounts } from "../services/moderation.js";
let stop = () => {};
export function staffNotifications() {
  stop();
  let closed = false;
  let busy = false;
  let authorized = false;
  let timer;
  let subscription;
  const target = document.querySelector("#staff-access");
  async function refresh() {
    if (closed || busy || document.hidden) return;
    busy = true;
    try {
      const db = requireClient();
      const { data, error } = await db.auth.getUser();
      if (error || !data.user) {
        target.replaceChildren();
        return;
      }
      const signIn = document.querySelector("#sign-in-link");
      if (signIn) {
        signIn.textContent = "My businesses";
        signIn.href = "/owner.html";
      }
      const types = await moderationAccess(db);
      if (!types.length) {
        authorized = false;
        target.replaceChildren();
        return;
      }
      authorized = true;
      const counts = await pendingCounts(db, types);
      if (closed) return;
      const total = counts.reduce((sum, r) => sum + r.count, 0);
      target.innerHTML = `<a class="btn staff-button" href="/moderation.html">Staff panel <span class="notification-count">${total}</span><span class="visually-hidden"> pending submissions</span></a><details class="notifications"><summary aria-label="Moderation notifications">Notifications <span class="notification-dot">${total}</span></summary><div class="notification-menu"><strong>${total ? `${total} submissions need review` : "You are all caught up"}</strong>${counts.map((t) => `<a href="/moderation.html?type=${t.table}"><span>${t.label}</span><b>${t.count}</b></a>`).join("")}<small>Checked ${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}. Updates every 45 seconds.</small></div></details>`;
    } catch {
      if (!closed && authorized)
        target.innerHTML =
          '<a href="/moderation.html">Staff panel</a><small>Notifications unavailable</small>';
    } finally {
      busy = false;
    }
  }
  const onVisible = () => {
    if (!document.hidden) refresh();
  };
  document.addEventListener("visibilitychange", onVisible);
  window.addEventListener("borough:moderated", refresh);
  timer = setInterval(refresh, 45000);
  try {
    subscription = requireClient().auth.onAuthStateChange(() =>
      setTimeout(refresh, 0),
    ).data.subscription;
  } catch {}
  stop = () => {
    closed = true;
    clearInterval(timer);
    subscription?.unsubscribe();
    document.removeEventListener("visibilitychange", onVisible);
    window.removeEventListener("borough:moderated", refresh);
  };
  refresh();
}
