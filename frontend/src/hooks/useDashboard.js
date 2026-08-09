import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import dashboardService from "../services/dashboardservice";


const EMPTY_FILTERS = {
  start_date: "",
  end_date: "",
};


const useDashboard = (options = {}) => {
  const {
    autoLoad = true,
  } = options;


  /* =========================================================
     State
  ========================================================= */

  const [
    dashboardData,
    setDashboardData,
  ] = useState(null);

  const [
    loading,
    setLoading,
  ] = useState(false);

  const [
    detailsLoading,
    setDetailsLoading,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState("");

  const [
    detailsError,
    setDetailsError,
  ] = useState("");

  const [
    lastUpdated,
    setLastUpdated,
  ] = useState(null);

  const [
    appliedFilters,
    setAppliedFilters,
  ] = useState(
    EMPTY_FILTERS
  );


  /* =========================================================
     Refs
  ========================================================= */

  const appliedFiltersRef =
    useRef(
      EMPTY_FILTERS
    );

  const requestIdRef =
    useRef(0);

  const summaryControllerRef =
    useRef(null);

  const detailsControllerRef =
    useRef(null);

  const initialLoadDoneRef =
    useRef(false);


  /* =========================================================
     Merge Helper
  ========================================================= */

  const mergeDashboardData =
    useCallback(
      (newData) => {
        setDashboardData(
          (current) => ({
            ...(current || {}),
            ...(newData || {}),
          })
        );
      },
      []
    );


  /* =========================================================
     Cancel Current Requests
  ========================================================= */

  const cancelCurrentRequests =
    useCallback(
      () => {
        if (
          summaryControllerRef.current
        ) {
          summaryControllerRef.current.abort();
        }

        if (
          detailsControllerRef.current
        ) {
          detailsControllerRef.current.abort();
        }

        summaryControllerRef.current =
          null;

        detailsControllerRef.current =
          null;
      },
      []
    );


  /* =========================================================
     Load Details
  ========================================================= */

  const loadDetails =
    useCallback(
      async (
        params,
        requestId
      ) => {
        if (
          detailsControllerRef.current
        ) {
          detailsControllerRef.current.abort();
        }

        const controller =
          new AbortController();

        detailsControllerRef.current =
          controller;

        try {
          if (
            requestId ===
            requestIdRef.current
          ) {
            setDetailsLoading(
              true
            );

            setDetailsError(
              ""
            );
          }

          const details =
            await dashboardService
              .getDashboardDetails(
                params,
                {
                  signal:
                    controller.signal,
                }
              );

          if (
            requestId !==
            requestIdRef.current
          ) {
            return null;
          }

          mergeDashboardData(
            details
          );

          setLastUpdated(
            new Date()
          );

          return details;
        } catch (err) {
          /*
           * Abort is expected when filters change,
           * refresh is clicked or component unmounts.
           */
          if (
            err?.name ===
            "AbortError"
          ) {
            return null;
          }

          if (
            requestId ===
            requestIdRef.current
          ) {
            setDetailsError(
              err?.message ||
                "Unable to load detailed dashboard analytics."
            );
          }

          return null;
        } finally {
          if (
            requestId ===
            requestIdRef.current
          ) {
            setDetailsLoading(
              false
            );
          }

          if (
            detailsControllerRef.current ===
            controller
          ) {
            detailsControllerRef.current =
              null;
          }
        }
      },
      [
        mergeDashboardData,
      ]
    );


  /* =========================================================
     Load Dashboard
  ========================================================= */

  const loadDashboard =
    useCallback(
      async (
        customParams = {}
      ) => {
        const currentFilters =
          appliedFiltersRef.current;

        const params = {
          start_date:
            customParams.start_date ??
            currentFilters.start_date,

          end_date:
            customParams.end_date ??
            currentFilters.end_date,
        };

        const requestId =
          ++requestIdRef.current;


        /*
         * Cancel previous summary/details requests.
         */

        cancelCurrentRequests();


        const summaryController =
          new AbortController();

        summaryControllerRef.current =
          summaryController;


        try {
          setLoading(
            true
          );

          setError(
            ""
          );

          setDetailsError(
            ""
          );


          /*
           * =================================================
           * Stage 1
           *
           * Load lightweight summary first.
           * Dashboard can render as soon as this finishes.
           * =================================================
           */

          const summary =
            await dashboardService
              .getDashboardSummary(
                params,
                {
                  signal:
                    summaryController.signal,
                }
              );


          if (
            requestId !==
            requestIdRef.current
          ) {
            return summary;
          }


          /*
           * Keep detailed data from previous render only
           * when using the same filter set.
           *
           * For a fresh filtered request we reset the
           * secondary sections so old filtered data is not
           * displayed as current.
           */

          const filtersChanged =
            params.start_date !==
              currentFilters.start_date ||
            params.end_date !==
              currentFilters.end_date;


          setDashboardData(
            (current) => ({
              ...(filtersChanged
                ? {}
                : current || {}),

              ...summary,

              generated_at:
                new Date()
                  .toISOString(),
            })
          );


          appliedFiltersRef.current =
            params;

          setAppliedFilters(
            params
          );

          setLastUpdated(
            new Date()
          );


          /*
           * Main dashboard is now ready.
           */

          setLoading(
            false
          );


          /*
           * =================================================
           * Stage 2
           *
           * Do NOT await this before rendering.
           * Detailed analytics load in background.
           * =================================================
           */

          loadDetails(
            params,
            requestId
          ).catch(
            () => {
              /*
               * loadDetails already stores
               * its own error.
               */
            }
          );


          return summary;
        } catch (err) {
          if (
            err?.name ===
            "AbortError"
          ) {
            return null;
          }

          if (
            requestId ===
            requestIdRef.current
          ) {
            setError(
              err?.message ||
                "Unable to load dashboard data."
            );
          }

          throw err;
        } finally {
          if (
            requestId ===
            requestIdRef.current
          ) {
            setLoading(
              false
            );
          }

          if (
            summaryControllerRef.current ===
            summaryController
          ) {
            summaryControllerRef.current =
              null;
          }
        }
      },
      [
        cancelCurrentRequests,
        loadDetails,
      ]
    );


  /* =========================================================
     Apply Filters
  ========================================================= */

  const applyFilters =
    useCallback(
      async ({
        start_date = "",
        end_date = "",
      } = {}) => {
        return loadDashboard({
          start_date,
          end_date,
        });
      },
      [
        loadDashboard,
      ]
    );


  /* =========================================================
     Reset Filters
  ========================================================= */

  const resetFilters =
    useCallback(
      async () => {
        return loadDashboard({
          start_date: "",
          end_date: "",
        });
      },
      [
        loadDashboard,
      ]
    );


  /* =========================================================
     Refresh
  ========================================================= */

  const refreshDashboard =
    useCallback(
      async () => {
        const currentFilters =
          appliedFiltersRef.current;

        return loadDashboard({
          start_date:
            currentFilters.start_date,

          end_date:
            currentFilters.end_date,
        });
      },
      [
        loadDashboard,
      ]
    );


  /* =========================================================
     Clear Errors
  ========================================================= */

  const clearError =
    useCallback(
      () => {
        setError("");
        setDetailsError("");
      },
      []
    );


  /* =========================================================
     Initial Load
  ========================================================= */

  useEffect(() => {
    if (
      !autoLoad ||
      initialLoadDoneRef.current
    ) {
      return;
    }

    initialLoadDoneRef.current =
      true;

    loadDashboard(
      EMPTY_FILTERS
    ).catch(
      () => {
        /*
         * Error already stored
         * inside hook.
         */
      }
    );
  }, [
    autoLoad,
    loadDashboard,
  ]);


  /* =========================================================
     Cleanup
  ========================================================= */

  useEffect(() => {
    return () => {
      requestIdRef.current +=
        1;

      cancelCurrentRequests();
    };
  }, [
    cancelCurrentRequests,
  ]);


  /* =========================================================
     Returned Values
  ========================================================= */

  return {
    dashboardData,

    overview:
      dashboardData?.overview ||
      null,

    sales:
      dashboardData?.sales ||
      null,

    orders:
      dashboardData?.orders ||
      null,

    payments:
      dashboardData?.payments ||
      null,

    products:
      dashboardData?.products ||
      null,

    customers:
      dashboardData?.customers ||
      null,

    coupons:
      dashboardData?.coupons ||
      null,

    reviews:
      dashboardData?.reviews ||
      null,

    charts:
      dashboardData?.charts ||
      null,

    recentActivity:
      dashboardData
        ?.recent_activity ||
      null,

    generatedAt:
      dashboardData
        ?.generated_at ||
      null,

    /*
     * loading:
     * only the fast summary is loading.
     *
     * detailsLoading:
     * slower analytics are loading in background.
     */
    loading,
    detailsLoading,

    error,
    detailsError,

    lastUpdated,
    appliedFilters,

    loadDashboard,
    applyFilters,
    resetFilters,
    refreshDashboard,
    clearError,

    hasData:
      Boolean(
        dashboardData
      ),

    hasSummary:
      Boolean(
        dashboardData?.overview
      ),

    hasDetails:
      Boolean(
        dashboardData?.products ||
        dashboardData?.charts ||
        dashboardData
          ?.recent_activity
      ),
  };
};


export default useDashboard;