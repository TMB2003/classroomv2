import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../../components/layout/Layout';
import axios from 'axios';
import { getToken } from '../../utils/auth';
import toast from 'react-hot-toast';

const TeacherActivity = () => {
  const navigate = useNavigate();
  const [activities, setActivities] = useState([]);

  useEffect(() => {
    fetchActivities();
  }, []);

  const fetchActivities = async () => {
    try {
      const token = getToken();
      const response = await axios.get('http://localhost:3001/api/teacher/activities', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setActivities(response.data);
    } catch (error) {
      console.error('Error fetching activities:', error);
      toast.error('Failed to fetch activities');
    }
  };

  return (
    <Layout>
      <div className="container mx-auto px-4">
        <h1 className="text-2xl font-bold mb-6">My Activities</h1>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="space-y-4">
            {activities.map((activity, index) => (
              <div key={index} className="border-b pb-4">
                <h3 className="text-lg font-semibold">{activity.title}</h3>
                <p className="text-gray-600">{activity.description}</p>
                <div className="mt-2 text-sm text-gray-500">
                  {new Date(activity.date).toLocaleDateString()}
                </div>
              </div>
            ))}
            {activities.length === 0 && (
              <p className="text-gray-500 text-center">No activities found</p>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default TeacherActivity;
