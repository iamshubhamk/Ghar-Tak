import { FormEvent, useState } from "react";
import { useNavigate } from "react-router";

import { apiRequest } from "../lib/api";
import { AuthResponse } from "../types/auth";

export default function AdminLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setStatus("");
    try {
      const res = await apiRequest<AuthResponse>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      // Store the token only for admins, so a customer or provider session is never replaced here.
      if (res.user.role !== "ADMIN") {
        setStatus("This account is not an admin account.");
        return;
      }
      localStorage.setItem("ghartak_token", res.access_token);
      navigate("/admin", { replace: true });
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Login failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <form onSubmit={submit} className="w-full max-w-sm bg-white rounded-3xl border border-slate-200 p-6 shadow-card space-y-4">
        <h1 className="text-xl font-black text-brand-navy">Ghar-Tak Admin</h1>
        <input
          type="email"
          required
          autoComplete="username"
          placeholder="Admin email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm"
        />
        <input
          type="password"
          required
          autoComplete="current-password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm"
        />
        {status && <p role="alert" className="text-xs font-bold text-rose-600">{status}</p>}
        <button
          type="submit"
          disabled={busy}
          className="w-full py-3 bg-brand-orange hover:bg-brand-orange-hover disabled:opacity-60 text-white rounded-2xl text-sm font-extrabold"
        >
          {busy ? "Signing in..." : "Sign in"}
        </button>
      </form>
    </div>
  );
}
