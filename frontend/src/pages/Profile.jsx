import {
  useEffect,
  useMemo,
  useState,
} from "react";

import { useAuth } from "../context/AuthContext";

import {
  changePassword,
  updateProfile,
} from "../services/api";


const BACKEND_URL =
  "http://127.0.0.1:8000";


const EMPTY_PASSWORD_FORM = {
  oldPassword: "",
  newPassword: "",
  confirmPassword: "",
};


/* =========================================================
   Image Helper
========================================================= */

function getImageUrl(image) {
  if (!image) {
    return "";
  }

  if (
    image.startsWith("http://") ||
    image.startsWith("https://") ||
    image.startsWith("blob:") ||
    image.startsWith("data:")
  ) {
    return image;
  }

  return `${BACKEND_URL}${
    image.startsWith("/")
      ? image
      : `/${image}`
  }`;
}


/* =========================================================
   API Error Helpers
========================================================= */

function formatApiError(
  errorData,
  parentKey = ""
) {
  if (!errorData) {
    return "";
  }

  if (
    typeof errorData ===
    "string"
  ) {
    return parentKey
      ? `${parentKey}: ${errorData}`
      : errorData;
  }

  if (
    Array.isArray(
      errorData
    )
  ) {
    return errorData
      .map(
        (
          item,
          index
        ) => {
          if (
            item &&
            typeof item ===
              "object"
          ) {
            return formatApiError(
              item,
              parentKey
                ? `${parentKey} ${
                    index + 1
                  }`
                : `Item ${
                    index + 1
                  }`
            );
          }

          return parentKey
            ? `${parentKey}: ${String(
                item
              )}`
            : String(item);
        }
      )
      .filter(Boolean)
      .join(" ");
  }

  if (
    typeof errorData ===
    "object"
  ) {
    return Object.entries(
      errorData
    )
      .map(
        ([key, value]) => {
          const label =
            parentKey
              ? `${parentKey}.${key}`
              : key;

          return formatApiError(
            value,
            label
          );
        }
      )
      .filter(Boolean)
      .join(" ");
  }

  return String(
    errorData
  );
}


function getErrorMessage(error) {
  return (
    formatApiError(
      error?.data
    ) ||
    error?.message ||
    "Something went wrong. Please try again."
  );
}


/* =========================================================
   Profile
========================================================= */

