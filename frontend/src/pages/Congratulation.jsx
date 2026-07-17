import React from 'react';
import { CheckCircle } from 'lucide-react'; 
import { useNavigate } from 'react-router-dom';

const Congratulation = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-6">
      {/* Main Card */}
      <div className="bg-white max-w-sm w-full rounded-3xl shadow-xl p-8 text-center">
        
        {/* Green Circle with Check Icon */}
        <div className="flex justify-center mb-6">
          <div className="bg-green-500 p-4 rounded-full shadow-lg">
            <CheckCircle size={50} className="text-white" />
          </div>
        </div>

        {/* Text Content */}
        <h1 className="text-3xl font-bold text-gray-800 mb-2">Congratulations!</h1>
        <p className="text-gray-600 mb-6">Your order has been placed successfully!</p>

       
        {/* Payment Status */}
        <div className="bg-green-50 border border-green-200 text-green-700 py-3 rounded-xl mb-8 flex items-center justify-center gap-2">
          <CheckCircle size={18} />
          <span className="font-semibold italic">Confirmed</span>
        </div>

        {/* Back to Home Button */}
        <button 
          onClick={() => navigate('/')}
          className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 rounded-xl transition-colors"
        >
          Back to Home
        </button>

        <p className="text-xs text-gray-400 mt-6 italic">
          Redirecting to home page soon...
        </p>
      </div>
    </div>
  );
};

export default Congratulation;