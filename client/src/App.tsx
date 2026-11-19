import { ChangeEvent, FormEvent, ReactNode, useEffect, useState } from "react";
import { api, ApiError, hasSession, setToken } from "./api";
import biitLogo from "./assets/biit-logo.png";

type Status = "Pending" | "In Progress" | "Resolved" | "Rejected";
type Role = "student" | "department" | "super";
type Screen =
  | "login"
  | "register"
  | "dashboard"
  | "new"
  | "detail"
  | "admin-directory"
  | "complaint-categories"
  | "departments"
  | "change-password"
  | "first-login-password"
  | "denied"
  | "expired";

type Account = {
  label: string;
  email: string;
  role: Role;
  department?: string;
  firstLogin?: boolean;
};

type Credentials = Account & { password: string };
type Session = { account: Account; token: string };

type ManagedCategory = {
  id: string;
  name: string;
  department: string;
  description?: string;
  active: boolean;
};

type ManagedDepartment = {
  id: string;
  name: string;
  description?: string;
  active: boolean;
};

type Reply = { author: string; text: string; at: string };
type Event = { title: string; detail: string; at: string };
type Complaint = {
  id: string;
  departmentId: string;
  createdAt: string;
  title: string;
  category: string;
  department: string;
  student: string;
  studentEmail: string;
  date: string;
  status: Status;
  description: string;
  replies: Reply[];
  events: Event[];
  resolutionNote?: string;
  rejectionReason?: string;
  image?: string;
};

const departmentShort: Record<string, string> = {
  "Cafeteria Administration": "Cafeteria",
  "Library Administration": "Library",
  "Laboratory / IT Administration": "Laboratory / IT",
  "Teaching Manager / Academic Coordination": "Teaching / Academic",
};

function Icon({ name, size = 20 }: { name: string; size?: number }) {
  const paths: Record<string, ReactNode> = {
    grid: (
      <>
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </>
    ),
    plus: (
      <>
        <path d="M12 5v14M5 12h14" />
      </>
    ),
    file: (
      <>
        <path d="M6 3h8l4 4v14H6z" />
        <path d="M14 3v5h5M9 13h6M9 17h6" />
      </>
    ),
    logout: (
      <>
        <path d="M10 5H5v14h5M14 8l4 4-4 4M18 12H9" />
      </>
    ),
    search: (
      <>
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-4-4" />
      </>
    ),
    chevron: <path d="m9 18 6-6-6-6" />,
    back: <path d="m15 18-6-6 6-6" />,
    eye: (
      <>
        <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z" />
        <circle cx="12" cy="12" r="2.5" />
      </>
    ),
    menu: (
      <>
        <path d="M4 7h16M4 12h16M4 17h16" />
      </>
    ),
    close: (
      <>
        <path d="m6 6 12 12M18 6 6 18" />
      </>
    ),
    check: <path d="m5 12 4 4L19 6" />,
    alert: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 8v5M12 17h.01" />
      </>
    ),
    upload: (
      <>
        <path d="M12 16V4M8 8l4-4 4 4" />
        <path d="M4 15v5h16v-5" />
      </>
    ),
    filter: <path d="M4 6h16M7 12h10M10 18h4" />,
    clock: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </>
    ),
    message: <path d="M5 5h14v11H9l-4 4z" />,
    users: (
      <>
        <circle cx="9" cy="8" r="3" />
        <path d="M3.5 19c.5-3.2 2.3-5 5.5-5s5 1.8 5.5 5M15 6.5a3 3 0 0 1 0 5.8M16 14c2.6.3 4 1.9 4.5 4.5" />
      </>
    ),
    key: (
      <>
        <circle cx="8" cy="15" r="4" />
        <path d="m11 12 8-8M16 7l2 2M14 9l2 2" />
      </>
    ),
    shield: (
      <>
        <path d="M12 3 5 6v5c0 4.8 3 8.3 7 10 4-1.7 7-5.2 7-10V6z" />
        <path d="m9 12 2 2 4-4" />
      </>
    ),
  };
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  );
}

function Logo({ dark = false }: { dark?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <span
        className={`grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-xl bg-white p-1 ${
          dark ? "ring-1 ring-white/20" : "ring-1 ring-brand-border"
        }`}
      >
        <img src={biitLogo} alt="BIIT official emblem" className="h-full w-full object-contain" />
      </span>
      <div>
        <div
          className={`text-[17px] font-bold tracking-tight ${dark ? "text-white" : "text-brand-ink"}`}
        >
          CampusConnect
        </div>
        <div
          className={`text-[10px] font-semibold tracking-[.15em] ${dark ? "text-brand-muted/70" : "text-brand-muted"}`}
        >
          BIIT SERVICE PORTAL
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: Status }) {
  const styles: Record<Status, string> = {
    Pending: "bg-amber-50 text-amber-700 ring-amber-200",
    "In Progress": "bg-blue-50 text-blue-700 ring-blue-200",
    Resolved: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    Rejected: "bg-rose-50 text-rose-700 ring-rose-200",
  };
  return (
    <span className={`status-badge ${styles[status]}`}>
      <span className="status-dot" />
      {status}
    </span>
  );
}

function Button({
  children,
  onClick,
  variant = "primary",
  type = "button",
  disabled = false,
  className = "",
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: "primary" | "secondary" | "danger" | "ghost";
  type?: "button" | "submit";
  disabled?: boolean;
  className?: string;
}) {
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={`btn btn-${variant} ${className}`}
    >
      {children}
    </button>
  );
}

function Alert({
  type = "error",
  children,
}: {
  type?: "error" | "success" | "info";
  children: ReactNode;
}) {
  return (
    <div className={`alert alert-${type}`}>
      <Icon name={type === "success" ? "check" : "alert"} size={18} />
      <div>{children}</div>
    </div>
  );
}

function Login({
  onLogin,
  onRegister,
}: {
  onLogin: (session: Session) => Promise<void>;
  onRegister: () => void;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loginError, setLoginError] = useState("");
  const signIn = async (event: FormEvent) => {
    event.preventDefault();
    if (loading) return;
    setLoading(true);
    setError(false);
    try {
      await onLogin(await api<Session>("/auth/login", "POST", { email, password }));
    } catch (error) {
      setError(true);
      setLoginError(error instanceof Error ? error.message : "Sign-in failed.");
    } finally {
      setLoading(false);
    }
  };
  return (
    <div className="auth-page">
      <div className="auth-brand-panel">
        <div className="relative z-10 max-w-lg">
          <Logo dark />
          <p className="mt-24 text-sm font-semibold uppercase tracking-[.18em] text-emerald-100">
            A better campus, together
          </p>
          <h1 className="font-display mt-4 text-5xl font-bold leading-[1.08] tracking-tight text-white">
            Report. Track.
            <br />
            Make a difference.
          </h1>
          <p className="mt-6 max-w-md text-lg leading-8 text-white/70">
            A clear, accountable way for the BIIT community to resolve campus issues.
          </p>
        </div>
        <div className="auth-orb auth-orb-one" />
        <div className="auth-orb auth-orb-two" />
        <p className="relative z-10 text-sm text-white/50">
          © 2025 Barani Institute of Information Technology
        </p>
      </div>
      <main className="auth-form-panel">
        <div className="auth-mobile-logo">
          <Logo />
        </div>
        <form onSubmit={signIn} className="w-full max-w-[420px]">
          <p className="eyebrow">WELCOME BACK</p>
          <h2 className="font-display mt-2 text-3xl font-bold tracking-tight text-brand-ink">
            Sign in to CampusConnect
          </h2>
          <p className="mt-3 text-sm text-brand-muted">
            Enter your BIIT account details to continue.
          </p>
          {error && (
            <div className="mt-6">
              <Alert>{loginError}</Alert>
            </div>
          )}
          <label className="field-label mt-7">Email address</label>
          <input
            className={`field ${error ? "field-error" : ""}`}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            placeholder="name@biit.edu.pk"
            required
          />
          <label className="field-label mt-5">Password</label>
          <div className="relative">
            <input
              className={`field pr-12 ${error ? "field-error" : ""}`}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type={show ? "text" : "password"}
              placeholder="Enter your password"
              required
            />
            <button
              type="button"
              onClick={() => setShow(!show)}
              aria-label="Toggle password visibility"
              className="field-icon"
            >
              <Icon name="eye" />
            </button>
          </div>
          <Button type="submit" disabled={loading} className="mt-6 w-full">
            {loading ? (
              <>
                <span className="spinner" /> Signing in…
              </>
            ) : (
              "Sign In"
            )}
          </Button>
          <p className="mt-6 text-center text-sm text-brand-muted">
            New student?{" "}
            <button type="button" onClick={onRegister} className="text-link">
              Create Student Account
            </button>
          </p>
        </form>
      </main>
    </div>
  );
}

function Register({ onBack, onCreated }: { onBack: () => void; onCreated: (session: Session) => Promise<void> }) {
  const [form, setForm] = useState({ name: "", email: "", password: "", confirm: "" });
  const [submitted, setSubmitted] = useState(false);
  const [exists, setExists] = useState(false);
  const set = (key: string, value: string) => setForm({ ...form, [key]: value });
  const errors = {
    name: !form.name.trim(),
    email: !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email),
    password: form.password.length < 8,
    confirm: form.password !== form.confirm,
  };
  const [registerError, setRegisterError] = useState("");
  const [saving, setSaving] = useState(false);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitted(true);
    setExists(false);
    setRegisterError("");
    if (saving || Object.values(errors).some(Boolean)) return;
    setSaving(true);
    try {
      const { name, email, password } = form;
      await onCreated(await api<Session>("/auth/register", "POST", { name, email, password }));
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) setExists(true);
      else setRegisterError(error instanceof Error ? error.message : "Registration failed.");
    } finally {
      setSaving(false);
    }
  };
  return (
    <div className="auth-page">
      <div className="auth-brand-panel">
        <div className="relative z-10 max-w-lg">
          <Logo dark />
          <p className="mt-24 text-sm font-semibold uppercase tracking-[.18em] text-emerald-100">
            Student access
          </p>
          <h2 className="font-display mt-4 text-5xl font-bold leading-[1.08] tracking-tight text-white">
            Your campus voice
            <br />
            starts here.
          </h2>
          <p className="mt-6 max-w-md text-lg leading-8 text-white/70">
            Create an account to report issues, follow progress, and read department updates.
          </p>
        </div>
        <div className="auth-orb auth-orb-one" />
        <div className="auth-orb auth-orb-two" />
        <p className="relative z-10 text-sm text-white/50">
          © 2025 Barani Institute of Information Technology
        </p>
      </div>
      <main className="auth-form-panel">
        <div className="auth-mobile-logo">
          <Logo />
        </div>
        <div className="w-full max-w-[500px] pt-16 lg:pt-0">
          <p className="eyebrow">STUDENT REGISTRATION</p>
          <h1 className="font-display mt-2 text-3xl font-bold tracking-tight text-brand-ink">
            Create your account
          </h1>
          <p className="mt-2 text-sm text-brand-muted">Use your email to access CampusConnect.</p>
          {exists && (
            <div className="mt-6">
              <Alert>
                An account already exists for this email.{" "}
                <button onClick={onBack} className="font-semibold underline">
                  Sign in instead
                </button>
                .
              </Alert>
            </div>
          )}
          <form onSubmit={submit} className="mt-7" noValidate>
            {registerError && <p role="alert" className="text-rose-700">{registerError}</p>}
            <Field
              label="Full name"
              value={form.name}
              onChange={(v) => set("name", v)}
              placeholder="Your full name"
              error={submitted && errors.name ? "Full name is required." : ""}
            />
            <Field
              label="Email address"
              value={form.email}
              onChange={(v) => {
                set("email", v);
                setExists(false);
              }}
              placeholder="name@example.com"
              type="email"
              error={submitted && errors.email ? "Enter a valid email address." : ""}
            />
            <div className="grid gap-5 sm:grid-cols-2">
              <Field
                label="Password"
                value={form.password}
                onChange={(v) => set("password", v)}
                placeholder="At least 8 characters"
                type="password"
                error={submitted && errors.password ? "Use at least 8 characters." : ""}
              />
              <Field
                label="Confirm password"
                value={form.confirm}
                onChange={(v) => set("confirm", v)}
                placeholder="Repeat password"
                type="password"
                error={submitted && errors.confirm ? "Passwords do not match." : ""}
              />
            </div>
            <Button type="submit" className="mt-7 w-full">
              Create Account
            </Button>
          </form>
          <p className="mt-6 text-center text-sm text-brand-muted">
            Already registered?{" "}
            <button onClick={onBack} className="text-link">
              Back to Sign In
            </button>
          </p>
          <p className="mt-6 text-center text-xs text-brand-muted/70">
            Your role is assigned automatically. Administrator accounts are issued by BIIT.
          </p>
        </div>
      </main>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  error = "",
  type = "text",
  textarea = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  error?: string;
  type?: string;
  textarea?: boolean;
}) {
  return (
    <label className="mb-5 block">
      <span className="field-label">{label}</span>
      {textarea ? (
        <textarea
          className={`field min-h-32 resize-y ${error ? "field-error" : ""}`}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
        />
      ) : (
        <input
          className={`field ${error ? "field-error" : ""}`}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          type={type}
        />
      )}{" "}
      {error && <span className="mt-1.5 block text-xs font-medium text-rose-600">{error}</span>}
    </label>
  );
}

