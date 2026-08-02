import { AuthProvider, useAuth } from "./lib/auth";
import SignIn from "./screens/SignIn";
import Signup from "./screens/Signup";
import Pending from "./screens/Pending";
import ClientDashboard from "./screens/ClientDashboard";
import AdminDashboard from "./screens/AdminDashboard";

function Loading() {
  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center" }}>
      <div className="spinner" aria-label="Loading" />
    </div>
  );
}

function Gate() {
  const { user, client, admin, loading, error } = useAuth();

  if (loading) return <Loading />;

  if (error) {
    return (
      <div className="empty" style={{ minHeight: "100vh", display: "grid", placeContent: "center" }}>
        <h3>We couldn't load your account</h3>
        <p>{error}</p>
      </div>
    );
  }

  if (!user) return <SignIn />;

  // Sierra goes straight to the admin side.
  if (admin) return <AdminDashboard />;

  // Client record still loading on first paint.
  if (!client) return <Loading />;

  // New client: fill the form, then wait for Sierra.
  if (client.accountState === "onboarding") {
    return <Signup uid={user.uid} email={user.email} />;
  }
  if (client.accountState === "pending") {
    return <Pending client={client} />;
  }

  return <ClientDashboard />;
}

export default function App() {
  return (
    <AuthProvider>
      <Gate />
    </AuthProvider>
  );
}
