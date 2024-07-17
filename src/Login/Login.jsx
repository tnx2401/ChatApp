import "./Login.css";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faUser, faLock } from "@fortawesome/free-solid-svg-icons";
import { useState } from "react";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { Navigate } from "react-router-dom";

function Login() {
  const [email, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  function handleEmail(event) {
    setUsername(event.target.value);
  }
  function handlePassword(event) {
    setPassword(event.target.value);
  }

  const handleLogin = (event) => {
    event.preventDefault();
    const auth = getAuth();
    signInWithEmailAndPassword(auth, email, password)
      .then((userCredential) => {
        const user = userCredential.user;
        setIsLoggedIn(true);
      })
      .catch((error) => {
        const errorCode = error.code;
        const errorMessage = error.message;
        setError(errorMessage);
        console.error(`Error (${errorCode}): ${errorMessage}`);
      });
  };

  if (isLoggedIn) {
    return <Navigate to="/"/>;
  }

  return (
    <div className="login animate__animated animate__fadeInLeft">
      <h1>LOGIN</h1>
      <form onSubmit={handleLogin} className="sign-in-form">
        <label htmlFor="username">Email</label>
        <div className="input-container">
          <FontAwesomeIcon icon={faUser} className="input-icon" />
          <input
            type="email"
            placeholder="Enter your email"
            id="email"
            value={email}
            onChange={handleEmail}
          />
        </div>

        <label htmlFor="password">Password</label>
        <div className="input-container">
          <FontAwesomeIcon icon={faLock} className="input-icon" />
          <input
            type="password"
            placeholder="Enter your password"
            id="password"
            value={password}
            onChange={handlePassword}
          />
        </div>
        <div className="forgot-password-container">
          <a href="#" className="forgot-password">
            Forgot password?
          </a>
        </div>
        <div className="btn-container">
          <button type="submit">LOGIN</button>
        </div>
      </form>
      <div className="sign-up-container">
        <h5>Or sign up using</h5>
        <a href="/register">Sign Up</a>
      </div>
    </div>
  );
}

export default Login;
