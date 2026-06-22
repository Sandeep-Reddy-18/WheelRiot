const { spawn } = require('child_process');
const fs = require('fs');

console.log("Launching server...");
const out = fs.openSync('./server_crash.log', 'w');
const err = fs.openSync('./server_crash.log', 'w');

const server = spawn('node', ['index.js'], {
  stdio: [ 'ignore', out, err ]
});

server.on('error', (e) => {
    fs.writeFileSync('./server_crash.log', 'Spawn Error: ' + e.message);
});

console.log(`Server PID: ${server.pid}`);
