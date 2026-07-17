import { Award, Star } from "lucide-react";

const initials = (name) =>
  name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase();

const DashboardHeader = ({ customer }) => {
  return (
    <div className="relative flex flex-col gap-5 overflow-hidden rounded-2xl bg-gradient-to-br from-orange-600 via-orange-500 to-emerald-600 p-6 sm:flex-row sm:items-center sm:justify-between sm:p-7">
      <div
        className="pointer-events-none absolute -top-16 -right-16 h-56 w-56 rounded-full bg-white/10"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute -bottom-20 left-1/3 h-48 w-48 rounded-full bg-black/5"
        aria-hidden="true"
      />

      <div className="relative flex items-center gap-4">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-white/25 bg-white/15 text-lg font-bold text-white">
          {initials(customer.name)}
        </div>
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white sm:text-2xl">
            Welcome back, {customer.firstName}!
          </h1>
          <p className="text-sm text-white/80">
            Manage your orders and track deliveries
          </p>
        </div>
      </div>

      <div className="relative flex items-center gap-3">
        <div className="flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 backdrop-blur-sm">
          <Award size={16} className="text-white/80" />
          <div>
            <p className="text-[10px] font-medium tracking-wide text-white/70 uppercase">
              Member Since
            </p>
            <p className="text-sm font-semibold text-white">
              {customer.memberSince}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 backdrop-blur-sm">
          <Star size={16} className="text-white/80" />
          <div>
            <p className="text-[10px] font-medium tracking-wide text-white/70 uppercase">
              Loyalty Points
            </p>
            <p className="text-sm font-semibold text-white">
              {customer.loyaltyPoints}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardHeader;
