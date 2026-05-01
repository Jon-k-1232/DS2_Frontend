import { useCallback, useContext, useEffect, useRef, useState } from 'react';
import { context } from '../../App';
import { fetchNotifications, fetchUnreadCount, markNotificationRead, markAllNotificationsRead } from '../../Services/ApiCalls/NotificationsCalls';

const POLL_INTERVAL_MS = 60_000;

export default function useNotifications() {
   const { accountID, userID, token } = useContext(context).loggedInUser || {};
   const [unreadCount, setUnreadCount] = useState(0);
   const [items, setItems] = useState([]);
   const [loading, setLoading] = useState(false);
   const intervalRef = useRef(null);

   const refreshCount = useCallback(async () => {
      if (!accountID || !userID) return;
      const c = await fetchUnreadCount(accountID, userID, token);
      setUnreadCount(c);
   }, [accountID, userID, token]);

   const refreshItems = useCallback(async () => {
      if (!accountID || !userID) return;
      setLoading(true);
      const res = await fetchNotifications(accountID, userID, token);
      setItems(res?.notifications || []);
      setLoading(false);
   }, [accountID, userID, token]);

   const markRead = useCallback(async notificationId => {
      if (!accountID || !userID) return;
      await markNotificationRead(accountID, userID, notificationId, token);
      await refreshCount();
      await refreshItems();
   }, [accountID, userID, token, refreshCount, refreshItems]);

   const markAllRead = useCallback(async () => {
      if (!accountID || !userID) return;
      await markAllNotificationsRead(accountID, userID, token);
      await refreshCount();
      await refreshItems();
   }, [accountID, userID, token, refreshCount, refreshItems]);

   useEffect(() => {
      if (!accountID || !userID) return undefined;
      refreshCount();
      const onVisibility = () => {
         if (document.hidden) {
            if (intervalRef.current) clearInterval(intervalRef.current);
            intervalRef.current = null;
         } else if (!intervalRef.current) {
            intervalRef.current = setInterval(refreshCount, POLL_INTERVAL_MS);
            refreshCount();
         }
      };
      intervalRef.current = setInterval(refreshCount, POLL_INTERVAL_MS);
      document.addEventListener('visibilitychange', onVisibility);
      return () => {
         if (intervalRef.current) clearInterval(intervalRef.current);
         document.removeEventListener('visibilitychange', onVisibility);
      };
   }, [accountID, userID, refreshCount]);

   return { unreadCount, items, loading, refreshItems, markRead, markAllRead };
}
