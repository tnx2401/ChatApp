import "./Dashboard.css";
import UserInfo from "../UserInfo/UserInfo.jsx";
import Chat from "../ChatList/ChatList.jsx";
import ChatBox from "../ChatBox/ChatBox.jsx";
import ChatDetail from "../ChatDetail/ChatDetail.jsx";
import EditProfile from "../EditProfile/EditProfile.jsx";
import GroupChatBox from "../GroupChatBox/GroupChatBox.jsx";
import { useState } from "react";
import GroupDetail from "../GroupDetail/GroupDetail.jsx";

function Dashboard() {
  const [currentChatBox, setCurrentChatBox] = useState(null);
  const [showEdit, setShowEdit] = useState(false);
  const [showInformation, setShowInformation] = useState(false);
  const [isUserChat, setIsUserChat] = useState();
  const [isGroupChat, setIsGroupChat] = useState();

  const switchChatBox = (
    img,
    id,
    username,
    description,
    firstname,
    lastname,
    email,
    phonenumber,
    dateofbirth,
    address,
    chats
  ) => {
    setCurrentChatBox({
      img,
      id,
      username,
      description,
      firstname,
      lastname,
      email,
      phonenumber,
      dateofbirth,
      address,
      chats,
    });
  };

  const switchChatBoxGroup = (name, manager, chats, id, members) => {
    setCurrentChatBox({
      name,
      manager,
      chats,
      id,
      members,
    });
  };

  const handleUserChat = () => {
    setIsUserChat(true);
    setIsGroupChat(false);
  };

  const handleGroupChat = () => {
    setIsGroupChat(true);
    setIsUserChat(false);
  };

  return (
    <>
      {!showEdit ? (
        <main>
          {!showInformation ? (
            <>
              <div className="left-nav">
                <div className="user-info">
                  <UserInfo showEdit={setShowEdit} />
                </div>
                <div className="contact-list">
                  <Chat
                    switchChatBox={switchChatBox}
                    switchChatBoxGroup={switchChatBoxGroup}
                    isUserChat={handleUserChat}
                    isGroupChat={handleGroupChat}
                  />
                </div>
              </div>
              <div className="chat-box">
                {isUserChat && (
                  <ChatBox
                    currentChatBox={currentChatBox}
                    showChatInformation={setShowInformation}
                  />
                )}
                {isGroupChat && (
                  <GroupChatBox
                    currentChatBox={currentChatBox}
                    showChatInformation={setShowInformation}
                  />
                )}
                {!isUserChat && !isGroupChat && (
                  <div className="message-notify">
                    <h1>Select a chat from the left menu to start messaging</h1>
                    <p>Or hit the + button to add new people to your chat</p>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <div className="left-nav">
                <div className="user-info">
                  <UserInfo showEdit={setShowEdit} />
                </div>
                <div className="contact-list">
                  <Chat
                    switchChatBox={switchChatBox}
                    switchChatBoxGroup={switchChatBoxGroup}
                    isUserChat={handleUserChat}
                    isGroupChat={handleGroupChat}
                  />
                </div>
              </div>
              <div className="chat-box">
                {isUserChat && (
                  <ChatBox
                    currentChatBox={currentChatBox}
                    showChatInformation={setShowInformation}
                  />
                )}
                {isGroupChat && (
                  <GroupChatBox
                    currentChatBox={currentChatBox}
                    showChatInformation={setShowInformation}
                  />
                )}
                {!isUserChat && !isGroupChat && (
                  <div className="message-notify">
                    <h1>Select a chat from the left menu to start messaging</h1>
                    <p>Or hit the + button to add new people to your chat</p>
                  </div>
                )}
              </div>
              <div className="chat-detail">
                {isUserChat && <ChatDetail currentChatBox={currentChatBox} />}
                {isGroupChat && <GroupDetail currentChatBox={currentChatBox} />}
              </div>
            </>
          )}
        </main>
      ) : (
        <EditProfile showEdit={setShowEdit} />
      )}
    </>
  );
}

export default Dashboard;
