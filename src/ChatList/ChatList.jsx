import { useEffect, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faUser,
  faCircle,
  faUserGroup,
} from "@fortawesome/free-solid-svg-icons";
import "./ChatList.css";
import AddUser from "./AddUser";
import { userStore } from "../lib/userStore";
import { doc, getDoc, updateDoc, onSnapshot } from "firebase/firestore";
import { db } from "../lib/firebase";
import { userPresenceStore } from "../lib/userPresenceStore";
import PendingRequest from "../PendingRequest/PendingRequest";
import CreateGroup from "../CreateGroup/CreateGroup";

function ChatList({
  switchChatBox,
  switchChatBoxGroup,
  isUserChat,
  isGroupChat,
}) {
  const [isAddUserVisible, setIsAddUserVisible] = useState(false);
  const [isCreateGroup, setIsCreateGroup] = useState(false);
  const [isPendingRequestVisible, setIsPendingRequestVisible] = useState(false);
  const [chatList, setChatList] = useState([]);
  const [groupList, setGroupList] = useState([]);
  const [searchInput, setSearchInput] = useState("");
  const [filteredChatList, setFilteredChatList] = useState([]);
  const [blockedUsers, setBlockedUsers] = useState([]);
  const [isPendingRequest, setIsPendingRequest] = useState(new Set());

  const { currentUser } = userStore();
  const { userStatuses, listenToAllUsersStatus } = userPresenceStore();

  useEffect(() => {
    const fecthChatList = async () => {
      try {
        const docRef = doc(db, "user-chats", currentUser.id);

        const unsub = onSnapshot(docRef, async (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data();
            const userIds = Object.keys(data);
            const userPromises = userIds.map(async (userId) => {
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
                  chats: data[userId].chats,
                  isPending: data[userId].isPending,
                };
              } else {
                console.log(`No such user document for ID: ${userId}`);
                return null;
              }
            });

            const users = await Promise.all(userPromises);

            users.sort((a, b) => {
              if (!a || !b) {
                return 0;
              }

              const findLastIndex = (chats) => {
                if (!chats || chats.length === 0) return -1;
                return chats.length - 1;
              };

              const lastIndexA = findLastIndex(a.chats);
              const lastIndexB = findLastIndex(b.chats);
              if (lastIndexA === -1) return 1; // A has no messages, move it down
              if (lastIndexB === -1) return -1; // B has no messages, move it down
              return (
                b.chats[lastIndexB].timestamp - a.chats[lastIndexA].timestamp
              ); // Sort by timestamp descending
            });

            const validUsers = users.filter((user) => user && user.id);
            setChatList(validUsers);
            setFilteredChatList(validUsers);
          } else {
            console.log("No such document!");
          }
        });

        return () => unsub();
      } catch (error) {
        console.log("Error", error);
      }
    };
    const fetchGroupList = async () => {
      try {
        const docRef = doc(db, "group-chats", currentUser.id);

        const unsub = onSnapshot(docRef, async (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data();
            const groupIds = Object.keys(data);

            const groupPromises = groupIds.map(async (groupId) => {
              const groupData = data[groupId];

              if (!groupData.members) {
                console.log(`No members for group ID: ${groupId}`);
                return null;
              }

              // Check if the current user is marked as deleted in this group
              const currentUserMember = groupData.members.find(
                (member) => member.id === currentUser.id
              );

              const usersInGroupPromises = groupData.members.map(
                async (user) => {
                  const userDocRef = doc(db, "users", user.id);
                  const userDocSnap = await getDoc(userDocRef);

                  if (userDocSnap.exists()) {
                    return {
                      id: user.id,
                      ...userDocSnap.data(),
                    };
                  } else {
                    console.log(`No such user document for ID: ${user.id}`);
                    return null;
                  }
                }
              );

              const usersInGroup = await Promise.all(usersInGroupPromises);

              return {
                id: groupId,
                members: usersInGroup.filter((user) => user),
                chats: groupData.chats,
                manager: groupData.manager,
                groupName: groupData.name,
              };
            });

            const groups = await Promise.all(groupPromises);

            groups.sort((a, b) => {
              if (!a || !b) {
                return 0;
              }

              const findLastIndex = (chats) => {
                if (!chats || chats.length === 0) return -1;
                return chats.length - 1;
              };

              const lastIndexA = findLastIndex(a.chats);
              const lastIndexB = findLastIndex(b.chats);
              if (lastIndexA === -1) return 1; // A has no messages, move it down
              if (lastIndexB === -1) return -1; // B has no messages, move it down
              return (
                b.chats[lastIndexB].timestamp - a.chats[lastIndexA].timestamp
              ); // Sort by timestamp descending
            });

            const validGroups = groups.filter(
              (group) => group && group.id && !blockedUsers.includes(group.id)
            );
            setGroupList(validGroups);
          }
        });

        return () => unsub();
      } catch (error) {
        console.error("Error fetching groups: ", error);
      }
    };

    fecthChatList();
    fetchGroupList();
  }, [currentUser.id, listenToAllUsersStatus, blockedUsers]);

  const handleAddUser = () => {
    setIsAddUserVisible(true);
  };

  const closeAddUser = () => {
    setIsAddUserVisible(false);
  };

  const handleNewUser = () => {
    setIsAddUserVisible(false);
  };

  const findLastIndex = (chats) => {
    if (!chats || chats.length === 0) {
      return -1;
    }

    let maxIndex = 0;
    let maxTimestamp = chats[0].timestamp;

    for (let i = 0; i <= chats.length; i++) {
      if (chats[i] && chats[i].timestamp > maxTimestamp) {
        maxIndex = i;
        maxTimestamp = chats[i].timestamp;
      }
    }
    return maxIndex;
  };

  const handleInputChange = (e) => {
    const inputValue = e.target.value.toLowerCase();
    setSearchInput(inputValue);

    if (inputValue !== "") {
      const filteredUsers = chatList.filter((user) =>
        user.username.toLowerCase().includes(inputValue)
      );
      setFilteredChatList(filteredUsers);
    } else {
      setFilteredChatList([...chatList]);
    }
  };

  const handleIsSeen = async (userId) => {
    try {
      const docRef = doc(db, "user-chats", currentUser.id);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data();
        const userChats = data[userId].chats.map((chat) => ({
          ...chat,
          isSeen: true,
        }));

        await updateDoc(docRef, {
          [userId]: {
            ...data[userId],
            chats: userChats,
          },
        });
      }
    } catch (error) {
      console.log("Error updating isSeen status:", error);
    }
  };

  const handlePendingRequest = () => {
    setIsPendingRequestVisible(true);
  };

  const closePendingRequest = () => {
    setIsPendingRequestVisible(false);
  };

  const handleCreateGroup = () => {
    setIsCreateGroup(true);
  };

  const closeCreateGroup = () => {
    setIsCreateGroup(false);
  };

  return (
    //Class from Dashboard : contact-list
    <>
      {isAddUserVisible && (
        <div className="modal">
          <div className="modal-content">
            <AddUser onClose={closeAddUser} onNewUserAdded={handleNewUser} />
          </div>
        </div>
      )}
      {isPendingRequestVisible && (
        <div className="modal">
          <div className="modal-content">
            <PendingRequest
              onClose={closePendingRequest}
              isPendingRequest={isPendingRequest}
            />
          </div>
        </div>
      )}
      {isCreateGroup && (
        <div className="modal">
          <div className="modal-content">
            <CreateGroup
              onClose={closeCreateGroup}
              userList={filteredChatList}
            />
          </div>
        </div>
      )}
      <div className="contact">
        <div className="search-container">
          <input
            type="search"
            placeholder="Search..."
            value={searchInput}
            onChange={handleInputChange}
          />
          <button>
            <FontAwesomeIcon icon={faUser} onClick={handleAddUser} />
          </button>
          <button>
            <FontAwesomeIcon icon={faUserGroup} onClick={handleCreateGroup} />
          </button>
        </div>

        <div className="pending-request-container">
          <button
            className="pending-request-button"
            onClick={() => handlePendingRequest()}
          >
            Pending request {<span>{isPendingRequest.size}</span>}
          </button>
        </div>
        {filteredChatList.length > 0 && (
          <p className="user-chats-text">User chats: </p>
        )}
        <div className="user-chats-container">
          {filteredChatList.length > 0 ? (
            filteredChatList.map((chat, index) => {
              const lastIndex = findLastIndex(chat.chats);
              const notifyIsSeenClass =
                lastIndex !== -1 && chat.chats[lastIndex].isSeen === false
                  ? "not-seen"
                  : "seen";

              const textIsSeenClass =
                lastIndex !== -1 && chat.chats[lastIndex].isSeen === false
                  ? "text-not-seen"
                  : "text-seen";
              return (
                <div
                  className="contact-info"
                  key={chat.id || index}
                  onClick={() => {
                    switchChatBox(
                      chat.profileimage,
                      chat.id,
                      chat.username,
                      chat.description,
                      chat.firstname,
                      chat.lastname,
                      chat.email,
                      chat.phonenumber,
                      chat.dateofbirth,
                      chat.address,
                      chat.chats
                    );
                    handleIsSeen(chat.id);
                    isUserChat();
                  }}
                >
                  {/* Handle img and status */}
                  <div className="avatar">
                    <img src={chat.profileimage} alt="" />
                    <p
                      className={`${
                        userStatuses[chat.id]?.state === "online"
                          ? "status-online"
                          : userStatuses[chat.id]?.state === "away"
                          ? "status-away"
                          : "status-offline"
                      }`}
                    >
                      <FontAwesomeIcon icon={faCircle} />
                    </p>
                  </div>

                  {/* Handle chat */}
                  <div className="chatlist-text">
                    <div>
                      <h3>{chat.username}</h3>
                      {chat.chats && chat.chats.length > 0 ? (
                        <p className={textIsSeenClass}>
                          {findLastIndex(chat.chats) !== -1
                            ? chat.chats[findLastIndex(chat.chats)].senderId ===
                              currentUser.id
                              ? `You: ${
                                  chat.chats[findLastIndex(chat.chats)].isImage
                                    ? "You've sent an image"
                                    : `${
                                        chat.chats[findLastIndex(chat.chats)]
                                          .message
                                      }`
                                }`
                              : `${
                                  chat.chats[findLastIndex(chat.chats)].message
                                }`
                            : "No message yet"}
                        </p>
                      ) : (
                        <p className="text-seen">No messages yet</p>
                      )}
                    </div>
                    <span className={notifyIsSeenClass}>
                      <FontAwesomeIcon icon={faCircle} />
                    </span>
                  </div>
                </div>
              );
            })
          ) : (
            <p className="text-warning">
              It seems like you don't have any chat yet. <br />
              Click on the{" "}
              <span className="text-bold text-underline">user button</span> to
              add one
            </p>
          )}
        </div>
        {groupList.length > 0 && (
          <p className="group-chats-text ">Group chats:</p>
        )}
        <div className="group-chats-container">
          {groupList.length > 0 ? (
            groupList.map((group) => {
              const lastIndex = findLastIndex(group.chats);
              const notifyIsSeenClass =
                lastIndex !== -1 && group.chats[lastIndex].isSeen === false
                  ? "not-seen"
                  : "seen";

              const textIsSeenClass =
                lastIndex !== -1 && group.chats[lastIndex].isSeen === false
                  ? "text-not-seen"
                  : "text-seen";
              return (
                <div
                  key={group.id}
                  className="group-chats-info"
                  onClick={() => {
                    switchChatBoxGroup(
                      group.groupName,
                      group.manager,
                      group.chats,
                      group.id,
                      group.members
                    );
                    isGroupChat();
                  }}
                >
                  <div className="avatar">
                    <img src="9853c5ae293810fc37fb567c8940c303.jpg" alt="" />
                    <p
                      className={
                        group.members.some(
                          (member) =>
                            member.id !== currentUser.id &&
                            userStatuses[member.id]?.state === "online"
                        )
                          ? "status-online"
                          : "status-offline"
                      }
                    >
                      <FontAwesomeIcon icon={faCircle} />
                    </p>
                  </div>
                  <div className="chatlist-text">
                    <div className="grouplist-text">
                      <h3>{group.groupName}</h3>
                      {group.chats.length > 0 && (
                        <p className={textIsSeenClass}>
                          {findLastIndex(group.chats) !== -1
                            ? group.chats[findLastIndex(group.chats)]
                                .senderId === currentUser.id
                              ? `You: ${
                                  group.chats[findLastIndex(group.chats)]
                                    .message
                                }`
                              : `${
                                  group.chats[findLastIndex(group.chats)]
                                    .message
                                }`
                            : "No message yet"}
                        </p>
                      )}
                      <span className={notifyIsSeenClass}>
                        <FontAwesomeIcon icon={faCircle} />
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <p>You are currently not participating to any groups</p>
          )}
        </div>
      </div>
    </>
  );
}

export default ChatList;
