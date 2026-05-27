import { Outlet, Navigate } from 'react-router-dom';
import TokenService from '../Services/TokenService';

export default function PrivateRoutes() {
  if (!TokenService.hasAuthToken()) {
    return <Navigate to='/login' />;
  }

  return <Outlet />;
}
