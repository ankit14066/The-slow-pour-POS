import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from '../api/axios';
import toast from 'react-hot-toast';

const FeedbackForm = () => {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ ratingOverall: 5, ratingTaste: 5, ratingSpeed: 5, comment: '' });
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`/feedback/${orderId}`, formData);
      setSubmitted(true);
      toast.success('Thank you for your feedback!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error submitting feedback');
    }
  };

  const StarRating = ({ label, value, onChange }) => (
    <div className="mb-6">
      <label className="block text-gray-700 font-bold mb-2">{label}</label>
      <div className="flex gap-2">
        {[1, 2, 3, 4, 5].map(star => (
          <button
            key={star}
            type="button"
            onClick={() => onChange(star)}
            className={`text-4xl transition-transform active:scale-90 ${star <= value ? 'text-yellow-400' : 'text-gray-300'}`}
          >
            ★
          </button>
        ))}
      </div>
    </div>
  );

  if (submitted) {
    return (
      <div className="min-h-screen bg-cream-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center">
          <div className="text-6xl mb-4">🎉</div>
          <h1 className="text-3xl font-black text-brown-800 mb-2">Thank You!</h1>
          <p className="text-gray-600">We appreciate your feedback and hope to see you again soon.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cream-50 flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full border-t-8 border-brown-600">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-black text-brown-800">How was your experience?</h1>
          <p className="text-sm text-gray-500 mt-2">The Slow Pour</p>
        </div>

        <form onSubmit={handleSubmit}>
          <StarRating 
            label="Overall Experience" 
            value={formData.ratingOverall} 
            onChange={(v) => setFormData({...formData, ratingOverall: v})} 
          />
          <StarRating 
            label="Taste & Quality" 
            value={formData.ratingTaste} 
            onChange={(v) => setFormData({...formData, ratingTaste: v})} 
          />
          <StarRating 
            label="Speed of Service" 
            value={formData.ratingSpeed} 
            onChange={(v) => setFormData({...formData, ratingSpeed: v})} 
          />

          <div className="mb-6">
            <label className="block text-gray-700 font-bold mb-2">Any comments? (Optional)</label>
            <textarea 
              className="w-full border border-gray-300 rounded p-3 focus:outline-none focus:ring-2 focus:ring-brown-500 h-24 resize-none"
              placeholder="Tell us what you loved or what we can improve..."
              value={formData.comment}
              onChange={e => setFormData({...formData, comment: e.target.value})}
            />
          </div>

          <button 
            type="submit" 
            className="w-full bg-brown-600 text-white font-bold text-lg py-4 rounded-xl shadow-lg hover:bg-brown-700 transition"
          >
            Submit Feedback
          </button>
        </form>
      </div>
    </div>
  );
};

export default FeedbackForm;
