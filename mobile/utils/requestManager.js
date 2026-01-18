/**
 * Request Manager - Handles cancellation of active API requests on logout
 * Prevents app from making unnecessary API calls after user signs out
 */

let activeRequests = [];

// Create axios interceptor for tracking requests
export const setupRequestCancellation = (axiosInstance) => {
    // Store request sources
    axiosInstance.interceptors.request.use(
        config => {
            const source = axiosInstance.CancelToken.source();
            config.cancelToken = source.token;
            activeRequests.push(source);
            return config;
        },
        error => Promise.reject(error)
    );

    // Clean up completed requests
    axiosInstance.interceptors.response.use(
        response => {
            if (activeRequests.length > 0) {
                activeRequests.shift();
            }
            return response;
        },
        error => {
            if (activeRequests.length > 0) {
                activeRequests.shift();
            }
            return Promise.reject(error);
        }
    );
};

/**
 * Cancel all active API requests
 * Call this when user logs out to prevent orphaned requests
 */
export const cancelAllRequests = () => {
    console.log(`🛑 Cancelling ${activeRequests.length} active API requests...`);
    activeRequests.forEach(source => {
        try {
            source.cancel('User logged out - request cancelled');
        } catch (e) {
            // Request may have already completed
        }
    });
    activeRequests = [];
};

/**
 * Get number of active requests (for debugging)
 */
export const getActiveRequestCount = () => activeRequests.length;
