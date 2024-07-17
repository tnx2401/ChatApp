import { useState } from "react";
import "./CreateGroup.css";
import { doc, setDoc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { userStore } from "../lib/userStore";
import { v4 as uuidv4 } from "uuid";

function CreateGroup({ onClose, userList }) {
  const { currentUser } = userStore();
  const [isCreateGroupMode, setIsCreateGroupMode] = useState(true);
  const [isFindGroupMode, setIsFindGroupMode] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState([
    {
      id: currentUser.id,
      username: currentUser.username,
      avatar: currentUser.profileimage,
    },
  ]);
  const [groupName, setGroupName] = useState();

  const handleCreateGroupMode = () => {
    setIsCreateGroupMode(true);
    setIsFindGroupMode(false);
  };

  const handleFindGroupMode = () => {
    setIsCreateGroupMode(false);
    setIsFindGroupMode(true);
  };

  const handleCheckboxChange = (userId, username, profileimage) => {
    setSelectedUsers((prevSelectedUsers) =>
      prevSelectedUsers.includes(userId)
        ? prevSelectedUsers.filter((id) => id !== userId)
        : [
            ...prevSelectedUsers,
            { id: userId, username: username, avatar: profileimage },
          ]
    );
  };

  const handleGroupName = (e) => {
    setGroupName(e.target.value);
  };

  const handleCreateGroup = async () => {
    if (!groupName) {
      alert("Please provide a group name.");
      return;
    }

    if (selectedUsers.length === 0) {
      alert("Please select at least one user.");
      return;
    }

    try {
      const groupId = uuidv4();
      const newGroupData = {
        groupId: groupId,
        name: groupName,
        manager: currentUser.id,
        members: selectedUsers,
        chats: [],
        createdBy: currentUser.id,
        createdAt: new Date(),
      };

      const groupRef = doc(db, "group-chats", currentUser.id);
      const groupSnap = await getDoc(groupRef);
      if (groupSnap.exists()) {
        await updateDoc(groupRef, {
          [groupId]: newGroupData,
        });
      } else {
        await setDoc(groupRef, {
          [groupId]: newGroupData,
        });
      }

      selectedUsers.map(async (user) => {
        const userGroupRef = doc(db, "group-chats", user.id);
        const userGroupSnap = await getDoc(userGroupRef);

        if (userGroupSnap.exists()) {
          await updateDoc(userGroupRef, {
            [groupId]: newGroupData,
          });
        } else {
          await setDoc(userGroupRef, {
            [groupId]: newGroupData,
          });
        }
      });

      alert("Group created successfully");
      onClose();
    } catch (error) {
      console.error("Error creating group: ", error);
    }
  };

  return (
    <div className="group-container">
      <div className="group-close-button">
        <button onClick={onClose}>Close</button>
      </div>
      <div className="create-group-mode">
        <button
          onClick={handleCreateGroupMode}
          className={isCreateGroupMode ? "isChosen" : ""}
        >
          Create group
        </button>
        <button
          onClick={handleFindGroupMode}
          className={isFindGroupMode ? "isChosen" : ""}
        >
          Find group
        </button>
      </div>

      {isCreateGroupMode && !isFindGroupMode && (
        <div className="create-group-container">
          <label htmlFor="chatgroupName">Set group name:</label>
          <input type="text" id="chatgroupName" onChange={handleGroupName} />
          <h3>Invite people to the chat group: </h3>
          {userList.map((user, index) => (
            <div key={user.id} className="user-container">
              <div className="info">
                <img src={user.profileimage} alt="" />
                <h4>{user.username}</h4>
              </div>
              <input
                type="checkbox"
                onChange={() =>
                  handleCheckboxChange(
                    user.id,
                    user.username,
                    user.profileimage
                  )
                }
              />
            </div>
          ))}
          <div className="create-group-btn-function">
            <button id="create-group" onClick={handleCreateGroup}>
              Create
            </button>
          </div>
        </div>
      )}
      {isFindGroupMode && !isCreateGroupMode && (
        <div className="find-group-container"></div>
      )}
    </div>
  );
}

export default CreateGroup;
