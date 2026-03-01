  import { useState } from "react";
  import axios from "axios";

  const API = "https://ai-study-buddy-production-e464.up.railway.app/api";

  export default function Auth({ onLogin }) {
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    const handleSubmit = async () => {
      if (!email || !password) return;
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    setError("Please enter a valid email address.");
    return;
  }
  if (password.length < 8) {
    setError("Password must be at least 8 characters.");
    return;
  }
  if (!isLogin) {
    // Extra checks only for signup
    if (!/[A-Z]/.test(password)) {
      setError("Password must contain at least one uppercase letter.");
      return;
    }
    if (!/[0-9]/.test(password)) {
      setError("Password must contain at least one number.");
      return;
    }
    if (!/[!@#$%^&*]/.test(password)) {
      setError("Password must contain at least one special character (!@#$%^&*).");
      return;
    }
  }
      setLoading(true);
      setError("");
      setSuccess("");

      try {
        if (isLogin) {
          const res = await axios.post(`${API}/auth/login`, { email, password });
          localStorage.setItem("access_token", res.data.access_token);
          localStorage.setItem("user_email", res.data.email);
          onLogin(res.data.access_token, res.data.email);
        } else {
          await axios.post(`${API}/auth/signup`, { email, password });
          const res = await axios.post(`${API}/auth/login`, { email, password });
          localStorage.setItem("access_token", res.data.access_token);
          localStorage.setItem("user_email", res.data.email);
          onLogin(res.data.access_token, res.data.email);
        }
      } catch (err) {
        setError(err.response?.data?.detail || "Something went wrong.");
      } finally {
        setLoading(false);
      }
    };

    return (
      <div className="auth-container">
        <div className="auth-box">

          <div className="auth-logo">
            <div className="auth-logo-icon">📚</div>
          </div>

          <h1>Study<span>Buddy</span></h1>
          <p>{isLogin ? "Welcome back. Sign in to continue." : "Create your account to get started."}</p>

          {error && <div className="auth-error">{error}</div>}
          {success && <div className="auth-success">{success}</div>}

          <label className="auth-label">Email</label>
          <input
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          />

          <label className="auth-label">Password</label>
          <input
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          />

          <button className="auth-btn" onClick={handleSubmit} disabled={loading}>
            {loading ? "Please wait..." : isLogin ? "Sign In →" : "Create Account →"}
          </button>

          <div className="auth-divider"><span>or</span></div>

          <div className="auth-switch">
            {isLogin
              ? <>No account? <span onClick={() => { setIsLogin(false); setError(""); }}>Sign up free</span></>
              : <>Have an account? <span onClick={() => { setIsLogin(true); setError(""); }}>Sign in</span></>
            }
          </div>

        </div>
      </div>
    );
  }