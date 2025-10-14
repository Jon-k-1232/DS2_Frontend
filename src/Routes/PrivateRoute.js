import { Outlet, Navigate } from 'react-router-dom';
import { useContext } from 'react';
import TokenService from '../Services/TokenService';
import { context } from '../App';

export default function PrivateRoutes() {
  const { loggedInUser } = useContext(context);

  if (!TokenService.hasAuthToken()) {
    return <Navigate to='/login' />;
  }

  if (loggedInUser?.requiresPasswordReset) {
    return <Navigate to='/reset-password' replace />;
  }

  return <Outlet />;
}
