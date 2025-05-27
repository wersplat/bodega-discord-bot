import { useState, useEffect, useCallback } from "react";
import "./App.css"; // This imports global styles. Ensure App.css or activity-index.css (imported in main.tsx) contains all necessary styles.
import {
  DiscordSDK,
  Events as DiscordEvents,
  type Types as DiscordTypes,
} from "@discord/embedded-app-sdk";

let discordSdk: DiscordSDK | null = null;

const sheetTabs = [
  { name: "Road-to-25K-Teams", sheetName: "Road-to-25K-Teams" },
  { name: "Overall Standings", sheetName: "Overall Standings" },
  { name: "D1", sheetName: "D1" },
  { name: "D2", sheetName: "D2" },
  { name: "D3", sheetName: "D3" },
  { name: "Open", sheetName: "Open" },
];

const DEFAULT_SHEET_NAME = "Open";

type SheetRow = Record<string, string>;

type User = {
  username: string;
  discriminator: string;
  id: string;
  public_flags: number;
  avatar?: string | null | undefined;
  global_name?: string | null | undefined;
};

function Participants({
  participants,
}: {
  participants: DiscordTypes.GetActivityInstanceConnectedParticipantsResponse;
}) {
  return (
    <div>
      {participants.participants.map((participant) => (
        <div key={participant.id} style={{
          display: "flex",
          gap: "1rem",
          alignItems: "center",
        }}>
          {participant.avatar && (
            <img
              src={`https://cdn.discordapp.com/avatars/${participant.id}/${participant.avatar}.png?size=64`}
              alt={participant.username}
              style={{
                width: "4rem",
                height: "4rem",
                borderRadius: "1rem",
              }}
            />
          )}
          <span>{participant.username}</span>
        </div>
      ))}
    </div>
  );
}

