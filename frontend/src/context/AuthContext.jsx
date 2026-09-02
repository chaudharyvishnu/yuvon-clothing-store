import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  fetchProfile,
  loginUser,
  logoutUser,
  registerUser,
} from "../services/api";


const AuthContext =
  createContext(null);


/* =========================================================
   Local Storage Keys
========================================================= */

const ACCESS_TOKEN =
  "yuvon_access_token";

const REFRESH_TOKEN =
  "yuvon_refresh_token";

const USER_DATA =
  "yuvon_user";


/* =========================================================
   Boolean Helper
========================================================= */

function normalizeBoolean(
  value
) {
  if (
    value === true ||
    value === 1
  ) {
    return true;
  }


  if (
    value === false ||
    value === 0 ||
    value === null ||
    value === undefined
  ) {
    return false;
  }


  const normalizedValue =
    String(
      value
    )
      .trim()
      .toLowerCase();


  return [
    "true",
    "1",
    "yes",
    "y",
  ].includes(
    normalizedValue
  );
}


/* =========================================================
   Role Helper
========================================================= */

function normalizeRole(
  value
) {
  if (
    value === null ||
    value === undefined
  ) {
    return "";
  }


  /*
   * Normal string role:
   *
   * "admin"
   * "customer"
   * "staff"
   */

  if (
    typeof value ===
    "string"
  ) {
    return value
      .trim()
      .toLowerCase();
  }


  /*
   * Compatibility:
   *
   * role may sometimes be:
   *
   * {
   *   name: "Admin"
   * }
   *
   * or:
   *
   * {
   *   slug: "admin"
   * }
   */

  if (
    typeof value ===
    "object"
  ) {
    return String(
      value?.slug ||
      value?.name ||
      value?.code ||
      ""
    )
      .trim()
      .toLowerCase();
  }


  return String(
    value
  )
    .trim()
    .toLowerCase();
}


/* =========================================================
   Storage Helpers
========================================================= */

const getStoredAccessToken =
  () => {
    return (
      localStorage.getItem(
        ACCESS_TOKEN
      ) ||
      localStorage.getItem(
        "access"
      ) ||
      localStorage.getItem(
        "access_token"
      ) ||
      localStorage.getItem(
        "token"
      ) ||
      ""
    );
  };


const getStoredRefreshToken =
  () => {
    return (
      localStorage.getItem(
        REFRESH_TOKEN
      ) ||
      localStorage.getItem(
        "refresh"
      ) ||
      localStorage.getItem(
        "refresh_token"
      ) ||
      ""
    );
  };


const storeAccessToken =
  (token) => {
    if (!token) {
      return;
    }


    const cleanToken =
      String(
        token
      ).trim();


    if (!cleanToken) {
      return;
    }


    localStorage.setItem(
      ACCESS_TOKEN,
      cleanToken
    );


    /*
     * Compatibility alias used by
     * some existing frontend files.
     */
    localStorage.setItem(
      "access",
      cleanToken
    );
  };


const storeRefreshToken =
  (token) => {
    if (!token) {
      return;
    }


    const cleanToken =
      String(
        token
      ).trim();


    if (!cleanToken) {
      return;
    }


    localStorage.setItem(
      REFRESH_TOKEN,
      cleanToken
    );


    /*
     * Compatibility alias.
     */
    localStorage.setItem(
      "refresh",
      cleanToken
    );
  };


/* =========================================================
   User Helpers
========================================================= */

function normalizeUser(
  value
) {
  if (
    !value ||
    typeof value !==
      "object" ||
    Array.isArray(
      value
    )
  ) {
    return null;
  }


  const role =
    normalizeRole(
      value?.role ||
      value?.user_role ||
      value?.user_type
    );


  return {
    ...value,


    /*
     * Always normalize these permission
     * values to actual booleans.
     *
     * This protects against backend values
     * such as:
     *
     * true
     * false
     * 1
     * 0
     * "true"
     * "false"
     */

    is_staff:
      normalizeBoolean(
        value?.is_staff ??
        value?.isStaff ??
        false
      ),


    is_superuser:
      normalizeBoolean(
        value?.is_superuser ??
        value?.isSuperuser ??
        false
      ),


    is_admin:
      normalizeBoolean(
        value?.is_admin ??
        value?.isAdmin ??
        false
      ),


    role,
  };
}


/* =========================================================
   Admin Permission Helper
========================================================= */

