import { ArrowLeft, Eye, EyeOff, Lock, Mail, Phone, User } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { useRegisterMutation } from "../../features/auth/authSlice";
import { loginSuccess } from "../../features/auth/authSlice";

const Register = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    password: "",
    password_confirmation: "",
    address: "",
  });

  const [register, { isLoading }] = useRegisterMutation();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!agreed) {
      setError("Please agree to the Terms & Privacy Policy.");
      return;
    }

    if (formData.password !== formData.password_confirmation) {
      setError("Passwords do not match.");
      return;
    }

    try {
      const result = await register({
        name: `${formData.first_name} ${formData.last_name}`.trim(),
        email: formData.email,
        phone: formData.phone,
        address: formData.address,
        password: formData.password,
        password_confirmation: formData.password_confirmation,
      }).unwrap();

      dispatch(loginSuccess({ user: result.user, token: result.token }));
      navigate("/");
    } catch (err) {
      const errors = err?.data?.errors;
      const firstError = errors
        ? Object.values(errors)[0]?.[0]
        : err?.data?.message;
      setError(firstError || "Registration failed. Please try again.");
    }
  };

  return (
    <div className="bg-white font-sans text-gray-800 min-h-screen relative">
      {/* BACK BUTTON */}
      <div className="absolute left-3 top-4 z-10">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center text-gray-500 hover:text-gray-800 bg-white/60 px-2 py-0.5 rounded-lg text-xs"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back
        </button>
      </div>

      {/* MAIN CONTENT */}
      <main className="flex flex-col items-center py-8 px-3 max-w-4xl mx-auto">
        {/* HEADER */}
        <div className="flex flex-col items-center mb-6 mt-3">
          <div className="bg-orange-500 p-3 rounded-xl mb-3 shadow-md">
            <User className="text-white w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-gray-900">Create Account</h2>
          <p className="text-gray-500 text-sm mt-1">
            Join us to start shopping
          </p>
        </div>

        {/* CARD */}
        <div className="bg-white rounded-2xl shadow-lg p-4 w-full max-w-md border border-gray-100">
          <form className="space-y-3" onSubmit={handleSubmit}>
            {error && (
              <p className="text-sm text-red-500 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            {/* NAME */}
            <div className="grid grid-cols-2 gap-2">
              <input
                name="first_name"
                type="text"
                value={formData.first_name}
                onChange={handleChange}
                required
                placeholder="First Name"
                className="border p-2 rounded-lg w-full bg-gray-50 focus:ring-2 focus:ring-green-500 outline-none text-sm"
              />
              <input
                name="last_name"
                type="text"
                value={formData.last_name}
                onChange={handleChange}
                placeholder="Last Name"
                className="border p-2 rounded-lg w-full bg-gray-50 focus:ring-2 focus:ring-green-500 outline-none text-sm"
              />
            </div>

            {/* EMAIL */}
            <div className="relative">
              <Mail className="absolute left-3 top-3.5 w-4 h-4 text-green-600" />
              <input
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                required
                placeholder="Email Address"
                className="w-full pl-10 p-2.5 border rounded-lg bg-gray-50 focus:ring-2 focus:ring-green-500 outline-none text-sm"
              />
            </div>

            {/* PHONE */}
            <div className="relative">
              <Phone className="absolute left-3 top-3.5 w-4 h-4 text-green-600" />
              <input
                name="phone"
                type="text"
                value={formData.phone}
                onChange={handleChange}
                placeholder="Phone Number"
                className="w-full pl-10 p-2.5 border rounded-lg bg-gray-50 focus:ring-2 focus:ring-green-500 outline-none text-sm"
              />
            </div>

            {/* PASSWORD */}
            <div className="relative">
              <Lock className="absolute left-3 top-3.5 w-4 h-4 text-green-600" />
              <input
                name="password"
                value={formData.password}
                onChange={handleChange}
                required
                minLength={6}
                type={showPassword ? "text" : "password"}
                placeholder="Password"
                className="w-full pl-10 pr-10 p-2.5 border rounded-lg bg-gray-50 focus:ring-2 focus:ring-green-500 outline-none text-sm"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-3 text-gray-400"
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>

            {/* CONFIRM PASSWORD */}
            <div className="relative">
              <Lock className="absolute left-3 top-3.5 w-4 h-4 text-green-600" />
              <input
                name="password_confirmation"
                value={formData.password_confirmation}
                onChange={handleChange}
                required
                minLength={6}
                type={showConfirmPassword ? "text" : "password"}
                placeholder="Confirm Password"
                className="w-full pl-10 pr-10 p-2.5 border rounded-lg bg-gray-50 focus:ring-2 focus:ring-green-500 outline-none text-sm"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-3 text-gray-400"
              >
                {showConfirmPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>

            {/* ADDRESS */}
            <textarea
              name="address"
              value={formData.address}
              onChange={handleChange}
              placeholder="Delivery Address"
              className="w-full p-2.5 border rounded-lg h-18 bg-gray-50 focus:ring-2 focus:ring-green-500 outline-none resize-none text-sm"
            />

            {/* TERMS */}
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                className="accent-green-600 w-4 h-4"
              />
              <label className="text-xs text-gray-600">
                I agree to Terms & Privacy Policy
              </label>
            </div>

            {/* BUTTON */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-orange-500 hover:bg-orange-600 text-white py-2.5 rounded-xl font-semibold text-sm shadow-md active:scale-95 transition disabled:opacity-60"
            >
              {isLoading ? "Creating Account..." : "Create Account"}
            </button>
          </form>

          {/* LOGIN */}
          <div className="text-center mt-6 pt-4 border-t text-sm">
            <p className="text-gray-600">
              Already have an account?
              <Link to="/login" className="text-green-600 font-semibold ml-1">
                Sign In
              </Link>
            </p>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Register;
