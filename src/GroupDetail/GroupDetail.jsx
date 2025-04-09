import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faUserGroup, faGear, faPlus } from "@fortawesome/free-solid-svg-icons";
import "./GroupDetail.css";
import { userStore } from "../lib/userStore";
import { useState } from "react";
import GroupInformation from "./GroupInformation";
import Members from "./Members";

function GroupDetail({ currentChatBox }) {
  const { currentUser } = userStore();
  const [isShowGroupInfo, setIsShowGroupInfo] = useState(false);
  const [isShowMembers, setIsShowMembers] = useState(false);

  const handleShowGroupInformation = () => {
    setIsShowGroupInfo(true);
  };
  const handleShowMembers = () => {
    setIsShowMembers(true);
  };

  const closeGroupInfo = () => {
    setIsShowGroupInfo(false);
  };
  const closeMembers = () => {
    setIsShowMembers(false);
  };

  const groupInfo = {
    name: currentChatBox.name,
  };

  return (
    <>
      {isShowGroupInfo && (
        <div className="modal">
          <div className="modal-content">
            <GroupInformation onClose={closeGroupInfo} groupInfo={groupInfo} />
          </div>
        </div>
      )}

      {isShowMembers && (
        <div className="modal">
          <div className="modal-content">
            <Members
              onClose={closeMembers}
              members={currentChatBox.members}
              groupId={currentChatBox.id}
              manager={currentChatBox.manager}
            />
          </div>
        </div>
      )}

      <div className="group-detail-container">
        <h2>Group's Info</h2>
        <img src="/9853c5ae293810fc37fb567c8940c303.jpg" alt="" />
        <div className="group-function">
          {currentUser.id == currentChatBox.manager && (
            <>
              <div
                className="individual-group-function"
                onClick={handleShowGroupInformation}
              >
                <h4>Group Information</h4>
                <h3>
                  <FontAwesomeIcon icon={faGear} />
                </h3>
              </div>

              <div
                className="individual-group-function"
                onClick={handleShowMembers}
              >
                <h4>Invite new user</h4>
                <h3>
                  <FontAwesomeIcon icon={faPlus} />
                </h3>
              </div>
            </>
          )}
          <div
            className="individual-group-function"
            onClick={handleShowMembers}
          >
            <h4>Members</h4>
            <h3>
              <FontAwesomeIcon icon={faUserGroup} />
            </h3>
          </div>
        </div>
        <div className="group-detail-buttons">
          {currentUser.id == currentChatBox.manager ? (
            <button>Delete Group</button>
          ) : (
            <button>Leave Group</button>
          )}
        </div>
      </div>
    </>
  );
}

export default GroupDetail;
