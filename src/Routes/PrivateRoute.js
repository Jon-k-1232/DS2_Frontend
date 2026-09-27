import { Outlet, Navigate, useLocation } from 'react-router-dom';
import TokenService from '../Services/TokenService';

export default function PrivateRoutes() {
  const location=useLocation();
  if (!TokenService.hasAuthToken()) {
    return <Navigate replace to='/login' state={{from:location.pathname+location.search+location.hash}} />;
  }

  return <Outlet />;
}
