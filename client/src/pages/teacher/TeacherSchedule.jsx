import React, { useState, useEffect } from 'react';
import Layout from '../../components/layout/Layout';
import axios from 'axios';
import { getToken } from '../../utils/auth';
import toast from 'react-hot-toast';
import Modal from '../../components/common/Modal';

const TeacherSchedule = () => {
  const [schedule, setSchedule] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [rescheduleData, setRescheduleData] = useState({
    newDay: '',
    newTimeSlot: ''
  });

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
  const timeSlots = [
    '9:00 AM', '10:00 AM', '11:00 AM', '12:00 PM',
    '1:00 PM', '2:00 PM', '3:00 PM', '4:00 PM'
  ];

  useEffect(() => {
    fetchSchedule();
  }, []);

  const fetchSchedule = async () => {
    try {
      const token = getToken();
      const response = await axios.get('http://localhost:3001/api/teacher/schedule', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSchedule(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching schedule:', error);
      toast.error('Failed to fetch schedule');
      setLoading(false);
    }
  };

  const getClassForTimeSlot = (day, timeSlot) => {
    return schedule.find(slot => 
      slot.day === day && 
      slot.timeSlot === timeSlot
    );
  };

  const handleSlotClick = (slot) => {
    if (slot) {
      setSelectedSlot(slot);
      setShowCancelModal(true);
    }
  };

  const handleCancelClass = async () => {
    try {
      const token = getToken();
      await axios.post('http://localhost:3001/api/teacher/cancel-class', {
        day: selectedSlot.day,
        timeSlot: selectedSlot.timeSlot,
        subject: selectedSlot.subject
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Class cancelled successfully');
      fetchSchedule();
    } catch (error) {
      toast.error('Failed to cancel class');
    }
    setShowCancelModal(false);
  };

  const handleRescheduleClick = (slot) => {
    if (slot) {
      setSelectedSlot(slot);
      setShowRescheduleModal(true);
    }
  };

  const handleReschedule = async () => {
    try {
      const token = getToken();
      await axios.post('http://localhost:3001/api/teacher/reschedule-class', {
        oldDay: selectedSlot.day,
        oldTimeSlot: selectedSlot.timeSlot,
        newDay: rescheduleData.newDay,
        newTimeSlot: rescheduleData.newTimeSlot,
        subject: selectedSlot.subject
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Class rescheduled successfully');
      fetchSchedule();
    } catch (error) {
      toast.error('Failed to reschedule class');
    }
    setShowRescheduleModal(false);
  };

  const getSlotColor = (slot) => {
    if (!slot) return 'bg-gray-50';
    
    const colors = [
      'bg-blue-100 hover:bg-blue-200',
      'bg-green-100 hover:bg-green-200',
      'bg-yellow-100 hover:bg-yellow-200',
      'bg-purple-100 hover:bg-purple-200',
      'bg-pink-100 hover:bg-pink-200',
      'bg-indigo-100 hover:bg-indigo-200'
    ];
    
    const index = slot.subject.length % colors.length;
    return colors[index];
  };

  return (
    <Layout>
      <div className="flex flex-col h-screen bg-gray-100">
        <div className="p-6 bg-white shadow-sm">
          <div className="max-w-7xl mx-auto">
            <h1 className="text-2xl font-bold text-gray-900">My Teaching Schedule</h1>
            <p className="text-gray-500 mt-2">View and manage your weekly teaching schedule</p>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center flex-grow">
            <p className="text-gray-500">Loading schedule...</p>
          </div>
        ) : (
          <div className="flex-grow p-6">
            <div className="max-w-7xl mx-auto">
              <div className="bg-white rounded-lg shadow-md overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full border-collapse">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="sticky left-0 z-10 bg-gray-50 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b w-32">
                          Day
                        </th>
                        {timeSlots.map(timeSlot => (
                          <th key={timeSlot} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b min-w-[160px]">
                            {timeSlot}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {days.map(day => (
                        <tr key={day}>
                          <td className="sticky left-0 z-10 bg-gray-50 px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 border-r w-32">
                            {day}
                          </td>
                          {timeSlots.map(timeSlot => {
                            const slot = getClassForTimeSlot(day, timeSlot);
                            return (
                              <td key={`${day}-${timeSlot}`} className="px-4 py-4 whitespace-nowrap border-r min-w-[160px]">
                                {slot ? (
                                  <div className={`p-3 rounded-lg ${getSlotColor(slot)} relative group`}>
                                    <div className="font-medium text-gray-900">
                                      {slot.subject}
                                    </div>
                                    <div className="text-sm text-gray-600">
                                      Room {slot.room}
                                    </div>
                                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black bg-opacity-20 rounded-lg">
                                      <button
                                        onClick={() => handleSlotClick(slot)}
                                        className="mx-1 px-2 py-1 bg-red-500 text-white rounded text-xs hover:bg-red-600"
                                      >
                                        Cancel
                                      </button>
                                      <button
                                        onClick={() => handleRescheduleClick(slot)}
                                        className="mx-1 px-2 py-1 bg-blue-500 text-white rounded text-xs hover:bg-blue-600"
                                      >
                                        Reschedule
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="h-16"></div>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Cancel Class Modal */}
      {showCancelModal && selectedSlot && (
        <Modal
          isOpen={showCancelModal}
          onClose={() => setShowCancelModal(false)}
          title="Cancel Class"
        >
          <div className="p-6">
            <p className="mb-4">Are you sure you want to cancel this class?</p>
            <p className="mb-4">
              <strong>Subject:</strong> {selectedSlot.subject}<br />
              <strong>Day:</strong> {selectedSlot.day}<br />
              <strong>Time:</strong> {selectedSlot.timeSlot}<br />
              <strong>Room:</strong> {selectedSlot.room}
            </p>
            <div className="flex justify-end gap-4">
              <button
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
                onClick={() => setShowCancelModal(false)}
              >
                No, Keep It
              </button>
              <button
                className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
                onClick={handleCancelClass}
              >
                Yes, Cancel Class
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Reschedule Class Modal */}
      {showRescheduleModal && selectedSlot && (
        <Modal
          isOpen={showRescheduleModal}
          onClose={() => setShowRescheduleModal(false)}
          title="Reschedule Class"
        >
          <div className="p-6">
            <p className="mb-4">Current Schedule:</p>
            <p className="mb-4">
              <strong>Subject:</strong> {selectedSlot.subject}<br />
              <strong>Day:</strong> {selectedSlot.day}<br />
              <strong>Time:</strong> {selectedSlot.timeSlot}<br />
              <strong>Room:</strong> {selectedSlot.room}
            </p>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700">New Day</label>
              <select
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                value={rescheduleData.newDay}
                onChange={(e) => setRescheduleData(prev => ({ ...prev, newDay: e.target.value }))}
              >
                <option value="">Select Day</option>
                {days.map(day => (
                  <option key={day} value={day}>{day}</option>
                ))}
              </select>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700">New Time Slot</label>
              <select
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                value={rescheduleData.newTimeSlot}
                onChange={(e) => setRescheduleData(prev => ({ ...prev, newTimeSlot: e.target.value }))}
              >
                <option value="">Select Time</option>
                {timeSlots.map(time => (
                  <option key={time} value={time}>{time}</option>
                ))}
              </select>
            </div>
            <div className="flex justify-end gap-4">
              <button
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
                onClick={() => setShowRescheduleModal(false)}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                onClick={handleReschedule}
                disabled={!rescheduleData.newDay || !rescheduleData.newTimeSlot}
              >
                Reschedule Class
              </button>
            </div>
          </div>
        </Modal>
      )}
    </Layout>
  );
};

export default TeacherSchedule;