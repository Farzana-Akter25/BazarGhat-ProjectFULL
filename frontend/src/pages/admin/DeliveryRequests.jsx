import { Bell, Check, Package, X } from "lucide-react"; // icons for request types + actions
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { formatDate } from "../../utils/formatDate";
import { Card, StatusBadge } from "../../components/admin/AdminUI"; // shared card wrapper + status pill
import DataTable, { TD } from "../../components/shared/DataTable"; // shared table shell
import { shortId } from "../../utils/shortId";
import {
  useGetAdminDeliveryRequestsQuery,
  useUpdateDeliveryRequestStatusMutation,
} from "../../features/admin/deliveryRequestApi";
import AdminLayout from "../../layouts/AdminLayout"; // shared admin page frame

// type filter chip labels — rejections are not listed here.
const FILTERS = ["All", "Day Off"];

// request table columns
const COLUMNS = [
  { label: "#" },
  { label: "Type" },
  { label: "Delivery Man" },
  { label: "Related Order" },
  { label: "Message" },
  { label: "Date" },
  { label: "Status" },
  { label: "Actions" },
];

// Admin page listing delivery men's requests (approve / reject)
const DeliveryRequests = () => {
  // Router helper
  const navigate = useNavigate();
  const { data: requests = [], isLoading } = useGetAdminDeliveryRequestsQuery(); // request list from api
  const [updateStatus] = useUpdateDeliveryRequestStatusMutation(); // approve/reject mutation
  const [filter, setFilter] = useState("All"); // active type filter chip

  // requests matching the active type filter
  const filtered = useMemo(
    () => requests.filter((r) => filter === "All" || r.type === filter),
    [requests, filter],
  );

  // pending count shown in summary line
  const pendingCount = requests.filter((r) => r.status === "Pending").length;

  return (
    <AdminLayout
      title="Delivery Man Request"
      subtitle="Day-off requests and other delivery-man requests"
      backTo={{
        to: "/admindashboard",
        onClick: () => navigate("/admindashboard"),
      }}
    >
      <Card>
        {/* summary + type filters */}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          {/* pending count summary text */}
          <p className="text-sm text-slate-700">
            <span className="font-bold text-slate-800">{pendingCount}</span>{" "}
            pending of {requests.length} total
          </p>
          {/* type filter chips */}
          <div className="flex flex-wrap gap-2">
            {FILTERS.map((f) => (
              // filter chip, green when active
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                  filter === f
                    ? "bg-green-700 text-white"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {/* requests table */}
        <DataTable
          columns={COLUMNS}
          isLoading={isLoading}
          loadingText="Loading requests..."
          isEmpty={filtered.length === 0}
          emptyText="No requests match this filter."
        >
          {filtered.map((req, idx) => (
            // request row
            <tr key={req.id} className="align-top hover:bg-slate-50">
              {/* row number cell */}
              <td className={`${TD} text-slate-600`}>{idx + 1}</td>
              {/* request type cell */}
              <td className={TD}>
                <div className="flex items-center gap-2">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-700">
                    <Bell size={13} />
                  </span>
                  <span className="font-semibold whitespace-nowrap text-slate-800">
                    {req.type}
                  </span>
                </div>
              </td>
              {/* delivery man name + staff code cell */}
              <td className={TD}>
                <p className="font-medium text-slate-700">
                  {req.deliveryManName}
                </p>
                <p className="mt-0.5 text-xs text-slate-600">
                  {req.deliveryManCode}
                </p>
              </td>
              {/* related order cell, only for order-linked requests */}
              <td className={TD}>
                {req.orderNumber ? (
                  <>
                    <p
                      className="flex items-center gap-1 font-semibold text-blue-600"
                      title={req.orderNumber}
                    >
                      <Package size={12} /> {shortId(req.orderNumber)}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-600">
                      {req.customerName}
                    </p>
                  </>
                ) : (
                  <span className="text-slate-500">—</span>
                )}
              </td>
              {/* request message cell */}
              <td className={`${TD} max-w-xs`}>
                <p className="text-slate-700">{req.message}</p>
              </td>
              {/* date + request code cell */}
              <td className={TD}>
                <p className="whitespace-nowrap text-slate-700">
                  {formatDate(req.date)}
                </p>
                <p className="mt-0.5 text-xs text-slate-600">{req.code}</p>
              </td>
              {/* status badge cell */}
              <td className={TD}>
                <StatusBadge status={req.status} />
              </td>
              {/* action buttons cell */}
              <td className={TD}>
                <div className="flex flex-wrap items-center gap-2">
                  {req.status === "Pending" && (
                    <>
                      {/* approve button */}
                      <button
                        onClick={() =>
                          updateStatus({ id: req.id, status: "Approved" })
                        }
                        className="flex items-center gap-1 rounded-lg bg-green-50 px-3 py-1.5 text-xs font-semibold text-green-700 hover:bg-green-100"
                      >
                        <Check size={12} />
                        Approve
                      </button>
                      {/* reject button */}
                      <button
                        onClick={() =>
                          updateStatus({ id: req.id, status: "Rejected" })
                        }
                        className="flex items-center gap-1 rounded-lg bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-100"
                      >
                        <X size={12} />
                        Reject
                      </button>
                    </>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </DataTable>
      </Card>
    </AdminLayout>
  );
};

export default DeliveryRequests;
