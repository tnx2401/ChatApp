import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlus, faTrash } from "@fortawesome/free-solid-svg-icons";
import { userStore } from "../lib/userStore";
import { useEffect, useState } from "react";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "../lib/firebase";

function Members({ onClose, members, groupId, manager }) {
  const { currentUser } = userStore();
  const [chatList, setChatList] = useState([]);
  const [addedChat, setAddedChat] = useState([]);

  useEffect(() => {
    const fetchChatList = async () => {
      const currentChatRef = doc(db, "group-chats", currentUser.id);
      const currentChatSnap = await getDoc(currentChatRef);

      if (currentChatSnap.exists()) {
        const data = currentChatSnap.data();
        const chatMemberIds = data[groupId].members;

        setAddedChat(chatMemberIds);
      } else {
        setAddedChat([]); // Ensure chatList is always an array
      }
    };
    if (currentUser?.id) {
      fetchChatList();
    }
  }, [currentUser?.id, members]);

  const handleAddMember = async (memberId) => {
    try {
      const userChatsRef = doc(db, "user-chats", currentUser.id);
      await updateDoc(userChatsRef, {
        [memberId]: {
          chats: [],
        },
      });

      const contactChatsRef = doc(db, "user-chats", memberId);

      await updateDoc(
        contactChatsRef,
        {
          [currentUser.id]: {
            chats: [],
            isPending: true,
          },
        },
        { merge: true }
      );
    } catch (err) {
      console.log("Error", err);
    }
  };

  const handleDeleteMember = async (memberId) => {
    try {
      const groupChatRef = doc(db, `group-chats/${currentUser.id}`);

      const groupChatSnap = await getDoc(groupChatRef);

      if (groupChatSnap.exists()) {
        const data = groupChatSnap.data();

        const updatedMembers = data[groupId].members.map((member) =>
          member.id === memberId ? { ...member, isDeleted: true } : member
        );

        await updateDoc(groupChatRef, {
          [`${groupId}.members`]: updatedMembers,
        });

        for (const member of members) {
          const groupChatRef_ = doc(db, `group-chats/${member.id}`);
          const groupChatSnap_ = await getDoc(groupChatRef_);

          if (groupChatSnap_.exists()) {
            const data = groupChatSnap_.data();
            const updatedMembers = data[groupId].members.map((member) =>
              member.id === memberId ? { ...member, isDeleted: true } : member
            );

            await updateDoc(groupChatRef_, {
              [`${groupId}.members`]: updatedMembers,
            });
          }
        }

        setChatList(chatList.filter((id) => id !== memberId));
      }
    } catch (error) {
      console.log("Error: ", error);
    }
  };

  const checkAdded = (memberId) => {
    return addedChat.some((addedchat) => addedchat.id === memberId);
  };

  return (
    <div className="members-container">
      <button onClick={onClose} id="btn-member-close">
        Close
      </button>
      <h1>Members in this group: </h1>
      {members.map((member) => (
        <div key={member.id} className="individual-member-container">
          <div className="member-info">
            <img src={member.profileimage} alt="" />
            <h3>{member.username}</h3>
            <h4>{member.id === manager ? "Group Manager" : "Member"}</h4>
          </div>
          {currentUser.id === member.id ? (
            <></>
          ) : (
            <div className="members-container-buttons">
              {!checkAdded(member.id) ? (
                <button
                  id="btn-add-member"
                  onClick={() => handleAddMember(member.id)}
                >
                  <FontAwesomeIcon icon={faPlus} />
                </button>
              ) : (
                <></>
              )}
              {currentUser.id === manager && (
                <button
                  id="btn-delete-member"
                  onClick={() => handleDeleteMember(member.id)}
                >
                  <FontAwesomeIcon icon={faTrash} />
                </button>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export default Members;
