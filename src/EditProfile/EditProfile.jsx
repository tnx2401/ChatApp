import { useState, useEffect } from "react";
import { userStore } from "../lib/userStore";
import "./EditProfile.css";
import Flatpickr from "react-flatpickr";
import "flatpickr/dist/themes/material_blue.css";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowLeft, faFloppyDisk } from "@fortawesome/free-solid-svg-icons";
import { doc, updateDoc } from "firebase/firestore";
import { storage, db } from "../lib/firebase";
import { ref, getDownloadURL, uploadBytesResumable } from "firebase/storage";

function EditProfile({ showEdit }) {
  const { currentUser } = userStore();

  const [firstName, setFirstname] = useState(currentUser.firstname || "");
  const [lastName, setLastname] = useState(currentUser.lastname || "");
  const [username, setUsername] = useState(currentUser.username);
  const [email, setEmail] = useState(currentUser.email);
  const [profileImage, setProfileImage] = useState(
    currentUser.profileimage || null
  );
  const [description, setDescription] = useState(currentUser.description || "");
  const [phoneNumber, setPhoneNumber] = useState(currentUser.phonenumber || "");
  const [dateOfBirth, setDateOfBirth] = useState(
    new Date(currentUser.dateofbirth) || new Date()
  );
  const [address, setAddress] = useState(currentUser.address || "");
  const [imageFile, setImageFile] = useState(null);

  const backDashboard = () => {
    showEdit(false);
  };

  const handleImageChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setImageFile(e.target.files[0]);
      setProfileImage(URL.createObjectURL(e.target.files[0]));
    }
  };

  const handleUpdateProfile = async () => {
    if (imageFile) {
      const storageRef = ref(storage, `profileImages/${imageFile.name}`);
      const uploadTask = uploadBytesResumable(storageRef, imageFile);

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
          await saveProfileData(downloadURL);
        }
      );
    } else {
      await saveProfileData();
    }
  };

  const saveProfileData = async (downloadURL) => {
    const updateUserRef = doc(db, "users", currentUser.id);

    const updatedData = {
      username: username,
      firstname: firstName,
      lastname: lastName,
      phonenumber: phoneNumber,
      dateofbirth: dateOfBirth.toString(),
      address: address,
      description: description,
      profileImage: profileImage,
    };
    if (downloadURL) {
      updatedData.profileimage = downloadURL;
    }

    await updateDoc(updateUserRef, updatedData);
    showEdit(false);
    location.reload();
  };

  return (
    <div className="edit-container">
      <div className="edit-info-container">
        <div id="title">
          <h1>Edit Profile</h1>
          <button id="back" onClick={backDashboard}>
            <FontAwesomeIcon icon={faArrowLeft} />
          </button>
          <button id="save" onClick={handleUpdateProfile}>
            <FontAwesomeIcon icon={faFloppyDisk} />
          </button>
        </div>

        <div id="image">
          <label htmlFor="profileImage">Profile Image</label>
          <input
            type="file"
            id="profileImage"
            accept="image/*"
            onChange={handleImageChange}
          />
          {profileImage && (
            <img
              src={profileImage}
              alt="Profile Preview"
              className="profile-preview"
            />
          )}
        </div>

        <div id="firstname">
          <label htmlFor="firstname">First Name</label>
          <input
            type="text"
            id="firstname"
            value={firstName}
            onChange={(e) => {
              setFirstname(e.target.value);
            }}
          />
        </div>

        <div id="lastname">
          <label htmlFor="lastname">Last Name</label>
          <input
            type="text"
            id="lastname"
            value={lastName}
            onChange={(e) => {
              setLastname(e.target.value);
            }}
          />
        </div>

        <div id="username">
          <label htmlFor="username">Username</label>
          <input
            type="text"
            id="username"
            value={username}
            onChange={(e) => {
              setUsername(e.target.value);
            }}
          />
        </div>

        <div id="email">
          <label htmlFor="email">Email</label>
          <input type="text" id="email" value={email} />
        </div>

        <div id="phonenumber">
          <label htmlFor="phonenumber">Phone Number</label>
          <input
            type="text"
            id="phonenumber"
            value={phoneNumber}
            onChange={(e) => {
              setPhoneNumber(e.target.value);
            }}
          />
        </div>

        <div id="dateofbirth">
          <label htmlFor="dateofbirth">Date of Birth</label>
          <Flatpickr
            value={dateOfBirth}
            onChange={(date) => {
              setDateOfBirth(date[0]);
            }}
            options={{
              dateFormat: "Y-m-d",
            }}
            className="flatpickr-input"
            placeholder="Select Date of Birth"
          />
        </div>

        <div id="address">
          <label htmlFor="address">Address</label>
          <input
            type="text"
            id="address"
            value={address}
            onChange={(e) => {
              setAddress(e.target.value);
            }}
          />
        </div>

        <div id="description">
          <label htmlFor="description">Description</label>
          <input
            type="text"
            id="description"
            value={description}
            onChange={(e) => {
              setDescription(e.target.value);
            }}
          />
        </div>
      </div>
    </div>
  );
}

export default EditProfile;
