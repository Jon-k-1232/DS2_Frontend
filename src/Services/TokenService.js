// The session JWT now lives in an httpOnly cookie that JavaScript cannot read,
// so an XSS can no longer steal it. The browser sends the cookie automatically
// (axios is configured with withCredentials). Here we keep only a NON-sensitive
// expiry marker in sessionStorage so the UI can gate protected routes and react
// to session expiry without ever holding the token itself.

const AUTH_MARKER = 'cookie-session';
const DEFAULT_TTL_MS = 11 * 60 * 60 * 1000; // mirrors backend JWT_EXPIRATION (11h)

const clearSessionKeys = () => {
   ['userID', 'accountID', 'accessLevel', 'displayName', 'role', 'authExpiresAt', 'token'].forEach(key => window.sessionStorage.removeItem(key));
};

const TokenService = {
   // Record (only) when the session should be considered expired client-side.
   startSession(ttlMs = DEFAULT_TTL_MS) {
      window.sessionStorage.setItem('authExpiresAt', String(Date.now() + ttlMs));
      return AUTH_MARKER;
   },

   // Non-sensitive sentinel placed in app context where a token used to live.
   authMarker() {
      return AUTH_MARKER;
   },

   getExpiresAt() {
      const value = window.sessionStorage.getItem('authExpiresAt');
      return value ? Number(value) : null;
   },

   // Authenticated if we have a known user and the session hasn't expired.
   hasAuthToken() {
      const expiresAt = TokenService.getExpiresAt();
      return !!expiresAt && expiresAt > Date.now() && !!window.sessionStorage.getItem('userID');
   },

   // Retained for any defensive callers — there is no JS-readable token anymore.
   getAuthToken() {
      return TokenService.hasAuthToken() ? AUTH_MARKER : null;
   },

   handleLogout() {
      clearSessionKeys();
   },

   isTokenExpired() {
      const expiresAt = TokenService.getExpiresAt();
      const isExpired = !expiresAt || expiresAt <= Date.now();
      const resetContext = {
         accountID: null,
         userID: null,
         displayName: null,
         role: null,
         accessLevel: null,
         token: null
      };
      if (isExpired) clearSessionKeys();
      return { isExpired, resetContext };
   }
};

export default TokenService;
