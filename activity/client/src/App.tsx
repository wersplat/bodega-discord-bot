import { useState, useEffect } from "react";
import {
  DiscordSDK,
  Events as DiscordEvents,
  type Types as DiscordTypes,
} from "@discord/embedded-app-sdk";

const discordSdk = new DiscordSDK(import.meta.env.VITE_CLIENT_ID);

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

function App() {
  const [auth, setAuth] = useState<User | null>(null);
  const [sheetData, setSheetData] = useState<SheetRow[] | null>(null);
  const [isLoadingSheetData, setIsLoadingSheetData] = useState<boolean>(false);
  const [sheetError, setSheetError] = useState<string | null>(null);
  const [participants, setParticipants] =
    useState<DiscordTypes.GetActivityInstanceConnectedParticipantsResponse | null>(
      null
    );

  useEffect(() => {
    async function setupDiscordSDK() {
      await discordSdk.ready();
      const { code } = await discordSdk.commands.authorize({
        client_id: import.meta.env.VITE_CLIENT_ID,
        response_type: "code",
        state: "",
        prompt: "none",
        scope: ["identify", "guilds"],
      });

      // Fetch token from your server
      const tokenResponse = await fetch("/.proxy/api/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const { access_token } = await tokenResponse.json();

      // Authenticate with Discord SDK
      const newAuth = await discordSdk.commands.authenticate({
        access_token,
      });
      setAuth(newAuth.user);

      // Setup participant listeners
      function updateParticipants(
        _participants: DiscordTypes.GetActivityInstanceConnectedParticipantsResponse
      ) {
        setParticipants(_participants);
      }
      discordSdk.subscribe(
        DiscordEvents.ACTIVITY_INSTANCE_PARTICIPANTS_UPDATE,
        updateParticipants
      );
      // Initialize participants
      try {
        const initialParticipants = await discordSdk.commands.getInstanceConnectedParticipants();
        setParticipants(initialParticipants);
      } catch (e) {
        console.error("Error fetching initial participants:", e);
        // Optionally set an error state or handle as needed
      }
    }

    async function fetchSheetData() {
      if (!auth) return; // Should not happen if called correctly, but good guard
      setIsLoadingSheetData(true);
      setSheetError(null);
      try {
        const response = await fetch('/.proxy/api/sheet-data');
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Failed to parse error response from sheet data endpoint' }));
          throw new Error(errorData.error || `Error fetching sheet data: ${response.status}`);
        }
        const data: SheetRow[] = await response.json();
        setSheetData(data);
      } catch (e: unknown) {
        console.error("Failed to fetch sheet data:", e);
        if (e instanceof Error) {
          setSheetError(e.message);
        } else {
          setSheetError("An unknown error occurred while fetching sheet data.");
        }
      }
      setIsLoadingSheetData(false);
    }

    if (auth) {
      // If authenticated, and we don't have data, and not loading, and no error, then fetch.
      if (!sheetData && !isLoadingSheetData && !sheetError) {
        fetchSheetData();
      }
    } else {
      setupDiscordSDK();
    }
  }, [auth, sheetData, isLoadingSheetData, sheetError]);

  return (
    <main
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "1rem",
      }}
    >
      <section>
        <h1>Discord Activity</h1>
        <p>Instance ID: {discordSdk.instanceId}</p>
      </section>
      <section>
        <h2>Auth</h2>
        {auth === null ? (
          <p>Authenticating...</p>
        ) : (
          <div>Hello, {auth.global_name ?? auth.username}!</div>
        )}
      </section>
      <section>
        <h2>Participants</h2>
        {participants === null ? (
          <p>Fetching participants...</p>
        ) : (
          <Participants participants={participants} />
        )}
      </section>
      {isLoadingSheetData && <p>Loading sheet data...</p>}
      {sheetError && <p style={{ color: 'red' }}>Error: {sheetError}</p>}
      {sheetData && sheetData.length > 0 && (
        <div style={{marginTop: '1rem'}}>
          <h3>Sheet Data</h3>
          <button 
            onClick={() => window.open('https://docs.google.com/spreadsheets/d/1sOdG103h92LBv-FmoABPOd5jLROq0Smk23_-7IkQFYY/edit?usp=sharing', '_blank')}
            style={{
              backgroundColor: '#5865F2',
              color: 'white',
              border: 'none',
              padding: '10px 15px',
              borderRadius: '3px',
              cursor: 'pointer',
              marginBottom: '10px',
              fontSize: '14px'
            }}
          >
            Open Google Sheet
          </button>
          <div style={{maxHeight: '400px', overflowY: 'auto', border: '1px solid #eee'}}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead style={{position: 'sticky', top: 0, backgroundColor: '#36393f', zIndex: 1}}>
                <tr>
                  {Object.keys(sheetData[0]).map(header => (
                    <th key={header} style={{ border: '1px solid #4f545c', padding: '8px', textAlign: 'left', color: '#b9bbbe' }}>{header}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sheetData.map((row, rowIndex) => (
                  <tr key={rowIndex} style={{backgroundColor: rowIndex % 2 === 0 ? '#2f3136' : '#2c2f33'}}>
                    {Object.values(row).map((value, colIndex) => (
                      <td key={colIndex} style={{ border: '1px solid #4f545c', padding: '8px', color: '#dcddde' }}>{value}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {sheetData && sheetData.length === 0 && <p>No data found in the sheet.</p>}
    </main>
  );
}

export default App;