function App() { // Renamed from ActivityApp to App
  const [auth, setAuth] = useState<User | null>(null);
  const [sheetData, setSheetData] = useState<SheetRow[] | null>(null);
  const [isLoadingSheetData, setIsLoadingSheetData] = useState<boolean>(false);
  const [sheetError, setSheetError] = useState<string | null>(null);
  const [selectedSheetName, setSelectedSheetName] = useState<string>(DEFAULT_SHEET_NAME);
  const [participants, setParticipants] =
    useState<DiscordTypes.GetActivityInstanceConnectedParticipantsResponse | null>(
      null
    );
  const [discordClientId, setDiscordClientId] = useState<string | null>(null);

  useEffect(() => {
    async function fetchConfig() {
      try {
        const response = await fetch("/api/config");
        if (!response.ok) {
          throw new Error(`Failed to fetch config: ${response.status}`);
        }
        const config = await response.json();
        if (config.discordClientId) {
          setDiscordClientId(config.discordClientId);
          // Initialize SDK here after getting client ID
          try {
            discordSdk = new DiscordSDK(config.discordClientId);
            console.log("DiscordSDK initialized in fetchConfig");
          } catch (sdkError) {
            console.warn("Failed to initialize DiscordSDK in fetchConfig (expected in local dev):", sdkError);
            // discordSdk remains null, app should proceed without full Discord integration
          }
        } else {
          throw new Error("Discord Client ID not found in config");
        }
      } catch (e) {
        console.error("Failed to fetch /api/config", e);
        setSheetError(e instanceof Error ? e.message : "Failed to load configuration.");
      }
    }
    fetchConfig();
  }, []);

  const fetchSheetData = useCallback(async (sheetName: string) => {
    // Determine if running in a likely Discord environment (basic check)
    const isLikelyDiscordEnv = !!(window.location.search.includes("frame_id"));

    if (isLikelyDiscordEnv && (!auth || !discordSdk)) {
      console.log("Skipping fetchSheetData in Discord env: auth or discordSdk not ready");
      // setSheetError("Waiting for Discord authentication to load data."); // Optional: inform user
      return;
    } else if (!isLikelyDiscordEnv) {
      console.log("Running fetchSheetData in local/non-Discord env. Discord auth/SDK checks for data fetching bypassed.");
      // In local dev, we proceed even if auth/discordSdk is null,
      // assuming the /api/sheet-data endpoint doesn't strictly require them for basic viewing.
    }
    // If it's a Discord env and auth & SDK are ready, it will also proceed here.
    setIsLoadingSheetData(true);
    setSheetError(null);
    try {
      const response = await fetch(`/api/sheet-data/${sheetName}`);
      if (!response.ok) {
        let errorDetails = `Error fetching sheet data: ${response.status}`;
        try {
            const errorData = await response.json();
            errorDetails = errorData.details || errorData.error || errorDetails;
        } catch {
            console.error("Failed to parse error response from worker as JSON, status:", response.status);
        }
        throw new Error(errorDetails);
      }
      const result = await response.json();
      setSheetData(result.data);
    } catch (e: unknown) {
      console.error(`Failed to fetch sheet data for sheet ${sheetName}:`, e);
      if (e instanceof Error) {
        setSheetError(e.message);
      } else {
        setSheetError("An unknown error occurred while fetching sheet data.");
      }
    }
    setIsLoadingSheetData(false);
  }, [auth]); // discordSdk is stable once initialized, auth is the key dependency here

  useEffect(() => {
    async function loadSheetDataOnAuthOrSelectionChange() {
      if (auth && discordSdk && selectedSheetName) { // Ensure SDK is also ready
        await fetchSheetData(selectedSheetName);
      }
    }
    loadSheetDataOnAuthOrSelectionChange();
  }, [auth, selectedSheetName, fetchSheetData]);

  useEffect(() => {
    async function setupDiscordSDK() {
      if (!discordClientId) {
        console.log("Discord Client ID not available yet for SDK setup.");
        return;
      }
      // Ensure discordSdk is initialized if it hasn't been already
      if (!discordSdk && discordClientId) {
        console.log("Attempting to initialize DiscordSDK in setupDiscordSDK effect because it was null.");
        try {
          discordSdk = new DiscordSDK(discordClientId!);
          console.log("DiscordSDK initialized in setupDiscordSDK");
        } catch (sdkError) {
          console.warn("Failed to initialize DiscordSDK in setupDiscordSDK (expected in local dev):", sdkError);
          // setSheetError("Discord SDK could not be initialized. Live features may be unavailable."); // Optional: inform user
          return; // Exit if SDK cannot be initialized
        }
      }

      if (!discordSdk) {
        console.warn("DiscordSDK is null in setupDiscordSDK, cannot proceed with Discord-specific setup.");
        return; 
      }

      try { // This try is for discordSdk.ready() and subsequent auth flow
        await discordSdk.ready();
        console.log("Discord SDK is ready");

        // Continue with authorization flow ONLY if SDK is ready
        const { code } = await discordSdk!.commands.authorize({
          client_id: discordClientId!,
          response_type: "code",
          state: "",
          prompt: "none", // "none" for automatic auth, "consent" to force user approval
          scope: ["identify", "guilds"], // Request necessary scopes
        });
        console.log("Authorization code received:", code);

        const tokenResponse = await fetch("/token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code }),
        });

        if (!tokenResponse.ok) {
          const errorBody = await tokenResponse.text(); // Read as text first to avoid JSON parse error if not JSON
          throw new Error(`Failed to exchange token: ${tokenResponse.status} ${tokenResponse.statusText}. Body: ${errorBody}`);
        }

        const { access_token } = await tokenResponse.json();
        console.log("Access token received");

        const newAuth = await discordSdk!.commands.authenticate({
          access_token,
        });
        setAuth(newAuth.user);
        console.log("Authentication successful:", newAuth.user);

        // Subscribe to participant updates
        discordSdk!.subscribe(
          DiscordEvents.ACTIVITY_INSTANCE_PARTICIPANTS_UPDATE,
          (updatedParticipants) => {
            setParticipants(updatedParticipants);
            console.log("Participants updated:", updatedParticipants);
          }
        );

        // Fetch initial participants
        const initialParticipants = await discordSdk!.commands.getInstanceConnectedParticipants();
        setParticipants(initialParticipants);
        console.log("Initial participants fetched:", initialParticipants);

      } catch (err) { // This catch is for discordSdk.ready() and the auth flow
        console.error("Error in Discord SDK setup (ready or auth flow):", err);
        if (err instanceof Error && err.message.includes("frame_id")) {
            console.warn("Discord SDK features unavailable in local dev (frame_id missing). App will proceed with available data.");
            // For local dev, don't set a blocking sheetError for frame_id issues.
            // If preferred, a non-blocking info message can be set:
            // setSheetError("Discord features unavailable (local dev mode)."); 
        } else {
            setSheetError(err instanceof Error ? err.message : "An unknown error occurred during Discord setup.");
        }
      }
    }

    if (discordClientId && !auth) { // Only run setup if client ID is available and not yet authed
      setupDiscordSDK();
    }
  }, [discordClientId, auth]); // Rerun if discordClientId changes or auth state changes

  // Loading state for configuration
  if (!discordClientId) {
    return <div>Loading configuration... {sheetError && <p style={{color: 'red'}}>{sheetError}</p>}</div>;
  }
  
  // SDK not ready (should be brief if discordClientId is set)
  if (!discordSdk) {
    return <div>Initializing SDK... (Waiting for SDK to be ready)</div>;
  }

  // Main application UI
  return (
    <main
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "1rem",
        padding: "1rem", // Added some padding for better layout
      }}
    >
      <section>
        <h1>Discord Activity</h1>
        {discordSdk.instanceId && <p>Instance ID: {discordSdk.instanceId}</p>} {/* Conditional render for instanceId */}
      </section>
      <section>
        <h2>Auth</h2>
        {auth === null ? (
          <p>Authenticating with Discord... {sheetError && <p style={{color: 'red'}}>Auth Error: {sheetError}</p>}</p>
        ) : (
          <div>Hello, {auth.global_name ?? auth.username}!</div>
        )}
      </section>
      <section>
        <h2>Sheet Tabs</h2>
        <div>
          {sheetTabs.map(tab => (
            <button 
              type="button"
              key={tab.sheetName} 
              onClick={() => setSelectedSheetName(tab.sheetName)}
              disabled={isLoadingSheetData || !auth} // Disable if loading or not authenticated
              style={{ 
                fontWeight: selectedSheetName === tab.sheetName ? 'bold' : 'normal', 
                marginRight: '0.5rem',
                padding: '0.5rem 1rem', // Added padding to buttons
                cursor: (isLoadingSheetData || !auth) ? 'not-allowed' : 'pointer', // Indicate disabled state
              }}
            >
              {tab.name}
            </button>
          ))}
        </div>
      </section>
      <section>
        <h2>Sheet Data for: {selectedSheetName}</h2>
        {isLoadingSheetData && <p>Loading sheet data...</p>}
        {sheetError && !isLoadingSheetData && <p style={{ color: 'red' }}>Error: {sheetError}</p>} {/* Show error only if not loading */}
        {sheetData && sheetData.length > 0 && (
          <div style={{marginTop: '1rem', overflowX: 'auto'}}>
            <table border={1} style={{borderCollapse: 'collapse', width: '100%'}}>
              <thead>
                <tr>
                  {Object.keys(sheetData[0]).map(header => <th key={header} style={{padding: '0.5rem', textAlign: 'left'}}>{header}</th>)}
                </tr>
              </thead>
              <tbody>
                {sheetData.map((row, rowIndex) => {
                  const headers = Object.keys(sheetData[0]); // Get headers from the first row
                  return (
                    <tr key={`sheet-row-${rowIndex}`}>
                      {headers.map(header => (
                        <td key={`sheet-cell-${rowIndex}-${header}`} style={{padding: '0.5rem'}}>{row[header]}</td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {sheetData && sheetData.length === 0 && !isLoadingSheetData && !sheetError && (
          <p>No data found for this sheet or sheet is empty.</p>
        )}
      </section>
      <section>
        <h2>Participants</h2>
        {participants === null && !auth && (
          <p>Waiting for authentication to fetch participants...</p>
        )}
        {participants === null && auth && (
          <p>Fetching participants...</p>
        )}
        {participants && (
          <Participants participants={participants} />
        )}
      </section>
    </main>
  );
}
export default App;