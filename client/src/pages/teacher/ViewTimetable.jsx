import React, { useState, useEffect } from 'react';
import Layout from '../../components/layout/Layout';
import axios from 'axios';
import { getToken } from '../../utils/auth';
import toast from 'react-hot-toast';

const ViewTimetable = () => {
  const [timetable, setTimetable] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
  const timeSlots = [
    '9:00 AM', '10:00 AM', '11:00 AM', '12:00 PM',
    '1:00 PM', '2:00 PM', '3:00 PM', '4:00 PM'
  ];

  useEffect(() => {
    fetchTimetable();
  }, []);

  const fetchTimetable = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = getToken();
      const response = await axios.get('http://localhost:3001/api/teacher/timetable', {
        headers: { Authorization: `Bearer ${token}` },
      });
      console.log('Timetable data:', response.data); // For debugging
      setTimetable(response.data);
    } catch (error) {
      console.error('Error fetching timetable:', error);
      setError(error.response?.data?.message || 'Failed to fetch timetable');
      toast.error(error.response?.data?.message || 'Failed to fetch timetable');
    } finally {
      setLoading(false);
    }
  };

  const getClassForTimeSlot = (day, time) => {
    return timetable.find(slot => 
      slot.day === day && 
      slot.startTime === time
    );
  };

  const getSlotColor = (slot) => {
    if (!slot) return 'bg-gray-50';
    return 'bg-blue-50 hover:bg-blue-100';
  };

  if (error) {
    return (
      <Layout>
        <div className="p-6">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <h2 className="text-red-800 font-medium">Error Loading Timetable</h2>
            <p className="text-red-600 mt-1">{error}</p>
            <button
              onClick={fetchTimetable}
              className="mt-3 px-4 py-2 bg-red-100 text-red-800 rounded-md hover:bg-red-200"
            >
              Try Again
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Schedule</h1>
          <p className="text-gray-500 mt-2">View and manage your weekly teaching schedule</p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-sm font-medium text-gray-500">Total Classes</h3>
            <p className="mt-2 text-3xl font-semibold text-gray-900">
              {timetable.length}
            </p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-sm font-medium text-gray-500">Weekly Hours</h3>
            <p className="mt-2 text-3xl font-semibold text-gray-900">
              {timetable.length} hrs
            </p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-sm font-medium text-gray-500">Unique Subjects</h3>
            <p className="mt-2 text-3xl font-semibold text-gray-900">
              {new Set(timetable.map(slot => slot.subject)).size}
            </p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-sm font-medium text-gray-500">Free Slots</h3>
            <p className="mt-2 text-3xl font-semibold text-gray-900">
              {(timeSlots.length * days.length) - timetable.length}
            </p>
          </div>
        </div>

        {/* Timetable Grid */}
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
              <p className="text-gray-500 mt-4">Loading timetable...</p>
            </div>
          </div>
        ) : (
          <div className="bg-white shadow-lg rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse">
                <thead>
                  <tr>
                    <th className="sticky left-0 z-10 bg-gray-50 px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                      Time
                    </th>
                    {days.map(day => (
                      <th key={day} className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b min-w-[150px]">
                        {day}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {timeSlots.map(time => (
                    <tr key={time}>
                      <td className="sticky left-0 z-10 bg-gray-50 px-3 py-2 whitespace-nowrap text-xs font-medium text-gray-900 border-r">
                        {time}
                      </td>
                      {days.map(day => {
                        const slot = getClassForTimeSlot(day, time);
                        return (
                          <td key={`${day}-${time}`} className="px-2 py-2 whitespace-nowrap border-r">
                            {slot ? (
                              <div className={`p-2 rounded ${getSlotColor(slot)} transition-colors duration-150`}>
                                <div className="font-medium text-xs text-gray-900">
                                  {slot.subject}
                                </div>
                                <div className="text-xs text-gray-600">
                                  Room {slot.room}
                                </div>
                                <div className="text-xs text-gray-600">
                                  {slot.studentGroup}
                                </div>
                              </div>
                            ) : (
                              <div className="h-12 bg-gray-50 rounded"></div>
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
        )}

        {/* Legend */}
        <div className="bg-white p-4 rounded-lg shadow-md">
          <h3 className="text-sm font-medium text-gray-900 mb-2">Legend</h3>
          <div className="flex space-x-4">
            <div className="flex items-center">
              <span className="w-3 h-3 bg-blue-50 rounded-full mr-2"></span>
              <span className="text-sm text-gray-600">Scheduled Class</span>
            </div>
            <div className="flex items-center">
              <span className="w-3 h-3 bg-gray-50 rounded-full mr-2"></span>
              <span className="text-sm text-gray-600">Free Slot</span>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default ViewTimetable;
