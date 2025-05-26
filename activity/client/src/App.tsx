import { useState, useEffect, useCallback } from "react";
import {
  DiscordSDK,
  Events as DiscordEvents,
  type Types as DiscordTypes,
} from "@discord/embedded-app-sdk";

const discordSdk = new DiscordSDK(import.meta.env.VITE_CLIENT_ID);

const sheetTabs = [
  { name: "Road-to-25K-Teams", gid: "2116993983" },
  { name: "Overall Standings", gid: "2002411778" },
  { name: "D1", gid: "1182226510" },
  { name: "D2", gid: "2033091792" },
  { name: "D3", gid: "2000624894" },
  { name: "Open", gid: "191822127" },
];

const DEFAULT_GID = sheetTabs[0].gid; // Default to Road-to-25K-Teams

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
  const [selectedGid, setSelectedGid] = useState<string>(DEFAULT_GID);
  const [participants, setParticipants] =
    useState<DiscordTypes.GetActivityInstanceConnectedParticipantsResponse | null>(
      null
    );

  const fetchSheetData = useCallback(async (gid: string) => {
    if (!auth) return; // Should not happen if called correctly, but good guard
    setIsLoadingSheetData(true);
    setSheetError(null);
    try {
      const response = await fetch(`/.proxy/api/sheet-data/${gid}`);
      if (!response.ok) { // If worker returns an error (e.g., 403, 404, 500 from Sheets API)
        let errorDetails = `Error fetching sheet data: ${response.status}`;
        try {
            const errorData = await response.json(); // Worker's error responses should be JSON
            errorDetails = errorData.details || errorData.error || errorDetails; // Prefer 'details' if available
        } catch (_unusedParseError) {
            // If parsing the error response as JSON fails, stick with the status code
            console.error("Failed to parse error response from worker as JSON, status:", response.status);
        }
        throw new Error(errorDetails);
      }
      const data: SheetRow[] = await response.json();
      setSheetData(data);
    } catch (e: unknown) {
      console.error(`Failed to fetch sheet data for GID ${gid}:`, e);
      if (e instanceof Error) {
        setSheetError(e.message);
      } else {
        setSheetError("An unknown error occurred while fetching sheet data.");
      }
    }
    setIsLoadingSheetData(false);
  }, [auth]);

  useEffect(() => {
    // This effect handles fetching sheet data when auth or selectedGid changes
    async function loadSheetData() {
      if (auth) {
        setIsLoadingSheetData(true);
        setSheetData(null); // Clear previous data
        setSheetError(null);  // Clear previous error
        await fetchSheetData(selectedGid);
      }
    }

    loadSheetData();
  }, [auth, selectedGid, fetchSheetData]);

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

    // This effect handles initial Discord SDK setup and authentication
    if (!auth) {
      setupDiscordSDK();
    }
  }, [auth]); // Only re-run when auth changes (e.g., from null to authenticated user)

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
          <div className="sheet-tabs-container" style={{ marginBottom: '10px', display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
            {sheetTabs.map((tab) => (
              <button
                key={tab.gid}
                onClick={() => setSelectedGid(tab.gid)}
                disabled={isLoadingSheetData || selectedGid === tab.gid}
                style={{
                  padding: '8px 12px',
                  cursor: 'pointer',
                  backgroundColor: selectedGid === tab.gid ? '#7289da' : '#4f545c',
                  color: 'white',
                  border: 'none',
                  borderRadius: '3px',
                  opacity: isLoadingSheetData && selectedGid !== tab.gid ? 0.5 : 1,
                  fontSize: '14px',
                  fontWeight: selectedGid === tab.gid ? 'bold' : 'normal',
                }}
              >
                {tab.name}
              </button>
            ))}
          </div>
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
