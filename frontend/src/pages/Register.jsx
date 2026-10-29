import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../api/axios";

export default function Register() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", password: "", phone: "", houseId: "" });
  const [houses, setHouses] = useState([]);
  const [loadingHouses, setLoadingHouses] = useState(true);
  const [errors, setErrors] = useState([]);
  const [success, setSuccess] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showPass, setShowPass] = useState(false);

  useEffect(() => {
    api.get("/houses/available")
      .then((r) => setHouses(r.data.data.houses || []))
      .catch(() => setHouses([]))
      .finally(() => setLoadingHouses(false));
  }, []);

  const handleChange = (e) => setForm((p) => ({ ...p, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors([]);
    setSuccess("");
    setSubmitting(true);
    try {
      const res = await api.post("/auth/register", form);
      setSuccess(res.data.message);
    } catch (err) {
      const data = err.response?.data;
      setErrors(data?.errors?.length ? data.errors : [data?.message || "Registration failed."]);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-gray-50">
      {/* Left branding */}
      <div className="hidden lg:flex flex-1 bg-gradient-to-br from-indigo-700 via-indigo-600 to-purple-700 items-center justify-center p-12">
        <div className="text-white max-w-md">
          <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center text-3xl mb-8">🏘️</div>
          <h1 className="text-4xl font-bold mb-4">Join the Society</h1>
          <p className="text-indigo-200 text-lg leading-relaxed">
            Register as a resident to access the society management portal. Your account will be reviewed by the admin.
          </p>
          <div className="mt-10 space-y-4">
            {["Fill in your details", "Select your house", "Wait for admin approval", "Start using the portal"].map((step, i) => (
              <div key={step} className="flex items-center gap-3">
                <div className="w-7 h-7 bg-white/20 rounded-full flex items-center justify-center text-sm font-bold">{i + 1}</div>
                <p className="text-indigo-100">{step}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-bold text-xl">S</div>
            <span className="text-xl font-bold text-gray-900">SocietyMS</span>
          </div>

          <h2 className="text-2xl font-bold text-gray-900 mb-1">Create account</h2>
          <p className="text-gray-500 text-sm mb-8">Register as a resident</p>

          {success ? (
            <div className="p-4 bg-green-50 border border-green-200 rounded-xl text-center">
              <p className="text-3xl mb-3">✅</p>
              <p className="text-green-800 font-semibold text-sm">{success}</p>
              <button onClick={() => navigate("/login")} className="mt-4 text-indigo-600 text-sm font-medium hover:underline">
                Go to Login →
              </button>
            </div>
          ) : (
            <>
              {errors.length > 0 && (
                <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200">
                  {errors.map((e, i) => <p key={i} className="text-red-700 text-sm">• {e}</p>)}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Full Name</label>
                  <input
                    name="name" value={form.name} onChange={handleChange} required
                    placeholder="John Doe"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Email address</label>
                  <input
                    type="email" name="email" value={form.email} onChange={handleChange} required
                    placeholder="you@example.com"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Phone (optional)</label>
                  <input
                    name="phone" value={form.phone} onChange={handleChange}
                    placeholder="+92 300 0000000"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
                  <div className="relative">
                    <input
                      type={showPass ? "text" : "password"} name="password" value={form.password}
                      onChange={handleChange} required placeholder="Min 8 characters"
                      className="w-full px-4 py-2.5 pr-11 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                    <button type="button" onClick={() => setShowPass((p) => !p)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      {showPass ? "🙈" : "👁️"}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Select House</label>
                  {loadingHouses ? (
                    <div className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm text-gray-400">Loading houses...</div>
                  ) : (
                    <select
                      name="houseId" value={form.houseId} onChange={handleChange} required
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
                    >
                      <option value="">-- Select your house --</option>
                      {houses.map((h) => (
                        <option key={h._id} value={h._id}>
                          Block {h.block} - House {h.houseNumber}{h.address ? ` (${h.address})` : ""}
                        </option>
                      ))}
                    </select>
                  )}
                  {!loadingHouses && houses.length === 0 && (
                    <p className="text-xs text-orange-600 mt-1">No available houses. Contact admin.</p>
                  )}
                </div>

                <button
                  type="submit" disabled={submitting}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-semibold py-2.5 rounded-xl transition-all text-sm flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <>
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Registering...
                    </>
                  ) : "Register"}
                </button>
              </form>

              <p className="text-center text-sm text-gray-500 mt-6">
                Already have an account?{" "}
                <Link to="/login" className="text-indigo-600 font-medium hover:text-indigo-700">Sign in</Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
