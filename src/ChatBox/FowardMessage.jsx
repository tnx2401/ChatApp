import "./FowardMessage.css";

import { doc, getDoc, writeBatch } from "firebase/firestore";
import { db } from "../lib/firebase";
import { userStore } from "../lib/userStore";
import { useEffect, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPaperPlane } from "@fortawesome/free-solid-svg-icons";

function FowardMessage({ onClose, message, info }) {
  const [fowardList, setFowardList] = useState([]);
  const [blockedUsers, setBlockedUsers] = useState([]);
  const [isPendingRequest, setIsPendingRequest] = useState(new Set());

  const { currentUser } = userStore();

  useEffect(() => {
    const fetchBlockedUser = async () => {
      const userRef = doc(db, "users", currentUser.id);
      const userSnap = await getDoc(userRef);

      if (userSnap.exists()) {
        setBlockedUsers(userSnap.data().blocked || []);
      }
    };
    fetchBlockedUser();
  }, [currentUser.id]);

  useEffect(() => {
    const fetchChatList = async () => {
      try {
        const docRef = doc(db, "user-chats", currentUser.id);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data();
          const userIds = Object.keys(data);

          const usersInfoPromises = userIds.map(async (userId) => {
            const userDocRef = doc(db, "users", userId);
            const userDocSnap = await getDoc(userDocRef);

            if (userDocSnap.exists()) {
              if (data[userId].isPending === true) {
                setIsPendingRequest((prev) => new Set([...prev, userId]));
                return null;
              }
              return {
                id: userId,
                ...userDocSnap.data(),
              };
            } else {
              console.log("No user for ID: ", userId);
              return null;
            }
          });

          const usersInfo = await Promise.all(usersInfoPromises);
          const validUsers = usersInfo.filter(
            (user) => user && user.id && !blockedUsers.includes(user.id)
          );
          setFowardList(validUsers);
        }
      } catch (error) {
        console.error("Error: ", error);
      }
    };

    fetchChatList();
  }, [blockedUsers, currentUser.id]);

  const handleFowardMessage = async (fowardId) => {
    try {
      const chatRefSender = doc(db, "user-chats", currentUser.id);
      const chatRefReceiver = doc(db, "user-chats", fowardId);

      const chatSnapSender = await getDoc(chatRefSender);
      const chatSnapReceiver = await getDoc(chatRefReceiver);

      if (chatSnapSender.exists() && chatSnapReceiver.exists()) {
        const senderData = chatSnapSender.data();
        const receiverData = chatSnapReceiver.data();

        const hasOriginalId = receiverData[info.originalId] !== undefined;

        const newMessageData = {
          message: message,
          senderId: currentUser.id,
          originalId: info.originalId,
          fowardBy: info.fowardBy,
          timestamp: new Date(),
          isSeen: true,
          isDeleted: false,
          isFowarded: true,
        };

        if (hasOriginalId) {
          newMessageData.username = info.username;
        }

        console.log("New message data", newMessageData);
        Object.entries(newMessageData).forEach(([key, value]) => {
          console.log(`${key}: ${value}`);
        });

        const senderChats = senderData[fowardId]?.chats || [];
        const receiverChats = receiverData[currentUser.id]?.chats || [];

        const batch = writeBatch(db);

        batch.update(chatRefSender, {
          [`${fowardId}.chats`]: [...senderChats, newMessageData],
        });

        batch.update(chatRefReceiver, {
          [`${currentUser.id}.chats`]: [
            ...receiverChats,
            { ...newMessageData, isSeen: false },
          ],
        });

        await batch.commit();
      }
    } catch (err) {
      console.log("Error", err);
    }
  };

  return (
    <div className="foward-container">
      <div className="foward-title">
        <h1>Foward Message:</h1>
        <button onClick={onClose}>Close</button>
      </div>
      <p>Chose a person you want to send the message</p>
      {fowardList.map((foward) => (
        <div key={foward.id} className="user-foward">
          <div className="user-foward-info">
            <img src={foward.profileimage} alt="" />
            <h3>{foward.username}</h3>
          </div>
          <button
            onClick={() => {
              handleFowardMessage(foward.id);
            }}
          >
            <FontAwesomeIcon icon={faPaperPlane} />
          </button>
        </div>
      ))}
    </div>
  );
}

export default FowardMessage;
