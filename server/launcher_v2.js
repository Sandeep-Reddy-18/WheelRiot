const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const logPath = path.join(__dirname, 'server_crash_v2.log');
console.log("Launching server, logs at: " + logPath);

try {
    const out = fs.openSync(logPath, 'w');
    const err = fs.openSync(logPath, 'w');

    const server = spawn('node', ['index.js'], {
      cwd: __dirname,
      stdio: [ 'ignore', out, err ]
    });

    server.on('error', (e) => {
        fs.appendFileSync(logPath, 'Spawn Error: ' + e.message);
    });
    
    fs.appendFileSync(logPath, `Server spawned with PID: ${server.pid}\n`);

} catch(e) {
}
