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


const AuthContext = createContext(null);


/* =========================================================
   Local Storage Keys
========================================================= */

const ACCESS_TOKEN = "yuvon_access_token";
const REFRESH_TOKEN = "yuvon_refresh_token";
const USER_DATA = "yuvon_user";


/* =========================================================
   Storage Helpers
========================================================= */

const getStoredAccessToken = () => {
  return (
    localStorage.getItem(ACCESS_TOKEN) ||
    localStorage.getItem("access") ||
    localStorage.getItem("access_token") ||
    localStorage.getItem("token") ||
    ""
  );
};


const getStoredRefreshToken = () => {
  return (
    localStorage.getItem(REFRESH_TOKEN) ||
    localStorage.getItem("refresh") ||
    localStorage.getItem("refresh_token") ||
    ""
  );
};


const storeAccessToken = (token) => {
  if (!token) {
    return;
  }

  localStorage.setItem(
    ACCESS_TOKEN,
    token
  );

  /*
   * Compatibility alias.
   *
   * dashboardService.js currently checks
   * the "access" key as well.
   */
  localStorage.setItem(
    "access",
    token
  );
};


const storeRefreshToken = (token) => {
  if (!token) {
    return;
  }

  localStorage.setItem(
    REFRESH_TOKEN,
    token
  );

  localStorage.setItem(
    "refresh",
    token
  );
};


/* =========================================================
   Auth Provider
========================================================= */

