import "./App.css";
import { Outlet } from "react-router-dom";
import Login from "./Login/Login.jsx";
import { useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { userStore } from "./lib/userStore.js";
import { userPresenceStore } from "./lib/userPresenceStore.js";
import { auth } from "./lib/firebase.js";

function App() {
  const { currentUser, isLoading, fetchUserInfo } = userStore();
  const {
    currentStatus,
    isLoadingStatus,
    userStatuses,
    fetchUserStatus,
    setupPresenceTracking,
    listenToAllUsersStatus,
  } = userPresenceStore();

  useEffect(() => {
    const unSub = onAuthStateChanged(auth, (user) => {
      if (user) {
        fetchUserInfo(user.uid);
        setupPresenceTracking(user.uid);
        listenToAllUsersStatus();
      } else {
        fetchUserInfo(null);
      }
    });

    return () => {
      unSub();
    };
  }, [fetchUserInfo, setupPresenceTracking, listenToAllUsersStatus]);

  if (isLoading) return <div className="loading-screen">Loading..</div>;

  return (
    <>
      {currentUser ? (
        <div className="container">
          <Outlet />
        </div>
      ) : (
        <>
          <Login />
        </>
      )}
    </>
  );
}

export default App;
