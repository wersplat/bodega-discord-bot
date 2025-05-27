import { useState, useEffect, useCallback } from "react";
import "./App.css";
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

function ActivityApp() {
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
          discordSdk = new DiscordSDK(config.discordClientId);
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
    if (!auth || !discordSdk) return;
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
  }, [auth]);

  useEffect(() => {
    async function loadSheetData() {
      if (auth && selectedSheetName && discordSdk) {
        setIsLoadingSheetData(true);
        setSheetData(null);
        setSheetError(null);
        await fetchSheetData(selectedSheetName);
      }
    }
    loadSheetData();
  }, [auth, selectedSheetName, fetchSheetData]);

  useEffect(() => {
    if (!discordClientId || !discordSdk) return;

    async function setupDiscordSDK() {
      await discordSdk!.ready();
      const { code } = await discordSdk!.commands.authorize({
        client_id: discordClientId!, // Assert non-null as it's guarded above
        response_type: "code",
        state: "",
        prompt: "none",
        scope: ["identify", "guilds"],
      });

      const tokenResponse = await fetch("/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const { access_token } = await tokenResponse.json();

      const newAuth = await discordSdk!.commands.authenticate({
        access_token,
      });
      setAuth(newAuth.user);

      function updateParticipants(
        _participants: DiscordTypes.GetActivityInstanceConnectedParticipantsResponse
      ) {
        setParticipants(_participants);
      }
      discordSdk!.subscribe(
        DiscordEvents.ACTIVITY_INSTANCE_PARTICIPANTS_UPDATE,
        updateParticipants
      );
      try {
        const initialParticipants = await discordSdk!.commands.getInstanceConnectedParticipants();
        setParticipants(initialParticipants);
      } catch (e) {
        console.error("Error fetching initial participants:", e);
      }
    }

    if (!auth) {
      setupDiscordSDK();
    }
  }, [auth, discordClientId]);

  if (!discordClientId) {
    return <div>Loading configuration... {sheetError && <p style={{color: 'red'}}>{sheetError}</p>}</div>;
  }
  
  if (!discordSdk) {
    return <div>Initializing SDK...</div>;
  }

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
          <p>Authenticating with Discord...</p>
        ) : (
          <div>Hello, {auth.global_name ?? auth.username}!</div>
        )}
      </section>
      <section>
        <h2>Sheet Tabs</h2>
        <div>
          {sheetTabs.map(tab => (
            <button 
              type="button" // Added type attribute
              key={tab.sheetName} 
              onClick={() => setSelectedSheetName(tab.sheetName)}
              disabled={isLoadingSheetData || !auth}
              style={{ fontWeight: selectedSheetName === tab.sheetName ? 'bold' : 'normal', marginRight: '0.5rem' }}
            >
              {tab.name}
            </button>
          ))}
        </div>
      </section>
      <section>
        <h2>Sheet Data for: {selectedSheetName}</h2>
        {isLoadingSheetData && <p>Loading sheet data...</p>}
        {sheetError && <p style={{ color: 'red' }}>Error: {sheetError}</p>}
        {sheetData && sheetData.length > 0 && (
          <div style={{marginTop: '1rem', overflowX: 'auto'}}>
            <table border={1} style={{borderCollapse: 'collapse', width: '100%'}}>
              <thead>
                <tr>
                  {Object.keys(sheetData[0]).map(header => <th key={header} style={{padding: '0.5rem', textAlign: 'left'}}>{header}</th>)}
                </tr>
              </thead>
              <tbody>
                {sheetData.map((row, rowIndex) => (
                  <tr key={`sheet-row-${rowIndex}`}> {/* Modified key for tr */}
                    {Object.values(row).map((cell, cellIndex) => <td key={`sheet-cell-${rowIndex}-${cellIndex}`} style={{padding: '0.5rem'}}>{cell}</td>)} {/* Modified key for td */}
                  </tr>
                ))}
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
        {participants === null ? (
          <p>Fetching participants...</p>
        ) : (
          <Participants participants={participants} />
        )}
      </section>
    </main>
  );
}

export default ActivityApp;
