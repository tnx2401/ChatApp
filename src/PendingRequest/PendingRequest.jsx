import "./PendingRequest.css";
import { useEffect, useState } from "react";
import { db } from "../lib/firebase";
import { deleteField, doc, getDoc, updateDoc } from "firebase/firestore";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCancel } from "@fortawesome/free-solid-svg-icons";
import { userStore } from "../lib/userStore";

function PendingRequest({ onClose, isPendingRequest }) {
  const [pendingRequests, setPendingRequests] = useState([]);
  const [users, setUsers] = useState([]);

  const { currentUser } = userStore();
  useEffect(() => {
    if (
      isPendingRequest &&
      (Array.isArray(isPendingRequest) || isPendingRequest instanceof Set)
    ) {
      setPendingRequests([...isPendingRequest]);
    } else {
      console.warn("isPendingRequest is not iterable:", isPendingRequest);
    }
  }, [isPendingRequest]);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const userPromises = [];

        for (const requestId of pendingRequests) {
          const userRef = doc(db, "users", requestId);
          const userSnap = await getDoc(userRef);

          if (userSnap.exists()) {
            userPromises.push(userSnap.data());
          } else {
            console.log(`User document not found for ID: ${requestId}`);
          }
        }

        const fetchedUsers = await Promise.all(userPromises);
        setUsers(fetchedUsers);
      } catch (error) {
        console.error("Error fetching users:", error);
      }
    };

    if (pendingRequests.length > 0) {
      fetchUsers();
    }
  }, [pendingRequests]);

  const handleAccept = async (userId) => {
    try {
      const userRef = doc(db, "user-chats", currentUser.id);
      const userSnap = await getDoc(userRef);

      if (userSnap.exists()) {
        const data = userSnap.data();

        await updateDoc(userRef, {
          [userId]: {
            ...data[userId],
            isPending: false,
          },
        });
        onClose();
        window.location.reload();
      }
    } catch (error) {}
  };

  const handleDeny = async (userId) => {
    try {
      const userRef = doc(db, "user-chats", currentUser.id);

      const currentChatRef = doc(db, "user-chats", userId);

      await updateDoc(userRef, {
        [userId]: deleteField(),
      });

      await updateDoc(currentChatRef, {
        [currentUser.id]: deleteField(),
      });
      onClose();
      window.location.reload();
    } catch (error) {
      console.error("Error denying request:", error);
    }
  };

  return (
    <>
      <div className="pending-container">
        <div className="pending-button">
          <button onClick={onClose}>
            <FontAwesomeIcon icon={faCancel} />
          </button>
        </div>
        <h1>Pending Requests:</h1>

        <div className="pending-info-container">
          {users.map((user, index) => (
            <div key={index} className="pending-info">
              <h2>
                <span>User</span> {user.username}{" "}
                <span>wants to chat with you</span>
              </h2>
              <div className="pending-info-button">
                <button id="accept" onClick={() => handleAccept(user.id)}>
                  Accept
                </button>
                <button id="deny" onClick={() => handleDeny(user.id)}>
                  Deny
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

export default PendingRequest;
