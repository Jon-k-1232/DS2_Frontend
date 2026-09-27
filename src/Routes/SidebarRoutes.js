import navigation from './navigation.json';

export const canOpenPage = (user, permission = 'staff') => {
   const role = (user?.accessLevel || '').toLowerCase();
   if (permission === 'super') return role === 'super admin';
   if (permission === 'admin') return ['admin', 'super admin'].includes(role);
   if (permission === 'manager') return ['admin', 'super admin', 'manager', 'owner'].includes(role);
   return Boolean(role);
};

export const sidebarRoutes = navigation;
export const buildSidebarRoutes = user => navigation.map(group => ({
   ...group,
   children: group.children.filter(page => canOpenPage(user, page.permission))
})).filter(group => group.children.length);

export function pageForPath(pathname) {
   return navigation.flatMap(group => group.children.map(page => ({ ...page, group: group.title })))
      .sort((a, b) => b.path.length - a.path.length)
      .find(page => pathname === page.path || pathname.startsWith(page.path + '/'));
}
export default sidebarRoutes;