export function AuthProvider({
  children,
}) {
  /* -------------------------------------------------------
     User
  ------------------------------------------------------- */

  const [user, setUserState] = useState(
    () => {
      try {
        const savedUser =
          localStorage.getItem(
            USER_DATA
          );

        return savedUser
          ? JSON.parse(savedUser)
          : null;
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
    }
  );


  /* -------------------------------------------------------
     Tokens
  ------------------------------------------------------- */

  const [
    accessToken,
    setAccessToken,
  ] = useState(
    () => getStoredAccessToken()
  );

  const [
    refreshToken,
    setRefreshToken,
  ] = useState(
    () => getStoredRefreshToken()
  );


  /* -------------------------------------------------------
     UI State
  ------------------------------------------------------- */

  const [loading, setLoading] =
    useState(true);

  const [
    isLoginOpen,
    setIsLoginOpen,
  ] = useState(false);


  /* =======================================================
     User Storage
  ======================================================= */

  const saveUser = useCallback(
    (nextUser) => {
      setUserState(
        nextUser || null
      );

      if (nextUser) {
        localStorage.setItem(
          USER_DATA,
          JSON.stringify(
            nextUser
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

  const saveTokens = useCallback(
    ({
      access = "",
      refresh = "",
    } = {}) => {
      if (access) {
        storeAccessToken(
          access
        );

        setAccessToken(
          access
        );
      }

      if (refresh) {
        storeRefreshToken(
          refresh
        );

        setRefreshToken(
          refresh
        );
      }
    },
    []
  );


  /* =======================================================
     Clear Authentication
  ======================================================= */

  const clearAuthentication =
    useCallback(() => {
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
        (key) => {
          localStorage.removeItem(
            key
          );
        }
      );

      setUserState(null);
      setAccessToken("");
      setRefreshToken("");
    }, []);


  /* =======================================================
     Update Current User
  ======================================================= */

  const updateCurrentUser =
    useCallback(
      (nextUser) => {
        saveUser(
          nextUser
        );
      },
      [saveUser]
    );


  /* =======================================================
     Login Drawer
  ======================================================= */

  const openLogin =
    useCallback(() => {
      setIsLoginOpen(true);
    }, []);


  const closeLogin =
    useCallback(() => {
      setIsLoginOpen(false);
    }, []);


  /* =======================================================
     Load Existing Session
  ======================================================= */

  useEffect(() => {
    let isMounted = true;

    const loadProfile =
      async () => {
        if (!accessToken) {
          if (isMounted) {
            setLoading(false);
          }

          return;
        }

        try {
          const profile =
            await fetchProfile();

          if (!isMounted) {
            return;
          }

          saveUser(
            profile
          );
        } catch (error) {
          console.error(
            "Profile load error:",
            error
          );

          if (
            isMounted &&
            (
              error?.status === 401 ||
              error?.status === 403
            )
          ) {
            clearAuthentication();
          }
        } finally {
          if (isMounted) {
            setLoading(false);
          }
        }
      };

    loadProfile();

    return () => {
      isMounted = false;
    };
  }, [
    accessToken,
    saveUser,
    clearAuthentication,
  ]);


  /* =======================================================
     Login
  ======================================================= */

  const login = useCallback(
    async (
      username,
      password
    ) => {
      const data =
        await loginUser({
          username,
          password,
        });

      const access =
        data?.access ||
        data?.access_token ||
        "";

      const refresh =
        data?.refresh ||
        data?.refresh_token ||
        "";

      if (!access) {
        throw new Error(
          "Access token login response me nahi mila."
        );
      }

      saveTokens({
        access,
        refresh,
      });

      let loggedInUser =
        data?.user ||
        null;

      if (!loggedInUser) {
        try {
          loggedInUser =
            await fetchProfile();
        } catch (
          profileError
        ) {
          console.error(
            "Profile fetch after login failed:",
            profileError
          );
        }
      }

      saveUser(
        loggedInUser
      );

      closeLogin();

      return {
        ...data,
        access,
        refresh,
        user: loggedInUser,
      };
    },
    [
      saveTokens,
      saveUser,
      closeLogin,
    ]
  );


  /* =======================================================
     Register
  ======================================================= */

  const register = useCallback(
    async (payload) => {
      const data =
        await registerUser(
          payload
        );

      const access =
        data?.access ||
        data?.access_token ||
        "";

      const refresh =
        data?.refresh ||
        data?.refresh_token ||
        "";

      if (!access) {
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
        null;

      if (!registeredUser) {
        try {
          registeredUser =
            await fetchProfile();
        } catch (
          profileError
        ) {
          console.error(
            "Profile fetch after register failed:",
            profileError
          );
        }
      }

      saveUser(
        registeredUser
      );

      closeLogin();

      return {
        ...data,
        access,
        refresh,
        user: registeredUser,
      };
    },
    [
      saveTokens,
      saveUser,
      closeLogin,
    ]
  );


  /* =======================================================
     Logout
  ======================================================= */

  const logout = useCallback(
    async () => {
      try {
        if (refreshToken) {
          await logoutUser(
            refreshToken
          );
        }
      } catch (error) {
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
    useCallback(async () => {
      if (!accessToken) {
        return null;
      }

      try {
        const profile =
          await fetchProfile();

        saveUser(
          profile
        );

        return profile;
      } catch (error) {
        console.error(
          "Current user refresh error:",
          error
        );

        if (
          error?.status === 401 ||
          error?.status === 403
        ) {
          clearAuthentication();
        }

        throw error;
      }
    }, [
      accessToken,
      saveUser,
      clearAuthentication,
    ]);


  /* =======================================================
     Authentication Flags
  ======================================================= */

  const isAuthenticated =
    Boolean(
      accessToken &&
      user
    );


  /*
   * Django normally exposes is_staff / is_superuser.
   *
   * Extra fallbacks are included so this will also
   * work if your profile serializer returns role/admin
   * instead.
   */
  const isStaff = Boolean(
    user?.is_staff ||
    user?.isStaff
  );


  const isSuperuser = Boolean(
    user?.is_superuser ||
    user?.isSuperuser
  );


  const isAdmin = Boolean(
    isStaff ||
    isSuperuser ||
    user?.is_admin ||
    user?.role === "admin"
  );


  /* =======================================================
     Context Value
  ======================================================= */

  const value = useMemo(
    () => ({
      /* User */
      user,
      setUser: saveUser,
      updateCurrentUser,
      refreshCurrentUser,

      /* Loading */
      loading,

      /* Tokens */
      accessToken,
      refreshToken,

      /* Authentication */
      isAuthenticated,

      /* Authorization */
      isAdmin,
      isStaff,
      isSuperuser,

      /* Authentication Actions */
      login,
      register,
      logout,

      /* Login Drawer */
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

      login,
      register,
      logout,

      isLoginOpen,
      openLogin,
      closeLogin,
    ]
  );


  return (
    <AuthContext.Provider
      value={value}
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

  if (!context) {
    throw new Error(
      "useAuth must be used inside AuthProvider."
    );
  }

  return context;
}


export default AuthContext;