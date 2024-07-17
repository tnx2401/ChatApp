import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faPhone,
  faCircleInfo,
  faArrowRight,
  faHeart,
  faImage,
  faCircle,
  faTrash,
  faPen,
  faShareFromSquare,
  faReply,
  faArrowRotateLeft,
} from "@fortawesome/free-solid-svg-icons";

import "./ChatBox.css";
import { useEffect, useRef, useState } from "react";
import { userStore } from "../lib/userStore";
import { userPresenceStore } from "../lib/userPresenceStore";
import {
  doc,
  getDoc,
  updateDoc,
  onSnapshot,
  writeBatch,
} from "firebase/firestore";
import { db, storage } from "../lib/firebase";
import FowardMessage from "./FowardMessage";
import WebRTCComponent from "../WebRTC/WebRTCComponent";
import { getDownloadURL, ref, uploadBytesResumable } from "firebase/storage";
import { v4 as uuidv4 } from "uuid";

function ChatBox({ currentChatBox, showChatInformation }) {
  const endRef = useRef(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [isFowardMessage, setIsFowardMessage] = useState(false);
  const [messageToFoward, setMessageToFoward] = useState("");
  const [infoToFoward, setInfoToFoward] = useState({
    username: "",
    originalId: "",
  });

  const [editMode, setEditMode] = useState(false);
  const [selectedEditMessage, setSelectedEditMessage] = useState({
    messageId: "",
    messageContent: "",
  });

  const [replyMode, setReplyMode] = useState(false);
  const [replyInfo, setReplyInfo] = useState({
    messageUsername: "",
    messageContent: "",
  });
  const [replyMessage, setReplyMessage] = useState("");

  const [isCalling, setIsCalling] = useState(false);

  const { currentUser } = userStore();
  const { userStatuses } = userPresenceStore();

  // useEffect scroll đến tin nhắn mới nhất
  // useEffect(() => {
  //   endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  // }, [messages]);
  //

  // useEffect lấy danh sách tin nhắn của currentChatBox(ChatBox được chọn trong ChatList)
  useEffect(() => {
    if (currentChatBox && currentChatBox.id) {
      const unsub = onSnapshot(doc(db, "user-chats", currentUser.id), (doc) => {
        if (doc.exists()) {
          const data = doc.data();
          if (data[currentChatBox.id]) {
            const filteredMessages = (
              data[currentChatBox.id].chats || []
            ).filter((chat) => !chat.isDeleted);
            setMessages(filteredMessages);
          } else {
            setMessages([]);
          }
        } else {
          setMessages([]);
        }
      });

      return () => unsub();
    } else {
      setMessages([]);
    }
  }, [currentChatBox, currentUser.id]);
  //End

  // Function bắt sự kiện input của <input> và lưu vào newMessage state
  const handleMessageInput = (e) => {
    setNewMessage(e.target.value);
  };
  // End

  // Function bắt sự kiện input của <input> và lưu vào selectedEditMessage state

  const handleEditMessageInput = (e) => {
    setSelectedEditMessage((prev) => ({
      ...prev,
      messageContent: e.target.value,
    }));
  };
  //End

  // Function upload tin nhắn lên database
  const handleSendMessage = async (e) => {
    if (!editMode && !replyMode) {
      e.preventDefault();
      if (newMessage.trim() === "") return;

      try {
        const newMessageData = {
          id: uuidv4(),
          message: newMessage,
          senderId: currentUser.id,
          username: currentUser.username,
          timestamp: new Date(),
          isSeen: true,
          isDeleted: false,
        };

        const chatRefSender = doc(db, "user-chats", currentUser.id);
        const chatRefReceiver = doc(db, "user-chats", currentChatBox.id);

        const chatSnapSender = await getDoc(chatRefSender);
        const chatSnapReceiver = await getDoc(chatRefReceiver);

        if (chatSnapSender.exists() && chatSnapReceiver.exists()) {
          const senderData = chatSnapSender.data();
          const receiverData = chatSnapReceiver.data();

          const senderChats = senderData[currentChatBox.id]?.chats || [];
          const receiverChats = receiverData[currentUser.id]?.chats || [];

          const batch = writeBatch(db);

          batch.update(chatRefSender, {
            [`${currentChatBox.id}.chats`]: [...senderChats, newMessageData],
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
      setNewMessage("");
    }

    if (editMode) {
      e.preventDefault();

      if (selectedEditMessage.messageContent == "") {
        setEditMode(false);
        setSelectedEditMessage({ messageId: "", messageContent: "" });
      }

      try {
        const senderEditRef = doc(db, "user-chats", currentUser.id);
        const receiverEditRef = doc(db, "user-chats", currentChatBox.id);

        const senderEditSnap = await getDoc(senderEditRef);
        const receiverEditSnap = await getDoc(receiverEditRef);

        if (senderEditSnap.exists() && receiverEditSnap.exists()) {
          const senderEditData = senderEditSnap.data();
          const receiverEditData = receiverEditSnap.data();

          const senderChats = senderEditData[currentChatBox.id]?.chats || [];
          const receiverChats = receiverEditData[currentUser.id]?.chats || [];

          const updateMessageContent = (chats, messageId, messageContent) => {
            return chats.map((chat) => {
              if (chat.id === messageId) {
                return { ...chat, message: messageContent };
              }
              return chat;
            });
          };

          const updatedSenderChats = updateMessageContent(
            senderChats,
            selectedEditMessage.messageId,
            selectedEditMessage.messageContent
          );
          const updatedReceiverChats = updateMessageContent(
            receiverChats,
            selectedEditMessage.messageId,
            selectedEditMessage.messageContent
          );
          await updateDoc(senderEditRef, {
            [`${currentChatBox.id}.chats`]: updatedSenderChats,
          });

          await updateDoc(receiverEditRef, {
            [`${currentUser.id}.chats`]: updatedReceiverChats,
          });
          setEditMode(false);
          setSelectedEditMessage({ messageId: "", messageContent: "" });
        }
      } catch (error) {
        console.log("Error editting message", error);
      }
    }

    if (replyMode) {
      e.preventDefault();
      if (replyMessage.trim() === "") return;

      try {
        const newReplyData = {
          id: uuidv4(),
          message: replyMessage,
          senderId: currentUser.id,
          username: currentUser.username,
          replyToUser: replyInfo.messageUsername,
          replyToMessage: replyInfo.messageContent,
          timestamp: new Date(),
          isSeen: true,
          isDeleted: false,
          isReply: true,
        };

        const chatRefSender = doc(db, "user-chats", currentUser.id);
        const chatRefReceiver = doc(db, "user-chats", currentChatBox.id);

        const chatSnapSender = await getDoc(chatRefSender);
        const chatSnapReceiver = await getDoc(chatRefReceiver);

        if (chatSnapSender.exists() && chatSnapReceiver.exists()) {
          const senderData = chatSnapSender.data();
          const receiverData = chatSnapReceiver.data();

          const senderChats = senderData[currentChatBox.id]?.chats || [];
          const receiverChats = receiverData[currentUser.id]?.chats || [];

          const batch = writeBatch(db);

          batch.update(chatRefSender, {
            [`${currentChatBox.id}.chats`]: [...senderChats, newReplyData],
          });

          batch.update(chatRefReceiver, {
            [`${currentUser.id}.chats`]: [
              ...receiverChats,
              { ...newReplyData, isSeen: false },
            ],
          });

          await batch.commit();
        }
      } catch (err) {
        console.log("Error", err);
      }
      setReplyMode(false);
    }
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  };
  // End

  // Upload tin nhắn ❤️
  const handleSendHeart = async (e) => {
    e.preventDefault();
    try {
      const messageData = {
        message: "❤️",
        senderId: currentUser.id,
        timestamp: new Date(),
      };

      const batch = writeBatch(db);
      const chatRefSender = doc(db, "user-chats", currentUser.id);
      const chatRefReceiver = doc(db, "user-chats", currentChatBox.id);

      batch.update(chatRefSender, {
        [`${currentChatBox.id}.chats`]: [...messages, messageData],
      });

      batch.update(chatRefReceiver, {
        [`${currentUser.id}.chats`]: [...messages, messageData],
      });

      await batch.commit();
    } catch (err) {
      console.log("Error", err);
    }
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  };
  const handleToggleChatInformation = () => {
    showChatInformation((prevState) => !prevState);
  };
  // End

  // Function cập nhật trạng thái "Đã xem" của tin nhắn
  const handleIsSeen = async (userId) => {
    try {
      const docRef = doc(db, "user-chats", currentUser.id);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data[userId]) {
          const updatedChats = data[userId].chats.map((chat) => ({
            ...chat,
            isSeen: true,
          }));

          await updateDoc(docRef, {
            [userId]: {
              ...data[userId],
              chats: updatedChats,
            },
          });
        }
      }
    } catch (error) {
      console.log("Error updating isSeen status:", error);
    }
  };

  // End

  const handleStartCall = () => {
    setIsCalling(true);
  };

  // Function xóa tin nhắn
  const handleDeleteMessage = async (userId, i) => {
    const result = confirm("Are you sure you want to delete this message?");

    if (result) {
      const deleteRef = doc(db, "user-chats", currentUser.id);
      const deleteSnap = await getDoc(deleteRef);

      if (deleteSnap.exists()) {
        const data = deleteSnap.data();
        if (data[userId]) {
          const updatedChats = data[userId].chats.filter(
            (_, chatIndex) => chatIndex !== i
          );
          await updateDoc(deleteRef, {
            [`${userId}.chats`]: updatedChats,
          });
        }
      }
    }
  };
  // End

  // Function chỉnh sửa tin nhắn được chọn
  const handleEditMessage = async (message) => {
    //Set edit mode = true để đặt điều kiện cho input trong handleSendMessage
    setEditMode(true);
    setReplyMode(false);
    setSelectedEditMessage(message);
  };
  // End

  // Lấy thông tin message, username của tin nhắn và truyền qua FowardMessage.jsx để gửi tin nhắn đó cho người khác
  const handleFowardMessage = ({ message, senderId, fowardBy }) => {
    setMessageToFoward(message);
    setInfoToFoward({
      originalId: senderId,
      fowardBy: fowardBy,
    });
    setIsFowardMessage(true);
  };
  // End

  const closeFowardMessage = () => {
    setIsFowardMessage(false);
  };

  // Function cho người dùng upload hình ảnh dưới dạng tin nhắn
  const handleFileInputClick = () => {
    document.getElementById("fileInput").click();
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleUpdateImage(e.target.files[0]);
    }
  };

  const handleUpdateImage = (file) => {
    if (file) {
      const storageRef = ref(storage, `message-img/${file.name}`);
      const uploadTask = uploadBytesResumable(storageRef, file);

      uploadTask.on(
        "state_changed",
        (snapshot) => {
          const progress =
            (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          console.log("Upload is " + progress + "% done");
        },
        (error) => {
          console.error("Upload failed: ", error);
        },
        async () => {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          await saveMessageData(downloadURL);
        }
      );
    }
  };

  const saveMessageData = async (downloadURL) => {
    try {
      const newMessageData = {
        message: downloadURL,
        senderId: currentUser.id,
        timestamp: new Date(),
        isSeen: true,
        isDeleted: false,
        isImage: true,
      };

      const chatRefSender = doc(db, "user-chats", currentUser.id);
      const chatRefReceiver = doc(db, "user-chats", currentChatBox.id);

      const chatSnapSender = await getDoc(chatRefSender);
      const chatSnapReceiver = await getDoc(chatRefReceiver);

      if (chatSnapSender.exists() && chatSnapReceiver.exists()) {
        const senderData = chatSnapSender.data();
        const receiverData = chatSnapReceiver.data();

        const senderChats = senderData[currentChatBox.id]?.chats || [];
        const receiverChats = receiverData[currentUser.id]?.chats || [];

        const batch = writeBatch(db);

        batch.update(chatRefSender, {
          [`${currentChatBox.id}.chats`]: [...senderChats, newMessageData],
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
  // End

  // Function thả emoji cho tin nhắn được chọn
  const handleSendEmoji = async (emojiName, messageId) => {
    try {
      const emojiData = {
        heart: "❤️",
        smileFace: "😊",
        sadFace: "😢",
        laughFace: "😂",
        supriseFace: "😮",
        angryFace: "😠",
      };

      const selectedEmoji = emojiData[emojiName];

      const senderChatRef = doc(db, "user-chats", currentUser.id);
      const receiverChatRef = doc(db, "user-chats", currentChatBox.id);

      const [senderChatSnap, receiverChatSnap] = await Promise.all([
        getDoc(senderChatRef),
        getDoc(receiverChatRef),
      ]);

      if (!senderChatSnap.exists() || !receiverChatSnap.exists()) {
        throw new Error("One or both chat documents do not exist.");
      }

      const senderChatData = senderChatSnap.data();
      const receiverChatData = receiverChatSnap.data();

      const findChatIndexById = (chats, messageId) =>
        chats.findIndex((chat) => chat.id === messageId);

      const updateEmojis = (
        emojis,
        emojiSenders,
        selectedEmoji,
        currentUsername
      ) => {
        const userIndex = emojiSenders.indexOf(currentUsername);

        if (userIndex !== -1) {
          if (emojis[userIndex] === selectedEmoji) {
            emojis.splice(userIndex, 1);
            emojiSenders.splice(userIndex, 1);
          } else {
            emojis[userIndex] = selectedEmoji;
          }
        } else {
          emojis.push(selectedEmoji);
          emojiSenders.push(currentUsername);
        }
        return { emojis, emojiSenders };
      };

      const updateChatWithEmoji = async (chatRef, chatId, updatedChats) => {
        await updateDoc(chatRef, {
          [`${chatId}.chats`]: updatedChats,
        });
      };

      const updateChatEmojis = (
        chatData,
        chatBoxId,
        messageId,
        currentUsername
      ) => {
        if (chatData[chatBoxId]) {
          const chats = chatData[chatBoxId].chats;
          const chatIndex = findChatIndexById(chats, messageId);

          if (chatIndex !== -1) {
            const updatedChats = [...chats];
            const { emoji = [], emojiSender = [] } =
              updatedChats[chatIndex] || {};

            const updatedEmojis = updateEmojis(
              emoji,
              emojiSender,
              selectedEmoji,
              currentUsername
            );

            updatedChats[chatIndex] = {
              ...chats[chatIndex],
              emoji: updatedEmojis.emojis,
              emojiSender: updatedEmojis.emojiSenders,
            };
            return updatedChats;
          }
        }
        return null;
      };

      const updatedSenderChats = updateChatEmojis(
        senderChatData,
        currentChatBox.id,
        messageId,
        currentUser.username
      );

      const updatedReceiverChats = updateChatEmojis(
        receiverChatData,
        currentUser.id,
        messageId,
        currentUser.username
      );

      if (updatedSenderChats) {
        await updateChatWithEmoji(
          senderChatRef,
          currentChatBox.id,
          updatedSenderChats
        );
      }

      if (updatedReceiverChats) {
        await updateChatWithEmoji(
          receiverChatRef,
          currentUser.id,
          updatedReceiverChats
        );
      }
    } catch (error) {
      console.log("Error sending emoji:", error);
    }
  };
  // End

  //Filter blocked user to disable input
  const filterBlockUser = (blockUsers) => {
    for (const user of blockUsers) {
      if (currentChatBox.id == user) {
        return true;
      } else {
        return false;
      }
    }
  };
  //End

  const handleReplyMessage = (info) => {
    setReplyMode(true);
    setEditMode(false);
    setReplyInfo(info);
  };

  const handleReplyMessageInput = (e) => {
    setReplyMessage(e.target.value);
  };

  const handleFormatTime = (timestamp) => {
    const milliseconds =
      timestamp.seconds * 1000 + timestamp.nanoseconds / 1000000;

    // Create a Date object
    const date = new Date(milliseconds);

    // Format the date
    const options = {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    };

    // Get the formatted date string
    return date.toLocaleString("en-US", options);
  };

  return (
    <>
      {isFowardMessage && (
        <div className="modal">
          <div className="modal-content">
            <FowardMessage
              onClose={closeFowardMessage}
              message={messageToFoward}
              info={infoToFoward}
            />
          </div>
        </div>
      )}

      {isCalling && (
        <div className="modal">
          <div className="modal-content">
            <WebRTCComponent />
          </div>
        </div>
      )}
      <div className="chat">
        <div className="top-chat">
          <div className="title">
            <div className="chatbox-avatar">
              <img src={currentChatBox.img} alt="" />
              <p
                className={`${
                  userStatuses[currentChatBox.id]?.state === "online"
                    ? "chat-box-status-online"
                    : userStatuses[currentChatBox.id]?.state === "away"
                    ? "chat-box-status-away"
                    : "chat-box-status-offline"
                }`}
              >
                <FontAwesomeIcon icon={faCircle} />
              </p>
            </div>
            <div>
              <h2>{currentChatBox.username}</h2>
              <p>{currentChatBox.description}</p>
            </div>
          </div>
          <div className="function">
            <button onClick={handleStartCall}>
              <FontAwesomeIcon icon={faPhone} />
            </button>
            <button onClick={handleToggleChatInformation}>
              <FontAwesomeIcon icon={faCircleInfo} />
            </button>
          </div>
        </div>
        <div className="main-chat">
          <div className="messages">
            {messages.map((message, index) => (
              <div
                ref={endRef}
                key={index}
                className={
                  message.isHeart
                    ? "heart-message"
                    : message.senderId == currentUser.id
                    ? "sender"
                    : "receiver"
                }
              >
                <div className="message-container">
                  {message.isImage ? (
                    <img src={message.message} className="message-image" />
                  ) : (
                    <div className="individual-message">
                      {message.isReply ? (
                        <div className="reply-message-container">
                          <div className="reply-info-container">
                            <h5>
                              <FontAwesomeIcon icon={faArrowRotateLeft} />
                            </h5>
                            <h4>{message.replyToMessage}</h4>
                            <h5>{`${message.replyToUser}, ${handleFormatTime(
                              message.timestamp
                            )}`}</h5>
                          </div>
                          <p id="individual-message">{message.message}</p>
                        </div>
                      ) : (
                        <p>{message.message}</p>
                      )}

                      {message.emoji && (
                        <>
                          <span className="message-emoji-span">
                            {message.emoji}
                            <span
                              className={
                                message.senderId == currentUser.id
                                  ? "message-emoji-sender-span sender-emoji"
                                  : "message-emoji-sender-span receiver-emoji"
                              }
                            >
                              {message.emojiSender.map((sender, index) => (
                                <span key={index}>{sender}</span>
                              ))}
                            </span>
                          </span>
                        </>
                      )}
                    </div>
                  )}
                  <span className="unselectable">{message.edited}</span>

                  <span className="unselectable">
                    {message.isFowarded
                      ? message.fowardBy === currentUser.username
                        ? `You've fowarded a message`
                        : `${message.fowardBy} have fowarded you a message`
                      : ``}
                  </span>
                  <span
                    className={
                      message.senderId == currentUser.id
                        ? "sender-message"
                        : "receiver-message"
                    }
                  >
                    <button
                      onClick={() => {
                        handleReplyMessage({
                          messageUsername: message.username,
                          messageContent: message.message,
                        });
                      }}
                    >
                      <FontAwesomeIcon icon={faReply} />
                    </button>

                    <button
                      onClick={() => {
                        handleFowardMessage({
                          message: message.message,
                          senderId: message.senderId,
                          fowardBy: currentUser.username,
                        });
                      }}
                    >
                      <FontAwesomeIcon icon={faShareFromSquare} />
                    </button>

                    <button
                      onClick={() => {
                        handleEditMessage({
                          messageId: message.id,
                          messageContent: message.message,
                        });
                      }}
                      className={`${
                        message.senderId == currentUser.id ? "" : "hide"
                      } ${message.isImage ? "hide" : ""}`}
                    >
                      <FontAwesomeIcon icon={faPen} />
                    </button>

                    <button
                      onClick={() => {
                        handleDeleteMessage(currentChatBox.id, index);
                      }}
                    >
                      <FontAwesomeIcon icon={faTrash} />
                    </button>
                    <button id="message-emoji" className="message-emoji">
                      🙂
                      <div className="emoji-container">
                        <p
                          id="heart"
                          onClick={() => handleSendEmoji("heart", message.id)}
                        >
                          ❤️
                        </p>
                        <p
                          id="smile-face"
                          onClick={() =>
                            handleSendEmoji("smileFace", message.id)
                          }
                        >
                          😊
                        </p>
                        <p
                          id="sad-face"
                          onClick={() => handleSendEmoji("sadFace", message.id)}
                        >
                          😢
                        </p>
                        <p
                          id="laugh-face"
                          onClick={() =>
                            handleSendEmoji("laughFace", message.id)
                          }
                        >
                          😂
                        </p>
                        <p
                          id="suprise-face"
                          onClick={() =>
                            handleSendEmoji("supriseFace", message.id)
                          }
                        >
                          😮
                        </p>
                        <p
                          id="angry-face"
                          onClick={() =>
                            handleSendEmoji("angryFace", message.id)
                          }
                        >
                          😠
                        </p>
                      </div>
                    </button>
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="bottom-chat">
          {!currentUser.blocked.includes(currentChatBox.id) &&
            !currentUser.isBlockedBy?.includes(currentChatBox.id) && (
              <>
                <button
                  onClick={() => {
                    handleFileInputClick();
                  }}
                >
                  <FontAwesomeIcon icon={faImage} />
                </button>
                <input
                  type="file"
                  id="fileInput"
                  accept="image/*"
                  style={{ display: "none" }}
                  onChange={handleFileChange}
                />
                <form className="form" onSubmit={handleSendMessage}>
                  {!editMode && !replyMode && (
                    <input
                      type="text"
                      value={newMessage}
                      onChange={handleMessageInput}
                      onFocus={() => handleIsSeen(currentChatBox.id)}
                    />
                  )}

                  {editMode && (
                    <div className="edit-mode-container">
                      <input
                        id="edit-input"
                        type="text"
                        value={selectedEditMessage.messageContent}
                        onChange={handleEditMessageInput}
                        onFocus={() => handleIsSeen(currentChatBox.id)}
                      />
                      <button
                        onClick={() => {
                          setEditMode(false);
                        }}
                        id="cancel-edit-button"
                      >
                        x
                      </button>
                    </div>
                  )}

                  {replyMode && (
                    <div className="reply-mode-container">
                      <div className="reply-info">
                        <h3>
                          {replyInfo.messageUsername == currentUser.username
                            ? "Reply to myself"
                            : `Reply to ${replyInfo.messageUsername}`}
                        </h3>
                        <p>{replyInfo.messageContent}</p>
                      </div>
                      <div className="reply-function">
                        <input
                          id="reply-input"
                          type="text"
                          onChange={handleReplyMessageInput}
                          onFocus={() => handleIsSeen(currentChatBox.id)}
                        />
                        <button
                          onClick={() => {
                            setReplyMode(false);
                          }}
                          id="cancel-reply-button"
                        >
                          x
                        </button>
                      </div>
                    </div>
                  )}

                  <button type="button" onClick={handleSendMessage}>
                    <FontAwesomeIcon icon={faArrowRight} />
                  </button>
                  <button id="heart" type="button" onClick={handleSendHeart}>
                    <FontAwesomeIcon icon={faHeart} />
                  </button>
                </form>
              </>
            )}

          {currentUser.blocked.includes(currentChatBox.id) &&
            filterBlockUser(currentUser.blocked) && (
              <h4>
                This user is being blocked by you. Unblock to continue chatting
              </h4>
            )}

          {currentUser.isBlockedBy?.includes(currentChatBox.id) &&
            filterBlockUser(currentUser.isBlockedBy) && (
              <h4>You cannot chat with this person at this time</h4>
            )}
        </div>
      </div>
    </>
  );
}

export default ChatBox;
