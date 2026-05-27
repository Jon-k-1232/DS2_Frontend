const CUSTOMER_ACCESS_LEVELS = ['admin', 'manager', 'super admin'];

export const getDefaultLandingRoute = accessLevel => {
   const normalized = typeof accessLevel === 'string' ? accessLevel.toLowerCase() : '';
   return CUSTOMER_ACCESS_LEVELS.includes(normalized) ? '/customers/customersList' : '/time-tracking/upload';
};
