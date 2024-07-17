import "./ChatDetail.css";
import { userStore } from "../lib/userStore";
import { doc, getDoc, updateDoc, deleteField } from "firebase/firestore";
import { db } from "../lib/firebase";

function ChatDetail({ currentChatBox }) {
  const { currentUser } = userStore();

  const formatDateOfBirth = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const handleBlockUser = async () => {
    const result = confirm(
      `Are you sure you want to block ${currentChatBox.username}`
    );

    if (result) {
      try {
        const blockedUserRef = doc(db, "users", currentUser.id);
        const beingBlockedUserRef = doc(db, "users", currentChatBox.id);

        const blockedUserSnap = await getDoc(blockedUserRef);
        const beingBlockedUserSnap = await getDoc(beingBlockedUserRef);
        if (blockedUserSnap.exists() && beingBlockedUserSnap.exists()) {
          const blockedUsers = blockedUserSnap.data().blocked || [];
          const beingBlockedUser =
            beingBlockedUserSnap.data().isBlockedBy || [];

          if (!blockedUsers.includes(currentChatBox.id)) {
            await updateDoc(blockedUserRef, {
              blocked: [...blockedUsers, currentChatBox.id],
            });

            await updateDoc(beingBlockedUserRef, {
              isBlockedBy: [...beingBlockedUser, currentUser.id],
            });
            alert(`User ${currentChatBox.username} blocked successfully`);
            window.location.reload();
          } else {
            alert(`User ${currentChatBox.username} is already blocked`);
          }
        } else {
          console.error("No such document!");
        }
      } catch (error) {
        console.error("Error blocking user: ", error);
      }
    } else {
      return;
    }
  };

  //Function unblock user
  const handleUnblockUser = async () => {
    const result = confirm(
      `Are you sure you want to unblock ${currentChatBox.username}`
    );

    if (result) {
      try {
        const blockedUserRef = doc(db, "users", currentUser.id);
        const beingBlockedUserRef = doc(db, "users", currentChatBox.id);

        const blockedUserSnap = await getDoc(blockedUserRef);
        const beingBlockedUserSnap = await getDoc(beingBlockedUserRef);
        if (blockedUserSnap.exists() && beingBlockedUserSnap.exists()) {
          const blockedUsers = blockedUserSnap.data().blocked || [];
          const beingBlockedUsers =
            beingBlockedUserSnap.data().isBlockedBy || [];

          if (blockedUsers.includes(currentChatBox.id)) {
            const updatedBlockedUsers = blockedUsers.filter(
              (id) => id !== currentChatBox.id
            );
            const updatedBeingBlockedUsers = beingBlockedUsers.filter(
              (id) => id !== currentUser.id
            );

            await updateDoc(blockedUserRef, {
              blocked: updatedBlockedUsers,
            });

            await updateDoc(beingBlockedUserRef, {
              isBlockedBy: updatedBeingBlockedUsers,
            });
            alert(`Unblock User ${currentChatBox.username} successfully`);
            window.location.reload();
          } else {
            alert(`User ${currentChatBox.username} is already blocked`);
          }
        } else {
          console.error("No such document!");
        }
      } catch (error) {
        console.error("Error blocking user: ", error);
      }
    } else {
      return;
    }
  };
  //End

  // Function delete conversation & user
  const handleDeleteConversation = async () => {
    const result = confirm(
      "Are you sure you want to delete this conversation?"
    );

    if (result) {
      try {
        const currenUserConversationRef = doc(db, "user-chats", currentUser.id);
        const currenUserConversationSnap = await getDoc(
          currenUserConversationRef
        );

        if (currenUserConversationSnap.exists()) {
          const currentUserData = currenUserConversationSnap.data();

          if (currentUserData[currentChatBox.id]) {
            await updateDoc(currenUserConversationRef, {
              [currentChatBox.id]: deleteField(),
            });
            alert(
              `Conversation with ${currentChatBox.username} deleted successfully`
            );
            window.location.reload();
          }
        }
      } catch (error) {
        console.error("Error deleting conversation: ", error);
      }
    }
  };

  const filterBlockUser = (blockUsers) => {
    for (const user of blockUsers) {
      if (currentChatBox.id == user) {
        return true;
      } else {
        return false;
      }
    }
  };

  return (
    <div className="chat-detail-container">
      <div className="detail-title">
        <h2>User's Info</h2>
      </div>
      <div className="detail-info">
        <div className="detail-info">
          {Object.entries(currentChatBox).map(([key, value]) => {
            if (key === "chats") return null;
            if (key === "id") return null;
            if (key === "description") return null;
            if (key === "username") return null;
            if (key === "dateofbirth") value = formatDateOfBirth(value);
            return (
              <div key={key} className="detail-item">
                {key === "img" ? (
                  <img src={value} alt="profile-img" />
                ) : (
                  <>
                    <h4 className="detail-item-key">{key}</h4>
                    <p>
                      {typeof value === "object"
                        ? JSON.stringify(value)
                        : value}
                    </p>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="detail-button-container">
        <button onClick={handleDeleteConversation}>Delete conversation</button>
        {currentUser.blocked.includes(currentChatBox.id) && (
          <button id="unblock-button" onClick={handleUnblockUser}>
            Unblock User
          </button>
        )}

        {!currentUser.blocked.includes(currentChatBox.id) && (
          <button onClick={handleBlockUser}>Block user</button>
        )}
      </div>
    </div>
  );
}

export default ChatDetail;
