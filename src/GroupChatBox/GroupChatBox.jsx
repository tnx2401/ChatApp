import "./GroupChatBox.css";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faPhone,
  faImage,
  faArrowRight,
  faHeart,
  faInfoCircle,
} from "@fortawesome/free-solid-svg-icons";
import { userStore } from "../lib/userStore";
import { doc, updateDoc, getDoc, onSnapshot } from "firebase/firestore";
import { db } from "../lib/firebase";
import { useEffect, useState, useRef } from "react";

function GroupChatBox({ currentChatBox, showChatInformation }) {
  const endRef = useRef(null);
  const [newMessage, setNewMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [isDeletedFromGroup, setIsDeletedFromGroup] = useState([]);

  const { currentUser } = userStore();

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

  useEffect(() => {
    if (currentChatBox && currentChatBox.id) {
      const unsub = onSnapshot(
        doc(db, "group-chats", currentUser.id),
        (doc) => {
          if (doc.exists()) {
            const data = doc.data();
            if (data[currentChatBox.id]) {
              setMessages(data[currentChatBox.id].chats);
            } else {
              setMessages([]);
            }
          } else {
            setMessages([]);
          }
        }
      );
      return () => unsub();
    } else {
      setMessages([]);
    }
  }, [currentChatBox.id, currentChatBox]);

  useEffect(() => {
    const fetchDeletedUser = async () => {
      try {
        const groupRef = doc(db, "group-chats", currentUser.id);
        const groupSnap = await getDoc(groupRef);

        if (groupSnap.exists()) {
          const data = groupSnap.data();
          const chatMemberIds = data[currentChatBox.id]?.members;

          if (chatMemberIds) {
            const deletedUserIds = chatMemberIds
              .filter((member) => member.isDeleted)
              .map((member) => member.id);

            if (deletedUserIds.length > 0) {
              setIsDeletedFromGroup(deletedUserIds);
            } else {
              setIsDeletedFromGroup([]);
            }
          }
        }
      } catch (error) {
        console.error("Error fetching group data: ", error);
      }
    };

    if (currentUser?.id && currentChatBox?.id) {
      fetchDeletedUser();
    }
  }, [currentUser?.id, currentChatBox?.id]);

  const handleMessageInput = (e) => {
    setNewMessage(e.target.value);
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (newMessage.trim() === "") return;

    try {
      for (const member of currentChatBox.members) {
        if (!member.id || isDeletedFromGroup.includes(member.id)) {
          console.error("Error: member.id is undefined for member", member);
          continue;
        }

        const chatRef = doc(db, "group-chats", member.id);
        const chatSnap = await getDoc(chatRef);

        if (chatSnap.exists()) {
          const chatData = chatSnap.data();
          const chats = chatData[currentChatBox.id]?.chats || [];

          await updateDoc(chatRef, {
            [`${currentChatBox.id}.chats`]: [
              ...chats,
              {
                message: newMessage,
                senderId: currentUser.id,
                timestamp: new Date(),
                username: currentUser.username,
                profileimage: currentUser.profileimage,
                isSeen: true,
                isDeleted: false,
              },
            ],
          });
        }
      }

      setNewMessage("");
    } catch (error) {
      console.error("Error: ", error);
    }
  };

  const handleGroupInfo = () => {
    showChatInformation((prevState) => !prevState);
  };

  return (
    <>
      <div className="group-chat">
        <div className="group-top-chat">
          <div className="group-top-chat-info">
            <img
              src="/9853c5ae293810fc37fb567c8940c303.jpg"
              alt="Chat Avatar"
            />
            <h3>{currentChatBox.name}</h3>
          </div>
          <div className="group-top-chat-button">
            {isDeletedFromGroup.map((deletedUser) => {
              if (deletedUser !== currentUser.id) {
                return (
                  <>
                    <button>
                      <FontAwesomeIcon icon={faPhone} />
                    </button>
                    <button onClick={() => handleGroupInfo()}>
                      <FontAwesomeIcon icon={faInfoCircle} />
                    </button>
                  </>
                );
              }
            })}
          </div>
        </div>
        <div className="group-middle-chat">
          <div className="group-messages">
            {messages.map((message, index) => (
              <div
                className={`${
                  message.senderId == currentUser.id
                    ? "group-sender-message"
                    : "group-receiver-message"
                } group-each-messages`}
              >
                <img src={message.profileimage} alt="" />
                <div className="group-messages-main">
                  <h5>{message.username}</h5>
                  <div
                    ref={endRef}
                    key={index}
                    id="message"
                    className={
                      message.isHeart
                        ? "heart-message"
                        : message.senderId == currentUser.id
                        ? "group-sender"
                        : "group-receiver"
                    }
                  >
                    <p>{message.message}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="group-bottom-chat">
          {isDeletedFromGroup.map((deletedUser) => {
            if (deletedUser !== currentUser.id) {
              return (
                <>
                  <button>
                    <FontAwesomeIcon icon={faImage} />
                  </button>
                  <input
                    type="text"
                    value={newMessage}
                    onChange={handleMessageInput}
                  />
                  <button onClick={handleSendMessage}>
                    <FontAwesomeIcon icon={faArrowRight} />
                  </button>
                  <button>
                    <FontAwesomeIcon icon={faHeart} id="heart" />
                  </button>
                </>
              );
            } else {
              return (
                <div className="is_deleted_notify">
                  <h2>You cannot send message to this group</h2>
                  <p>
                    You've left this group. Messages cant not be sent until
                    someone invites you again
                  </p>
                </div>
              );
            }
          })}
        </div>
      </div>
    </>
  );
}

export default GroupChatBox;