function Shell({
  role,
  name,
  department,
  onNavigate,
  onLogout,
  children,
  title,
  screen,
}: {
  role: Role;
  name: string;
  department?: string;
  onNavigate: (s: Screen) => void;
  onLogout: () => void;
  children: ReactNode;
  title: string;
  screen: Screen;
}) {
  const [menu, setMenu] = useState(false);
  const roleName =
    role === "student"
      ? "Student Portal"
      : role === "super"
        ? "Central Oversight"
        : departmentShort[department || ""] || department;
  return (
    <div className="min-h-screen bg-brand-canvas">
      <aside className={`sidebar ${menu ? "sidebar-open" : ""}`}>
        <div className="flex items-center justify-between">
          <Logo />
          <button className="text-brand-muted lg:hidden" onClick={() => setMenu(false)}>
            <Icon name="close" />
          </button>
        </div>
        <div className="mt-9 rounded-xl border border-brand-border bg-brand-mint px-3 py-3">
          <p className="text-[10px] font-bold uppercase tracking-[.16em] text-brand-primary">
            {role === "department" ? "Department account" : "Signed in as"}
          </p>
          <p className="mt-1 truncate text-sm font-semibold text-brand-ink">{roleName}</p>
        </div>
        <nav className="mt-8 space-y-1">
          <button
            onClick={() => {
              onNavigate("dashboard");
              setMenu(false);
            }}
            className={`nav-item ${screen === "dashboard" || screen === "detail" ? "nav-active" : ""}`}
          >
            <Icon name="grid" />
            {role === "student" ? "My Complaints" : "Dashboard"}
          </button>
          {role === "student" && (
            <button
              onClick={() => {
                onNavigate("new");
                setMenu(false);
              }}
              className={`nav-item ${screen === "new" ? "nav-active" : ""}`}
            >
              <Icon name="plus" />
              New Complaint
            </button>
          )}
          {role === "super" && (
            <>
              <button
                onClick={() => {
                  onNavigate("admin-directory");
                  setMenu(false);
                }}
                className={`nav-item ${screen === "admin-directory" ? "nav-active" : ""}`}
              >
                <Icon name="users" />
                Admin Directory
              </button>
              <button
                onClick={() => {
                  onNavigate("complaint-categories");
                  setMenu(false);
                }}
                className={`nav-item ${screen === "complaint-categories" ? "nav-active" : ""}`}
              >
                <Icon name="file" />
                Complaint Categories
              </button>
              <button
                onClick={() => {
                  onNavigate("departments");
                  setMenu(false);
                }}
                className={`nav-item ${screen === "departments" ? "nav-active" : ""}`}
              >
                <Icon name="shield" />
                Departments
              </button>
            </>
          )}
          {role !== "student" && (
            <button
              onClick={() => {
                onNavigate("change-password");
                setMenu(false);
              }}
              className={`nav-item ${screen === "change-password" ? "nav-active" : ""}`}
            >
              <Icon name="key" />
              Change Password
            </button>
          )}
          <div className="my-5 border-t border-brand-border" />
          <button onClick={onLogout} className="nav-item">
            <Icon name="logout" />
            Sign Out
          </button>
        </nav>
        <div className="mt-auto rounded-xl border border-brand-border bg-brand-canvas p-4 text-xs leading-5 text-brand-muted">
          <span className="font-semibold text-brand-ink">Need help?</span>
          <br />
          Contact BIIT IT support.
        </div>
      </aside>
      {menu && (
        <button
          className="fixed inset-0 z-30 bg-brand-forest/40 lg:hidden"
          onClick={() => setMenu(false)}
          aria-label="Close menu"
        />
      )}
      <div className="lg:pl-[272px]">
        <header className="topbar">
          <div className="flex items-center gap-3">
            <button className="icon-button lg:hidden" onClick={() => setMenu(true)}>
              <Icon name="menu" />
            </button>
            <h1 className="text-base font-semibold text-brand-ink lg:hidden">{title}</h1>
          </div>
          <div className="ml-auto flex items-center gap-3">
            <div className="avatar">
              {name.split(/\s+/).slice(0, 2).map((word) => word.charAt(0)).join("").toUpperCase()}
            </div>
            <div className="hidden sm:block">
              <p className="text-sm font-semibold text-brand-ink">
                {name}
              </p>
              <p className="text-xs text-brand-muted">
                {role === "student"
                  ? "Student"
                  : role === "super"
                    ? "Campus-wide access"
                    : "Department administrator"}
              </p>
            </div>
          </div>
        </header>
        <main className="mx-auto max-w-[1320px] p-5 sm:p-7 lg:p-9">{children}</main>
      </div>
    </div>
  );
}

function PageHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
      <div>
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h2 className="font-display mt-1 text-2xl font-bold tracking-tight text-brand-ink sm:text-[28px]">
          {title}
        </h2>
        <p className="mt-2 text-sm text-brand-muted">{description}</p>
      </div>
      {action}
    </div>
  );
}

function StatCard({ label, value, status }: { label: string; value: number; status?: Status }) {
  const accents = status
    ? {
        Pending: "bg-amber-400",
        "In Progress": "bg-blue-500",
        Resolved: "bg-emerald-500",
        Rejected: "bg-rose-500",
      }[status]
    : "bg-brand-forest";
  return (
    <div className="card relative overflow-hidden p-5">
      <span className={`absolute inset-y-0 left-0 w-1 ${accents}`} />
      <p className="text-sm font-medium text-brand-muted">{label}</p>
      <p className="font-display mt-2 text-3xl font-bold tracking-tight text-brand-ink">{value}</p>
    </div>
  );
}

