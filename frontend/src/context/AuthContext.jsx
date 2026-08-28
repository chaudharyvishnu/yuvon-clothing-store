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

    localStorage.setItem(
      ACCESS_TOKEN,
      token
    );

    /*
     * Compatibility alias.
     */
    localStorage.setItem(
      "access",
      token
    );
  };


const storeRefreshToken =
  (token) => {
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
   User Helpers
========================================================= */

function normalizeUser(
  value
) {
  if (
    !value ||
    typeof value !== "object"
  ) {
    return null;
  }

  return {
    ...value,

    is_staff:
      Boolean(
        value?.is_staff ??
        value?.isStaff ??
        false
      ),

    is_superuser:
      Boolean(
        value?.is_superuser ??
        value?.isSuperuser ??
        false
      ),

    is_admin:
      Boolean(
        value?.is_admin ??
        value?.isAdmin ??
        false
      ),

    role:
      String(
        value?.role || ""
      )
        .trim()
        .toLowerCase(),
  };
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

      if (!savedUser) {
        return null;
      }

      return normalizeUser(
        JSON.parse(
          savedUser
        )
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
  ] = useState(true);


  const [
    isLoginOpen,
    setIsLoginOpen,
  ] = useState(false);


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


          try {

            const profile =
              await fetchProfile();


            if (
              !isMounted
            ) {
              return;
            }


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
              isMounted &&
              (
                error?.status ===
                  401 ||
                error?.status ===
                  403
              )
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


        if (
          !access
        ) {
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


        /*
         * Login response user ko first use karenge.
         *
         * Agar backend login response me user nahi mila,
         * then profile endpoint call hoga.
         */
        if (
          !loggedInUser
        ) {
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

          user:
            normalizeUser(
              loggedInUser
            ),
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
          "";


        const refresh =
          data?.refresh ||
          data?.refresh_token ||
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
          null;


        if (
          !registeredUser
        ) {
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

          user:
            normalizeUser(
              registeredUser
            ),
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

          const profile =
            await fetchProfile();


          saveUser(
            profile
          );


          return normalizeUser(
            profile
          );

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
    String(
      user?.role ||
      ""
    )
      .trim()
      .toLowerCase();


  const isStaff =
    Boolean(
      user?.is_staff ===
        true ||
      user?.isStaff ===
        true
    );


  const isSuperuser =
    Boolean(
      user?.is_superuser ===
        true ||
      user?.isSuperuser ===
        true
    );


  const isAdmin =
    Boolean(
      isSuperuser ||
      isStaff ||
      user?.is_admin ===
        true ||
      user?.isAdmin ===
        true ||
      normalizedRole ===
        "admin" ||
      normalizedRole ===
        "administrator"
    );


  /* =======================================================
     Context Value
  ======================================================= */

  const value =
    useMemo(
      () => ({
        /* User */

        user,

        setUser:
          saveUser,

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