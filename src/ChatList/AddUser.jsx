import { React, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSearch, faCancel, faPlus } from "@fortawesome/free-solid-svg-icons";

import {
  collection,
  query,
  where,
  getDocs,
  doc,
  updateDoc,
} from "firebase/firestore";
import { db } from "../lib/firebase";
import { userStore } from "../lib/userStore";

function AddUser({ onClose, onNewUserAdded }) {
  const [searchUserInput, setSearchUserInput] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const { currentUser } = userStore();

  const handleUserInputChange = (event) => {
    setSearchUserInput(event.target.value);
  };

  const handleSearchButton = async () => {
    setIsLoading(true);
    setHasSearched(true);

    try {
      const usersRef = collection(db, "users");
      const q = query(usersRef, where("username", "==", searchUserInput));
      const querySnapshot = await getDocs(q);

      const results = [];
      querySnapshot.forEach((doc) => {
        results.push({ id: doc.id, ...doc.data() });
      });

      setSearchResults(results);
      setIsLoading(false);
    } catch (error) {
      console.error("Error fetching user", error);
      setIsLoading(false);
    }
  };
  
  const addContact = async (contactId, contactData) => {
    try {
      const userChatsRef = doc(db, "user-chats", currentUser.id);
      await updateDoc(userChatsRef, {
        [contactId]: {
          chats: [],
        },
      });

      const contactChatsRef = doc(db, "user-chats", contactId);

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

      onNewUserAdded({ id: contactId, ...contactData, chats: [] });
      onClose();
    } catch (err) {
      console.log("Error", err);
    }
  };

  return (
    <>
      <div className="add-user-container">
        <input
          type="text"
          placeholder="Search user..."
          onChange={handleUserInputChange}
        />
        <button onClick={handleSearchButton}>
          <FontAwesomeIcon icon={faSearch} />
        </button>
        <button onClick={onClose}>
          <FontAwesomeIcon icon={faCancel} />
        </button>
      </div>
      <div className="result">
        {isLoading && <h3>Loading...</h3>}

        {!isLoading &&
          searchResults.length > 0 &&
          searchResults.map((result, index) => (
            <div key={result.id} className="result-user">
              <div>
                <h2>{result.id}</h2>
                <h2>{result.username}</h2>
                <h4>{result.email}</h4>
              </div>
              <div>
                <button onClick={() => addContact(result.id, result)}>
                  <FontAwesomeIcon icon={faPlus} />
                </button>
              </div>
            </div>
          ))}

        {!isLoading && searchResults.length === 0 && hasSearched && (
          <h3>There are no users match your search!</h3>
        )}

        {!isLoading && !hasSearched && (
          <h3>Search for user and start chatting!</h3>
        )}
      </div>
    </>
  );
}

export default AddUser;