function ComplaintsTable({
  rows,
  onOpen,
  admin = false,
}: {
  rows: Complaint[];
  onOpen: (c: Complaint) => void;
  admin?: boolean;
}) {
  return (
    <>
      <div className="hidden overflow-x-auto md:block">
        <table className="data-table">
          <thead>
            <tr>
              <th>Complaint</th>
              {admin && <th>Student</th>}
              <th>{admin ? "Submitted" : "Category & department"}</th>
              <th>Status</th>
              <th>
                <span className="sr-only">Open</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((c) => (
              <tr
                key={c.id}
                onClick={() => onOpen(c)}
                tabIndex={0}
                onKeyDown={(e) => e.key === "Enter" && onOpen(c)}
              >
                <td>
                  <p className="font-semibold text-brand-ink">{c.title}</p>
                  <p className="mt-1 text-xs font-semibold text-brand-muted/70">
                    {c.id} · {c.date}
                  </p>
                </td>
                {admin && (
                  <td>
                    <p className="text-sm font-medium text-brand-muted">{c.student}</p>
                  </td>
                )}
                <td>
                  {admin ? (
                    <p className="text-sm text-brand-muted">{c.date}</p>
                  ) : (
                    <>
                      <p className="text-sm text-brand-muted">{c.category}</p>
                      <p className="mt-1 text-xs text-brand-muted/70">{c.department}</p>
                    </>
                  )}
                </td>
                <td>
                  <StatusBadge status={c.status} />
                </td>
                <td>
                  <button className="icon-button">
                    <Icon name="chevron" size={18} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="grid gap-3 md:hidden">
        {rows.map((c) => (
          <button key={c.id} onClick={() => onOpen(c)} className="mobile-complaint-card">
            <div className="flex items-start justify-between gap-3">
              <span className="text-xs font-bold text-brand-muted/70">{c.id}</span>
              <StatusBadge status={c.status} />
            </div>
            <h3 className="mt-3 text-left font-semibold text-brand-ink">{c.title}</h3>
            <p className="mt-2 text-left text-xs text-brand-muted">
              {admin ? `${c.student} · ${c.date}` : `${c.category} · ${c.date}`}
            </p>
            {!admin && (
              <p className="mt-1 text-left text-[11px] leading-4 text-brand-muted/70">
                {c.department}
              </p>
            )}
            <div className="mt-4 flex items-center justify-between border-t border-brand-border pt-3 text-xs font-semibold text-brand-primary">
              <span>View details</span>
              <Icon name="chevron" size={16} />
            </div>
          </button>
        ))}
      </div>
    </>
  );
}

function StudentDashboard({
  complaints,
  onNew,
  onOpen,
}: {
  complaints: Complaint[];
  onNew: () => void;
  onOpen: (c: Complaint) => void;
}) {
  const [filter, setFilter] = useState("All");
  const mine = complaints;
  const filtered = mine.filter((c) => filter === "All" || c.status === filter);
  return (
    <>
      <PageHeader
        eyebrow="STUDENT PORTAL"
        title="My Complaints"
        description="Track your submitted issues and department responses."
        action={
          <Button onClick={onNew}>
            <Icon name="plus" size={18} />
            New Complaint
          </Button>
        }
      />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Total" value={mine.length} />
        <StatCard
          label="Pending"
          value={mine.filter((c) => c.status === "Pending").length}
          status="Pending"
        />
        <StatCard
          label="In Progress"
          value={mine.filter((c) => c.status === "In Progress").length}
          status="In Progress"
        />
        <StatCard
          label="Resolved"
          value={mine.filter((c) => c.status === "Resolved").length}
          status="Resolved"
        />
      </div>
      <section className="card mt-6">
        <div className="card-header">
          <div>
            <h3 className="font-bold text-brand-ink">Your recent complaints</h3>
            <p className="mt-1 text-xs text-brand-muted">
              {filtered.length} complaint{filtered.length !== 1 && "s"} shown
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="select-field"
              aria-label="Filter by status"
            >
              <option>All</option>
              <option>Pending</option>
              <option>In Progress</option>
              <option>Resolved</option>
              <option>Rejected</option>
            </select>

          </div>
        </div>
        {mine.length === 0 ? (
          <EmptyState
            title="Submit your first complaint"
            text="Report a campus issue and follow every update in one place."
            action={<Button onClick={onNew}>Submit a Complaint</Button>}
          />
        ) : filtered.length ? (
          <ComplaintsTable rows={filtered} onOpen={onOpen} />
        ) : (
          <EmptyState
            title="No complaints found"
            text={
              filter === "All"
                ? "You have not submitted a complaint yet."
                : `You have no ${filter.toLowerCase()} complaints.`
            }
            action={<Button onClick={onNew}>Submit a Complaint</Button>}
          />
        )}
      </section>
    </>
  );
}

function EmptyState({ title, text, action }: { title: string; text: string; action?: ReactNode }) {
  return (
    <div className="px-6 py-16 text-center">
      <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-brand-canvas text-brand-muted">
        <Icon name="file" />
      </span>
      <h3 className="mt-4 font-bold text-brand-ink">{title}</h3>
      <p className="mx-auto mt-2 max-w-sm text-sm text-brand-muted">{text}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

function NewComplaint({
  categories,
  departments,
  onCancel,
  onSubmit,
  onOpen,
}: {
  categories: ManagedCategory[];
  departments: ManagedDepartment[];
  onCancel: () => void;
  onSubmit: (input: { title: string; categoryId: string; description: string; image: string }) => Promise<Complaint>;
  onOpen: (complaint: Complaint) => void;
}) {
  const [form, setForm] = useState({ title: "", category: "", description: "" });
  const [image, setImage] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [success, setSuccess] = useState(false);
  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [created, setCreated] = useState<Complaint | null>(null);
  const selectedCategory = categories.find((category) => category.id === form.category);
  const facilitiesExample = categories.find(
    (category) => category.active && category.name === "Classroom Maintenance",
  );
  const invalid = {
    title: !form.title.trim(),
    category: !form.category,
    description: form.description.trim().length < 15,
  };
  const fileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type) || file.size > 1_500_000) {
      setSubmitError("Choose a PNG, JPEG, or WebP image up to 1.5 MB.");
      return;
    }
    setSubmitError("");
    const reader = new FileReader();
    reader.onload = () => setImage(String(reader.result));
    reader.onerror = () => setSubmitError("Could not read the selected image.");
    reader.readAsDataURL(file);
  };
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitted(true);
    if (saving || Object.values(invalid).some(Boolean)) return;
    setSubmitError("");
    setSaving(true);
    try {
      setCreated(await onSubmit({
        title: form.title, categoryId: form.category, description: form.description, image,
      }));
      setSuccess(true);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Could not submit the complaint.");
    } finally {
      setSaving(false);
    }
  };
  if (success && created)
    return (
      <div className="mx-auto max-w-2xl">
        <div className="card p-7 text-center sm:p-10">
          <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-emerald-50 text-emerald-600">
            <Icon name="check" size={30} />
          </span>
          <p className="eyebrow mt-6">COMPLAINT SUBMITTED</p>
          <h2 className="mt-2 text-2xl font-bold">We’ve sent it to the right team</h2>
          <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-brand-muted">
            Your complaint is now in the department queue. You can track every update from My
            Complaints.
          </p>
          <div className="mx-auto mt-7 max-w-md rounded-xl border border-brand-border bg-brand-canvas p-5 text-left">
            <InfoRow label="Complaint ID" value={created.id} />
            <InfoRow label="Category" value={created.category} />
            <InfoRow label="Assigned department" value={created.department} />
            <div className="flex items-center justify-between pt-3">
              <span className="text-xs font-medium text-brand-muted">Status</span>
              <StatusBadge status="Pending" />
            </div>
          </div>
          <Button className="mt-7" onClick={() => onOpen(created)}>
            View Complaint
          </Button>
        </div>
      </div>
    );
  return (
    <>
      <PageHeader
        eyebrow="STUDENT PORTAL"
        title="Submit a new complaint"
        description="Tell us what happened. Your complaint will be routed automatically."
        action={
          <Button
            variant="secondary"
            onClick={() =>
              setForm({
                title: facilitiesExample ? "Broken classroom fan" : "Wi-Fi disconnects in Lab 2",
                category:
                  facilitiesExample?.id ||
                  categories.find((category) => category.active && category.name === "Campus Wi-Fi")
                    ?.id ||
                  categories.find((category) => category.name === "Laboratories & IT Facilities")
                    ?.id ||
                  "",
                description: facilitiesExample
                  ? "The ceiling fan in Classroom 4 is not working, making the room uncomfortable during afternoon lectures."
                  : "The Wi-Fi disconnects every few minutes on the computers in Lab 2. It is interrupting our programming lab work.",
              })
            }
          >
            Fill Demo Complaint
          </Button>
        }
      />
      <form onSubmit={submit} className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]" noValidate>
        <section className="card p-5 sm:p-7">
          <h3 className="section-title">Complaint details</h3>
          {submitError && (
            <div className="mt-5">
              <Alert>
                {submitError}
              </Alert>
            </div>
          )}
          <div className="mt-6">
            <Field
              label="Title *"
              value={form.title}
              onChange={(v) => setForm({ ...form, title: v })}
              placeholder="Briefly describe the issue"
              error={submitted && invalid.title ? "Add a short title." : ""}
            />
            <label className="mb-5 block">
              <span className="field-label">Category *</span>
              <select
                className={`field ${submitted && invalid.category ? "field-error" : ""}`}
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
              >
                <option value="">Select a category</option>
                {departments
                  .filter((department) => department.active)
                  .map((department) => {
                    const options = categories.filter(
                      (category) => category.active && category.department === department.name,
                    );
                    if (!options.length) return null;
                    return (
                      <optgroup key={department.id} label={department.name}>
                        {options.map((category) => (
                          <option key={category.id} value={category.id}>
                            {category.name} — {category.department}
                          </option>
                        ))}
                      </optgroup>
                    );
                  })}
              </select>
              {submitted && invalid.category && (
                <span className="error-text">Choose a category.</span>
              )}
            </label>
            {form.category && (
              <div className="mb-5 rounded-xl border border-brand-border bg-brand-mint p-4">
                <div className="flex items-start gap-3">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-white text-brand-primary shadow-sm">
                    <Icon name="shield" size={18} />
                  </span>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[.14em] text-brand-primary">
                      Automatically assigned
                    </p>
                    <p className="mt-1 text-sm font-bold text-brand-primary-hover">
                      {selectedCategory?.department}
                    </p>
                    <p className="mt-1 text-xs leading-5 text-brand-muted">
                      This department will receive your complaint immediately.
                    </p>
                  </div>
                </div>
              </div>
            )}
            <Field
              textarea
              label="Description *"
              value={form.description}
              onChange={(v) => setForm({ ...form, description: v })}
              placeholder="Include the location, when it happened, and any useful details."
              error={submitted && invalid.description ? "Please enter at least 15 characters." : ""}
            />
          </div>
          <div className="flex flex-col-reverse gap-3 border-t border-brand-border pt-6 sm:flex-row sm:justify-end">
            <Button variant="secondary" onClick={onCancel}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? (
                <>
                  <span className="spinner" />
                  Submitting…
                </>
              ) : (
                "Submit Complaint"
              )}
            </Button>
          </div>
        </section>
        <aside className="space-y-5">
          <div className="card p-5">
            <h3 className="section-title">
              Supporting image <span className="font-normal text-brand-muted/70">(optional)</span>
            </h3>
            {image ? (
              <div className="mt-4">
                <img
                  src={image}
                  alt="Attachment preview"
                  className="h-36 w-full rounded-lg object-cover"
                />
                <button
                  type="button"
                  onClick={() => setImage("")}
                  className="mt-3 text-sm font-semibold text-rose-600"
                >
                  Remove image
                </button>
              </div>
            ) : (
              <label className="upload-zone">
                <Icon name="upload" />
                <span className="mt-2 text-sm font-semibold text-brand-muted">Choose an image</span>
                <span className="mt-1 text-xs text-brand-muted/70">PNG, JPG, or WebP, up to 1.5 MB</span>
                <input type="file" accept="image/png,image/jpeg,image/webp" onChange={fileChange} className="sr-only" />
              </label>
            )}

          </div>
        </aside>
      </form>
    </>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-5 border-b border-brand-border py-3 first:pt-0">
      <span className="shrink-0 text-xs font-medium text-brand-muted">{label}</span>
      <span className="text-right text-sm font-semibold text-brand-ink">{value}</span>
    </div>
  );
}

