module.exports = {
  apps: [
    {
      name: "wheelriot-backend",
      script: "./server/index.js", 
      cwd: "./server",            
      env: {
        NODE_ENV: "production",
      },
      env_file: ".env", 
      instances: 1,
      autorestart: true,
      watch: false
    }
  ],
};