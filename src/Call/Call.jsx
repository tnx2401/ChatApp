import React, { useState, useEffect, useRef } from "react";
import Peer from "peerjs";
import "./Call.scss";
import { ref, set, onValue } from "firebase/database"; // Import Realtime Database functions
import { realtimeDB } from "../lib/firebase"; // Import Realtime Database instance
import { userStore } from "../lib/userStore";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPhone, faPhoneSlash, faX } from "@fortawesome/free-solid-svg-icons";

const Call = ({ currentUser, currentChatBox, showCall }) => {
  const [peer, setPeer] = useState(null);
  const [call, setCall] = useState(null);
  const [localStream, setLocalStream] = useState(null);
  const remoteAudioRef = useRef(null); // Reference for the remote audio element

  // Access callStatus and updateCallStatus from the store
  const { callStatus, updateCallStatus } = userStore((state) => ({
    callStatus: state.callStatus,
    updateCallStatus: state.updateCallStatus,
  }));

  useEffect(() => {
    const newPeer = new Peer(currentUser.id);

    newPeer.on("open", (id) => {
      console.log("Connected with peer ID: ", id);
      setPeer(newPeer);
    });

    newPeer.on("error", (error) => {
      console.error("PeerJS error:", error);
      setPeer(null);
      updateCallStatus("error"); // Update call status in the store
    });

    newPeer.on("disconnected", () => {
      console.log("Peer disconnected");
      newPeer.reconnect();
    });

    const handleIncomingCall = (incomingCall) => {
      console.log("Incoming call received");
      updateCallStatus("receiving"); // Update call status

      // Set up event listeners
      incomingCall.on("stream", handleRemoteStream);
      incomingCall.on("close", () => {
        updateCallStatus("idle"); // Reset status on call close
        setCall(null); // Reset call state
      });

      setCall(incomingCall); // Update the call state
    };

    newPeer.on("call", handleIncomingCall); // Register the incoming call handler

    // Listen for ICE candidates from Realtime Database
    const iceCandidatesRef = ref(realtimeDB, `iceCandidates/${currentUser.id}`);
    const unsubscribe = onValue(iceCandidatesRef, (snapshot) => {
      const data = snapshot.val();
      if (data && data.candidate) {
        peer.addIceCandidate(new RTCIceCandidate(data.candidate));
      }
    });

    return () => {
      if (localStream) {
        localStream.getTracks().forEach((track) => track.stop());
      }
      newPeer.destroy();
      unsubscribe();
    };
  }, [currentUser.id]); // Ensure dependencies are set correctly

  const startCall = async () => {
    if (!peer) {
      console.error("Peer connection not established");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setLocalStream(stream);

      const newCall = peer.call(currentChatBox.id, stream);
      if (!newCall) {
        throw new Error(`Could not connect to peer ${currentChatBox.id}`);
      }
      setCall(newCall);
      updateCallStatus("calling"); // Update call status in the store

      newCall.on("stream", handleRemoteStream);
      newCall.on("close", () => {
        updateCallStatus("idle"); // Update call status in the store
      });
      newCall.on("error", (error) => {
        console.error("Call error:", error);
        endCall();
      });

      // Send ICE candidates to Realtime Database
      newCall.on("icecandidate", (event) => {
        if (event.candidate) {
          set(ref(realtimeDB, `iceCandidates/${currentChatBox.id}`), {
            candidate: event.candidate.toJSON(),
          });
        }
      });
    } catch (error) {
      console.error("Error starting call: ", error);
      endCall();
    }
  };

  const answerCall = async () => {
    if (!call) {
      console.error("No call to answer");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setLocalStream(stream);

      call.answer(stream); // Answer the call
      call.on("stream", handleRemoteStream); // Receive stream from caller

      // Update call status for both parties
      updateCallStatus("ongoing"); // Update call status in the store

      // Send ICE candidates to Realtime Database
      call.on("icecandidate", (event) => {
        if (event.candidate) {
          set(ref(realtimeDB, `iceCandidates/${currentChatBox.id}`), {
            candidate: event.candidate.toJSON(),
          });
        }
      });
    } catch (error) {
      console.error("Error answering call: ", error);
    }
  };

  const handleRemoteStream = (stream) => {
    if (remoteAudioRef.current) {
      // Check if the audio is already playing
      if (remoteAudioRef.current.srcObject !== stream) {
        remoteAudioRef.current.srcObject = stream; // Set the new stream
        remoteAudioRef.current.play().catch((error) => {
          console.error("Error playing audio:", error);
        });
      }
      updateCallStatus("ongoing"); // Update call status to ongoing when the stream is received
    } else {
      console.error("Audio reference is not available");
    }
  };

  const endCall = () => {
    if (call) {
      call.close();
    }
    if (localStream) {
      localStream.getTracks().forEach((track) => track.stop());
    }
    setLocalStream(null);
    updateCallStatus("idle"); // Update call status in the store
  };

  const handleClose = () => {
    endCall();
    if (peer) {
      peer.destroy();
      setPeer(null);
    }
    showCall(false);
  };

  return (
    <div className="call-container">
      <audio ref={remoteAudioRef} autoPlay /> {/* Remote audio element */}
      {callStatus === "idle" && (
        <div className="call-actions">
          <h1>{currentChatBox.username}</h1>
          <img src={currentChatBox.img} alt={currentChatBox.username} />
          <div className="call-buttons">
            <button onClick={startCall} id="call-button">
              <FontAwesomeIcon icon={faPhone} />
            </button>
            <button onClick={handleClose} id="end-call-button">
              <FontAwesomeIcon icon={faX} />
            </button>
          </div>
        </div>
      )}
      {callStatus === "calling" && (
        <div>
          <p>Calling {currentChatBox.username}...</p>
          <button onClick={endCall}>Cancel</button>
        </div>
      )}
      {callStatus === "receiving" && (
        <div>
          <p>{currentChatBox.username} is calling...</p>
          <button onClick={answerCall}>Answer</button>
          <button onClick={endCall}>Reject</button>
        </div>
      )}
      {callStatus === "ongoing" && (
        <div>
          <p>In call with {currentChatBox.username}</p>
          <button onClick={endCall}>End Call</button>
        </div>
      )}
      {callStatus === "error" && (
        <div>
          <p>Error connecting to the call server. Please try again later.</p>
          <button onClick={() => window.location.reload()}>Retry</button>
        </div>
      )}
    </div>
  );
};

export default Call;