function Profile() {
  const {
    user,
    setUser,
    updateCurrentUser,
    refreshCurrentUser,
    isAdmin,
    isStaff,
    isSuperuser,
  } = useAuth();


  /* =======================================================
     Profile Form
  ======================================================= */

  const [
    profileForm,
    setProfileForm,
  ] = useState({
    first_name: "",
    last_name: "",
    email: "",
    mobile: "",
    profile_image: null,
  });

  const [
    profileImagePreview,
    setProfileImagePreview,
  ] = useState("");

  const [
    savingProfile,
    setSavingProfile,
  ] = useState(false);

  const [
    profileMessage,
    setProfileMessage,
  ] = useState("");

  const [
    profileError,
    setProfileError,
  ] = useState("");


  /* =======================================================
     Password Form
  ======================================================= */

  const [
    passwordForm,
    setPasswordForm,
  ] = useState(
    EMPTY_PASSWORD_FORM
  );

  const [
    changingPassword,
    setChangingPassword,
  ] = useState(false);

  const [
    passwordMessage,
    setPasswordMessage,
  ] = useState("");

  const [
    passwordError,
    setPasswordError,
  ] = useState("");

  const [
    showOldPassword,
    setShowOldPassword,
  ] = useState(false);

  const [
    showNewPassword,
    setShowNewPassword,
  ] = useState(false);

  const [
    showConfirmPassword,
    setShowConfirmPassword,
  ] = useState(false);


  /* =======================================================
     Populate Profile
  ======================================================= */

  useEffect(() => {
    if (!user) {
      return;
    }

    setProfileForm({
      first_name:
        user.first_name ||
        "",
      last_name:
        user.last_name ||
        "",
      email:
        user.email ||
        "",
      mobile:
        user.mobile ||
        "",
      profile_image:
        null,
    });

    setProfileImagePreview(
      getImageUrl(
        user.profile_image ||
          ""
      )
    );
  }, [user]);


  /* =======================================================
     Blob Cleanup
  ======================================================= */

  useEffect(() => {
    return () => {
      if (
        profileImagePreview &&
        profileImagePreview.startsWith(
          "blob:"
        )
      ) {
        URL.revokeObjectURL(
          profileImagePreview
        );
      }
    };
  }, [
    profileImagePreview,
  ]);


  /* =======================================================
     Display Name
  ======================================================= */

  const displayName =
    useMemo(() => {
      if (!user) {
        return "Customer";
      }

      const fullName = [
        user.first_name,
        user.last_name,
      ]
        .filter(Boolean)
        .join(" ")
        .trim();

      return (
        user.display_name ||
        fullName ||
        user.username ||
        user.email ||
        user.mobile ||
        "Customer"
      );
    }, [user]);


  const profileInitial =
    displayName
      .trim()
      .charAt(0)
      .toUpperCase() ||
    "U";


  /* =======================================================
     Account Type
  ======================================================= */

  const accountType =
    useMemo(() => {
      if (
        isSuperuser
      ) {
        return "Super Admin";
      }

      if (
        isAdmin ||
        isStaff
      ) {
        return "Admin";
      }

      if (
        user?.role
      ) {
        return user.role;
      }

      return "Customer";
    }, [
      user,
      isAdmin,
      isStaff,
      isSuperuser,
    ]);


  const accountBadgeClass =
    isAdmin
      ? "bg-purple-100 text-purple-700"
      : "bg-blue-100 text-blue-700";


  /* =======================================================
     Profile Input
  ======================================================= */

  const handleProfileChange = (
    event
  ) => {
    const {
      name,
      value,
    } = event.target;

    setProfileForm(
      (current) => ({
        ...current,

        [name]:
          name ===
          "mobile"
            ? value
                .replace(
                  /\D/g,
                  ""
                )
                .slice(
                  0,
                  10
                )
            : value,
      })
    );

    setProfileError("");
    setProfileMessage("");
  };


  /* =======================================================
     Profile Image
  ======================================================= */

  const handleProfileImageChange = (
    event
  ) => {
    const file =
      event.target
        .files?.[0] ||
      null;

    if (!file) {
      return;
    }

    if (
      file.size >
      5 * 1024 * 1024
    ) {
      setProfileError(
        "Profile image size cannot exceed 5 MB."
      );

      event.target.value =
        "";

      return;
    }

    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
    ];

    if (
      !allowedTypes.includes(
        file.type
      )
    ) {
      setProfileError(
        "Only JPG, PNG and WEBP images are allowed."
      );

      event.target.value =
        "";

      return;
    }

    if (
      profileImagePreview &&
      profileImagePreview.startsWith(
        "blob:"
      )
    ) {
      URL.revokeObjectURL(
        profileImagePreview
      );
    }

    setProfileForm(
      (current) => ({
        ...current,
        profile_image:
          file,
      })
    );

    setProfileImagePreview(
      URL.createObjectURL(
        file
      )
    );

    setProfileError("");
    setProfileMessage("");
  };


  const removeSelectedImage =
    () => {
      if (
        profileImagePreview &&
        profileImagePreview.startsWith(
          "blob:"
        )
      ) {
        URL.revokeObjectURL(
          profileImagePreview
        );
      }

      setProfileForm(
        (current) => ({
          ...current,
          profile_image:
            null,
        })
      );

      setProfileImagePreview(
        getImageUrl(
          user?.profile_image ||
            ""
        )
      );
    };


  /* =======================================================
     Profile Validation
  ======================================================= */

  const validateProfile = () => {
    const cleanedEmail =
      profileForm.email
        .trim()
        .toLowerCase();

    if (!cleanedEmail) {
      return (
        "Email address is required."
      );
    }

    if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
        cleanedEmail
      )
    ) {
      return (
        "Please enter a valid email address."
      );
    }

    if (
      profileForm.mobile &&
      profileForm.mobile
        .length !== 10
    ) {
      return (
        "Please enter a valid 10-digit mobile number."
      );
    }

    return "";
  };


  /* =======================================================
     Save Profile
  ======================================================= */

  const handleProfileSubmit =
    async (event) => {
      event.preventDefault();

      setProfileError("");
      setProfileMessage("");

      const validationError =
        validateProfile();

      if (
        validationError
      ) {
        setProfileError(
          validationError
        );

        return;
      }

      try {
        setSavingProfile(
          true
        );

        const response =
          await updateProfile(
            {
              first_name:
                profileForm
                  .first_name
                  .trim(),

              last_name:
                profileForm
                  .last_name
                  .trim(),

              email:
                profileForm
                  .email
                  .trim()
                  .toLowerCase(),

              mobile:
                profileForm
                  .mobile
                  .trim(),

              ...(profileForm
                .profile_image
                ? {
                    profile_image:
                      profileForm
                        .profile_image,
                  }
                : {}),
            }
          );


        /*
         * Important:
         *
         * ProfileUpdateSerializer may return only editable
         * profile fields and not is_staff/is_superuser.
         *
         * Therefore fetch the complete profile again.
         */

        let updatedUser =
          null;

        if (
          refreshCurrentUser
        ) {
          updatedUser =
            await refreshCurrentUser();
        }

        if (
          !updatedUser
        ) {
          updatedUser =
            response?.user ||
            response;
        }

        if (
          updatedUser &&
          !refreshCurrentUser
        ) {
          if (
            updateCurrentUser
          ) {
            updateCurrentUser(
              updatedUser
            );
          } else if (
            setUser
          ) {
            setUser(
              updatedUser
            );
          }
        }


        setProfileForm(
          (current) => ({
            ...current,
            profile_image:
              null,
          })
        );

        setProfileImagePreview(
          getImageUrl(
            updatedUser
              ?.profile_image ||
              user
                ?.profile_image ||
              ""
          )
        );

        setProfileMessage(
          response?.message ||
            "Profile updated successfully."
        );
      } catch (error) {
        console.error(
          "Profile update error:",
          error
        );

        setProfileError(
          getErrorMessage(
            error
          )
        );
      } finally {
        setSavingProfile(
          false
        );
      }
    };


  /* =======================================================
     Password Input
  ======================================================= */

  const handlePasswordChange = (
    event
  ) => {
    const {
      name,
      value,
    } = event.target;

    setPasswordForm(
      (current) => ({
        ...current,
        [name]:
          value,
      })
    );

    setPasswordError("");
    setPasswordMessage("");
  };


  /* =======================================================
     Password Validation
  ======================================================= */

  const validatePassword =
    () => {
      if (
        !passwordForm
          .oldPassword
      ) {
        return (
          "Please enter your current password."
        );
      }

      if (
        passwordForm
          .newPassword
          .length < 6
      ) {
        return (
          "New password must be at least 6 characters."
        );
      }

      if (
        passwordForm
          .newPassword ===
        passwordForm
          .oldPassword
      ) {
        return (
          "New password must be different from the current password."
        );
      }

      if (
        passwordForm
          .newPassword !==
        passwordForm
          .confirmPassword
      ) {
        return (
          "New password and confirm password do not match."
        );
      }

      return "";
    };


  /* =======================================================
     Change Password
  ======================================================= */

  const handlePasswordSubmit =
    async (event) => {
      event.preventDefault();

      setPasswordError("");
      setPasswordMessage("");

      const validationError =
        validatePassword();

      if (
        validationError
      ) {
        setPasswordError(
          validationError
        );

        return;
      }

      try {
        setChangingPassword(
          true
        );

        const response =
          await changePassword(
            {
              oldPassword:
                passwordForm
                  .oldPassword,

              newPassword:
                passwordForm
                  .newPassword,

              confirmPassword:
                passwordForm
                  .confirmPassword,
            }
          );

        setPasswordMessage(
          response?.message ||
            "Password changed successfully."
        );

        setPasswordForm(
          EMPTY_PASSWORD_FORM
        );

        setShowOldPassword(
          false
        );

        setShowNewPassword(
          false
        );

        setShowConfirmPassword(
          false
        );
      } catch (error) {
        console.error(
          "Password change error:",
          error
        );

        setPasswordError(
          getErrorMessage(
            error
          )
        );
      } finally {
        setChangingPassword(
          false
        );
      }
    };


  /* =======================================================
     UI
  ======================================================= */

  return (
    <section className="min-h-screen bg-gray-50 py-10">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">

        {/* Header */}

        <div className="mb-10">
          <p className="text-sm font-semibold uppercase tracking-widest text-blue-600">
            My Account
          </p>

          <h1 className="mt-2 text-3xl font-bold text-gray-950 sm:text-4xl">
            Profile Settings
          </h1>

          <p className="mt-2 text-gray-500">
            Manage your personal information and account security.
          </p>
        </div>


        <div className="grid gap-8 lg:grid-cols-3">

          {/* =================================================
              Profile Summary
          ================================================= */}

          <aside className="h-fit rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">

            <div className="text-center">

              {profileImagePreview ? (
                <img
                  src={
                    profileImagePreview
                  }
                  alt={
                    displayName
                  }
                  className="mx-auto h-28 w-28 rounded-full border-4 border-white object-cover shadow"
                />
              ) : (
                <div className="mx-auto flex h-28 w-28 items-center justify-center rounded-full bg-blue-600 text-4xl font-bold text-white shadow">
                  {
                    profileInitial
                  }
                </div>
              )}


              <h2 className="mt-5 text-2xl font-bold">
                {
                  displayName
                }
              </h2>

              <p className="mt-1 text-gray-500">
                @
                {user?.username ||
                  "user"}
              </p>


              {/* Account Role */}

              <span
                className={`mt-4 inline-flex rounded-full px-4 py-2 text-sm font-semibold capitalize ${accountBadgeClass}`}
              >
                {
                  accountType
                }
              </span>


              {isSuperuser && (
                <p className="mt-2 text-xs font-semibold text-purple-600">
                  Full administrative access
                </p>
              )}

            </div>


            <div className="mt-7 space-y-4 border-t pt-6 text-sm">

              <div>
                <p className="text-gray-400">
                  Email
                </p>

                <p className="mt-1 break-all font-semibold text-gray-800">
                  {user?.email ||
                    "—"}
                </p>
              </div>


              <div>
                <p className="text-gray-400">
                  Mobile
                </p>

                <p className="mt-1 font-semibold text-gray-800">
                  {user?.mobile
                    ? `+91 ${user.mobile}`
                    : "—"}
                </p>
              </div>


              <div>
                <p className="text-gray-400">
                  Account Type
                </p>

                <p className="mt-1 font-semibold text-gray-800">
                  {
                    accountType
                  }
                </p>
              </div>


              <div>
                <p className="text-gray-400">
                  Verification
                </p>

                <p
                  className={`mt-1 font-semibold ${
                    user?.is_verified
                      ? "text-green-600"
                      : "text-yellow-600"
                  }`}
                >
                  {user?.is_verified
                    ? "Verified Account"
                    : "Not Verified"}
                </p>
              </div>

            </div>
          </aside>


          {/* =================================================
              Forms
          ================================================= */}

          <div className="space-y-8 lg:col-span-2">

            {/* Personal Information */}

            <form
              onSubmit={
                handleProfileSubmit
              }
              className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm sm:p-8"
            >
              <div>
                <h2 className="text-2xl font-bold">
                  Personal Information
                </h2>

                <p className="mt-2 text-sm text-gray-500">
                  Update your name, email, mobile number and profile image.
                </p>
              </div>


              <div className="mt-7">
                <label className="block text-sm font-semibold text-gray-700">
                  Profile Image
                </label>

                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={
                    handleProfileImageChange
                  }
                  className="mt-2 block w-full rounded-xl border p-3 text-sm"
                />

                <p className="mt-2 text-xs text-gray-400">
                  JPG, PNG or WEBP. Maximum 5 MB.
                </p>

                {profileForm
                  .profile_image && (
                  <button
                    type="button"
                    onClick={
                      removeSelectedImage
                    }
                    className="mt-3 text-sm font-semibold text-red-600"
                  >
                    Cancel selected image
                  </button>
                )}
              </div>


              <div className="mt-6 grid gap-5 sm:grid-cols-2">

                <div>
                  <label className="mb-2 block text-sm font-semibold text-gray-700">
                    First Name
                  </label>

                  <input
                    type="text"
                    name="first_name"
                    value={
                      profileForm
                        .first_name
                    }
                    onChange={
                      handleProfileChange
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
                      profileForm
                        .last_name
                    }
                    onChange={
                      handleProfileChange
                    }
                    autoComplete="family-name"
                    placeholder="Last name"
                    className="w-full rounded-xl border px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

              </div>


              <div className="mt-5">
                <label className="mb-2 block text-sm font-semibold text-gray-700">
                  Email Address *
                </label>

                <input
                  type="email"
                  name="email"
                  value={
                    profileForm.email
                  }
                  onChange={
                    handleProfileChange
                  }
                  autoComplete="email"
                  placeholder="Email address"
                  className="w-full rounded-xl border px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>


              <div className="mt-5">
                <label className="mb-2 block text-sm font-semibold text-gray-700">
                  Mobile Number
                </label>

                <div className="flex items-center rounded-xl border px-4">
                  <span className="mr-3 text-gray-500">
                    +91
                  </span>

                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={10}
                    name="mobile"
                    value={
                      profileForm
                        .mobile
                    }
                    onChange={
                      handleProfileChange
                    }
                    autoComplete="tel"
                    placeholder="10-digit mobile number"
                    className="w-full py-3 outline-none"
                  />
                </div>
              </div>


              {profileError && (
                <p className="mt-5 rounded-xl bg-red-50 p-4 text-sm text-red-600">
                  {
                    profileError
                  }
                </p>
              )}


              {profileMessage && (
                <p className="mt-5 rounded-xl bg-green-50 p-4 text-sm text-green-700">
                  {
                    profileMessage
                  }
                </p>
              )}


              <button
                type="submit"
                disabled={
                  savingProfile
                }
                className="mt-6 rounded-full bg-blue-600 px-7 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-400"
              >
                {savingProfile
                  ? "Saving..."
                  : "Save Changes"}
              </button>

            </form>


            {/* =================================================
                Change Password
            ================================================= */}

            <form
              onSubmit={
                handlePasswordSubmit
              }
              className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm sm:p-8"
            >
              <div>
                <h2 className="text-2xl font-bold">
                  Change Password
                </h2>

                <p className="mt-2 text-sm text-gray-500">
                  Use a strong password that you do not use elsewhere.
                </p>
              </div>


              <div className="mt-7 space-y-5">

                {/* Current Password */}

                <div>
                  <label className="mb-2 block text-sm font-semibold text-gray-700">
                    Current Password
                  </label>

                  <div className="flex items-center rounded-xl border px-4">
                    <input
                      type={
                        showOldPassword
                          ? "text"
                          : "password"
                      }
                      name="oldPassword"
                      value={
                        passwordForm
                          .oldPassword
                      }
                      onChange={
                        handlePasswordChange
                      }
                      autoComplete="current-password"
                      placeholder="Current password"
                      className="w-full py-3 outline-none"
                    />

                    <button
                      type="button"
                      onClick={() =>
                        setShowOldPassword(
                          (current) =>
                            !current
                        )
                      }
                      className="ml-3 text-sm font-semibold text-blue-600"
                    >
                      {showOldPassword
                        ? "Hide"
                        : "Show"}
                    </button>
                  </div>
                </div>


                {/* New Password */}

                <div>
                  <label className="mb-2 block text-sm font-semibold text-gray-700">
                    New Password
                  </label>

                  <div className="flex items-center rounded-xl border px-4">
                    <input
                      type={
                        showNewPassword
                          ? "text"
                          : "password"
                      }
                      name="newPassword"
                      value={
                        passwordForm
                          .newPassword
                      }
                      onChange={
                        handlePasswordChange
                      }
                      autoComplete="new-password"
                      placeholder="New password"
                      className="w-full py-3 outline-none"
                    />

                    <button
                      type="button"
                      onClick={() =>
                        setShowNewPassword(
                          (current) =>
                            !current
                        )
                      }
                      className="ml-3 text-sm font-semibold text-blue-600"
                    >
                      {showNewPassword
                        ? "Hide"
                        : "Show"}
                    </button>
                  </div>
                </div>


                {/* Confirm Password */}

                <div>
                  <label className="mb-2 block text-sm font-semibold text-gray-700">
                    Confirm New Password
                  </label>

                  <div className="flex items-center rounded-xl border px-4">
                    <input
                      type={
                        showConfirmPassword
                          ? "text"
                          : "password"
                      }
                      name="confirmPassword"
                      value={
                        passwordForm
                          .confirmPassword
                      }
                      onChange={
                        handlePasswordChange
                      }
                      autoComplete="new-password"
                      placeholder="Confirm new password"
                      className="w-full py-3 outline-none"
                    />

                    <button
                      type="button"
                      onClick={() =>
                        setShowConfirmPassword(
                          (current) =>
                            !current
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

              </div>


              {passwordError && (
                <p className="mt-5 rounded-xl bg-red-50 p-4 text-sm text-red-600">
                  {
                    passwordError
                  }
                </p>
              )}


              {passwordMessage && (
                <p className="mt-5 rounded-xl bg-green-50 p-4 text-sm text-green-700">
                  {
                    passwordMessage
                  }
                </p>
              )}


              <button
                type="submit"
                disabled={
                  changingPassword
                }
                className="mt-6 rounded-full bg-black px-7 py-3 font-semibold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:bg-gray-400"
              >
                {changingPassword
                  ? "Updating..."
                  : "Change Password"}
              </button>

            </form>

          </div>
        </div>
      </div>
    </section>
  );
}


export default Profile;