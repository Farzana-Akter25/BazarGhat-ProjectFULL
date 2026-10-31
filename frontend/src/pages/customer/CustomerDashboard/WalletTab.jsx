import { Wallet } from "lucide-react"; // balance icon badge
import { RefundHistoryContent } from "../../../components/customer/RefundHistoryModal"; // refunds + balance ledger
import { useGetWalletQuery } from "../../../features/customer/walletApi";

// The Refund Wallet panel: what the customer holds right now, and the full record behind it.
const WalletTab = ({ onShopNow }) => {
  const { data: wallet, isLoading } = useGetWalletQuery();
  // Current balance
  const balance = wallet?.balance ?? 0;

  return (
    <div className="space-y-6">
      {/* balance banner */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            {/* green wallet icon badge */}
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-50 text-green-700">
              <Wallet size={20} strokeWidth={2.25} />
            </div>
            <p className="mt-3 text-xs font-semibold tracking-wide text-slate-600 uppercase">
              Refund Wallet
            </p>
            {/* available balance */}
            <p className="mt-1 text-3xl font-bold text-slate-900">
              {isLoading ? (
                <span className="inline-block h-8 w-32 animate-pulse rounded bg-slate-200 align-middle" />
              ) : (
                `৳${balance.toFixed(2)}`
              )}
            </p>
            <p className="mt-1 text-xs font-medium text-slate-600">
              Refunds credited here are available to use on your next purchase.
            </p>
          </div>
          {/* a balance is only worth something on an order, so the way to spend it is offered next to the figure */}
          {balance > 0 && onShopNow && (
            <button
              type="button"
              onClick={onShopNow}
              className="rounded-xl bg-green-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-green-800"
            >
              Shop Now
            </button>
          )}
        </div>
        {/* the one thing a customer cannot do with it */}
        <p className="mt-4 rounded-xl bg-slate-50 px-4 py-3 text-xs leading-relaxed text-slate-600">
          The Refund Wallet can be spent on an online payment at checkout. It is
          not available on Cash on Delivery orders, and it cannot be withdrawn as
          cash.
        </p>
      </div>

      {/* refunds + balance ledger, the same panel the summary card opens */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <h3 className="text-base font-bold text-slate-800">Refund History</h3>
        <p className="mt-0.5 mb-4 text-xs text-slate-600">
          Every refund raised on your orders, and what has moved in and out of
          your wallet.
        </p>
        <RefundHistoryContent />
      </div>
    </div>
  );
};

export default WalletTab;
