import { useState } from "react";
import axios from "axios";
import socket from "../socket";

if (typeof document !== "undefined" && !document.getElementById("wa-font")) {
  const l = document.createElement("link");
  l.id = "wa-font";
  l.rel = "stylesheet";
  l.href =
    "https://fonts.googleapis.com/css2?family=Noto+Sans:wght@400;500;600;700&display=swap";
  document.head.appendChild(l);
}

export default function Auth({ setUser }) {
  const [isLogin, setIsLogin] = useState(true);
  const [form, setForm] = useState({ username: "", email: "", password: "" });
  const [isAvailable, setIsAvailable] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState(null); // { text, ok }
  const url = "http://localhost:5000";

  const checkUsername = async (value) => {
    try {
      const res = await axios.get(`${url}/api/auth/check-username/${value}`);
      setIsAvailable(res.data.available);
    } catch {}
  };

  const handleSubmit = async () => {
    setMsg(null);
    if (!isLogin && isAvailable === false) {
      setMsg({ text: "Username is already taken.", ok: false });
      return;
    }
    setLoading(true);
    try {
      const endpoint = isLogin
        ? `${url}/api/auth/login`
        : `${url}/api/auth/register`;
      const res = await axios.post(endpoint, form);
      if (isLogin) {
        const user = res.data.user;
        setUser(user);
        socket.emit("join", user._id);
      } else {
        setMsg({ text: "Registered! Switching to login…", ok: true });
        setForm({ username: "", email: "", password: "" });
        setTimeout(() => {
          setMsg(null);
          setIsLogin(true);
          setIsAvailable(null);
        }, 1500);
      }
    } catch (err) {
      setMsg({
        text: err.response?.data?.message || "Something went wrong.",
        ok: false,
      });
    } finally {
      setLoading(false);
    }
  };

  const switchMode = () => {
    setIsLogin(!isLogin);
    setMsg(null);
    setIsAvailable(null);
    setForm({ username: "", email: "", password: "" });
  };

  const hint =
    !isLogin && form.username.length > 2
      ? isAvailable === true
        ? { ok: true, text: "✓ Username available" }
        : isAvailable === false
          ? { ok: false, text: "✗ Username taken" }
          : null
      : null;

  return (
    <>
      <style>{`
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
        .wa-auth-page{
          min-height:100svh;display:flex;flex-direction:column;
          align-items:center;justify-content:center;
          background:#111b21;padding:32px 16px;
          font-family:'Noto Sans','Segoe UI',system-ui,sans-serif;
        }
        .wa-auth-logo{display:flex;flex-direction:column;align-items:center;gap:10px;margin-bottom:28px;}
        .wa-logo-circle{
          width:76px;height:76px;border-radius:50%;background:#25d366;
          display:flex;align-items:center;justify-content:center;
        }
        .wa-auth-title{font-size:24px;font-weight:700;color:#e9edef;letter-spacing:-.3px;}
        .wa-auth-sub{font-size:13px;color:#8696a0;}
        .wa-auth-card{
          width:100%;max-width:340px;background:#202c33;
          border-radius:16px;padding:24px 20px;
        }
        .wa-tabs{display:flex;background:#111b21;border-radius:10px;padding:4px;margin-bottom:22px;}
        .wa-tab{
          flex:1;padding:9px 0;border:none;border-radius:8px;cursor:pointer;
          font-size:13px;font-weight:600;font-family:inherit;
          transition:background .18s,color .18s;
        }
        .wa-tab.active{background:#00a884;color:#111b21;}
        .wa-tab:not(.active){background:none;color:#8696a0;}
        .wa-field{margin-bottom:14px;}
        .wa-label{display:block;font-size:11px;font-weight:600;color:#00a884;letter-spacing:.05em;text-transform:uppercase;margin-bottom:6px;}
        .wa-input{
          width:100%;background:#2a3942;border:1.5px solid transparent;
          border-radius:10px;padding:11px 14px;font-size:14px;color:#e9edef;
          outline:none;font-family:inherit;transition:border-color .15s,background .15s;
        }
        .wa-input::placeholder{color:#8696a0;}
        .wa-input:focus{border-color:#00a884;background:#2f424e;}
        .wa-input.err{border-color:#f15c6d;}
        .wa-input.ok{border-color:#00a884;}
        .wa-pw-wrap{position:relative;}
        .wa-pw-wrap .wa-input{padding-right:42px;}
        .wa-pw-eye{
          position:absolute;right:12px;top:50%;transform:translateY(-50%);
          background:none;border:none;cursor:pointer;color:#8696a0;
          font-size:15px;line-height:1;padding:0;transition:color .15s;
        }
        .wa-pw-eye:hover{color:#e9edef;}
        .wa-hint{font-size:11px;margin-top:5px;padding-left:2px;}
        .wa-hint.ok{color:#00a884;}
        .wa-hint.err{color:#f15c6d;}
        .wa-msg{border-radius:8px;padding:10px 12px;font-size:13px;font-weight:500;margin-bottom:14px;}
        .wa-msg.ok{background:#0f2922;color:#25d366;border:1px solid #1a5e40;}
        .wa-msg.err{background:#2d1018;color:#f15c6d;border:1px solid #6e2020;}
        .wa-submit{
          width:100%;padding:13px;background:#00a884;border:none;border-radius:10px;
          color:#111b21;font-size:15px;font-weight:700;cursor:pointer;font-family:inherit;
          display:flex;align-items:center;justify-content:center;gap:8px;
          transition:background .15s,transform .1s,opacity .15s;
        }
        .wa-submit:hover:not(:disabled){background:#06cf9c;}
        .wa-submit:active:not(:disabled){transform:scale(.98);}
        .wa-submit:disabled{opacity:.6;cursor:not-allowed;}
        .wa-spinner{width:16px;height:16px;border:2.5px solid #111b2140;border-top-color:#111b21;border-radius:50%;animation:waSpin .7s linear infinite;flex-shrink:0;}
        @keyframes waSpin{to{transform:rotate(360deg)}}
        .wa-switch{text-align:center;margin-top:18px;font-size:13px;color:#8696a0;}
        .wa-switch-btn{background:none;border:none;color:#00a884;font-weight:600;cursor:pointer;font-size:13px;font-family:inherit;padding:0;margin-left:4px;transition:color .15s;}
        .wa-switch-btn:hover{color:#06cf9c;}
        .wa-footer{margin-top:24px;text-align:center;font-size:12px;color:#3b4a54;line-height:1.8;}
        .wa-footer a{color:#3b4a54;text-decoration:none;}
      `}</style>

      <div className="wa-auth-page">
        {/* LOGO */}
        <div className="wa-auth-logo">
          {/* <div className="wa-logo-circle">
            <svg width="42" height="42" viewBox="0 0 24 24" fill="white">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
              <path d="M12 0C5.373 0 0 5.373 0 12c0 2.126.556 4.123 1.529 5.856L0 24l6.335-1.51A11.955 11.955 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.882a9.877 9.877 0 01-5.031-1.378l-.36-.214-3.742.892.952-3.651-.235-.374A9.858 9.858 0 012.118 12C2.118 6.533 6.533 2.118 12 2.118c5.467 0 9.882 4.415 9.882 9.882 0 5.467-4.415 9.882-9.882 9.882z" />
            </svg>
          </div> */}
          <div className="wa-auth-title">ChatsApp</div>
          <div className="wa-auth-sub">
            {isLogin
              ? " What if whatsapp has a AI assistant? THIS IS OUR IDEA"
              : " What if whatsapp has a AI assistant? THIS IS OUR IDEA"}
          </div>
        </div>

        {/* CARD */}
        <div className="wa-auth-card">
          {/* Tab switcher */}
          <div className="wa-tabs">
            <button
              className={`wa-tab ${isLogin ? "active" : ""}`}
              onClick={() => isLogin || switchMode()}
            >
              Login
            </button>
            <button
              className={`wa-tab ${!isLogin ? "active" : ""}`}
              onClick={() => !isLogin || switchMode()}
            >
              Register
            </button>
          </div>

          {/* Message banner */}
          {msg && (
            <div className={`wa-msg ${msg.ok ? "ok" : "err"}`}>{msg.text}</div>
          )}

          {/* Username (register only) */}
          {!isLogin && (
            <div className="wa-field">
              <label className="wa-label">Username</label>
              <input
                className={`wa-input ${hint ? (hint.ok ? "ok" : "err") : ""}`}
                placeholder="Choose a username"
                value={form.username}
                onChange={(e) => {
                  const v = e.target.value;
                  setForm({ ...form, username: v });
                  setIsAvailable(null);
                  if (v.length > 2) checkUsername(v);
                }}
              />
              {hint && (
                <div className={`wa-hint ${hint.ok ? "ok" : "err"}`}>
                  {hint.text}
                </div>
              )}
            </div>
          )}

          {/* Email */}
          <div className="wa-field">
            <label className="wa-label">Email</label>
            <input
              className="wa-input"
              placeholder="Enter your email"
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </div>

          {/* Password */}
          <div className="wa-field">
            <label className="wa-label">Password</label>
            <div className="wa-pw-wrap">
              <input
                className="wa-input"
                placeholder="Enter your password"
                type={showPassword ? "text" : "password"}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSubmit();
                }}
              />
              <button
                className="wa-pw-eye"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
              >
                {showPassword ? "🙈" : "👁"}
              </button>
            </div>
          </div>

          {/* Submit */}
          <button
            className="wa-submit"
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="wa-spinner" />
                {isLogin ? "Signing in…" : "Registering…"}
              </>
            ) : (
              <>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="#111b21">
                  <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                </svg>
                {isLogin ? "Sign In" : "Create Account"}
              </>
            )}
          </button>

          {/* Switch link */}
          <div className="wa-switch">
            {isLogin ? "Don't have an account?" : "Already have an account?"}
            <button className="wa-switch-btn" onClick={switchMode}>
              {isLogin ? "Register" : "Sign in"}
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="wa-footer">
          &copy; {new Date().getFullYear()} ChatsApp <br></br> Developed by{" "}
          {"Greensky "}
        </div>
      </div>
    </>
  );
}
