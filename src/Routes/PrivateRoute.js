import { Outlet, Navigate } from 'react-router-dom';
import TokenService from '../Services/TokenService';

export default function PrivateRoutes() {
  return TokenService.hasAuthToken() ? <Outlet /> : <Navigate to='/login' />;
}
