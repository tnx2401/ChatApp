import "./Register.css";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth, db } from "../lib/firebase.js";
import { doc, setDoc } from "firebase/firestore";
import { redirect } from "react-router-dom";

import React, { useState } from "react";

import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

function Register() {
  const notify = () =>
    toast("Register successfully, you can now login!", {
      position: "top-right",
      pauseOnHover: false,
      autoClose: 3000,
      theme: "light",
    });
  const handleCreateUser = async (event) => {
    event.preventDefault();
    const formData = new FormData(event.target);

    const { username, email, password } = Object.fromEntries(formData);
    try {
      const res = await createUserWithEmailAndPassword(auth, email, password);

      await setDoc(doc(db, "users", res.user.uid), {
        username,
        email,
        id: res.user.uid,
        blocked: [],
      });
      await setDoc(doc(db,"user-chats", res.user.uid), {

      });
      notify();
    } catch (error) {
      console.log(error);
    }
  };

  return (
    <div className="register animate__animated animate__fadeInRight">
      <h1>Register</h1>
      <form onSubmit={handleCreateUser} className="sign-up-form">
        <label htmlFor="username">Email</label>
        <div className="input-container">
          <input
            type="email"
            placeholder="Enter your email"
            name="email"
            required
          />
        </div>

        <label htmlFor="username">Username</label>
        <div className="input-container">
          <input
            type="text"
            placeholder="Enter your username"
            name="username"
            required
          />
        </div>

        <label htmlFor="password">Password</label>
        <div className="input-container">
          <input
            type="password"
            placeholder="Enter your password"
            name="password"
            required
          />
        </div>
        <div className="btn-container">
          <button type="submit" onClick={redirect}>
            Register
          </button>
        </div>
      </form>
      <div className="sign-up-container">
        <h5>Already having an account ?</h5>
        <a href="/login">Sign in</a>
      </div>
      <ToastContainer />
    </div>
  );
}

export default Register;