function checkAdminAccess(
  value
) {
  const normalizedUser =
    normalizeUser(
      value
    );


  if (
    !normalizedUser
  ) {
    return false;
  }


  const role =
    normalizeRole(
      normalizedUser.role
    );


  const adminRoles =
    new Set([
      "admin",
      "administrator",
      "superadmin",
      "super_admin",
      "superuser",
      "staff",
    ]);


  return Boolean(
    normalizedUser.is_superuser ||
    normalizedUser.is_staff ||
    normalizedUser.is_admin ||
    adminRoles.has(
      role
    )
  );
}


/* =========================================================
   Auth Provider
========================================================= */

export function AuthProvider({
  children,
}) {

  /* -------------------------------------------------------
     User
  ------------------------------------------------------- */

  const [
    user,
    setUserState,
  ] = useState(() => {
    try {
      const savedUser =
        localStorage.getItem(
          USER_DATA
        );


      if (
        !savedUser
      ) {
        return null;
      }


      const parsedUser =
        JSON.parse(
          savedUser
        );


      return normalizeUser(
        parsedUser
      );

    } catch (error) {
      console.error(
        "Saved user load error:",
        error
      );


      localStorage.removeItem(
        USER_DATA
      );


      return null;
    }
  });


  /* -------------------------------------------------------
     Tokens
  ------------------------------------------------------- */

  const [
    accessToken,
    setAccessToken,
  ] = useState(
    () =>
      getStoredAccessToken()
  );


  const [
    refreshToken,
    setRefreshToken,
  ] = useState(
    () =>
      getStoredRefreshToken()
  );


  /* -------------------------------------------------------
     UI State
  ------------------------------------------------------- */

  const [
    loading,
    setLoading,
  ] = useState(
    true
  );


  const [
    isLoginOpen,
    setIsLoginOpen,
  ] = useState(
    false
  );


  /* =======================================================
     User Storage
  ======================================================= */

  const saveUser =
    useCallback(
      (
        nextUser
      ) => {

        const normalizedUser =
          normalizeUser(
            nextUser
          );


        setUserState(
          normalizedUser
        );


        if (
          normalizedUser
        ) {
          localStorage.setItem(
            USER_DATA,
            JSON.stringify(
              normalizedUser
            )
          );
        } else {
          localStorage.removeItem(
            USER_DATA
          );
        }
      },
      []
    );


  /* =======================================================
     Token Storage
  ======================================================= */

  const saveTokens =
    useCallback(
      ({
        access = "",
        refresh = "",
      } = {}) => {

        if (
          access
        ) {
          const cleanAccess =
            String(
              access
            ).trim();


          if (
            cleanAccess
          ) {
            storeAccessToken(
              cleanAccess
            );


            setAccessToken(
              cleanAccess
            );
          }
        }


        if (
          refresh
        ) {
          const cleanRefresh =
            String(
              refresh
            ).trim();


          if (
            cleanRefresh
          ) {
            storeRefreshToken(
              cleanRefresh
            );


            setRefreshToken(
              cleanRefresh
            );
          }
        }
      },
      []
    );


  /* =======================================================
     Clear Authentication
  ======================================================= */

  const clearAuthentication =
    useCallback(
      () => {

        const keysToRemove = [
          ACCESS_TOKEN,
          REFRESH_TOKEN,
          USER_DATA,

          "access",
          "refresh",

          "access_token",
          "refresh_token",

          "token",
        ];


        keysToRemove.forEach(
          (
            key
          ) => {
            localStorage.removeItem(
              key
            );
          }
        );


        setUserState(
          null
        );


        setAccessToken(
          ""
        );


        setRefreshToken(
          ""
        );
      },
      []
    );


  /* =======================================================
     Update Current User
  ======================================================= */

  const updateCurrentUser =
    useCallback(
      (
        nextUser
      ) => {
        saveUser(
          nextUser
        );
      },
      [
        saveUser,
      ]
    );


  /* =======================================================
     Login Drawer
  ======================================================= */

  const openLogin =
    useCallback(
      () => {
        setIsLoginOpen(
          true
        );
      },
      []
    );


  const closeLogin =
    useCallback(
      () => {
        setIsLoginOpen(
          false
        );
      },
      []
    );


  /* =======================================================
     Load Existing Session
  ======================================================= */

  useEffect(
    () => {

      let isMounted =
        true;


      const loadProfile =
        async () => {

          /*
           * No access token means there is
           * no authenticated session.
           */

          if (
            !accessToken
          ) {
            if (
              isMounted
            ) {
              setLoading(
                false
              );
            }


            return;
          }


          /*
           * We have a token.
           *
           * Always load the latest profile
           * from backend instead of trusting
           * old localStorage permissions.
           */

          try {

            const profileResponse =
              await fetchProfile();


            if (
              !isMounted
            ) {
              return;
            }


            /*
             * Compatibility with either:
             *
             * { ...user fields }
             *
             * or:
             *
             * {
             *   user: { ... }
             * }
             */

            const profile =
              profileResponse?.user ||
              profileResponse;


            saveUser(
              profile
            );

          } catch (
            error
          ) {

            console.error(
              "Profile load error:",
              error
            );


            if (
              !isMounted
            ) {
              return;
            }


            /*
             * api.js already attempts token refresh
             * automatically.
             *
             * Therefore if profile still returns
             * 401/403 after api.js handling,
             * session is no longer usable.
             */

            if (
              error?.status ===
                401 ||
              error?.status ===
                403
            ) {
              clearAuthentication();
            }

          } finally {

            if (
              isMounted
            ) {
              setLoading(
                false
              );
            }
          }
        };


      loadProfile();


      return () => {
        isMounted =
          false;
      };

    },
    [
      accessToken,
      saveUser,
      clearAuthentication,
    ]
  );


  /* =======================================================
     Login
  ======================================================= */

  const login =
    useCallback(
      async (
        username,
        password
      ) => {

        const cleanUsername =
          String(
            username ||
            ""
          ).trim();


        if (
          !cleanUsername
        ) {
          throw new Error(
            "Username is required."
          );
        }


        if (
          !password
        ) {
          throw new Error(
            "Password is required."
          );
        }


        const data =
          await loginUser({
            username:
              cleanUsername,

            password,
          });


        const access =
          data?.access ||
          data?.access_token ||
          data?.tokens?.access ||
          "";


        const refresh =
          data?.refresh ||
          data?.refresh_token ||
          data?.tokens?.refresh ||
          "";


        if (
          !access
        ) {
          throw new Error(
            "Access token login response me nahi mila."
          );
        }


        /*
         * Save token before fetchProfile().
         *
         * services/api.js reads authentication
         * token directly from localStorage.
         */

        saveTokens({
          access,
          refresh,
        });


        let loggedInUser =
          data?.user ||
          data?.profile ||
          null;


        /*
         * Login response may not contain all
         * Django permission fields.
         *
         * Therefore profile endpoint is preferred
         * whenever possible.
         */

        try {

          const profileResponse =
            await fetchProfile();


          const profile =
            profileResponse?.user ||
            profileResponse;


          if (
            profile &&
            typeof profile ===
              "object"
          ) {
            loggedInUser =
              profile;
          }

        } catch (
          profileError
        ) {

          console.error(
            "Profile fetch after login failed:",
            profileError
          );


          /*
           * If login response already contained
           * the user, we can continue.
           *
           * Otherwise authentication state would
           * contain a token but no user.
           */

          if (
            !loggedInUser
          ) {
            clearAuthentication();

            throw profileError;
          }
        }


        const normalizedUser =
          normalizeUser(
            loggedInUser
          );


        if (
          !normalizedUser
        ) {
          clearAuthentication();

          throw new Error(
            "User profile login response me nahi mila."
          );
        }


        saveUser(
          normalizedUser
        );


        closeLogin();


        return {
          ...data,

          access,

          refresh,

          user:
            normalizedUser,
        };
      },
      [
        saveTokens,
        saveUser,
        closeLogin,
        clearAuthentication,
      ]
    );


  /* =======================================================
     Register
  ======================================================= */

  const register =
    useCallback(
      async (
        payload
      ) => {

        const data =
          await registerUser(
            payload
          );


        const access =
          data?.access ||
          data?.access_token ||
          data?.tokens?.access ||
          "";


        const refresh =
          data?.refresh ||
          data?.refresh_token ||
          data?.tokens?.refresh ||
          "";


        if (
          !access
        ) {
          throw new Error(
            "Access token register response me nahi mila."
          );
        }


        saveTokens({
          access,
          refresh,
        });


        let registeredUser =
          data?.user ||
          data?.profile ||
          null;


        /*
         * Fetch fresh profile so that
         * role / permission fields remain
         * consistent with login.
         */

        try {

          const profileResponse =
            await fetchProfile();


          const profile =
            profileResponse?.user ||
            profileResponse;


          if (
            profile &&
            typeof profile ===
              "object"
          ) {
            registeredUser =
              profile;
          }

        } catch (
          profileError
        ) {

          console.error(
            "Profile fetch after register failed:",
            profileError
          );


          if (
            !registeredUser
          ) {
            clearAuthentication();

            throw profileError;
          }
        }


        const normalizedUser =
          normalizeUser(
            registeredUser
          );


        if (
          !normalizedUser
        ) {
          clearAuthentication();

          throw new Error(
            "User profile register response me nahi mila."
          );
        }


        saveUser(
          normalizedUser
        );


        closeLogin();


        return {
          ...data,

          access,

          refresh,

          user:
            normalizedUser,
        };
      },
      [
        saveTokens,
        saveUser,
        closeLogin,
        clearAuthentication,
      ]
    );


  /* =======================================================
     Logout
  ======================================================= */

  const logout =
    useCallback(
      async () => {

        try {

          if (
            refreshToken
          ) {
            await logoutUser(
              refreshToken
            );
          }

        } catch (
          error
        ) {

          /*
           * Even if backend logout fails,
           * local session must still be removed.
           */

          console.error(
            "Backend logout error:",
            error
          );

        } finally {

          clearAuthentication();

          closeLogin();
        }
      },
      [
        refreshToken,
        clearAuthentication,
        closeLogin,
      ]
    );


  /* =======================================================
     Refresh User Profile
  ======================================================= */

  const refreshCurrentUser =
    useCallback(
      async () => {

        if (
          !accessToken
        ) {
          return null;
        }


        try {

          const profileResponse =
            await fetchProfile();


          const profile =
            profileResponse?.user ||
            profileResponse;


          const normalizedUser =
            normalizeUser(
              profile
            );


          if (
            !normalizedUser
          ) {
            throw new Error(
              "Valid user profile was not returned."
            );
          }


          saveUser(
            normalizedUser
          );


          return normalizedUser;

        } catch (
          error
        ) {

          console.error(
            "Current user refresh error:",
            error
          );


          if (
            error?.status ===
              401 ||
            error?.status ===
              403
          ) {
            clearAuthentication();
          }


          throw error;
        }
      },
      [
        accessToken,
        saveUser,
        clearAuthentication,
      ]
    );


  /* =======================================================
     Authentication Flags
  ======================================================= */

  const isAuthenticated =
    Boolean(
      accessToken &&
      user
    );


  const normalizedRole =
    normalizeRole(
      user?.role
    );


  const isStaff =
    normalizeBoolean(
      user?.is_staff ??
      user?.isStaff ??
      false
    );


  const isSuperuser =
    normalizeBoolean(
      user?.is_superuser ??
      user?.isSuperuser ??
      false
    );


  const hasAdminFlag =
    normalizeBoolean(
      user?.is_admin ??
      user?.isAdmin ??
      false
    );


  const isAdmin =
    checkAdminAccess(
      user
    );


  /* =======================================================
     Context Value
  ======================================================= */

  const value =
    useMemo(
      () => ({

        /* -----------------------------------------------
           User
        ----------------------------------------------- */

        user,

        setUser:
          saveUser,

        updateCurrentUser,

        refreshCurrentUser,


        /* -----------------------------------------------
           Loading
        ----------------------------------------------- */

        loading,


        /* -----------------------------------------------
           Tokens
        ----------------------------------------------- */

        accessToken,

        refreshToken,


        /* -----------------------------------------------
           Authentication
        ----------------------------------------------- */

        isAuthenticated,


        /* -----------------------------------------------
           Authorization
        ----------------------------------------------- */

        isAdmin,

        isStaff,

        isSuperuser,

        hasAdminFlag,

        role:
          normalizedRole,


        /* -----------------------------------------------
           Authentication Actions
        ----------------------------------------------- */

        login,

        register,

        logout,


        /* -----------------------------------------------
           Login Drawer
        ----------------------------------------------- */

        isLoginOpen,

        openLogin,

        closeLogin,
      }),
      [
        user,

        saveUser,

        updateCurrentUser,

        refreshCurrentUser,

        loading,

        accessToken,

        refreshToken,

        isAuthenticated,

        isAdmin,

        isStaff,

        isSuperuser,

        hasAdminFlag,

        normalizedRole,

        login,

        register,

        logout,

        isLoginOpen,

        openLogin,

        closeLogin,
      ]
    );


  /* =======================================================
     Provider
  ======================================================= */

  return (
    <AuthContext.Provider
      value={
        value
      }
    >
      {children}
    </AuthContext.Provider>
  );
}


/* =========================================================
   useAuth Hook
========================================================= */

export function useAuth() {

  const context =
    useContext(
      AuthContext
    );


  if (
    !context
  ) {
    throw new Error(
      "useAuth must be used inside AuthProvider."
    );
  }


  return context;
}


export default AuthContext;