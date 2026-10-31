import { ArrowLeft, Bell, CheckCheck, ChevronLeft, ChevronRight } from "lucide-react"; // icons
import { useState } from "react";
import { useNavigate } from "react-router-dom";

import useAuth from "../../hooks/useAuth";
import { formatRelativeTime } from "../../utils/formatDate";
import notificationTarget from "../../utils/notificationTarget";
import {
  useGetNotificationsQuery,
  useMarkAllNotificationsReadMutation,
  useMarkNotificationReadMutation,
} from "../../features/customer/notificationApi";
import {
  useGetDeliveryNotificationsQuery,
  useMarkAllDeliveryNotificationsReadMutation,
  useMarkDeliveryNotificationReadMutation,
} from "../../features/delivery/notificationApi";
import {
  useGetAdminNotificationsQuery,
  useMarkAllAdminNotificationsReadMutation,
  useMarkAdminNotificationReadMutation,
} from "../../features/admin/notificationApi";

// The full notification history, for whichever role is signed in.
const NotificationsPage = () => {
  // Router, login state and current page number
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  const [page, setPage] = useState(1);

  // Which role is signed in
  const role = user?.role;
  const isCustomer = isAuthenticated && role === "customer";
  const isDelivery = isAuthenticated && role === "delivery";
  const isAdmin = isAuthenticated && role === "admin";

  // Only the signed-in role's query runs; the other two are skipped.
  const customer = useGetNotificationsQuery(page, { skip: !isCustomer });
  // Delivery and admin queries
  const delivery = useGetDeliveryNotificationsQuery(page, { skip: !isDelivery });
  const admin = useGetAdminNotificationsQuery(page, { skip: !isAdmin });

  // Mark-as-read actions for each role
  const [markCustomerRead] = useMarkNotificationReadMutation();
  const [markDeliveryRead] = useMarkDeliveryNotificationReadMutation();
  const [markAdminRead] = useMarkAdminNotificationReadMutation();
  const [markAllCustomerRead] = useMarkAllNotificationsReadMutation();
  const [markAllDeliveryRead] = useMarkAllDeliveryNotificationsReadMutation();
  const [markAllAdminRead] = useMarkAllAdminNotificationsReadMutation();

  // Pick the data and actions for the signed-in role
  const active = isAdmin ? admin : isDelivery ? delivery : customer;
  const markRead = isAdmin ? markAdminRead : isDelivery ? markDeliveryRead : markCustomerRead;
  const markAllRead = isAdmin
    ? markAllAdminRead
    : isDelivery
      ? markAllDeliveryRead
      : markAllCustomerRead;

  // Notifications, unread count and paging info
  const notifications = active.data?.notifications ?? [];
  const unreadCount = active.data?.unreadCount ?? 0;
  const meta = active.data?.meta;
  // isLoading is the first load only, so paging does not blank the list.
  const loading = active.isLoading;

  // Marks read, then goes to the existing page this notification is about.
  const open = (notification) => {
    if (!notification.read) {
      markRead(notification.id);
    }

    // Page this notification should open
    const target = notificationTarget(notification, role);

    if (target) {
      navigate(target);
    }
  };

  return (
    // page wrapper
    <div className="min-h-screen bg-gray-100 p-4 sm:p-6">
      <div className="mx-auto max-w-3xl">
        {/* back link */}
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="mb-3 inline-flex items-center gap-1 text-sm font-semibold text-slate-600 hover:text-orange-600"
        >
          <ArrowLeft size={14} /> Back
        </button>

        {/* card */}
        <div className="rounded-2xl bg-white shadow">
          {/* card header */}
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-4 sm:px-6">
            <div className="flex items-center gap-2">
              <Bell size={18} className="text-orange-500" />
              <h1 className="text-lg font-bold text-slate-800">Notifications</h1>
              {/* unread total, straight from the backend */}
              {unreadCount > 0 && (
                <span className="rounded-full bg-orange-100 px-2 py-0.5 text-[11px] font-bold text-orange-700">
                  {unreadCount} unread
                </span>
              )}
            </div>

            {/* mark all read action */}
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={() => markAllRead()}
                className="flex items-center gap-1 text-xs font-semibold text-orange-600 hover:text-orange-700"
              >
                <CheckCheck size={14} /> Mark all read
              </button>
            )}
          </div>

          {/* list */}
          <div>
            {loading ? (
              // Nothing is shown until the server answers — no placeholder rows and no count that could turn out to be wrong.
              <p className="px-4 py-10 text-center text-sm text-slate-400">
                Loading notifications...
              </p>
            ) : notifications.length === 0 ? (
              // empty state
              <p className="px-4 py-10 text-center text-sm text-slate-400">
                No notifications yet.
              </p>
            ) : (
              notifications.map((n) => (
                <button
                  type="button"
                  key={n.id}
                  onClick={() => open(n)}
                  className={`flex w-full items-start gap-3 border-b border-slate-50 px-4 py-4 text-left transition-colors last:border-b-0 hover:bg-slate-50 sm:px-6 ${
                    n.read ? "" : "bg-orange-50/50"
                  }`}
                >
                  {/* unread dot indicator */}
                  <span
                    className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                      n.read ? "bg-transparent" : "bg-orange-500"
                    }`}
                  />

                  <span className="min-w-0 flex-1">
                    {/* notification title, when the entry carries one */}
                    {n.title && (
                      <span className="block text-sm font-bold text-slate-800">
                        {n.title}
                      </span>
                    )}
                    {/* notification message text */}
                    <span className="block text-sm text-slate-600">{n.message}</span>
                    {/* relative timestamp */}
                    <span className="mt-1 block text-[11px] text-slate-400">
                      {formatRelativeTime(n.createdAt)}
                    </span>
                  </span>
                </button>
              ))
            )}
          </div>

          {/* pagination, only once there is more than one page */}
          {meta && meta.lastPage > 1 && (
            <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 sm:px-6">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-slate-600 disabled:opacity-40 enabled:hover:bg-slate-100"
              >
                <ChevronLeft size={14} /> Previous
              </button>

              <span className="text-xs text-slate-500">
                Page {meta.currentPage} of {meta.lastPage}
              </span>

              <button
                type="button"
                onClick={() => setPage((p) => Math.min(meta.lastPage, p + 1))}
                disabled={page >= meta.lastPage}
                className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-slate-600 disabled:opacity-40 enabled:hover:bg-slate-100"
              >
                Next <ChevronRight size={14} />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default NotificationsPage;
