import { getAuth } from "firebase-admin/auth";
import { getDb } from "./_firebase-admin.js";

// Never trust a uid from the request body. Verify the caller's ID token
// and use the uid inside it.
export async function requireUser(event) {
  const header = event.headers.authorization || event.headers.Authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) {
    const err = new Error("Not signed in");
    err.statusCode = 401;
    throw err;
  }

  getDb(); // ensures the admin app is initialized

  try {
    const decoded = await getAuth().verifyIdToken(token);
    return { uid: decoded.uid, email: decoded.email };
  } catch {
    const err = new Error("Session expired. Sign in again.");
    err.statusCode = 401;
    throw err;
  }
}

export function fail(err) {
  const code = err.statusCode ?? 500;
  return {
    statusCode: code,
    body: JSON.stringify({ error: code === 500 ? "Something went wrong" : err.message }),
  };
}
