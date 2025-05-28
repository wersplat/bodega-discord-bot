// src/App.tsx
import { useState, useEffect } from "react";
import reactLogo from "./assets/react.svg";
import viteLogo from "/vite.svg";
import cloudflareLogo from "./assets/Cloudflare_Logo.svg";
import honoLogo from "./assets/hono.svg";
import "./App.css";
import {DiscordSDK, Events as DiscordEvents, type Types as DiscordTypes} from "@discord/embedded-app-sdk";

const discordSdk = new DiscordSDK(import.meta.env.VITE_CLIENT_ID);


type User = {
  username: string;
  discriminator: string;
  id: string;
  public_flags: number;
  avatar?: string | null | undefined;
  global_name?: string | null | undefined;
};


function Participants({ participants }: { participants: DiscordTypes.GetActivityInstanceConnectedParticipantsResponse }) {
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
      ) : ( <div>Hello, {auth.global_name ?? auth.username}!</div>)}
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

function App() {
    const [auth, setAuth] = useState<User | null>(null);
  const [participants, setParticipants] =
    useState<DiscordTypes.GetActivityInstanceConnectedParticipantsResponse | null>(
      null
    );

  return (
    <>
      <div>
        <a href="https://vite.dev" target="_blank">
          <img src={viteLogo} className="logo" alt="Vite logo" />
        </a>
        <a href="https://react.dev" target="_blank">
          <img src={reactLogo} className="logo react" alt="React logo" />
        </a>
        <a href="https://hono.dev/" target="_blank">
          <img src={honoLogo} className="logo cloudflare" alt="Hono logo" />
        </a>
        <a href="https://workers.cloudflare.com/" target="_blank">
          <img
            src={cloudflareLogo}
            className="logo cloudflare"
            alt="Cloudflare logo"
          />
        </a>
      </div>
      <h1>Vite + React + Hono + Cloudflare</h1>
      <div className="card">
        <button
          onClick={() => setCount((count) => count + 1)}
          aria-label="increment"
        >
          count is {count}
        </button>
        <p>
          Edit <code>src/App.tsx</code> and save to test HMR
        </p>
      </div>
      <div className="card">
        <button
          onClick={() => {
            fetch("/.proxy/api/")
              .then((res) => res.json() as Promise<{ name: string }>)
              .then((data) => setName(data.name));
          }}
          aria-label="get name"
        >
          Name from API is: {name}
        </button>
        <p>
          Edit <code>worker/index.ts</code> to change the name
        </p>
      </div>
      <p className="read-the-docs">Click on the logos to learn more</p>
    </>
  );
}

export default App;