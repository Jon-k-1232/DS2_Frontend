import jwtDecode from 'jwt-decode';

const TokenService = {
  saveAuthToken(token) {
    TokenService.clearAuthToken();
    return window.sessionStorage.setItem('token', token);
  },
  getAuthToken() {
    return window.sessionStorage.getItem('token');
  },
  clearAuthToken() {
    window.sessionStorage.removeItem('token');
  },
  hasAuthToken() {
    return !!TokenService.getAuthToken();
  },
  handleLogout() {
    window.sessionStorage.removeItem('userID');
    window.sessionStorage.removeItem('accountID');
    window.sessionStorage.removeItem('token');
  },
  tokenExpirationTime(memoryToken) {
    const token = memoryToken || window.sessionStorage.getItem('token');
    const decodedToken = jwtDecode(token);
    const expirationTimeInSeconds = decodedToken.exp;
    const expirationDate = new Date(expirationTimeInSeconds * 1000); // Convert to milliseconds

    return expirationDate;
  },
  tokenTimeLeft(memoryToken) {
    const token = memoryToken || window.sessionStorage.getItem('token');
    const decodedToken = jwtDecode(token);
    const expirationTimeInSeconds = decodedToken.exp;
    const expirationDate = new Date(expirationTimeInSeconds * 1000); // Convert to milliseconds

    const currentTime = new Date();
    const timeLeft = expirationDate - currentTime; // This will be in milliseconds

    return timeLeft;
  },
  isTokenExpired(memoryToken) {
    const token = memoryToken || window.sessionStorage.getItem('token');
    const decodedToken = jwtDecode(token);
    const currentTime = Date.now() / 1000;
    const isExpired = decodedToken.exp < currentTime;

    const resetContext = {
      accountID: null,
      userID: null,
      displayName: null,
      role: null,
      accessLevel: null,
      token: null
    };

    // If the token is expired
    if (isExpired) {
      window.sessionStorage.removeItem('userID');
      window.sessionStorage.removeItem('accountID');
      window.sessionStorage.removeItem('token');
    }
    return { isExpired, resetContext };
  }
};

export default TokenService;
