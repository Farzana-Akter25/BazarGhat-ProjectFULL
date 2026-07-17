import React, { useState } from "react";
import { ArrowLeft, Printer, Eye } from "lucide-react";
import { useNavigate } from "react-router-dom";

const OrderPage = () => {
  const [selectedOrder, setSelectedOrder] = useState(null);
  const navigate = useNavigate();

  const company = {
    name: "BazarGhat",
    address: "Uttara, Dhaka, Bangladesh",
    phone: "01947938237",
    email: "support@bazargat.com",
  };

  const customer = {
    name: "Farzana Akter",
    phone: "01947938237",
    email: "farzana@gmail.com",
    address: "Uttara, Dhaka",
  };

  // Ekhane multiple orders thakte pare, state-er upor depend kore invoice change hobe
  const orders = [
    {
      id: "1001",
      date: "2026-05-02",
      status: "Delivered",
      items: [
        { name: "T-Shirt", qty: 2, price: 500 },
        { name: "Cap", qty: 1, price: 200 },
      ],
    },
    {
      id: "1002",
      date: "2026-05-04",
      status: "Pending",
      items: [
        { name: "Sneakers", qty: 1, price: 2500 },
        { name: "Socks", qty: 3, price: 150 },
      ],
    },
  ];

  // Dynamic Total Calculation
  const calculateTotal = (items) =>
    items.reduce((sum, i) => sum + i.qty * i.price, 0);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6 font-sans print:bg-white print:p-0">
      <div className="max-w-4xl mx-auto">
        
        {/* Back Button */}
        <div className="mb-8 print:hidden">
          <button
            onClick={() => (selectedOrder ? setSelectedOrder(null) : navigate(-1))}
            className="flex items-center gap-2 text-[#4B5E7D] hover:text-[#ff6b00] transition-colors group"
          >
            <ArrowLeft size={24} strokeWidth={2} />
            <span className="text-xl font-medium">Back</span>
          </button>
        </div>

        {!selectedOrder ? (
          /* Order List View */
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h1 className="text-3xl font-black text-gray-900 mb-8">Order History</h1>
            <div className="space-y-4">
              {orders.map((order) => (
                <div key={order.id} className="bg-white p-6 rounded-[24px] flex justify-between items-center shadow-sm border border-gray-100">
                  <div>
                    <h2 className="font-bold text-lg text-gray-800">Order #{order.id}</h2>
                    <p className="text-sm text-gray-400 font-medium">{order.date}</p>
                  </div>
                  <button 
                    onClick={() => setSelectedOrder(order)} 
                    className="bg-[#ff6b00] text-white px-6 py-3 rounded-xl flex items-center gap-2 font-bold"
                  >
                    <Eye size={18} /> View Invoice
                  </button>
                </div>
              ))}
            </div>
          </div>
        ) : (
          /* Dynamic Invoice View (Depends on selectedOrder) */
          <div className="flex flex-col items-center">
            <div 
              id="printable-invoice" 
              className="bg-white p-8 md:p-12 rounded-[40px] shadow-2xl border border-gray-50 w-full print:shadow-none print:border-none print:p-0 print:w-[210mm] print:mx-auto"
            >
              <div className="flex justify-between items-start border-b border-gray-100 pb-8 mb-8">
                <div>
                  <h1 className="text-4xl font-black text-[#ff6b00] tracking-tighter">{company.name}</h1>
                  <div className="text-sm text-gray-400 mt-2">
                    <p>{company.address}</p>
                    <p>{company.phone} | {company.email}</p>
                  </div>
                </div>
                <div className="text-right">
                  <h2 className="text-2xl font-black text-gray-300 tracking-widest uppercase">Invoice</h2>
                  <p className="font-bold text-gray-800 text-xl">#{selectedOrder.id}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-8 mb-12">
                <div>
                  <p className="text-gray-400 font-bold uppercase text-[10px] tracking-widest mb-3">Details</p>
                  <p className="text-sm"><b>Date:</b> {selectedOrder.date}</p>
                  <p className="text-sm"><b>Status:</b> {selectedOrder.status}</p>
                </div>
                <div className="text-right">
                  <p className="text-gray-400 font-bold uppercase text-[10px] tracking-widest mb-3">Bill To</p>
                  <h3 className="font-bold text-gray-900 text-lg">{customer.name}</h3>
                  <div className="text-sm text-gray-400">
                    <p>{customer.phone}</p>
                    <p>{customer.address}</p>
                  </div>
                </div>
              </div>

              {/* Items Table - Dynamically Rendered */}
              <div className="overflow-hidden rounded-3xl border border-gray-50 mb-10">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 text-gray-400 font-bold uppercase text-[10px] tracking-widest">
                      <th className="p-5 text-left">Product</th>
                      <th className="p-5 text-center">Qty</th>
                      <th className="p-5 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedOrder.items.map((item, i) => (
                      <tr key={i} className="border-b border-gray-50 last:border-0">
                        <td className="p-5 text-left font-bold text-base">{item.name}</td>
                        <td className="p-5 text-center">{item.qty}</td>
                        <td className="p-5 text-right font-medium">{item.qty * item.price} BDT</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-between items-center py-6 border-t border-gray-100 mb-8">
                <span className="text-gray-500 font-bold uppercase tracking-[3px] text-xs">Total Amount</span>
                <span className="text-4xl font-black text-[#0f172a]">৳{calculateTotal(selectedOrder.items)}</span>
              </div>

              <div className="text-center mt-12">
                <p className="text-gray-400 text-sm font-medium">
                  Thank you for shopping with {company.name} ❤️
                </p>
              </div>
            </div>

            <div className="mt-8 print:hidden w-full sm:w-auto">
              <button
                onClick={handlePrint}
                className="w-full bg-gray-900 hover:bg-[#ff6b00] text-white px-10 py-4 rounded-2xl flex items-center justify-center gap-2 font-bold transition-all shadow-xl active:scale-95"
              >
                <Printer size={20} /> Print One Page
              </button>
            </div>
          </div>
        )}
      </div>

      <style>{`
        @media print {
          body, html { height: 100%; margin: 0; overflow: hidden; }
          @page { size: auto; margin: 0mm; }
          #printable-invoice { height: 100vh; padding: 20mm !important; }
        }
      `}</style>
    </div>
  );
};

export default OrderPage;