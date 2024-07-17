import "./UserInfo.css";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faBars,
  faRightFromBracket,
  faPenToSquare,
  faCircle,
  faEyeSlash,
  faEye,
} from "@fortawesome/free-solid-svg-icons";
import { useState, useEffect } from "react";
import { auth } from "../lib/firebase.js";
import { signOut } from "firebase/auth";
import { userPresenceStore } from "../lib/userPresenceStore.js";
import { userStore } from "../lib/userStore.js";

function UserInfo({ showEdit }) {
  const { currentUser } = userStore();
  const {
    currentStatus,
    setupPresenceTracking,
    fetchUserStatus,
    isLoadingStatus,
    appearOffline,
    resetManualOffline,
  } = userPresenceStore();

  const [showMenu, setShowMenu] = useState(false);
  const [isAppearOffline, setIsAppearOffline] = useState(false);

  useEffect(() => {
    if (currentUser && currentUser.id) {
      setupPresenceTracking(currentUser.id);
      fetchUserStatus(currentUser.id);
    }
  }, [currentUser.id]);

  const toggleMenu = () => {
    setShowMenu((prevState) => !prevState);
  };

  const handleOptionClick = (option) => {
    if (option === "signout") {
      signOut(auth);
    } else if (option === "edit") {
      showEdit(true);
    } else if (option === "appearOffline") {
      appearOffline(currentUser.id);
      setIsAppearOffline(true);
    } else if (option === "appearOnline") {
      resetManualOffline(currentUser.id);
      setIsAppearOffline(false);
    }
  };

  if (isLoadingStatus) {
    return <div>Loading...</div>;
  }

  return (
    <div className="info">
      <div>
        <img src={currentUser.profileimage} alt="Profile" />
        <div className="info-title">
          <h3>{currentUser.username}</h3>
          <p
            className={`${
              currentStatus === "online"
                ? "online"
                : currentStatus === "away"
                ? "away"
                : "offline"
            }`}
          >
            <FontAwesomeIcon icon={faCircle} />
            &nbsp;
            {currentStatus}
          </p>
        </div>
      </div>
      <div className="dropdown">
        <button onClick={toggleMenu} className="dropdown-btn">
          <FontAwesomeIcon icon={faBars} />
        </button>
        {showMenu && (
          <div className="dropdown-menu">
            <ul>
              {!isAppearOffline ? (
                <>
                  <li onClick={() => handleOptionClick("appearOffline")}>
                    <FontAwesomeIcon icon={faEyeSlash} />
                    &nbsp;
                    <p>Appear offline</p>
                  </li>
                </>
              ) : (
                <>
                  <li onClick={() => handleOptionClick("appearOnline")}>
                    <FontAwesomeIcon icon={faEye} />
                    &nbsp;
                    <p>Appear online</p>
                  </li>
                </>
              )}
              <li onClick={() => handleOptionClick("edit")}>
                <FontAwesomeIcon icon={faPenToSquare} />
                &nbsp;
                <p>Edit Profile</p>
              </li>
              <li onClick={() => handleOptionClick("signout")}>
                <FontAwesomeIcon icon={faRightFromBracket} />
                &nbsp;
                <p>Sign Out</p>
              </li>
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

export default UserInfo;
