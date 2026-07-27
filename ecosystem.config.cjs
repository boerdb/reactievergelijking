/** PM2 — Reactievergelijkingen (poort 3017). */
module.exports = {
  apps: [
    {
      name: "reactievergelijking",
      cwd: "/var/www/reactievergelijking",
      script: "npm",
      args: "start",
      env: {
        NODE_ENV: "production",
        PORT: 3017,
        TZ: "Europe/Amsterdam",
      },
    },
  ],
};
