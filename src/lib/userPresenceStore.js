import { create } from "zustand";
import {
  ref,
  onValue,
  onDisconnect,
  set as firebaseSet,
} from "firebase/database";
import { auth, realtimeDB } from "./firebase";

export const userPresenceStore = create((set, get) => ({
  currentStatus: null,
  isLoadingStatus: true,
  userStatuses: {},
  userManuallyOffline: false,

  fetchUserStatus: async (uid, callback) => {
    if (uid) {
      const userStatusRef = ref(realtimeDB, `/status/${uid}`);
      onValue(userStatusRef, (snapshot) => {
        const status = snapshot.val() ? snapshot.val().state : "offline";
        set({ currentStatus: status, isLoadingStatus: false });
        if (callback) callback(status);
      });
    } else {
      set({ currentStatus: null, isLoadingStatus: false });
    }
  },

  setupPresenceTracking: (uid) => {
    if (!uid) return;

    const userStatusDatabaseRef = ref(realtimeDB, `/status/${uid}`);

    const isOfflineForDatabase = {
      state: "offline",
      last_changed: Date.now(),
    };

    const isOnlineForDatabase = {
      state: "online",
      last_changed: Date.now(),
    };

    const isAwayForDatabase = {
      state: "away",
      last_changed: Date.now(),
    };

    const connectedRef = ref(realtimeDB, ".info/connected");
    onValue(connectedRef, (snapshot) => {
      if (snapshot.val() === false) {
        return;
      }

      const presenceRef = ref(realtimeDB, `/status/${uid}`);
      onDisconnect(presenceRef)
        .set(isOfflineForDatabase)
        .catch((error) => {
          console.log("Error setting onDisconnect:", error);
        });

      if (!get().userManuallyOffline) {
        firebaseSet(presenceRef, isOnlineForDatabase).catch((error) => {
          console.log("Error setting user status to online:", error);
        });
      }

      // Track user inactivity to set the "away" state
      let inactivityTimeout;
      const handleActivity = () => {
        if (!get().userManuallyOffline) {
          clearTimeout(inactivityTimeout);
          firebaseSet(presenceRef, isOnlineForDatabase).catch((error) => {
            console.log("Error setting user status to online:", error);
          });
          inactivityTimeout = setTimeout(() => {
            if (!get().userManuallyOffline) {
              firebaseSet(presenceRef, isAwayForDatabase).catch((error) => {
                console.log("Error setting user status to away:", error);
              });
            }
          }, 300000);
        }
      };

      window.addEventListener("mousemove", handleActivity);
      window.addEventListener("keydown", handleActivity);

      handleActivity(); // Set initial activity state

      auth.onAuthStateChanged((user) => {
        if (!user) {
          firebaseSet(userStatusDatabaseRef, isOfflineForDatabase).catch(
            (error) => {
              console.log("Error setting user status to offline:", error);
            }
          );
        }
      });

      set({ currentStatus: "online", isLoadingStatus: false });
    });
  },

  appearOffline: (uid) => {
    if (uid) {
      const userStatusDatabaseRef = ref(realtimeDB, `/status/${uid}`);
      const isOfflineForDatabase = {
        state: "offline",
        last_changed: Date.now(),
      };
      firebaseSet(userStatusDatabaseRef, isOfflineForDatabase).catch(
        (error) => {
          console.log("Error setting user status to offline:", error);
        }
      );
      set({ currentStatus: "offline", userManuallyOffline: true });
    }
  },

  resetManualOffline: (uid) => {
    const presenceRef = ref(realtimeDB, `/status/${uid}`);
    const isOnlineForDatabase = {
      state: "online",
      last_changed: Date.now(),
    };
    firebaseSet(presenceRef, isOnlineForDatabase).catch((error) => {
      console.log("Error setting user status to online:", error);
    });
    set({ currentStatus: "online", userManuallyOffline: false });
  },

  listenToAllUsersStatus: () => {
    const usersStatusRef = ref(realtimeDB, "/status");
    onValue(usersStatusRef, (snapshot) => {
      const allUsersStatus = snapshot.val() || {};
      set({ userStatuses: allUsersStatus });
    });
  },
}));
