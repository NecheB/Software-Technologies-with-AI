import { requireClient } from "./client.js";
export async function session() {
  const db = requireClient();
  const { data, error } = await db.auth.getUser();
  if (error) throw error;
  if (!data.user) throw new Error("Please sign in to continue.");
  return { db, user: data.user };
}
export {checked} from "../utils/query.js";
