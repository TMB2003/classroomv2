import React, { useState, useEffect } from "react";
import axios from "axios";
import { getToken } from "../../utils/auth";
import { useParams } from "react-router-dom";

const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
const timeSlots = ["9:00 AM", "10:00 AM", "11:00 AM", "1:00 PM", "2:00 PM", "3:00 PM", "4:00 PM"];

const Timetable = () => {
    const {id} = useParams();
    const [timetable, setTimetable] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedSlot, setSelectedSlot] = useState(null);
    const token = getToken();
    
    useEffect(() => {
        const fetchTimetable = async () => {
            try {
                const response = await axios.get("http://localhost:3001/api/timetable", {
                    headers: { Authorization: `Bearer ${token}` },
                });
                setTimetable(response.data.timetable || []);
            } catch (error) {
                console.error("Error fetching timetable:", error);
                setTimetable([]);
            } finally {
                setLoading(false);
            }
        };
        fetchTimetable();
    }, []);

    const openModal = (day, time, group) => {
        const currentSlot = getSlotContent(day, time, group);
        if (!currentSlot) return;
        setSelectedSlot({ day, time, group, subjectId: currentSlot.subject });
        setIsModalOpen(true);
    };

    const handleDeleteSlot = async () => {
        if (!selectedSlot || !selectedSlot.subjectId) {
            console.error("Error: No subject ID found for deletion.");
            return;
        }
    
        try {
            await axios.delete(`http://localhost:3001/api/teacher/class/${id}/delete`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            // selectedSlot.subjectId
            setTimetable((prev) =>
                prev.map((group) =>
                    group.studentGroup === selectedSlot.group.studentGroup
                        ? {
                              ...group,
                              schedule: group.schedule.filter(
                                  (slot) => !(slot.day === selectedSlot.day && slot.timeSlot === selectedSlot.time)
                              ),
                          }
                        : group
                )
            );
            setIsModalOpen(false);
        } catch (error) {
            console.error("Error deleting slot:", error);
        }
    };
    

    const getSlotContent = (day, time, group) => {
        return group.schedule.find((slot) => slot.day === day && slot.timeSlot === time) || null;
    };

    return (
        <div className="p-4">
            <h1 className="text-2xl font-bold mb-4">Timetable</h1>
            {loading ? (
                <div className="flex justify-center items-center h-64">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
                </div>
            ) : (
                timetable.map((group) => (
                    <div key={group.studentGroup} className="mb-8 bg-white rounded-lg shadow overflow-hidden">
                        <div className="px-6 py-4 bg-gray-50 border-b">
                            <h2 className="text-lg font-semibold text-gray-900">Group: {group.studentGroup}</h2>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">Time</th>
                                        {days.map((day) => (
                                            <th key={day} className="px-6 py-3 text-left text-xs font-medium text-gray-500">
                                                {day}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {timeSlots.map((time) => (
                                        <tr key={time}>
                                            <td className="px-6 py-4 text-sm font-medium text-gray-900">{time}</td>
                                            {days.map((day) => {
                                                const content = getSlotContent(day, time, group);
                                                return (
                                                    <td key={`${day}-${time}`} className="px-6 py-4">
                                                        {content ? (
                                                            <div
                                                                className="cursor-pointer hover:bg-gray-100 p-2 rounded"
                                                                onClick={() => openModal(day, time, group)}
                                                            >
                                                                <div className="font-medium text-blue-600">{content.subject}</div>
                                                                <div className="text-sm text-gray-600">{content.teacher}</div>
                                                                <div className="text-xs text-gray-500">Room {content.classroom}</div>
                                                            </div>
                                                        ) : (
                                                            <div className="text-gray-400 text-sm">No class</div>
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
                ))
            )}
            {isModalOpen && selectedSlot && (
                <div className="fixed inset-0 flex items-center justify-center bg-gray-900 bg-opacity-50">
                    <div className="bg-white p-6 rounded-lg shadow-lg">
                        <h2 className="text-lg font-semibold mb-4">Lecture Details</h2>
                        <p>Subject: {selectedSlot.subjectId}</p>
                        <p>Day: {selectedSlot.day}</p>
                        <p>Time: {selectedSlot.time}</p>
                        <div className="mt-4 flex justify-end space-x-3">
                            <button className="px-4 py-2 bg-gray-300 rounded" onClick={() => setIsModalOpen(false)}>
                                Close
                            </button>
                            <button className="px-4 py-2 bg-red-500 text-white rounded" onClick={handleDeleteSlot}>
                                Cancel Lecture
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Timetable;
