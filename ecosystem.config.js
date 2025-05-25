module.exports = {
  apps: [
    {
      name: "bot",
      script: "dist/main.js"
    },
    {
      name: "activity-server",
      script: "dist/activity-server/server.js"
    }
  ]
};
