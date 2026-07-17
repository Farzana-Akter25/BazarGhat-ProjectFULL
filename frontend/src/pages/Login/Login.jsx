import { ArrowLeft, Eye, EyeOff, Lock, Mail, User } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { useLoginMutation } from "../../features/auth/authSlice";
import { loginSuccess } from "../../features/auth/authSlice";

const Login = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [error, setError] = useState("");

  const [login, { isLoading }] = useLoginMutation();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    try {
      const result = await login(formData).unwrap();
      dispatch(loginSuccess({ user: result.user, token: result.token }));
      navigate("/");
    } catch (err) {
      setError(
        err?.data?.message || "Invalid email or password. Please try again."
      );
    }
  };

  return (
    <div className="bg-white font-sans text-gray-800 m-0 min-h-screen">
      {/* BACK BUTTON */}
      <button
        onClick={() => navigate(-1)}
        className="absolute left-4 top-4 flex items-center text-gray-500 hover:text-orange-500 transition"
      >
        <div className="bg-gray-100 p-2 rounded-full hover:bg-orange-50 transition">
          <ArrowLeft className="w-5 h-5" />
        </div>
        <span className="ml-2 font-medium hidden sm:block">Back</span>
      </button>

      {/* MAIN */}
      <main className="flex flex-col items-center justify-center py-16 px-4">
        {/* TITLE */}
        <div className="flex items-center mb-10 mt-6">
          <div className="bg-orange-500 p-4 rounded-2xl mr-4">
            <User className="text-white w-8 h-8" />
          </div>
          <div>
            <h2 className="text-3xl font-bold text-gray-700">Sign in</h2>
            <p className="text-sm text-gray-500">
              Access your account securely
            </p>
          </div>
        </div>

        {/* CARD */}
        <form
          onSubmit={handleSubmit}
          className="bg-white p-4 md:p-6 rounded-xl shadow-xl border flex flex-col gap-4 max-w-sm w-full"
        >
          <h3 className="text-base font-semibold">Login With Credentials</h3>

          {error && (
            <p className="text-sm text-red-500 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <div className="space-y-3">
            {/* EMAIL */}
            <div className="relative">
              <Mail className="absolute left-4 top-3 w-5 h-5 text-green-500" />
              <input
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                required
                className="w-full pl-12 py-2.5 border rounded-xl bg-gray-50"
                placeholder="Email"
              />
            </div>

            {/* PASSWORD */}
            <div className="relative">
              <Lock className="absolute left-4 top-3 w-5 h-5 text-green-500" />
              <input
                name="password"
                value={formData.password}
                onChange={handleChange}
                required
                className="w-full pl-12 pr-10 py-2.5 border rounded-xl bg-gray-50"
                placeholder="Password"
                type={showPassword ? "text" : "password"}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-3 text-gray-400"
              >
                {showPassword ? (
                  <EyeOff className="w-5 h-5" />
                ) : (
                  <Eye className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>

          {/* LOGIN BUTTON */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-orange-500 text-white py-2.5 mt-3 rounded-xl font-bold text-sm disabled:opacity-60"
          >
            {isLoading ? "Logging in..." : "Login"}
          </button>
        </form>

        {/* FOOTER */}
        <p className="mt-10 text-gray-600">
          Don't have an account?
          <Link to="/register" className="text-green-500 font-bold ml-1">
            Register now
          </Link>
        </p>
      </main>
    </div>
  );
};

export default Login;
