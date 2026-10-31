import { Wallet } from "lucide-react"; // balance icon badge
import { useState } from "react";
import { useGetWalletQuery } from "../../features/customer/walletApi";
import RefundHistoryModal from "./RefundHistoryModal";

// The customer's BazarGhat refund balance, in the same card shape as the other dashboard summary cards.
const RefundBalanceCard = () => {
  const { data: wallet, isLoading } = useGetWalletQuery();
  const [showHistory, setShowHistory] = useState(false); // refund history modal

  return (
    <>
      {/* refund balance card */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        {/* green wallet icon badge */}
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-green-50 text-green-700">
          <Wallet size={18} strokeWidth={2.25} />
        </div>
        {/* card label */}
        <p className="mt-3 text-xs font-semibold tracking-wide text-slate-600 uppercase">
          Refund Wallet
        </p>
        {/* available balance */}
        <p className="mt-1 text-2xl font-bold text-slate-900">
          {isLoading ? (
            <span className="inline-block h-7 w-24 animate-pulse rounded bg-slate-200 align-middle" />
          ) : (
            `৳${(wallet?.balance ?? 0).toFixed(2)}`
          )}
        </p>
        {/* what it can be used for */}
        <p className="text-xs font-medium text-slate-600">
          Available to use on your next purchase
        </p>
        {/* open the full refund history */}
        <button
          type="button"
          onClick={() => setShowHistory(true)}
          className="mt-3 text-xs font-semibold text-orange-600 hover:text-orange-700 hover:underline"
        >
          View Refund History →
        </button>
      </div>

      {showHistory && (
        <RefundHistoryModal onClose={() => setShowHistory(false)} />
      )}
    </>
  );
};

export default RefundBalanceCard;
