import { BriefcaseBusiness, LogIn, UserPlus } from "lucide-react";
import { FormEvent, useState } from "react";

import { apiRequest } from "../lib/api";
import { AuthResponse, User } from "../types/auth";

type Mode = "login" | "customer" | "provider";

const modeLabels: Record<Mode, string> = {
  login: "Login",
  customer: "Customer Signup",
  provider: "Provider Signup"
};

export function AuthPanel() {
  const [mode, setMode] = useState<Mode>("customer");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [bio, setBio] = useState("");
  const [experienceYears, setExperienceYears] = useState("0");
  const [status, setStatus] = useState<string>("");
  const [user, setUser] = useState<User | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setStatus("");

    const endpoint =
      mode === "login"
        ? "/auth/login"
        : mode === "customer"
          ? "/auth/register/customer"
          : "/auth/register/provider";

    const payload =
      mode === "login"
        ? { email, phone, password }
        : mode === "customer"
          ? { name, email, phone, password }
          : {
              name,
              email,
              phone,
              password,
              bio,
              experience_years: Number(experienceYears || 0)
            };

    try {
      const response = await apiRequest<AuthResponse>(endpoint, {
        method: "POST",
        body: JSON.stringify(payload)
      });
      localStorage.setItem("ghartak_token", response.access_token);
      setUser(response.user);
      setStatus(`${response.user.role} account ready.`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Something went wrong.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="auth-section" aria-labelledby="auth-heading">
      <div className="section-heading">
        <p className="eyebrow">Phase 1 implementation</p>
        <h2 id="auth-heading">Authentication entry point</h2>
      </div>

      <div className="auth-layout">
        <div className="auth-copy">
          <h3>Start validating real users</h3>
          <p>
            Customers can create accounts immediately. Providers register into pending verification so
            admin quality control stays in place from day one.
          </p>
          {user ? (
            <div className="signed-in-card">
              <strong>{user.name}</strong>
              <span>{user.role}</span>
            </div>
          ) : null}
        </div>

        <form className="auth-form" onSubmit={submit}>
          <div className="mode-tabs" role="tablist" aria-label="Authentication mode">
            <button
              aria-selected={mode === "customer"}
              className={mode === "customer" ? "active" : ""}
              onClick={() => setMode("customer")}
              type="button"
            >
              <UserPlus size={16} aria-hidden="true" />
              Customer
            </button>
            <button
              aria-selected={mode === "provider"}
              className={mode === "provider" ? "active" : ""}
              onClick={() => setMode("provider")}
              type="button"
            >
              <BriefcaseBusiness size={16} aria-hidden="true" />
              Provider
            </button>
            <button
              aria-selected={mode === "login"}
              className={mode === "login" ? "active" : ""}
              onClick={() => setMode("login")}
              type="button"
            >
              <LogIn size={16} aria-hidden="true" />
              Login
            </button>
          </div>

          <h3>{modeLabels[mode]}</h3>

          {mode !== "login" ? (
            <label>
              Name
              <input
                autoComplete="name"
                minLength={2}
                onChange={(event) => setName(event.target.value)}
                required
                value={name}
              />
            </label>
          ) : null}

          <div className="form-grid">
            <label>
              Email
              <input
                autoComplete="email"
                onChange={(event) => setEmail(event.target.value)}
                type="email"
                value={email}
              />
            </label>
            <label>
              Phone
              <input
                autoComplete="tel"
                onChange={(event) => setPhone(event.target.value)}
                value={phone}
              />
            </label>
          </div>

          <label>
            Password
            <input
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              minLength={mode === "login" ? 1 : 8}
              onChange={(event) => setPassword(event.target.value)}
              required
              type="password"
              value={password}
            />
          </label>

          {mode === "provider" ? (
            <>
              <label>
                Experience Years
                <input
                  min={0}
                  max={60}
                  onChange={(event) => setExperienceYears(event.target.value)}
                  type="number"
                  value={experienceYears}
                />
              </label>
              <label>
                Service Bio
                <textarea
                  onChange={(event) => setBio(event.target.value)}
                  rows={3}
                  value={bio}
                />
              </label>
            </>
          ) : null}

          <button className="primary-action auth-submit" disabled={isSubmitting} type="submit">
            {isSubmitting ? "Please wait" : modeLabels[mode]}
          </button>

          {status ? <p className="form-status">{status}</p> : null}
        </form>
      </div>
    </section>
  );
}