function Timeline({ events }: { events: Event[] }) {
  return (
    <div className="timeline">
      {events.map((e, i) => (
        <div className="timeline-item" key={`${e.title}-${i}`}>
          <span className="timeline-dot">
            <Icon name={e.title === "Reply Posted" ? "message" : "check"} size={13} />
          </span>
          <div>
            <p className="text-sm font-semibold text-brand-ink">{e.title}</p>
            <p className="mt-1 text-xs text-brand-muted">{e.detail}</p>
            <p className="mt-1 text-[11px] text-brand-muted/70">{e.at}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

function ComplaintDetail({
  complaint,
  role,
  onBack,
  onUpdate,
}: {
  complaint: Complaint;
  role: Role;
  onBack: () => void;
  onUpdate: (path: string, method: string, body: unknown) => Promise<void>;
}) {
  const [status, setStatus] = useState<Status>(complaint.status);
  const [remark, setRemark] = useState(complaint.resolutionNote || complaint.rejectionReason || "");
  const [reply, setReply] = useState("");
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [confirm, setConfirm] = useState<Status | null>(null);
  const save = () => {
    if (status === "Rejected" && !remark.trim()) {
      setNotice("A rejection reason is required.");
      return;
    }
    if ((status === "Resolved" || status === "Rejected") && status !== complaint.status) {
      setConfirm(status);
      return;
    }
    applyStatus();
  };
  const applyStatus = async () => {
    if (saving) return;
    setSaving(true);
    try {
      await onUpdate("/status", "PATCH", { status, remark });
      setConfirm(null);
      setNotice("Update saved. The student can now see this change.");
    } catch (error) {
      setConfirm(null);
      setNotice(error instanceof Error ? error.message : "Could not update the complaint.");
    } finally {
      setSaving(false);
    }
  };
  const postReply = async () => {
    if (saving) return;
    if (!reply.trim()) {
      setNotice("Write a reply before posting.");
      return;
    }
    setSaving(true);
    try {
      await onUpdate("/replies", "POST", { text: reply });
      setReply("");
      setNotice("Reply posted without changing the status.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not post the reply.");
    } finally {
      setSaving(false);
    }
  };
  return (
    <>
      <button
        onClick={onBack}
        className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-brand-muted hover:text-brand-primary"
      >
        <Icon name="back" size={18} />
        Back to dashboard
      </button>
      <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div>
          <div className="flex items-center gap-3">
            <span className="text-sm font-bold text-brand-primary">{complaint.id}</span>
            <StatusBadge status={complaint.status} />
          </div>
          <h2 className="font-display mt-3 text-2xl font-bold tracking-tight text-brand-ink sm:text-3xl">
            {complaint.title}
          </h2>
          <p className="mt-2 text-sm text-brand-muted">
            Submitted {complaint.date} by {role === "student" ? "you" : complaint.student}
          </p>
        </div>
      </div>
      <div
        className={`grid gap-6 ${role === "department" ? "xl:grid-cols-[minmax(0,1fr)_380px]" : "lg:grid-cols-[minmax(0,1fr)_360px]"}`}
      >
        <div className="space-y-6">
          <section className="card p-5 sm:p-7">
            <h3 className="section-title">Complaint details</h3>
            <p className="mt-5 whitespace-pre-line text-sm leading-7 text-brand-muted">
              {complaint.description}
            </p>
            {complaint.image && (
              <img
                src={complaint.image}
                alt="Complaint attachment"
                className="mt-5 max-h-72 w-full rounded-xl object-cover"
              />
            )}
            <div className="mt-6 grid gap-4 border-t border-brand-border pt-6 sm:grid-cols-2">
              <InfoBlock label="Category" value={complaint.category} />
              <InfoBlock label="Assigned department" value={complaint.department} />
            </div>
            {complaint.resolutionNote && (
              <div className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                <p className="text-xs font-bold uppercase tracking-wider text-emerald-700">
                  Resolution note
                </p>
                <p className="mt-2 text-sm leading-6 text-emerald-950">
                  {complaint.resolutionNote}
                </p>
              </div>
            )}
            {complaint.rejectionReason && (
              <div className="mt-6 rounded-xl border border-rose-200 bg-rose-50 p-4">
                <p className="text-xs font-bold uppercase tracking-wider text-rose-700">
                  Reason for rejection
                </p>
                <p className="mt-2 text-sm leading-6 text-rose-950">{complaint.rejectionReason}</p>
              </div>
            )}
          </section>
          <section className="card p-5 sm:p-7">
            <div className="flex items-center justify-between">
              <h3 className="section-title">Department replies</h3>
              <span className="text-xs text-brand-muted/70">
                {complaint.replies.length} {complaint.replies.length === 1 ? "reply" : "replies"}
              </span>
            </div>
            {complaint.replies.length ? (
              <div className="mt-5 space-y-4">
                {complaint.replies.map((r, i) => (
                  <div key={i} className="rounded-xl bg-brand-canvas p-4">
                    <div className="flex items-start gap-3">
                      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-brand-mint text-brand-primary">
                        <Icon name="message" size={15} />
                      </span>
                      <div>
                        <p className="text-sm font-semibold text-brand-ink">{r.author}</p>
                        <p className="text-[11px] text-brand-muted/70">{r.at}</p>
                      </div>
                    </div>
                    <p className="mt-3 text-sm leading-6 text-brand-muted">{r.text}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-5 rounded-xl bg-brand-canvas p-5 text-sm text-brand-muted">
                No department replies yet. New replies will appear here.
              </p>
            )}
            {role === "department" && (
              <div className="mt-6 border-t border-brand-border pt-6">
                <label className="field-label">Write a reply</label>
                <textarea
                  className="field min-h-24"
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  placeholder="Write a clear update for the student…"
                />
                <div className="mt-3 flex justify-end">
                  <Button variant="secondary" onClick={postReply}>
                    <Icon name="message" size={17} />
                    Post Reply
                  </Button>
                </div>
              </div>
            )}
          </section>
        </div>
        <aside className="space-y-6">
          {role === "department" && (
            <section className="card border-brand-border p-5 sm:p-6">
              <p className="eyebrow">MANAGEMENT PANEL</p>
              <h3 className="mt-2 font-bold text-brand-ink">Update complaint</h3>
              {notice && (
                <div className="mt-4">
                  <Alert
                    type={
                      notice.startsWith("Update") || notice.startsWith("Reply")
                        ? "success"
                        : "error"
                    }
                  >
                    {notice}
                  </Alert>
                </div>
              )}
              <label className="field-label mt-5">Status</label>
              <select
                className="field"
                value={status}
                onChange={(e) => {
                  setStatus(e.target.value as Status);
                  setNotice("");
                }}
              >
                <option>Pending</option>
                <option>In Progress</option>
                <option>Resolved</option>
                <option>Rejected</option>
              </select>
              <label className="field-label mt-5">
                {status === "Rejected"
                  ? "Rejection reason *"
                  : status === "Resolved"
                    ? "Resolution note"
                    : "Internal remark"}
              </label>
              <textarea
                className="field min-h-24"
                value={remark}
                onChange={(e) => setRemark(e.target.value)}
                placeholder={
                  status === "Rejected"
                    ? "Explain why this is being rejected…"
                    : status === "Resolved"
                      ? "Describe how the issue was resolved…"
                      : "Optional note about this update…"
                }
              />
              <Button className="mt-5 w-full" onClick={save}>
                Save Update
              </Button>
            </section>
          )}
          <section className="card p-5 sm:p-6">
            <h3 className="section-title">Activity timeline</h3>
            <p className="mt-2 text-xs text-brand-muted">A record of this complaint’s progress.</p>
            <div className="mt-6">
              <Timeline events={complaint.events} />
            </div>
          </section>
        </aside>
      </div>
      {confirm && (
        <div className="modal-backdrop">
          <div className="modal">
            <span
              className={`mx-auto grid h-12 w-12 place-items-center rounded-full ${confirm === "Rejected" ? "bg-rose-50 text-rose-600" : "bg-emerald-50 text-emerald-600"}`}
            >
              <Icon name={confirm === "Rejected" ? "alert" : "check"} />
            </span>
            <h3 className="mt-4 text-center text-lg font-bold">
              {confirm === "Rejected" ? "Reject this complaint?" : "Mark as resolved?"}
            </h3>
            <p className="mt-2 text-center text-sm leading-6 text-brand-muted">
              {confirm === "Rejected"
                ? "The student will see your reason and the complaint will close."
                : "The student will see the resolution note and updated timeline."}
            </p>
            <div className="mt-6 flex gap-3">
              <Button variant="secondary" className="flex-1" onClick={() => setConfirm(null)}>
                Cancel
              </Button>
              <Button
                variant={confirm === "Rejected" ? "danger" : "primary"}
                className="flex-1"
                onClick={applyStatus}
              >
                Confirm {confirm}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function InfoBlock({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-medium text-brand-muted/70">{label}</p>
      <p className="mt-1 text-sm font-semibold leading-5 text-brand-ink">{value}</p>
    </div>
  );
}

function AdminDashboard({
  department,
  complaints,
  onOpen,
}: {
  department: string;
  complaints: Complaint[];
  onOpen: (c: Complaint) => void;
}) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("All");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const rows = complaints;
  const inboxCategories = Array.from(new Set(rows.map((complaint) => complaint.category)));
  const filtered = rows.filter(
    (c) =>
      (filter === "All" || c.status === filter) &&
      (categoryFilter === "All" || c.category === categoryFilter) &&
      `${c.id} ${c.title} ${c.student}`.toLowerCase().includes(query.toLowerCase()),
  );
  const counts = (s: Status) => rows.filter((c) => c.status === s).length;
  return (
    <>
      <PageHeader
        eyebrow="DEPARTMENT ADMINISTRATION"
        title="Complaint management"
        description="Review, respond to, and resolve complaints routed to your team."
        action={
          <div className="inline-flex items-center gap-2 rounded-lg border border-brand-border bg-brand-mint px-3 py-2 text-xs font-bold text-brand-primary">
            <Icon name="shield" size={16} />
            {department}
          </div>
        }
      />
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-5">
        <StatCard label="Total" value={rows.length} />
        <StatCard label="Pending" value={counts("Pending")} status="Pending" />
        <StatCard label="In Progress" value={counts("In Progress")} status="In Progress" />
        <StatCard label="Resolved" value={counts("Resolved")} status="Resolved" />
        <StatCard label="Rejected" value={counts("Rejected")} status="Rejected" />
      </div>
      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_280px]">
        <section className="card order-2 xl:order-1">
          <div className="card-header flex-col !items-stretch gap-4 sm:flex-row sm:!items-center">
            <div>
              <h3 className="font-bold text-brand-ink">Complaint inbox</h3>
              <p className="mt-1 text-xs text-brand-muted">
                Current and previously handled complaints
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="search-field">
                <Icon name="search" size={17} />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search ID or title"
                />
              </div>
              <select
                className="select-field"
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
              >
                <option>All</option>
                {inboxCategories.map((category) => (
                  <option key={category}>{category}</option>
                ))}
              </select>
              <select
                className="select-field"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
              >
                <option>All</option>
                <option>Pending</option>
                <option>In Progress</option>
                <option>Resolved</option>
                <option>Rejected</option>
              </select>
            </div>
          </div>
          {filtered.length ? (
            <ComplaintsTable rows={filtered} onOpen={onOpen} admin />
          ) : (
            <EmptyState
              title="No matching complaints"
              text="Try another search or status filter."
            />
          )}
        </section>
        <section className="card order-1 p-5 xl:order-2">
          <h3 className="section-title">Status breakdown</h3>
          <div className="mt-6 flex h-32 items-end justify-around gap-3">
            {(["Pending", "In Progress", "Resolved", "Rejected"] as Status[]).map((s) => {
              const n = counts(s);
              return (
                <div className="flex flex-1 flex-col items-center" key={s}>
                  <span className="mb-2 text-xs font-bold text-brand-muted">{n}</span>
                  <div
                    className={`w-full max-w-9 rounded-t ${s === "Pending" ? "bg-amber-400" : s === "In Progress" ? "bg-blue-500" : s === "Resolved" ? "bg-emerald-500" : "bg-rose-500"}`}
                    style={{ height: `${Math.max(12, n * 28)}px` }}
                  />
                  <span className="mt-2 text-center text-[10px] leading-3 text-brand-muted">
                    {s}
                  </span>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </>
  );
}

function SuperDashboard({
  complaints,
  categories,
  departments,
  onOpen,
}: {
  complaints: Complaint[];
  categories: ManagedCategory[];
  departments: ManagedDepartment[];
  onOpen: (c: Complaint) => void;
}) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const [department, setDepartment] = useState("All");
  const [status, setStatus] = useState("All");
  const [recentOnly, setRecentOnly] = useState(false);
  const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const recent = complaints.filter((complaint) => Date.parse(complaint.createdAt) >= cutoff);
  const recurring = [...new Set(recent.map((complaint) => complaint.category))]
    .map((name) => [name, recent.filter((complaint) => complaint.category === name).length] as const)
    .sort((a, b) => b[1] - a[1]).slice(0, 5);
  const rows = complaints.filter(
    (c) =>
      (!recentOnly || Date.parse(c.createdAt) >= cutoff) &&
      (category === "All" || c.category === category) &&
      (department === "All" || c.department === department) &&
      (status === "All" || c.status === status) &&
      `${c.id} ${c.title}`.toLowerCase().includes(query.toLowerCase()),
  );
  const counts = (s: Status) => complaints.filter((c) => c.status === s).length;
  const categoryOptions = Array.from(
    new Set([...categories.map((item) => item.name), ...complaints.map((item) => item.category)]),
  );
  const deptCounts = departments.map((department) => ({
    id: department.id,
    name: departmentShort[department.name] || department.name,
    value: complaints.filter((c) => c.departmentId === department.id).length,
  }));
  const clear = () => {
    setRecentOnly(false);
    setQuery("");
    setCategory("All");
    setDepartment("All");
    setStatus("All");
  };
  return (
    <>
      <PageHeader
        eyebrow="CENTRAL OVERSIGHT"
        title="Campus overview"
        description="Monitor complaint activity and outcomes across all BIIT departments."
      />
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-5">
        <StatCard label="Total" value={complaints.length} />
        <StatCard label="Pending" value={counts("Pending")} status="Pending" />
        <StatCard label="In Progress" value={counts("In Progress")} status="In Progress" />
        <StatCard label="Resolved" value={counts("Resolved")} status="Resolved" />
        <StatCard label="Rejected" value={counts("Rejected")} status="Rejected" />
      </div>
      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(280px,.8fr)]">
        <section className="card p-5 sm:p-6">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="section-title">Complaints by Department</h3>
              <p className="mt-1 text-xs text-brand-muted">All submitted complaints</p>
            </div>
          </div>
              <div className="mt-8 flex h-48 items-end justify-around gap-4 border-b border-brand-border px-2">
                {deptCounts.map((d) => (
                  <div
                    className="group relative flex h-full flex-1 flex-col items-center justify-end"
                    key={d.id}
                  >
                    <span className="mb-2 text-xs font-bold text-brand-muted">{d.value}</span>
                    <div
                      className="w-full max-w-16 rounded-t-md bg-brand-primary transition hover:bg-brand-primary-hover"
                      style={{ height: `${4 + 140 * d.value / Math.max(1, ...deptCounts.map((entry) => entry.value))}px` }}
                    />
                    <span className="absolute bottom-full mb-2 hidden whitespace-nowrap rounded bg-brand-forest px-2 py-1 text-[10px] text-white group-hover:block">
                      {d.name}: {d.value}
                    </span>
                    <span className="-mb-8 mt-2 text-center text-[10px] font-medium leading-3 text-brand-muted">
                      {d.name}
                    </span>
                  </div>
                ))}
              </div>
              <div className="h-8" />

        </section>
        <section className="card p-5 sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="section-title">Recurring Issues</h3>
              <p className="mt-1 text-xs text-brand-muted">Last 7 days</p>
            </div>
          </div>
          <div className="mt-5 space-y-4">
            {recurring.length === 0 && <p className="text-sm text-brand-muted">No complaints in the last seven days.</p>}
            {recurring.map(([name, n]) => (
              <button
                key={name}
                onClick={() => { clear(); setCategory(name); setRecentOnly(true); }}
                className="block w-full text-left"
              >
                <div className="flex justify-between text-xs">
                  <span className="font-medium text-brand-muted">{name}</span>
                  <span className="font-bold text-brand-ink">{n}</span>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-brand-canvas">
                  <div
                    className="h-full rounded-full bg-brand-primary"
                    style={{ width: `${100 * n / recurring[0][1]}%` }}
                  />
                </div>
              </button>
            ))}
          </div>
          <button
            onClick={() => { clear(); setRecentOnly(true); }}
            className="mt-6 text-sm font-semibold text-brand-primary"
          >
            View Complaints →
          </button>
        </section>
      </div>
      <section className="card mt-6">
        <div className="card-header block">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-brand-ink">All complaints{recentOnly ? " · last seven days" : ""}</h3>
              <p className="mt-1 text-xs text-brand-muted">Read-only central complaint view</p>
            </div>
            <button onClick={clear} className="text-sm font-semibold text-brand-primary">
              Clear Filters
            </button>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="search-field">
              <Icon name="search" size={17} />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search ID or title"
              />
            </div>
            <select
              className="select-field"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option>All</option>
              {categoryOptions.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
            <select
              className="select-field"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
            >
              <option>All</option>
              {departments.map((item) => (
                <option key={item.id}>{item.name}</option>
              ))}
            </select>
            <select
              className="select-field"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option>All</option>
              <option>Pending</option>
              <option>In Progress</option>
              <option>Resolved</option>
              <option>Rejected</option>
            </select>
          </div>
        </div>
        {rows.length ? (
          <ComplaintsTable rows={rows} onOpen={onOpen} admin />
        ) : (
          <EmptyState
            title="No complaints match these filters"
            text="Clear one or more filters to see more complaints."
            action={
              <Button variant="secondary" onClick={clear}>
                Clear Filters
              </Button>
            }
          />
        )}
      </section>
    </>
  );
}

function CategoryDialog({
  categories,
  departments,
  initial,
  lockedDepartment,
  onClose,
  onSave,
}: {
  categories: ManagedCategory[];
  departments: ManagedDepartment[];
  initial?: ManagedCategory;
  lockedDepartment?: string;
  onClose: () => void;
  onSave: (category: ManagedCategory) => Promise<void>;
}) {
  const [form, setForm] = useState({
    name: initial?.name || "",
    description: initial?.description || "",
    department: lockedDepartment || initial?.department || "",
  });
  const [submitted, setSubmitted] = useState(false);
  const duplicate = categories.some(
    (category) =>
      category.id !== initial?.id &&
      category.department === form.department &&
      category.name.trim().toLowerCase() === form.name.trim().toLowerCase(),
  );
  const [saveError, setSaveError] = useState("");
  const save = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitted(true);
    if (!form.name.trim() || !form.department || duplicate) return;
    try {
      await onSave({
      id: initial?.id || `cat-${Date.now()}`,
      name: form.name.trim(),
      description: form.description.trim(),
      department: form.department,
      active: initial?.active ?? true,
    });
      onClose();
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "Could not save.");
    }
  };
  return (
    <div className="modal-backdrop">
      <form onSubmit={save} className="modal max-w-md" noValidate>
        {saveError && <p role="alert" className="text-rose-700">{saveError}</p>}
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="eyebrow">{initial ? "EDIT CATEGORY" : "NEW CATEGORY"}</p>
            <h3 className="font-display mt-2 text-xl font-bold text-brand-ink">
              {initial ? "Update category" : "Add complaint category"}
            </h3>
          </div>
          <button type="button" onClick={onClose} className="icon-button" aria-label="Close dialog">
            <Icon name="close" size={18} />
          </button>
        </div>
        <div className="mt-6">
          <Field
            label="Category Name"
            value={form.name}
            onChange={(name) => setForm({ ...form, name })}
            placeholder="e.g. Campus Wi-Fi"
            error={
              submitted && !form.name.trim()
                ? "Category name is required."
                : submitted && duplicate
                  ? "This category already exists in the selected department."
                  : ""
            }
          />
          <Field
            textarea
            label="Description (optional)"
            value={form.description}
            onChange={(description) => setForm({ ...form, description })}
            placeholder="Describe the issues covered by this category."
          />
          <label className="mb-5 block">
            <span className="field-label">Assigned Department</span>
            {lockedDepartment ? (
              <div className="readonly-field">{lockedDepartment}</div>
            ) : (
              <select
                className={`field ${submitted && !form.department ? "field-error" : ""}`}
                value={form.department}
                onChange={(event) => setForm({ ...form, department: event.target.value })}
              >
                <option value="">Select department</option>
                {departments
                  .filter(
                    (department) => department.active || department.name === initial?.department,
                  )
                  .map((department) => (
                    <option key={department.id}>{department.name}</option>
                  ))}
              </select>
            )}
            {submitted && !form.department && (
              <span className="error-text">Choose a department.</span>
            )}
          </label>
          {duplicate && form.name.trim() && (
            <Alert>This category name is already assigned to {form.department}.</Alert>
          )}
        </div>
        <div className="mt-6 grid grid-cols-2 gap-3">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit">Save Category</Button>
        </div>
      </form>
    </div>
  );
}

function ComplaintCategoriesPage({
  categories,
  departments,
  onSave,
  onToggle,
}: {
  categories: ManagedCategory[];
  departments: ManagedDepartment[];
  onSave: (category: ManagedCategory) => Promise<void>;
  onToggle: (id: string) => void;
}) {
  const [department, setDepartment] = useState("All");
  const [dialog, setDialog] = useState<ManagedCategory | "new" | null>(null);
  const [confirmDeactivate, setConfirmDeactivate] = useState<ManagedCategory | null>(null);
  const rows = categories.filter(
    (category) => department === "All" || category.department === department,
  );
  return (
    <>
      <PageHeader
        eyebrow="SUPER ADMIN"
        title="Complaint Categories"
        description="Manage the categories students use and their department routing."
        action={
          <Button onClick={() => setDialog("new")}>
            <Icon name="plus" size={18} />
            Add Category
          </Button>
        }
      />
      <section className="card overflow-hidden">
        <div className="card-header flex-col gap-4 sm:flex-row">
          <div>
            <h3 className="font-bold text-brand-ink">Category directory</h3>
            <p className="mt-1 text-xs text-brand-muted">
              {rows.length} categor{rows.length === 1 ? "y" : "ies"} shown
            </p>
          </div>
          <select
            className="select-field"
            value={department}
            onChange={(event) => setDepartment(event.target.value)}
            aria-label="Filter categories by department"
          >
            <option>All</option>
            {departments.map((item) => (
              <option key={item.id}>{item.name}</option>
            ))}
          </select>
        </div>
        <div className="hidden overflow-x-auto md:block">
          <table className="data-table">
            <thead>
              <tr>
                <th>Category Name</th>
                <th>Assigned Department</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((category) => (
                <tr key={category.id}>
                  <td>
                    <p className="font-semibold text-brand-ink">{category.name}</p>
                    {category.description && (
                      <p className="mt-1 max-w-sm text-xs text-brand-muted">
                        {category.description}
                      </p>
                    )}
                  </td>
                  <td className="text-sm text-brand-muted">{category.department}</td>
                  <td>
                    <span
                      className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold ring-1 ring-inset ${
                        category.active
                          ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
                          : "bg-brand-canvas text-brand-muted ring-brand-border"
                      }`}
                    >
                      {category.active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td>
                    <div className="flex gap-3">
                      <button
                        onClick={() => setDialog(category)}
                        className="text-xs font-semibold text-brand-primary hover:underline"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() =>
                          category.active ? setConfirmDeactivate(category) : onToggle(category.id)
                        }
                        className={`text-xs font-semibold ${category.active ? "text-rose-600" : "text-brand-primary"}`}
                      >
                        {category.active ? "Deactivate" : "Reactivate"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="grid gap-3 p-4 md:hidden">
          {rows.map((category) => (
            <div key={category.id} className="rounded-xl border border-brand-border p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-brand-ink">{category.name}</p>
                  <p className="mt-1 text-xs leading-5 text-brand-muted">{category.department}</p>
                </div>
                <span
                  className={`rounded-full px-2 py-1 text-[10px] font-bold ${
                    category.active
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-brand-canvas text-brand-muted"
                  }`}
                >
                  {category.active ? "Active" : "Inactive"}
                </span>
              </div>
              <div className="mt-4 flex gap-4 border-t border-brand-border pt-3">
                <button
                  onClick={() => setDialog(category)}
                  className="text-xs font-semibold text-brand-primary"
                >
                  Edit
                </button>
                <button
                  onClick={() =>
                    category.active ? setConfirmDeactivate(category) : onToggle(category.id)
                  }
                  className={`text-xs font-semibold ${category.active ? "text-rose-600" : "text-brand-primary"}`}
                >
                  {category.active ? "Deactivate" : "Reactivate"}
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>
      {dialog && (
        <CategoryDialog
          categories={categories}
          departments={departments}
          initial={dialog === "new" ? undefined : dialog}
          onSave={onSave}
          onClose={() => setDialog(null)}
        />
      )}
      {confirmDeactivate && (
        <div className="modal-backdrop">
          <div className="modal">
            <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-rose-50 text-rose-600">
              <Icon name="alert" />
            </span>
            <h3 className="font-display mt-4 text-center text-lg font-bold text-brand-ink">
              Deactivate this category?
            </h3>
            <p className="mt-2 text-center text-sm leading-6 text-brand-muted">
              Students will no longer see “{confirmDeactivate.name}” in new complaint forms.
              Existing complaints will keep their category and department.
            </p>
            <div className="mt-6 grid grid-cols-2 gap-3">
              <Button variant="secondary" onClick={() => setConfirmDeactivate(null)}>
                Cancel
              </Button>
              <Button
                variant="danger"
                onClick={() => {
                  onToggle(confirmDeactivate.id);
                  setConfirmDeactivate(null);
                }}
              >
                Deactivate
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function DepartmentDialog({
  departments,
  initial,
  onClose,
  onSave,
}: {
  departments: ManagedDepartment[];
  initial?: ManagedDepartment;
  onClose: () => void;
  onSave: (department: ManagedDepartment) => Promise<void>;
}) {
  const [form, setForm] = useState({
    name: initial?.name || "",
    description: initial?.description || "",
  });
  const [submitted, setSubmitted] = useState(false);
  const duplicate = departments.some(
    (department) =>
      department.id !== initial?.id &&
      department.name.trim().toLowerCase() === form.name.trim().toLowerCase(),
  );
  const [saveError, setSaveError] = useState("");
  const save = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitted(true);
    if (!form.name.trim() || duplicate) return;
    try {
      await onSave({
      id: initial?.id || `dept-${Date.now()}`,
      name: form.name.trim(),
      description: form.description.trim(),
      active: initial?.active ?? true,
    });
      onClose();
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "Could not save.");
    }
  };
  return (
    <div className="modal-backdrop">
      <form onSubmit={save} className="modal max-w-md" noValidate>
        {saveError && <p role="alert" className="text-rose-700">{saveError}</p>}
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="eyebrow">{initial ? "EDIT DEPARTMENT" : "NEW DEPARTMENT"}</p>
            <h3 className="font-display mt-2 text-xl font-bold text-brand-ink">
              {initial ? "Update department" : "Create department"}
            </h3>
          </div>
          <button type="button" onClick={onClose} className="icon-button" aria-label="Close dialog">
            <Icon name="close" size={18} />
          </button>
        </div>
        <div className="mt-6">
          <Field
            label="Department Name"
            value={form.name}
            onChange={(name) => setForm({ ...form, name })}
            placeholder="e.g. Campus Facilities"
            error={
              submitted && !form.name.trim()
                ? "Department name is required."
                : submitted && duplicate
                  ? "A department with this name already exists."
                  : ""
            }
          />
          <Field
            textarea
            label="Description (optional)"
            value={form.description}
            onChange={(description) => setForm({ ...form, description })}
            placeholder="Describe this department’s responsibilities."
          />
          {duplicate && form.name.trim() && (
            <Alert>A department with this name already exists.</Alert>
          )}
        </div>
        <div className="mt-6 grid grid-cols-2 gap-3">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit">{initial ? "Save Changes" : "Create Department"}</Button>
        </div>
      </form>
    </div>
  );
}

function DepartmentsPage({
  departments,
  categories,
  accounts,
  onSave,
  onToggle,
  onSaveCategory,
  onCreateAdmin,
}: {
  departments: ManagedDepartment[];
  categories: ManagedCategory[];
  accounts: Account[];
  onSave: (department: ManagedDepartment) => Promise<void>;
  onToggle: (id: string) => void;
  onSaveCategory: (category: ManagedCategory) => Promise<void>;
  onCreateAdmin: (department: string) => void;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dialog, setDialog] = useState<ManagedDepartment | "new" | null>(null);
  const [categoryDialog, setCategoryDialog] = useState(false);
  const [confirmDeactivate, setConfirmDeactivate] = useState<ManagedDepartment | null>(null);
  const selected = departments.find((department) => department.id === selectedId);
  const saveDepartment = async (department: ManagedDepartment) => {
    await onSave(department);
    setSelectedId(department.id);
  };
  if (selected) {
    const departmentCategories = categories.filter(
      (category) => category.department === selected.name,
    );
    const departmentAdmins = accounts.filter(
      (account) => account.role === "department" && account.department === selected.name,
    );
    return (
      <>
        <button
          onClick={() => setSelectedId(null)}
          className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-brand-muted hover:text-brand-primary"
        >
          <Icon name="back" size={18} />
          Back to departments
        </button>
        <PageHeader
          eyebrow="DEPARTMENT DETAILS"
          title={selected.name}
          description={selected.description || "No department description has been added."}
          action={
            <span
              className={`w-fit rounded-full px-3 py-1.5 text-xs font-bold ${
                selected.active
                  ? "bg-emerald-50 text-emerald-700"
                  : "bg-brand-canvas text-brand-muted"
              }`}
            >
              {selected.active ? "Active" : "Inactive"}
            </span>
          }
        />
        {!selected.active && (
          <div className="mb-6">
            <Alert type="info">
              This department is inactive. Reactivate it before adding categories or administrators.
            </Alert>
          </div>
        )}
        <div className="grid gap-6 lg:grid-cols-2">
          <section className="card p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="section-title">Complaint categories</h3>
                <p className="mt-1 text-xs text-brand-muted">
                  {departmentCategories.filter((category) => category.active).length} active
                </p>
              </div>
              <Button
                variant="secondary"
                disabled={!selected.active}
                onClick={() => setCategoryDialog(true)}
              >
                <Icon name="plus" size={16} />
                Add Category
              </Button>
            </div>
            <div className="mt-5 space-y-2">
              {departmentCategories.length ? (
                departmentCategories.map((category) => (
                  <div
                    key={category.id}
                    className="flex items-center justify-between rounded-lg border border-brand-border px-3 py-3"
                  >
                    <span className="text-sm font-semibold text-brand-ink">{category.name}</span>
                    <span className="text-[10px] font-bold text-brand-muted">
                      {category.active ? "Active" : "Inactive"}
                    </span>
                  </div>
                ))
              ) : (
                <p className="rounded-lg bg-brand-canvas p-4 text-sm text-brand-muted">
                  No complaint categories yet.
                </p>
              )}
            </div>
          </section>
          <section className="card p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="section-title">Department administrators</h3>
                <p className="mt-1 text-xs text-brand-muted">{departmentAdmins.length} assigned</p>
              </div>
              <Button disabled={!selected.active} onClick={() => onCreateAdmin(selected.name)}>
                <Icon name="plus" size={16} />
                Create Department Admin
              </Button>
            </div>
            <div className="mt-5 space-y-2">
              {departmentAdmins.length ? (
                departmentAdmins.map((admin) => (
                  <div
                    key={admin.email}
                    className="rounded-lg border border-brand-border px-3 py-3"
                  >
                    <p className="text-sm font-semibold text-brand-ink">{admin.label}</p>
                    <p className="mt-1 text-xs text-brand-muted">{admin.email}</p>
                  </div>
                ))
              ) : (
                <p className="rounded-lg bg-brand-canvas p-4 text-sm text-brand-muted">
                  No administrators assigned yet.
                </p>
              )}
            </div>
          </section>
        </div>
        <div className="mt-6 flex flex-wrap gap-3">
          <Button variant="secondary" onClick={() => setDialog(selected)}>
            Edit Department
          </Button>
          <Button
            variant={selected.active ? "danger" : "secondary"}
            onClick={() =>
              selected.active ? setConfirmDeactivate(selected) : onToggle(selected.id)
            }
          >
            {selected.active ? "Deactivate Department" : "Reactivate Department"}
          </Button>
        </div>
        {categoryDialog && (
          <CategoryDialog
            categories={categories}
            departments={departments}
            lockedDepartment={selected.name}
            onSave={onSaveCategory}
            onClose={() => setCategoryDialog(false)}
          />
        )}
        {dialog && (
          <DepartmentDialog
            departments={departments}
            initial={dialog === "new" ? undefined : dialog}
            onSave={saveDepartment}
            onClose={() => setDialog(null)}
          />
        )}
        {confirmDeactivate && (
          <DepartmentDeactivateDialog
            department={confirmDeactivate}
            onCancel={() => setConfirmDeactivate(null)}
            onConfirm={() => {
              onToggle(confirmDeactivate.id);
              setConfirmDeactivate(null);
            }}
          />
        )}
      </>
    );
  }
  return (
    <>
      <PageHeader
        eyebrow="SUPER ADMIN"
        title="Departments"
        description="Manage campus teams, category routing, and administrator assignments."
        action={
          <Button onClick={() => setDialog("new")}>
            <Icon name="plus" size={18} />
            New Department
          </Button>
        }
      />
      <section className="card overflow-hidden">
        <div className="hidden overflow-x-auto md:block">
          <table className="data-table">
            <thead>
              <tr>
                <th>Department Name</th>
                <th>Status</th>
                <th>Active Categories</th>
                <th>Administrators</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {departments.map((department) => {
                const categoryCount = categories.filter(
                  (category) => category.department === department.name && category.active,
                ).length;
                const admins = accounts.filter(
                  (account) =>
                    account.role === "department" && account.department === department.name,
                );
                return (
                  <tr key={department.id} onClick={() => setSelectedId(department.id)}>
                    <td>
                      <p className="font-semibold text-brand-ink">{department.name}</p>
                      {department.description && (
                        <p className="mt-1 max-w-sm text-xs text-brand-muted">
                          {department.description}
                        </p>
                      )}
                    </td>
                    <td>
                      <span
                        className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${
                          department.active
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-brand-canvas text-brand-muted"
                        }`}
                      >
                        {department.active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="text-sm font-semibold text-brand-ink">{categoryCount}</td>
                    <td className="text-sm text-brand-muted">
                      {admins.length ? admins.map((admin) => admin.label).join(", ") : "None"}
                    </td>
                    <td>
                      <div className="flex gap-3">
                        <button
                          onClick={(event) => {
                            event.stopPropagation();
                            setDialog(department);
                          }}
                          className="text-xs font-semibold text-brand-primary"
                        >
                          Edit
                        </button>
                        <button
                          onClick={(event) => {
                            event.stopPropagation();
                            department.active
                              ? setConfirmDeactivate(department)
                              : onToggle(department.id);
                          }}
                          className={`text-xs font-semibold ${
                            department.active ? "text-rose-600" : "text-brand-primary"
                          }`}
                        >
                          {department.active ? "Deactivate" : "Reactivate"}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="grid gap-3 p-4 md:hidden">
          {departments.map((department) => (
            <button
              key={department.id}
              onClick={() => setSelectedId(department.id)}
              className="mobile-complaint-card text-left"
            >
              <div className="flex items-start justify-between gap-3">
                <p className="font-semibold text-brand-ink">{department.name}</p>
                <span className="text-[10px] font-bold text-brand-muted">
                  {department.active ? "Active" : "Inactive"}
                </span>
              </div>
              <p className="mt-3 text-xs text-brand-muted">
                {
                  categories.filter(
                    (category) => category.department === department.name && category.active,
                  ).length
                }{" "}
                active categories
              </p>
            </button>
          ))}
        </div>
      </section>
      {dialog && (
        <DepartmentDialog
          departments={departments}
          initial={dialog === "new" ? undefined : dialog}
          onSave={saveDepartment}
          onClose={() => setDialog(null)}
        />
      )}
      {confirmDeactivate && (
        <DepartmentDeactivateDialog
          department={confirmDeactivate}
          onCancel={() => setConfirmDeactivate(null)}
          onConfirm={() => {
            onToggle(confirmDeactivate.id);
            setConfirmDeactivate(null);
          }}
        />
      )}
    </>
  );
}

function DepartmentDeactivateDialog({
  department,
  onCancel,
  onConfirm,
}: {
  department: ManagedDepartment;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="modal-backdrop">
      <div className="modal">
        <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-rose-50 text-rose-600">
          <Icon name="alert" />
        </span>
        <h3 className="font-display mt-4 text-center text-lg font-bold text-brand-ink">
          Deactivate this department?
        </h3>
        <p className="mt-2 text-center text-sm leading-6 text-brand-muted">
          Categories assigned to “{department.name}” will be hidden from new complaints, and new
          administrators cannot be assigned. Historical complaints remain unchanged.
        </p>
        <div className="mt-6 grid grid-cols-2 gap-3">
          <Button variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
          <Button variant="danger" onClick={onConfirm}>
            Deactivate
          </Button>
        </div>
      </div>
    </div>
  );
}

function AdminDirectory({
  accounts,
  categories,
  departments,
  initialDepartment,
  onCreate,
  onReset,
  onSaveCategory,
  onSaveDepartment,
}: {
  accounts: Account[];
  categories: ManagedCategory[];
  departments: ManagedDepartment[];
  initialDepartment?: string;
  onCreate: (input: { name: string; email: string; department: string }) => Promise<Credentials>;
  onReset: (email: string) => Promise<Credentials>;
  onSaveCategory: (category: ManagedCategory) => Promise<void>;
  onSaveDepartment: (department: ManagedDepartment) => Promise<void>;
}) {
  const [adding, setAdding] = useState(Boolean(initialDepartment));
  const [submitted, setSubmitted] = useState(false);
  const [copied, setCopied] = useState(false);
  const [credentials, setCredentials] = useState<Credentials | null>(null);
  const [categoryDialog, setCategoryDialog] = useState(false);
  const [departmentDialog, setDepartmentDialog] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    department: initialDepartment || "",
  });
  const invalid = {
    name: !form.name.trim(),
    email: !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email),
    department: !form.department,
  };
  const [accountError, setAccountError] = useState("");
  const [working, setWorking] = useState(false);
  const create = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitted(true);
    if (working || Object.values(invalid).some(Boolean)) return;
    setAccountError("");
    setWorking(true);
    try {
      setCredentials(await onCreate(form));
      setCopied(false);
      setAdding(false);
      setSubmitted(false);
      setForm({ name: "", email: "", department: "" });
    } catch (error) {
      setAccountError(error instanceof Error ? error.message : "Could not create the account.");
    } finally {
      setWorking(false);
    }
  };
  const reset = async (email: string) => {
    if (!window.confirm("Issue a new temporary password and end this admin's existing sessions?")) return;
    setAccountError("");
    setWorking(true);
    try {
      setCredentials(await onReset(email));
      setCopied(false);
    } catch (error) {
      setAccountError(error instanceof Error ? error.message : "Could not reset the password.");
    } finally {
      setWorking(false);
    }
  };
  const copy = async () => {
    if (!credentials) return;
    await navigator.clipboard?.writeText(
      `CampusConnect\nEmail: ${credentials.email}\nTemporary password: ${credentials.password}`,
    );
    setCopied(true);
  };
  const admins = accounts.filter((account) => account.role === "department");
  return (
    <>
      <PageHeader
        eyebrow="ACCOUNT MANAGEMENT"
        title="Department administrators"
        description="Create and manage access for BIIT department teams."
        action={
          <Button onClick={() => setAdding(true)}>
            <Icon name="plus" size={18} />
            Add Department Admin
          </Button>
        }
      />
      {accountError && <p role="alert" className="mb-4 text-rose-700">{accountError}</p>}
      <div className={`grid gap-6 ${adding ? "xl:grid-cols-[minmax(0,1fr)_390px]" : ""}`}>
        <section className="card overflow-hidden">
          <div className="card-header">
            <div>
              <h3 className="font-bold text-brand-ink">Admin directory</h3>
              <p className="mt-1 text-xs text-brand-muted">{admins.length} active accounts</p>
            </div>
          </div>
          <div className="hidden overflow-x-auto md:block">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Administrator</th>
                  <th>Department</th>
                  <th>Access</th>
                </tr>
              </thead>
              <tbody>
                {admins.map((admin) => (
                  <tr key={admin.email}>
                    <td>
                      <p className="font-semibold text-brand-ink">{admin.label}</p>
                      <p className="mt-1 text-xs text-brand-muted">{admin.email}</p>
                    </td>
                    <td className="text-sm text-brand-muted">{admin.department}</td>
                    <td>
                      <span className="inline-flex rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700 ring-1 ring-emerald-200 ring-inset">
                        {admin.firstLogin ? "Password change pending" : "Active"}
                      </span>
                      <button type="button" className="text-link ml-2" disabled={working}
                        onClick={() => void reset(admin.email)}>Reset password</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="grid gap-3 p-4 md:hidden">
            {admins.map((admin) => (
              <div key={admin.email} className="rounded-xl border border-brand-border p-4">
                <p className="font-semibold text-brand-ink">{admin.label}</p>
                <p className="mt-1 text-xs text-brand-muted">{admin.email}</p>
                <button type="button" className="text-link mt-2" disabled={working}
                  onClick={() => void reset(admin.email)}>Reset password</button>
                <p className="mt-3 border-t border-brand-border pt-3 text-xs font-medium text-brand-muted">
                  {admin.department}
                </p>
              </div>
            ))}
          </div>
        </section>
        {adding && (
          <form onSubmit={create} className="card h-fit p-6" noValidate>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="eyebrow">NEW ACCOUNT</p>
                <h3 className="font-display mt-2 text-xl font-bold text-brand-ink">
                  Add administrator
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setAdding(false)}
                className="icon-button"
                aria-label="Close form"
              >
                <Icon name="close" size={18} />
              </button>
            </div>
            <div className="mt-6">
              <Field
                label="Full name"
                value={form.name}
                onChange={(name) => setForm({ ...form, name })}
                placeholder="Administrator name"
                error={submitted && invalid.name ? "Name is required." : ""}
              />
              <Field
                label="Email address"
                value={form.email}
                onChange={(email) => setForm({ ...form, email })}
                placeholder="name@biit.edu.pk"
                type="email"
                error={submitted && invalid.email ? "Enter a valid email." : ""}
              />
              <label className="mb-5 block">
                <span className="mb-2 flex items-center justify-between gap-3">
                  <span className="text-xs font-semibold text-brand-ink">Department</span>
                  <button
                    type="button"
                    onClick={() => setDepartmentDialog(true)}
                    className="text-xs font-semibold text-brand-primary hover:underline"
                  >
                    + New Department
                  </button>
                </span>
                <select
                  className={`field ${submitted && invalid.department ? "field-error" : ""}`}
                  value={form.department}
                  onChange={(event) => setForm({ ...form, department: event.target.value })}
                >
                  <option value="">Select department</option>
                  {departments
                    .filter((department) => department.active)
                    .map((department) => (
                      <option key={department.id}>{department.name}</option>
                    ))}
                </select>
                {submitted && invalid.department && (
                  <span className="error-text">Choose a department.</span>
                )}
              </label>
              {form.department && (
                <section className="mb-6 rounded-xl border border-brand-border bg-brand-canvas p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-bold text-brand-ink">
                        Complaint Categories for {form.department}
                      </p>
                      <p className="mt-1 text-xs leading-5 text-brand-muted">
                        Categories stay with this department if its administrator changes.
                      </p>
                    </div>
                    <Button
                      variant="secondary"
                      className="!min-h-9 shrink-0 !px-3"
                      onClick={() => setCategoryDialog(true)}
                    >
                      <Icon name="plus" size={15} />
                      Add Category
                    </Button>
                  </div>
                  <div className="mt-4 space-y-2">
                    {categories
                      .filter((category) => category.department === form.department)
                      .map((category) => (
                        <div
                          key={category.id}
                          className="flex items-center justify-between gap-3 rounded-lg border border-brand-border bg-white px-3 py-2.5"
                        >
                          <div>
                            <p className="text-xs font-semibold text-brand-ink">{category.name}</p>
                            {category.description && (
                              <p className="mt-0.5 line-clamp-1 text-[11px] text-brand-muted">
                                {category.description}
                              </p>
                            )}
                          </div>
                          <span
                            className={`text-[10px] font-bold ${category.active ? "text-emerald-700" : "text-brand-muted"}`}
                          >
                            {category.active ? "Active" : "Inactive"}
                          </span>
                        </div>
                      ))}
                  </div>
                </section>
              )}
            </div>
            <Button type="submit" disabled={working} className="w-full">
              Create Department Admin
            </Button>
          </form>
        )}
      </div>
      {credentials && (
        <div className="modal-backdrop">
          <div className="modal max-w-md">
            <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-emerald-50 text-emerald-600">
              <Icon name="check" />
            </span>
            <p className="eyebrow mt-5 text-center">ONE-TIME HANDOVER</p>
            <h3 className="font-display mt-2 text-center text-xl font-bold text-brand-ink">
              Department admin credentials
            </h3>
            <p className="mt-2 text-center text-sm leading-6 text-brand-muted">
              Share these credentials securely. They will not be shown again after you close this
              dialog.
            </p>
            <div className="mt-5 rounded-xl border border-brand-border bg-brand-mint p-4">
              <InfoRow label="Email" value={credentials.email} />
              <InfoRow label="Temporary password" value={credentials.password} />
              <InfoRow label="Department" value={credentials.department || ""} />
            </div>
            {copied && (
              <p className="mt-3 text-center text-xs font-semibold text-emerald-700">
                Credentials copied.
              </p>
            )}
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <Button variant="secondary" onClick={copy}>
                Copy Credentials
              </Button>
              <Button onClick={() => setCredentials(null)}>Done</Button>
            </div>
          </div>
        </div>
      )}
      {categoryDialog && form.department && (
        <CategoryDialog
          categories={categories}
          departments={departments}
          lockedDepartment={form.department}
          onSave={onSaveCategory}
          onClose={() => setCategoryDialog(false)}
        />
      )}
      {departmentDialog && (
        <DepartmentDialog
          departments={departments}
          onSave={async (department) => {
            await onSaveDepartment(department);
            setForm((current) => ({ ...current, department: department.name }));
          }}
          onClose={() => setDepartmentDialog(false)}
        />
      )}
    </>
  );
}

function PasswordScreen({
  firstLogin = false,
  onDone,
  onPasswordSaved,
}: {
  firstLogin?: boolean;
  onDone: () => void;
  onPasswordSaved: (current: string, password: string) => Promise<void>;
}) {
  const [form, setForm] = useState({ current: "", password: "", confirm: "" });
  const [submitted, setSubmitted] = useState(false);
  const [saved, setSaved] = useState(false);
  const invalid = {
    current: !firstLogin && !form.current,
    password: form.password.length < 8,
    confirm: form.password !== form.confirm,
  };
  const [saveError, setSaveError] = useState("");
  const [saving, setSaving] = useState(false);
  const save = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitted(true);
    if (saving || Object.values(invalid).some(Boolean)) return;
    setSaveError("");
    setSaving(true);
    try {
      await onPasswordSaved(form.current, form.password);
      setSaved(true);
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "Could not change the password.");
    } finally {
      setSaving(false);
    }
  };
  return (
    <div className="mx-auto max-w-xl">
      {!firstLogin && (
        <PageHeader
          eyebrow="ACCOUNT SECURITY"
          title="Change password"
          description="Choose a strong password you do not use elsewhere."
        />
      )}
      <section className="card p-6 sm:p-8">
        {firstLogin && (
          <div className="mb-7">
            <p className="eyebrow">FIRST SIGN IN</p>
            <h1 className="font-display mt-2 text-2xl font-bold text-brand-ink">
              Set your new password
            </h1>
            <p className="mt-2 text-sm leading-6 text-brand-muted">
              Replace your temporary password before opening the department dashboard.
            </p>
          </div>
        )}
        {saved ? (
          <div className="py-5 text-center">
            <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-emerald-50 text-emerald-600">
              <Icon name="check" size={26} />
            </span>
            <h2 className="font-display mt-4 text-xl font-bold text-brand-ink">Password updated</h2>
            <p className="mt-2 text-sm text-brand-muted">Your new password is ready to use.</p>
            <Button className="mt-6" onClick={onDone}>
              {firstLogin ? "Continue to Dashboard" : "Back to Dashboard"}
            </Button>
          </div>
        ) : (
          <form onSubmit={save} noValidate>
            {saveError && <p role="alert" className="text-rose-700">{saveError}</p>}
            {!firstLogin && (
              <Field
                label="Current password"
                type="password"
                value={form.current}
                onChange={(current) => setForm({ ...form, current })}
                placeholder="Enter current password"
                error={submitted && invalid.current ? "Current password is required." : ""}
              />
            )}
            <Field
              label="New password"
              type="password"
              value={form.password}
              onChange={(password) => setForm({ ...form, password })}
              placeholder="At least 8 characters"
              error={submitted && invalid.password ? "Use at least 8 characters." : ""}
            />
            <Field
              label="Confirm new password"
              type="password"
              value={form.confirm}
              onChange={(confirm) => setForm({ ...form, confirm })}
              placeholder="Repeat new password"
              error={submitted && invalid.confirm ? "Passwords do not match." : ""}
            />
            <Button type="submit" className="mt-2 w-full">
              Set New Password
            </Button>
          </form>
        )}
      </section>
    </div>
  );
}

function Unavailable({ expired = false, onBack }: { expired?: boolean; onBack: () => void }) {
  return (
    <div className="grid min-h-screen place-items-center bg-brand-canvas p-5">
      <div className="w-full max-w-md rounded-2xl border border-brand-border bg-white p-8 text-center shadow-sm">
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-brand-canvas text-brand-muted">
          <Icon name={expired ? "clock" : "shield"} size={27} />
        </span>
        <p className="eyebrow mt-6">{expired ? "SESSION ENDED" : "ACCESS RESTRICTED"}</p>
        <h1 className="font-display mt-2 text-2xl font-bold text-brand-ink">
          {expired ? "Please sign in again" : "Complaint unavailable"}
        </h1>
        <p className="mt-3 text-sm leading-6 text-brand-muted">
          {expired
            ? "Your session has expired to keep your account secure."
            : "You do not have permission to view this page, or it is not available to your account."}
        </p>
        <Button className="mt-7 w-full" onClick={onBack}>
          {expired ? "Go to Sign In" : "Back to Dashboard"}
        </Button>
      </div>
    </div>
  );
}

type Workspace = {
  account: Account;
  departments: ManagedDepartment[];
  categories: ManagedCategory[];
  complaints: Complaint[];
  accounts: Account[];
};

export default function App() {
  const [screen, setScreen] = useState<Screen>("login");
  const [account, setAccount] = useState<Account | null>(null);
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [selected, setSelected] = useState<Complaint | null>(null);
  const [preset, setPreset] = useState("");
  const [error, setError] = useState("");
  const [booting, setBooting] = useState(hasSession);
  const [opening, setOpening] = useState(false);

  async function refresh() {
    const data = await api<Workspace>("/workspace");
    setWorkspace(data);
    setAccount(data.account);
  }

  async function openId(id: string) {
    setOpening(true);
    setError("");
    try {
      setSelected(await api<Complaint>("/complaints/" + encodeURIComponent(id)));
      setScreen("detail");
      window.history.replaceState(null, "", "#complaints/" + encodeURIComponent(id));
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) setScreen("denied");
      else if (!(error instanceof ApiError && error.status === 401)) showError(error);
    } finally {
      setOpening(false);
    }
  }

  async function resume(user: Account) {
    setAccount(user);
    if (user.firstLogin) {
      setScreen("first-login-password");
      return;
    }
    await refresh();
    setScreen("dashboard");
    const match = location.hash.match(/^#complaints\/([A-Za-z0-9%-]+)$/);
    if (match) await openId(match[1]);
  }

  useEffect(() => {
    const expired = () => {
      setAccount(null);
      setWorkspace(null);
      setSelected(null);
      setScreen("expired");
    };
    window.addEventListener("campusconnect-session-expired", expired);
    if (hasSession()) {
      api<Account>("/auth/me").then(resume).catch((error) => {
        if (!(error instanceof ApiError && error.status === 401)) showError(error);
      }).finally(() => setBooting(false));
    }
    return () => window.removeEventListener("campusconnect-session-expired", expired);
  }, []);

  function showError(error: unknown) {
    setError(error instanceof Error ? error.message : "Could not complete the request.");
  }

  function navigate(next: Screen) {
    window.history.replaceState(null, "", location.pathname + location.search);
    setError("");
    setScreen(next);
    if (next === "dashboard") void refresh().catch(showError);
  }

  async function signIn(session: Session) {
    setError("");
    setToken(session.token);
    await resume(session.account);
  }

  async function changePassword(current: string, password: string) {
    const session = await api<Session>("/auth/password", "POST", { current, password });
    setToken(session.token);
    setAccount(session.account);
  }

  async function finishPassword() {
    try {
      await refresh();
      navigate("dashboard");
    } catch (error) {
      showError(error);
    }
  }

  function logout() {
    setToken("");
    setAccount(null);
    setWorkspace(null);
    setSelected(null);
    navigate("login");
  }

  async function updateComplaint(path: string, method: string, body: unknown) {
    if (!selected) return;
    const result = await api<Complaint>("/complaints/" + encodeURIComponent(selected.id) + path, method, body);
    setSelected(result);
    setWorkspace((previous) => previous && {
      ...previous, complaints: previous.complaints.map((item) => item.id === result.id ? result : item),
    });
  }

  async function submitComplaint(input: { title: string; categoryId: string; description: string; image: string }) {
    const result = await api<Complaint>("/complaints", "POST", input);
    setWorkspace((previous) => previous && { ...previous, complaints: [result, ...previous.complaints] });
    return result;
  }

  const saveCategory = async (category: ManagedCategory) => {
    await api("/categories/" + encodeURIComponent(category.id), "PUT", category);
    await refresh().catch(showError);
  };

  const saveDepartment = async (department: ManagedDepartment) => {
    await api("/departments/" + encodeURIComponent(department.id), "PUT", department);
    await refresh().catch(showError);
  };

  const issueCredentials = async (path: string, body: unknown) => {
    const credentials = await api<Credentials>(path, "POST", body);
    void refresh().catch(showError);
    return credentials;
  };

  if (booting) return <main className="grid min-h-screen place-items-center" role="status">Loading CampusConnect…</main>;
  if (screen === "expired") return <Unavailable expired onBack={logout} />;
  if (!account || screen === "login" || screen === "register") {
    return screen === "register"
      ? <Register onBack={() => setScreen("login")} onCreated={signIn} />
      : <Login onLogin={signIn} onRegister={() => setScreen("register")} />;
  }
  if (screen === "first-login-password") {
    return (
      <main className="grid min-h-screen place-items-center bg-brand-canvas px-5 py-10">
        <div className="w-full">
          <div className="mx-auto mb-8 flex max-w-xl justify-center"><Logo /></div>
          {error && <p className="mx-auto mb-4 max-w-xl text-rose-700" role="alert">{error}</p>}
          <PasswordScreen firstLogin onPasswordSaved={changePassword} onDone={() => void finishPassword()} />
        </div>
      </main>
    );
  }
  if (!workspace) {
    return (
      <main className="mx-auto max-w-lg space-y-4 p-8">
        <p role="alert">{error || "Could not load the CampusConnect workspace."}</p>
        <Button onClick={() => void resume(account).catch(showError)}>Retry</Button>
        <Button variant="secondary" onClick={logout}>Sign out</Button>
      </main>
    );
  }
  if (screen === "denied") return <Unavailable onBack={() => navigate("dashboard")} />;

  const { role, department } = account;
  const { departments, categories, complaints, accounts } = workspace;
  const titles: Partial<Record<Screen, string>> = {
    detail: "Complaint Details",
    new: "New Complaint",
    "admin-directory": "Admin Directory",
    "complaint-categories": "Complaint Categories",
    departments: "Departments",
    "change-password": "Change Password",
  };
  const open = (item: Complaint) => { void openId(item.id); };
  const toggleCategory = (id: string) => {
    const category = categories.find((item) => item.id === id);
    if (category) void saveCategory({ ...category, active: !category.active }).catch(showError);
  };
  const toggleDepartment = (id: string) => {
    const department = departments.find((item) => item.id === id);
    if (department) void saveDepartment({ ...department, active: !department.active }).catch(showError);
  };

  return (
    <Shell role={role} name={account.label} department={department} title={titles[screen] || "Dashboard"}
      screen={screen} onLogout={logout} onNavigate={(next) => {
        if (next === "admin-directory") setPreset("");
        navigate(next);
      }}>
      {error && <p role="alert" className="mb-4 rounded-lg bg-rose-50 p-3 text-rose-700">{error}</p>}
      {opening && <p role="status" className="mb-4">Loading complaint…</p>}
      {screen === "new" && role === "student" && (
        <NewComplaint categories={categories} departments={departments}
          onCancel={() => navigate("dashboard")} onSubmit={submitComplaint} onOpen={open} />
      )}
      {screen === "detail" && selected && (
        <ComplaintDetail key={selected.id} complaint={selected} role={role}
          onBack={() => navigate("dashboard")} onUpdate={updateComplaint} />
      )}
      {screen === "dashboard" && role === "student" && (
        <StudentDashboard complaints={complaints} onNew={() => { navigate("new"); void refresh().catch(showError); }} onOpen={open} />
      )}
      {screen === "dashboard" && role === "department" && department && (
        <AdminDashboard department={department} complaints={complaints} onOpen={open} />
      )}
      {screen === "dashboard" && role === "super" && (
        <SuperDashboard complaints={complaints} categories={categories} departments={departments} onOpen={open} />
      )}
      {screen === "dashboard" && (
        <div className="mt-5"><Button variant="secondary" onClick={() => void refresh().catch(showError)}>Refresh complaints</Button></div>
      )}
      {screen === "admin-directory" && role === "super" && (
        <AdminDirectory accounts={accounts} categories={categories} departments={departments}
          initialDepartment={preset} onSaveCategory={saveCategory} onSaveDepartment={saveDepartment}
          onCreate={(input) => issueCredentials("/admins", input)}
          onReset={(email) => issueCredentials("/admins/reset-password", { email })} />
      )}
      {screen === "complaint-categories" && role === "super" && (
        <ComplaintCategoriesPage categories={categories} departments={departments}
          onSave={saveCategory} onToggle={toggleCategory} />
      )}
      {screen === "departments" && role === "super" && (
        <DepartmentsPage departments={departments} categories={categories} accounts={accounts}
          onSave={saveDepartment} onToggle={toggleDepartment} onSaveCategory={saveCategory}
          onCreateAdmin={(name) => { setPreset(name); navigate("admin-directory"); }} />
      )}
      {screen === "change-password" && role !== "student" && (
        <PasswordScreen onPasswordSaved={changePassword} onDone={() => navigate("dashboard")} />
      )}
    </Shell>
  );
}
