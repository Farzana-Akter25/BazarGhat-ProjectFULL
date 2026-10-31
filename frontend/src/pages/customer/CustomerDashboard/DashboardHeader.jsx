import { Award } from "lucide-react"; // member-since badge icon

// "Month Year" formatted join date
const memberSince = (createdAt) => {
  if (!createdAt) return "—";
  return new Date(createdAt).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
};

// Greeting header at the top of the customer dashboard
const DashboardHeader = ({ user }) => {
  const fullName = user?.name || "Customer"; // customer full name

  return (
    // header card: name left, member badge right
    <div className="flex flex-col gap-4 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-6">
      {/* customer name block */}
      <div>
        {/* customer full name */}
        <h1 className="text-2xl font-black tracking-tight text-slate-900 lg:text-[28px]">
          {fullName}
        </h1>
        {/* subtitle */}
        <p className="text-sm text-slate-600">
          Manage your orders and track deliveries
        </p>
      </div>

      {/* member since badge */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2.5 rounded-xl border border-orange-100 bg-orange-50/60 px-4 py-2.5">
          {/* orange award icon */}
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-orange-500 text-white shadow-sm">
            <Award size={16} />
          </div>
          <div>
            {/* badge label */}
            <p className="text-[10px] font-bold tracking-wide text-orange-600 uppercase">
              Member Since
            </p>
            {/* formatted join date */}
            <p className="text-sm font-bold text-slate-800">
              {memberSince(user?.created_at)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardHeader;
