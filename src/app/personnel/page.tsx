"use client";
import React, { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Layout from "../components/Layout";
import Header from "../components/Header";
import Confirmpopup from "../components/Confirmpopup";
import AddDriverModal from "../components/AddDriverModal";
import AddAssistantOfficerModal from "../components/AddAssistantOfficerModal";
import EditDriverModal from "../components/EditDriverModal";
import EditAssistantOfficerModal from "../components/EditAssistantOfficerModal";
import Pagination from "../components/Pagination"; // Import Pagination Component
import { FaPlus, FaHistory } from "react-icons/fa";
import PersonnelRecord from "@/app/components/PersonnelRecord";
import { getAllProfiles, deleteProfile } from "@/app/services/userProfile";
import HistoryModal from "../components/HistoryModal";
import ViewBioDataModal from "../components/ViewBioDataModal";
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import AddDispatcherModal from "../components/AddDispatcherModal";
import EditDispatcherModal from "../components/EditDispatcherModal";

const extractHistoryFromProfiles = (profiles) => {
  return profiles.map((profile) => ({
    details: `${profile.profile.first_name} ${profile.profile.last_name}`,
    position: profile.profile.position,
    date_hired: profile.profile.date_hired || "N/A", // Assuming created_at as date hired
    status: profile.profile.status || "Active", // Replace with the correct status field if available
  }));
};

const ButtonGroup = ({ activeButton, onClick, onViewHistory }) => {
  return (
    <div className="flex flex-col md:flex-row space-x-0 md:space-x-10 m-5 ml-5 mb-2">
      <button
        className={`px-4 py-2 border-2 rounded-md transition-colors duration-300 ease-in-out w-full md:w-auto ${
          activeButton === "drivers"
            ? "bg-blue-500 text-white"
            : "bg-gray-200 text-gray-800"
        }`}
        onClick={() => onClick("drivers")}
      >
        Drivers
      </button>
      <button
        className={`px-4 py-2 border-2 rounded-md transition-colors duration-300 ease-in-out w-full md:w-auto ${
          activeButton === "conductors"
            ? "bg-blue-500 text-white"
            : "bg-gray-200 text-gray-800"
        }`}
        onClick={() => onClick("conductors")}
      >
        Passenger Assistant Officer
      </button>
      <button
        className={`px-4 py-2 border-2 rounded-md transition-colors duration-300 ease-in-out w-full md:w-auto ${
          activeButton === "dispatchers"
            ? "bg-blue-500 text-white"
            : "bg-gray-200 text-gray-800"
        }`}
        onClick={() => onClick("dispatchers")}
      >
        Dispatchers
      </button>
      <button
        className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 flex items-center w-full md:w-auto mt-2 md:mt-0"
        onClick={onViewHistory}
      >
        <FaHistory className="mr-2" />
        View History
      </button>
    </div>
  );
};

const calculateAge = (birthday) => {
  const birthDate = new Date(birthday);
  const ageDiff = Date.now() - birthDate.getTime();
  return new Date(ageDiff).getUTCFullYear() - 1970;
};

const Personnel = () => {
  const queryClient = useQueryClient();
  const [activeButton, setActiveButton] = useState("drivers");
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 3;
  const [isDeletePopupOpen, setIsDeletePopupOpen] = useState(false);
  const [deleteRecordId, setDeleteRecordId] = useState(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedProfileId, setSelectedProfileId] = useState(null);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [personnelHistory, setPersonnelHistory] = useState([]);
  const [isViewBioDataModalOpen, setIsViewBioDataModalOpen] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [toastKey, setToastKey] = React.useState(0);
  const toastId = React.useRef<string | number | null>(null);

  const showToast = async (operation: Promise<any>) => {
    // Dismiss all existing toasts
    toast.dismiss();
    // Force remount toast container
    setToastKey(prev => prev + 1);
    
    // Show loading toast
    toastId.current = toast.loading("Processing request...", {
      position: "top-right",
      closeButton: false,
      closeOnClick: false,
      pauseOnHover: false,
      draggable: false,
      progress: undefined
    });

    try {
      await operation;
      
      // Update toast to success
      toast.update(toastId.current, {
        render: "New personnel added successfully!",
        type: "success",
        isLoading: false,
        autoClose: 2000,
        closeButton: false,
        closeOnClick: false,
        pauseOnHover: false,
        draggable: false,
        onClose: () => {
          toastId.current = null;
          setToastKey(prev => prev + 1);
        }
      });
    } catch (error) {
      // Update toast to error
      toast.update(toastId.current, {
        render: "Failed to add new personnel. Please try again.",
        type: "error",
        isLoading: false,
        autoClose: 2000,
        closeButton: false,
        closeOnClick: false,
        pauseOnHover: false,
        draggable: false,
        onClose: () => {
          toastId.current = null;
          setToastKey(prev => prev + 1);
        }
      });
    }
  };

  // Replace useEffect with useQuery
  const { data: profiles = [], isLoading, isError } = useQuery({
    queryKey: ['profiles'],
    queryFn: getAllProfiles
  });

  // Add delete mutation
  const deleteMutation = useMutation({
    mutationFn: deleteProfile,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profiles'] });
      setDeleteRecordId(null);
      setIsDeletePopupOpen(false);
      showToast(Promise.resolve());
    },
    onError: (error) => {
      console.error("Error deleting profile:", error);
      showToast(Promise.reject());
    }
  });

  const openHistoryModal = () => {
    const history = extractHistoryFromProfiles(profiles);
    setPersonnelHistory(history);
    setIsHistoryModalOpen(true);
  };

  const filteredProfiles = profiles
    .filter(
      (item) =>
        item.profile &&
        (activeButton === "drivers"
          ? item.profile.position === "driver"
          : activeButton === "conductors"
          ? item.profile.position === "passenger_assistant_officer"
          : item.profile.position === "dispatcher")
    )
    .filter((profile) =>
      `${profile.profile.first_name} ${profile.profile.last_name}`
        .toLowerCase()
        .includes(searchTerm.toLowerCase())
    );

  const totalPages = Math.ceil(filteredProfiles.length / itemsPerPage);
  const paginatedProfiles = filteredProfiles.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Update handlers to use mutations
  const confirmDelete = () => {
    if (deleteRecordId) {
      deleteMutation.mutate(deleteRecordId);
    }
  };

  const handleAddNew = async (newProfile) => {
    const operation = async () => {
      const formattedProfile = {
        profile: newProfile,
      };
      
      queryClient.setQueryData(['profiles'], (old: any) => [...(old || []), formattedProfile]);
      setIsAddModalOpen(false);
      await queryClient.invalidateQueries({ queryKey: ['profiles'] });
    };

    await showToast(operation());
  };

  const handleSaveEdit = (updatedProfile) => {
    // Optimistically update the cache
    queryClient.setQueryData(['profiles'], (old: any) =>
      old.map((profile) =>
        profile.profile.user_profile_id === updatedProfile.user_profile_id
          ? { ...profile, profile: updatedProfile }
          : profile
      )
    );
    setIsEditModalOpen(false);
    // Invalidate and refetch
    queryClient.invalidateQueries({ queryKey: ['profiles'] });
    showToast(Promise.resolve());
  };

  const handleViewBioData = (profileId) => {
    const profile = profiles.find(
      (profile) => profile.profile.user_profile_id === profileId
    );
    setSelectedProfile(profile);
    setIsViewBioDataModalOpen(true);
  };

  const handleDelete = (recordId) => {
    setDeleteRecordId(recordId);
    setIsDeletePopupOpen(true);
  };

  const cancelDelete = () => {
    setDeleteRecordId(null);
    setIsDeletePopupOpen(false); // Close the popup when Cancel is clicked
  };

  const handleEdit = (profileId) => {
    setSelectedProfileId(profileId);
    setIsEditModalOpen(true);
  };

  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      toast.dismiss();
      if (toastId.current) {
        toast.dismiss(toastId.current);
      }
    };
  }, []);

  return (
    <Layout>
      <section className="flex flex-row h-screen bg-white">
        <div className="w-full flex flex-col bg-slate-200">
          <Header title="Bus Personnel Management" />
          <div className="content flex flex-col flex-1">
            <ButtonGroup
              activeButton={activeButton}
              onClick={setActiveButton}
              onViewHistory={openHistoryModal}
            />
            <div className="options flex flex-col sm:flex-row items-center space-y-3 sm:space-y-0 sm:space-x-3 p-4 w-full sm:w-9/12 ml-1">
              <input
                type="text"
                placeholder={`Find ${activeButton}`}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="flex-1 px-4 py-2 border border-gray-500 rounded-md text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 w-full sm:w-auto"
                style={{ height: "42px" }}
              />
              <button
                className="flex items-center px-4 py-2 border-2 border-blue-500 rounded-md text-blue-500 transition-colors duration-300 ease-in-out hover:bg-blue-50 w-full sm:w-auto"
                onClick={() => setIsAddModalOpen(true)}
                style={{ height: "42px" }}
              >
                <FaPlus size={22} className="mr-2 " />
                Add New
              </button>
            </div>

            {isLoading ? (
              <div className="text-center text-blue-500 mt-10">Loading personnel data...</div>
            ) : isError ? (
              <div className="text-center text-red-500 mt-10">Error loading personnel records.</div>
            ) : filteredProfiles.length === 0 ? (
              <div className="text-center text-gray-500 mt-10">No personnel records found.</div>
            ) : (
              <div className="records flex flex-col h-full">
                <div className="output grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 mt-3 ml-5">
                  {paginatedProfiles.map((profile) => (
                    <PersonnelRecord
                      key={profile.profile.user_profile_id}
                      driverId={profile.profile.user_profile_id}
                      driverName={`${profile.profile.first_name} ${profile.profile.last_name}`}
                      birthday={profile.profile.date_of_birth}
                      age={calculateAge(profile.profile.date_of_birth)}
                      licenseNumber={profile.profile.license_number}
                      address={profile.profile.address}
                      contactNumber={profile.profile.contact_number}
                      contactPerson={profile.profile.contact_person}
                      onDelete={() => handleDelete(profile.profile.user_profile_id)}
                      onEdit={() => handleEdit(profile.profile.user_profile_id)}
                      onView={() => handleViewBioData(profile.profile.user_profile_id)}
                    />
                  ))}
                </div>
                <div className="pagination-container mb-[46%]">
                  <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={setCurrentPage}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
        {activeButton === "drivers" ? (
          <AddDriverModal
            isOpen={isAddModalOpen}
            onClose={() => setIsAddModalOpen(false)}
            onSave={handleAddNew}
          />
        ) : activeButton === "conductors" ? (
          <AddAssistantOfficerModal
            isOpen={isAddModalOpen}
            onClose={() => setIsAddModalOpen(false)}
            onSave={handleAddNew}
          />
        ) : (
          <AddDispatcherModal
            isOpen={isAddModalOpen}
            onClose={() => setIsAddModalOpen(false)}
            onSave={handleAddNew}
          />
        )}
        {activeButton === "drivers" ? (
          <EditDriverModal
            isOpen={isEditModalOpen}
            onClose={() => setIsEditModalOpen(false)}
            userProfileId={selectedProfileId}
            onSave={handleSaveEdit}
          />
        ) : activeButton === "conductors" ? (
          <EditAssistantOfficerModal
            isOpen={isEditModalOpen}
            onClose={() => setIsEditModalOpen(false)}
            userProfileId={selectedProfileId}
            onSave={handleSaveEdit}
          />
        ) : (
          <EditDispatcherModal
            isOpen={isEditModalOpen}
            onClose={() => setIsEditModalOpen(false)}
            userProfileId={selectedProfileId}
            onSave={handleSaveEdit}
          />
        )}
        <ViewBioDataModal
          isOpen={isViewBioDataModalOpen}
          onClose={() => setIsViewBioDataModalOpen(false)}
          profile={selectedProfile}
        />
        <Confirmpopup
          isOpen={isDeletePopupOpen}
          onClose={cancelDelete} // This will be called when Cancel is clicked
          onConfirm={confirmDelete} // This will be called when Confirm is clicked
          title="Delete Profile"
          message="Are you sure you want to delete this profile?"
        />
        <HistoryModal
          isOpen={isHistoryModalOpen}
          onClose={() => setIsHistoryModalOpen(false)}
          history={personnelHistory}
        />
        <ToastContainer
          key={toastKey}
          position="top-right"
          autoClose={2000}
          hideProgressBar={false}
          newestOnTop={false}
          closeOnClick={false}
          rtl={false}
          pauseOnFocusLoss={false}
          draggable={false}
          pauseOnHover={false}
          theme="light"
          limit={1}
          style={{ zIndex: 9999 }}
          containerId="personnel-toasts"
        />
      </section>
    </Layout>
  );
};

export default Personnel;
