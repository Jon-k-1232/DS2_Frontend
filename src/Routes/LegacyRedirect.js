import { Navigate, useLocation } from 'react-router-dom';
import { canonicalPath } from './routePaths';
import SelectionRecovery from '../Components/Workspace/SelectionRecovery';

export default function LegacyRedirect() {
   const location = useLocation();
   const target = canonicalPath(location.pathname + location.search + location.hash, location.state);
   if (target === location.pathname + location.search + location.hash) return <SelectionRecovery />;
   return <Navigate replace to={target} state={location.state} />;
}
