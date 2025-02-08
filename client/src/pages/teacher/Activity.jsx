import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { UserIcon, AcademicCapIcon } from '@heroicons/react/24/outline';
import { getToken } from '../../utils/auth';
import Layout from '../../components/layout/Layout';
import axios from 'axios';

const Activity = () => {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState([]);
  const navigate = useNavigate();

  // Fetch student groups
  // Fetch student groups
useEffect(() => {
  const fetchGroups = async () => {
    try {
      setLoading(true);
      const token = getToken();
      
      const response = await axios.get('http://localhost:3001/api/teacher/batches', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.data.length > 0) {
        // Map through the response and include studentCount in each group
        const updatedGroups = response.data.map(group => ({
          ...group,
          studentCount: group.studentCount // Ensure studentCount is added
        }));
        setGroups(updatedGroups);
      } else {
        toast.error('No batches found for this teacher');
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to fetch batches');
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  fetchGroups();
}, []);

  
  // Fetch notifications
  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const token = getToken();
        const response = await axios.get('http://localhost:3001/api/teacher/notifications', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        setNotifications(response.data);
      } catch (error) {
        toast.error('Error fetching notifications');
        console.error('Error:', error);
      }
    };

    fetchNotifications();
  }, []);

  // Reschedule a lecture
  const rescheduleLecture = async (lectureId, targetSlot) => {
    try {
      const response = await axios.post(
        'http://localhost:3001/api/activity/lecture/reschedule',
        { lectureId, targetSlot },
        {
          headers: {
            'Authorization': `Bearer ${getToken()}`
          }
        }
      );
      toast.success('Lecture rescheduled successfully');
    } catch (error) {
      toast.error('Error rescheduling lecture');
      console.error('Error:', error);
    }
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        {/* Student Groups Display */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">My Classes</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
  {loading ? (
    // Loading skeleton
    Array(3).fill(0).map((_, index) => (
      <div key={index} className="bg-white rounded-lg shadow-lg overflow-hidden animate-pulse">
        <div className="h-24 bg-gray-200"></div>
        <div className="p-4">
          <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
    ))
  ) : groups.length === 0 ? (
    // No classes message
    <div className="col-span-3 text-center py-8">
      <AcademicCapIcon className="mx-auto h-12 w-12 text-gray-400" />
      <h3 className="mt-2 text-sm font-medium text-gray-900">No Classes</h3>
      <p className="mt-1 text-sm text-gray-500">You haven't been assigned to any classes yet.</p>
    </div>
  ) : (
    // Classes grid
    groups.map((group) => (
      <div
        key={group._id}
        className="bg-white rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 cursor-pointer"
        onClick={() => navigate(`/teacher/class/${group._id}`)}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-semibold text-white">
              Grade {group.grade}-{group.section}
            </h3>
            <span className="bg-blue-500 text-white text-sm py-1 px-2 rounded-full">
              {group.studentCount} students
            </span>
          </div>
          <p className="text-blue-100 mt-1">{group.name}</p>
        </div>

        {/* Body */}
        <div className="p-4">
          <div className="mb-4">
            <h4 className="text-sm font-medium text-gray-500">Subjects</h4>
            <div className="mt-2 flex flex-wrap gap-2">
              {group.subjects && group.subjects.length > 0 ? (
                group.subjects.map((subject, index) => (
                  <span
                    key={index}
                    className="bg-blue-50 text-blue-700 text-sm py-1 px-2 rounded-full"
                  >
                    {subject.name} {/* Or any field in subject */}
                  </span>
                ))
              ) : (
                <p className="text-sm text-gray-500">No subjects assigned</p>
              )}
            </div>
          </div>

          {/* Quick actions */}
          <div className="mt-4 pt-4 border-t border-gray-100">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Click to view details</span>
              <span className="text-blue-600">→</span>
            </div>
          </div>
        </div>
      </div>
    ))
  )}
</div>

        </div>

        {/* Notifications */}
        <div className="mt-8">
          <h3 className="text-2xl font-bold text-gray-900 mb-6">Notifications</h3>
          <div className="space-y-4">
            {notifications.length === 0 && !loading && (
              <div className="text-center py-8 bg-white rounded-lg">
                <p className="text-sm text-gray-500">No new notifications</p>
              </div>
            )}

            {notifications.map((notification) => (
              <div
                key={notification._id}
                className="bg-white p-4 rounded-lg shadow-lg flex justify-between items-center"
              >
                <div>
                  <h4 className="font-semibold text-gray-800">{notification.title}</h4>
                  <p className="text-sm text-gray-600">{notification.message}</p>
                </div>
                <button
                  onClick={() => rescheduleLecture(notification.metadata.requestedLecture, notification.metadata.targetSlot)}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
                >
                  Reschedule
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Activity;
