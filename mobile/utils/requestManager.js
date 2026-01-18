/**
 * Request Manager - Handles cancellation of active API requests on logout
 * Prevents app from making unnecessary API calls after user signs out
 */

let activeRequests = new Map();


export const registerRequest = (requestId, cancelTokenSource) => {
    activeRequests.set(requestId, cancelTokenSource);
};
export const unregisterRequest = (requestId) => {
    activeRequests.delete(requestId);
};
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
    const count = activeRequests.size;
    console.log(`🛑 Cancelling ${count} active API requests...`);
    
    activeRequests.forEach((source, requestId) => {
        try {
            source.cancel('User logged out - request cancelled');
            console.log(`   ✓ Cancelled request: ${requestId}`);
        } catch (e) {
            // Request may have already completed
            console.log(`   ⚠️  Failed to cancel ${requestId}:`, e.message);
        }
    });
    
    activeRequests.clear();
    console.log('✅ All requests cancelled');
};


/**
 * Get number of active requests (for debugging)
 */
export const getActiveRequestCount = () => activeRequests.size;