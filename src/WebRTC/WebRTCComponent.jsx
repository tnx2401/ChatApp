import React, { useRef, useEffect, useState } from "react";
import { ref, child, push, onValue, set, get } from "firebase/database";
import { realtimeDB } from "../lib/firebase";

const WebRTCComponent = () => {
  const localStreamRef = useRef(null);
  const remoteStreamRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const roomRef = ref(realtimeDB, "rooms/room-id");
  const iceCandidateQueue = useRef([]);
  const offerQueue = useRef([]); // Define offerQueue useRef
  const [callStatus, setCallStatus] = useState("idle");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const initializePeerConnection = async () => {
      try {
        console.log("Initializing peer connection...");
        peerConnectionRef.current = new RTCPeerConnection({
          iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
        });

        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
        });
        console.log("Local stream: ", stream);

        stream.getTracks().forEach((track) => {
          console.log("Adding local track:", track);
          peerConnectionRef.current.addTrack(track, stream);
        });

        if (localStreamRef.current) {
          localStreamRef.current.srcObject = stream;
        }

        peerConnectionRef.current.ontrack = (event) => {
          console.log("Received remote track:", event.track);
          if (remoteStreamRef.current) {
            if (!remoteStreamRef.current.srcObject) {
              remoteStreamRef.current.srcObject = new MediaStream();
            }
            remoteStreamRef.current.srcObject.addTrack(event.track);
          }
        };

        peerConnectionRef.current.onicecandidate = (event) => {
          if (event.candidate) {
            console.log("Sending ICE candidate:", event.candidate);
            push(child(roomRef, "ice-candidates"), event.candidate.toJSON());
          }
        };

        peerConnectionRef.current.onsignalingstatechange = () => {
          console.log(
            "Signaling state change:",
            peerConnectionRef.current.signalingState
          );
        };

        onValue(child(roomRef, "ice-candidates"), (snapshot) => {
          snapshot.forEach((childSnapshot) => {
            const candidate = new RTCIceCandidate(childSnapshot.val());
            console.log("Received ICE candidate:", candidate);
            if (peerConnectionRef.current.remoteDescription) {
              peerConnectionRef.current
                .addIceCandidate(candidate)
                .catch((e) =>
                  console.error("Error adding received ICE candidate", e)
                );
            } else {
              iceCandidateQueue.current.push(candidate);
            }
          });
        });

        onValue(child(roomRef, "answer"), async (snapshot) => {
          if (snapshot.exists()) {
            const answer = new RTCSessionDescription(snapshot.val());
            console.log(
              "Received answer. Current signaling state:",
              peerConnectionRef.current.signalingState
            );
            try {
              if (
                peerConnectionRef.current.signalingState === "have-local-offer"
              ) {
                await peerConnectionRef.current.setRemoteDescription(answer);
                processIceCandidatesQueue();
                setCallStatus("connected");
              } else {
                console.warn(
                  "Received answer but signaling state is not 'have-local-offer'. Current state:",
                  peerConnectionRef.current.signalingState
                );
              }
            } catch (error) {
              console.error(
                "Error setting remote description for answer:",
                error
              );
              setErrorMessage(
                "Error setting remote description for answer: " + error.message
              );
            }
          }
        });

        onValue(child(roomRef, "offer"), async (snapshot) => {
          if (
            snapshot.exists() &&
            !peerConnectionRef.current.localDescription
          ) {
            const offer = new RTCSessionDescription(snapshot.val());
            if (peerConnectionRef.current.signalingState === "stable") {
              await peerConnectionRef.current.setRemoteDescription(offer);
              const answer = await peerConnectionRef.current.createAnswer();
              await peerConnectionRef.current.setLocalDescription(answer);
              await set(
                child(roomRef, "answer"),
                peerConnectionRef.current.localDescription.toJSON()
              );
              processIceCandidatesQueue();
              setCallStatus("connected");
            } else if (
              peerConnectionRef.current.signalingState === "have-local-offer"
            ) {
              console.log(
                "Signaling state is have-local-offer. Adding received offer to the queue."
              );
              offerQueue.current.push(offer); // Handle received offer using offerQueue
            } else {
              console.warn(
                "Received offer but signaling state is not 'stable' or 'have-local-offer'. Current state:",
                peerConnectionRef.current.signalingState
              );
            }
          }
        });
      } catch (error) {
        console.error("Error initializing peer connection", error);
        setErrorMessage("Error initializing peer connection: " + error.message);
      }
    };

    const processIceCandidatesQueue = () => {
      while (iceCandidateQueue.current.length) {
        const candidate = iceCandidateQueue.current.shift();
        peerConnectionRef.current
          .addIceCandidate(candidate)
          .catch((e) =>
            console.error("Error adding ICE candidate from queue", e)
          );
      }
    };

    const ensureRoomExists = async () => {
      try {
        const roomSnapshot = await get(roomRef);
        if (!roomSnapshot.exists()) {
          await set(roomRef, {
            offer: null,
            answer: null,
            ice: [],
          });
        }
      } catch (error) {
        console.error("Error ensuring room exists:", error);
        setErrorMessage("Error ensuring room exists: " + error.message);
      }
    };

    const initialize = async () => {
      await ensureRoomExists();
      await initializePeerConnection();
    };

    initialize();

    return () => {
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
      }
    };
  }, []);

  const initiateCall = async () => {
    try {
      if (peerConnectionRef.current) {
        setCallStatus("calling");
        const offer = await peerConnectionRef.current.createOffer();
        await peerConnectionRef.current.setLocalDescription(offer);
        await set(
          child(roomRef, "offer"),
          peerConnectionRef.current.localDescription.toJSON()
        );
      } else {
        setErrorMessage("Error: Peer connection not initialized.");
      }
    } catch (error) {
      console.error("Error initiating call:", error);
      setErrorMessage("Error initiating call: " + error.message);
    }
  };

  const endCall = async () => {
    try {
      if (peerConnectionRef.current) {
        await set(child(roomRef, "offer"), null);
        await set(child(roomRef, "answer"), null);
        await set(child(roomRef, "ice-candidates"), null);
        peerConnectionRef.current.close();
        peerConnectionRef.current = null;
      }
      setCallStatus("ended");
    } catch (error) {
      console.error("Error ending call:", error);
      setErrorMessage("Error ending call: " + error.message);
    }
  };

  return (
    <div>
      <div>Status: {callStatus}</div>
      {errorMessage && <div>{errorMessage}</div>}
      {callStatus === "idle" && <button onClick={initiateCall}>Call</button>}
      {callStatus === "calling" && <div>Calling...</div>}
      {callStatus === "connected" && (
        <div>
          <audio ref={localStreamRef} autoPlay muted />
          <audio ref={remoteStreamRef} autoPlay />
          <button onClick={endCall}>End Call</button>
        </div>
      )}
    </div>
  );
};

export default WebRTCComponent;
