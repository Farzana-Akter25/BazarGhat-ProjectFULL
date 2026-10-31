import { Bell, Check, CheckCheck, MoreVertical, Trash2 } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import ConfirmDialog from "./ConfirmDialog";
import { formatDateTime } from "../../utils/formatDate";

// format timestamp for display, day-month-year plus the clock time
const formatAt = (iso) => formatDateTime(iso);


// Bell icon with unread badge and a dropdown list of notifications
const NotificationBell = ({
  notifications = [], // list of notification objects
  unreadCount = 0, // badge count
  onMarkRead, // mark single notification read
  onMarkAllRead, // mark all notifications read
  onDelete, // delete a notification
  onOpenNotification, // click handler: marks read, then navigates if the notification points somewhere
  viewAllTo = "/notifications", // full notifications page
  dark = false, // dark-header variant styling
}) => {
  const [open, setOpen] = useState(false); // dropdown panel visibility
  const [menuOpenId, setMenuOpenId] = useState(null); // which item's options menu is open
  const [deletingId, setDeletingId] = useState(null); // id pending delete confirmation

  return (
    <div className="relative">
      {/* bell toggle button */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`flex flex-col items-center group ${dark ? "text-white" : ""}`}
        aria-label="Notifications"
      >
        <span className="relative">
          {/* bell icon */}
          <Bell
            className={`w-5 h-5 transition ${
              dark ? "group-hover:text-white/80" : "group-hover:text-orange-500"
            }`}
          />
          {/* unread count badge */}
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-2 bg-orange-600 text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </span>
        <span className="text-[11px]">Alerts</span>
      </button>

      {open && (
        <>
          {/* click-away backdrop */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => {
              setOpen(false);
              setMenuOpenId(null);
            }}
          />
          {/* dropdown panel */}
          <div className="absolute right-0 z-20 mt-2 w-80 max-w-[90vw] rounded-2xl border border-slate-200 bg-white shadow-xl">
            {/* panel header */}
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
              <p className="text-sm font-bold text-slate-800">Notifications</p>
              {/* mark all read action */}
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={onMarkAllRead}
                  className="flex items-center gap-1 text-xs font-semibold text-orange-600 hover:text-orange-700"
                >
                  <CheckCheck size={13} /> Mark all read
                </button>
              )}
            </div>
            <div className="max-h-80 overflow-y-auto">
              {notifications.length === 0 ? (
                // empty state
                <p className="px-4 py-6 text-center text-xs text-slate-400">
                  No notifications yet.
                </p>
              ) : (
                // notification list items
                notifications.map((n) => (
                  <div
                    key={n.id}
                    className={`relative flex w-full items-start gap-2 border-b border-slate-50 px-4 py-3 transition-colors last:border-b-0 hover:bg-slate-50 ${
                      n.read ? "" : "bg-orange-50/50"
                    }`}
                  >
                    {/* click to mark this one read */}
                    <button
                      type="button"
                      onClick={() => {
                        // Without a click handler the bell behaves exactly as it did before: mark read in place, panel stays open.
                        if (!onOpenNotification) {
                          if (!n.read) onMarkRead?.(n.id);
                          return;
                        }

                        onOpenNotification(n);
                        setOpen(false);
                      }}
                      className="flex min-w-0 flex-1 items-start gap-2 text-left"
                    >
                      {/* unread dot indicator */}
                      <span
                        className={`mt-1 h-1.5 w-1.5 shrink-0 rounded-full ${
                          n.read ? "bg-transparent" : "bg-orange-500"
                        }`}
                      />
                      <span className="min-w-0 flex-1">
                        {/* notification title, when the entry carries one */}
                        {n.title && (
                          <span className="block text-xs font-bold text-slate-800">
                            {n.title}
                          </span>
                        )}
                        {/* notification message text */}
                        <span className="block text-xs font-medium text-slate-700">
                          {n.message}
                        </span>
                        {/* timestamp */}
                        <span className="mt-0.5 block text-[10px] text-slate-400">
                          {formatAt(n.createdAt)}
                        </span>
                      </span>
                      {/* read checkmark */}
                      {n.read && <Check size={13} className="mt-1 shrink-0 text-slate-300" />}
                    </button>

                    <div className="relative shrink-0">
                      {/* per-item options toggle */}
                      <button
                        type="button"
                        onClick={() => setMenuOpenId((id) => (id === n.id ? null : n.id))}
                        className="flex h-6 w-6 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                        aria-label="Notification options"
                      >
                        <MoreVertical size={14} />
                      </button>

                      {/* per-item options menu */}
                      {menuOpenId === n.id && (
                        <div className="absolute right-0 z-30 mt-1 w-32 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg">
                          {/* delete option, opens confirm dialog */}
                          <button
                            type="button"
                            onClick={() => {
                              setDeletingId(n.id);
                              setMenuOpenId(null);
                            }}
                            className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-medium text-red-600 hover:bg-red-50"
                          >
                            <Trash2 size={13} /> Delete
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* full notifications page */}
            <div className="border-t border-slate-100 px-4 py-2 text-center">
              <Link
                to={viewAllTo}
                onClick={() => setOpen(false)}
                className="text-xs font-semibold text-orange-600 hover:text-orange-700"
              >
                View all
              </Link>
            </div>
          </div>
        </>
      )}

      {/* delete confirmation dialog */}
      <ConfirmDialog
        open={!!deletingId}
        title="Delete Notification"
        message="Are you sure you want to delete this notification? This cannot be undone."
        onConfirm={() => {
          onDelete?.(deletingId);
          setDeletingId(null);
        }}
        onCancel={() => setDeletingId(null)}
      />
    </div>
  );
};

export default NotificationBell;
