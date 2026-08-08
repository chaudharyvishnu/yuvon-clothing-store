import { useState } from "react";

import { useAuth } from "../../context/AuthContext";

const INITIAL_LOGIN_FORM = {
  username: "",
  password: "",
};

const INITIAL_REGISTER_FORM = {
  username: "",
  first_name: "",
  last_name: "",
  email: "",
  mobile: "",
  password: "",
  confirm_password: "",
};

function formatApiError(error) {
  if (!error?.data) {
    return (
      error?.message ||
      "Something went wrong. Please try again."
    );
  }

  if (typeof error.data === "string") {
    return error.data;
  }

  if (error.data.detail) {
    if (Array.isArray(error.data.detail)) {
      return error.data.detail.join(" ");
    }

    return String(error.data.detail);
  }

  return Object.entries(error.data)
    .map(([field, messages]) => {
      if (Array.isArray(messages)) {
        return `${field}: ${messages.join(" ")}`;
      }

      if (
        messages &&
        typeof messages === "object"
      ) {
        return `${field}: ${JSON.stringify(messages)}`;
      }

      return `${field}: ${String(messages)}`;
    })
    .join(" ");
}

function LoginDrawer() {
  const {
    isLoginOpen,
    closeLogin,
    login,
    register,
  } = useAuth();

  const [mode, setMode] = useState("login");

  const [loginForm, setLoginForm] = useState(
    INITIAL_LOGIN_FORM
  );

  const [registerForm, setRegisterForm] = useState(
    INITIAL_REGISTER_FORM
  );

  const [showLoginPassword, setShowLoginPassword] =
    useState(false);

  const [
    showRegisterPassword,
    setShowRegisterPassword,
  ] = useState(false);

  const [
    showConfirmPassword,
    setShowConfirmPassword,
  ] = useState(false);

  const [submitting, setSubmitting] =
    useState(false);

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  if (!isLoginOpen) {
    return null;
  }

  const resetForms = () => {
    setLoginForm(INITIAL_LOGIN_FORM);
    setRegisterForm(INITIAL_REGISTER_FORM);
    setSubmitting(false);
    setError("");
    setMessage("");
    setShowLoginPassword(false);
    setShowRegisterPassword(false);
    setShowConfirmPassword(false);
  };

  const handleClose = () => {
    resetForms();
    setMode("login");
    closeLogin();
  };

  const changeMode = (nextMode) => {
    setMode(nextMode);
    setError("");
    setMessage("");
  };

  const handleLoginChange = (event) => {
    const { name, value } = event.target;

    setLoginForm((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const handleRegisterChange = (event) => {
    const { name, value } = event.target;

    let nextValue = value;

    if (name === "mobile") {
      nextValue = value
        .replace(/\D/g, "")
        .slice(0, 10);
    }

    setRegisterForm((current) => ({
      ...current,
      [name]: nextValue,
    }));
  };

  const validateLogin = () => {
    if (!loginForm.username.trim()) {
      return "Please enter your username.";
    }

    if (!loginForm.password) {
      return "Please enter your password.";
    }

    return "";
  };

  const validateRegister = () => {
    if (!registerForm.username.trim()) {
      return "Username is required.";
    }

    if (!registerForm.email.trim()) {
      return "Email address is required.";
    }

    if (!registerForm.mobile.trim()) {
      return "Mobile number is required.";
    }

    if (registerForm.mobile.length !== 10) {
      return "Please enter a valid 10-digit mobile number.";
    }

    if (registerForm.password.length < 6) {
      return "Password must be at least 6 characters.";
    }

    if (
      registerForm.password !==
      registerForm.confirm_password
    ) {
      return "Passwords do not match.";
    }

    return "";
  };

  const handleLogin = async (event) => {
    event.preventDefault();

    setError("");
    setMessage("");

    const validationError = validateLogin();

    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      setSubmitting(true);

      const response = await login(
        loginForm.username.trim(),
        loginForm.password
      );

      setMessage(
        response.message || "Login successful."
      );

      resetForms();
    } catch (loginError) {
      console.error(
        "Login error:",
        loginError
      );

      setError(
        formatApiError(loginError)
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleRegister = async (event) => {
    event.preventDefault();

    setError("");
    setMessage("");

    const validationError =
      validateRegister();

    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      setSubmitting(true);

      const response = await register({
        username:
          registerForm.username.trim(),

        first_name:
          registerForm.first_name.trim(),

        last_name:
          registerForm.last_name.trim(),

        email:
          registerForm.email
            .trim()
            .toLowerCase(),

        mobile:
          registerForm.mobile,

        password:
          registerForm.password,

        confirm_password:
          registerForm.confirm_password,
      });

      setMessage(
        response.message ||
          "Account created successfully."
      );

      resetForms();
    } catch (registerError) {
      console.error(
        "Register error:",
        registerError
      );

      setError(
        formatApiError(registerError)
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[1000] flex justify-end bg-black/40"
      onClick={handleClose}
    >
      <div
        className="h-full w-full overflow-y-auto bg-white shadow-2xl sm:w-[460px]"
        onClick={(event) =>
          event.stopPropagation()
        }
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-white p-5">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-600">
              Yuvon Account
            </p>

            <h2 className="mt-1 text-xl font-bold">
              {mode === "login"
                ? "Login"
                : "Create Account"}
            </h2>
          </div>

          <button
            type="button"
            onClick={handleClose}
            className="text-3xl font-light"
            aria-label="Close login drawer"
          >
            ×
          </button>
        </div>

        <div className="p-5 sm:p-7">
          <h3 className="text-2xl font-bold">
            {mode === "login"
              ? "Welcome back"
              : "Join Yuvon"}
          </h3>

          <p className="mt-2 text-gray-500">
            {mode === "login"
              ? "Login to manage orders, reviews, wishlist and saved addresses."
              : "Create your account to unlock the complete shopping experience."}
          </p>

          <div className="mt-6 grid grid-cols-2 overflow-hidden rounded-xl border">
            <button
              type="button"
              onClick={() =>
                changeMode("login")
              }
              className={`py-3 font-semibold transition ${
                mode === "login"
                  ? "bg-blue-600 text-white"
                  : "bg-white text-gray-700"
              }`}
            >
              Login
            </button>

            <button
              type="button"
              onClick={() =>
                changeMode("register")
              }
              className={`py-3 font-semibold transition ${
                mode === "register"
                  ? "bg-blue-600 text-white"
                  : "bg-white text-gray-700"
              }`}
            >
              Register
            </button>
          </div>

          {error && (
            <p className="mt-5 rounded-xl bg-red-50 p-4 text-sm text-red-600">
              {error}
            </p>
          )}

          {message && (
            <p className="mt-5 rounded-xl bg-green-50 p-4 text-sm text-green-700">
              {message}
            </p>
          )}

          {mode === "login" ? (
            <form
              onSubmit={handleLogin}
              className="mt-6 space-y-4"
            >
              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-700">
                  Username
                </label>

                <input
                  type="text"
                  name="username"
                  value={loginForm.username}
                  onChange={handleLoginChange}
                  autoComplete="username"
                  placeholder="Enter username"
                  className="w-full rounded-xl border px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-700">
                  Password
                </label>

                <div className="flex items-center rounded-xl border px-4">
                  <input
                    type={
                      showLoginPassword
                        ? "text"
                        : "password"
                    }
                    name="password"
                    value={
                      loginForm.password
                    }
                    onChange={
                      handleLoginChange
                    }
                    autoComplete="current-password"
                    placeholder="Enter password"
                    className="w-full py-3 outline-none"
                  />

                  <button
                    type="button"
                    onClick={() =>
                      setShowLoginPassword(
                        (current) => !current
                      )
                    }
                    className="ml-3 text-sm font-semibold text-blue-600"
                  >
                    {showLoginPassword
                      ? "Hide"
                      : "Show"}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-xl bg-blue-600 py-4 font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-400"
              >
                {submitting
                  ? "Logging in..."
                  : "Login"}
              </button>

              <p className="text-center text-sm text-gray-500">
                New to Yuvon?{" "}
                <button
                  type="button"
                  onClick={() =>
                    changeMode("register")
                  }
                  className="font-semibold text-blue-600"
                >
                  Create an account
                </button>
              </p>
            </form>
          ) : (
            <form
              onSubmit={handleRegister}
              className="mt-6 space-y-4"
            >
              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-700">
                  Username *
                </label>

                <input
                  type="text"
                  name="username"
                  value={
                    registerForm.username
                  }
                  onChange={
                    handleRegisterChange
                  }
                  autoComplete="username"
                  placeholder="Choose username"
                  className="w-full rounded-xl border px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-gray-700">
                    First Name
                  </label>

                  <input
                    type="text"
                    name="first_name"
                    value={
                      registerForm.first_name
                    }
                    onChange={
                      handleRegisterChange
                    }
                    autoComplete="given-name"
                    placeholder="First name"
                    className="w-full rounded-xl border px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-gray-700">
                    Last Name
                  </label>

                  <input
                    type="text"
                    name="last_name"
                    value={
                      registerForm.last_name
                    }
                    onChange={
                      handleRegisterChange
                    }
                    autoComplete="family-name"
                    placeholder="Last name"
                    className="w-full rounded-xl border px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-700">
                  Email *
                </label>

                <input
                  type="email"
                  name="email"
                  value={registerForm.email}
                  onChange={
                    handleRegisterChange
                  }
                  autoComplete="email"
                  placeholder="Enter email address"
                  className="w-full rounded-xl border px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-700">
                  Mobile Number *
                </label>

                <div className="flex items-center rounded-xl border px-4">
                  <span className="mr-3 text-gray-500">
                    +91
                  </span>

                  <input
                    type="text"
                    name="mobile"
                    inputMode="numeric"
                    maxLength={10}
                    value={
                      registerForm.mobile
                    }
                    onChange={
                      handleRegisterChange
                    }
                    autoComplete="tel"
                    placeholder="10-digit number"
                    className="w-full py-3 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-700">
                  Password *
                </label>

                <div className="flex items-center rounded-xl border px-4">
                  <input
                    type={
                      showRegisterPassword
                        ? "text"
                        : "password"
                    }
                    name="password"
                    value={
                      registerForm.password
                    }
                    onChange={
                      handleRegisterChange
                    }
                    autoComplete="new-password"
                    placeholder="Minimum 6 characters"
                    className="w-full py-3 outline-none"
                  />

                  <button
                    type="button"
                    onClick={() =>
                      setShowRegisterPassword(
                        (current) => !current
                      )
                    }
                    className="ml-3 text-sm font-semibold text-blue-600"
                  >
                    {showRegisterPassword
                      ? "Hide"
                      : "Show"}
                  </button>
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-700">
                  Confirm Password *
                </label>

                <div className="flex items-center rounded-xl border px-4">
                  <input
                    type={
                      showConfirmPassword
                        ? "text"
                        : "password"
                    }
                    name="confirm_password"
                    value={
                      registerForm.confirm_password
                    }
                    onChange={
                      handleRegisterChange
                    }
                    autoComplete="new-password"
                    placeholder="Enter password again"
                    className="w-full py-3 outline-none"
                  />

                  <button
                    type="button"
                    onClick={() =>
                      setShowConfirmPassword(
                        (current) => !current
                      )
                    }
                    className="ml-3 text-sm font-semibold text-blue-600"
                  >
                    {showConfirmPassword
                      ? "Hide"
                      : "Show"}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-xl bg-black py-4 font-bold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:bg-gray-400"
              >
                {submitting
                  ? "Creating Account..."
                  : "Create Account"}
              </button>

              <p className="text-center text-sm text-gray-500">
                Already have an account?{" "}
                <button
                  type="button"
                  onClick={() =>
                    changeMode("login")
                  }
                  className="font-semibold text-blue-600"
                >
                  Login
                </button>
              </p>
            </form>
          )}

          <p className="mt-6 text-center text-xs leading-5 text-gray-500">
            By continuing, you agree to our Terms,
            Privacy Policy and account usage policies.
          </p>
        </div>
      </div>
    </div>
  );
}

export default LoginDrawer;