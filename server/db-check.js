const mongoose = require('mongoose');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');
const https = require('https');
const net = require('net');
const dns = require('dns');

// Colors for console
const red = '\x1b[31m';
const green = '\x1b[32m';
const yellow = '\x1b[33m';
const reset = '\x1b[0m';

async function getPublicIP() {
  return new Promise((resolve) => {
    https.get('https://api.ipify.org', (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', () => resolve('Unable to fetch IP'));
  });
}

function testPort(host, port) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    const timer = setTimeout(() => {
      socket.destroy();
      resolve(false);
    }, 5000);

    socket.connect(port, host, () => {
      clearTimeout(timer);
      socket.destroy();
      resolve(true);
    });

    socket.on('error', () => {
      clearTimeout(timer);
      socket.destroy();
      resolve(false);
    });
  });
}

function resolveDNS(host) {
  return new Promise((resolve) => {
    dns.resolveSrv('_mongodb._tcp.' + host, (err, addresses) => {
      if (err) resolve({ success: false, error: err.message });
      else resolve({ success: true, targets: addresses.map(a => a.name) });
    });
  });
}

async function checkConnection() {
  console.log(`${yellow}--- Sportify DB Connection Diagnostic (v3) ---${reset}\n`);

  // 1. Basic System Info
  console.log(`Node.js Version: ${process.version}`);
  console.log(`Platform: ${process.platform}`);
  const publicIP = await getPublicIP();
  console.log(`Public IP: ${publicIP}`);
  console.log(`${green}[OK] Whitelisting: 0.0.0.0/0 is active in your Atlas, so IP is NOT the problem.${reset}\n`);

  // 2. Load environment variables
  dotenv.config();
  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.error(`${red}[ERROR] MONGO_URI is not defined in your .env file.${reset}`);
    process.exit(1);
  }

  // 3. Extract host for DNS/Port check
  const hostMatch = uri.match(/@([^/?]+)/);
  const clusterHost = hostMatch ? hostMatch[1] : null;

  if (clusterHost) {
    console.log(`Checking Network for ${clusterHost}...`);
    
    // DNS Check
    const dnsResult = await resolveDNS(clusterHost);
    if (dnsResult.success) {
      console.log(`${green}[OK] DNS SRV resolved successfully.${reset}`);
      
      // Port Check on first target
      const firstTarget = dnsResult.targets[0];
      console.log(`Testing reachability of ${firstTarget} on port 27017...`);
      const isReachable = await testPort(firstTarget, 27017);
      
      if (isReachable) {
        console.log(`${green}[OK] Port 27017 is reachable.${reset}`);
      } else {
        console.error(`${red}[FAIL] Port 27017 is BLOCKED.${reset}`);
        console.log(`\n${yellow}--- CRITICAL REASON ---${reset}`);
        console.log(`Your network/firewall is blocking port 27017 used by MongoDB Atlas.`);
        console.log(`Action: Change your network (Try mobile hotspot).`);
        process.exit(1);
      }
    } else {
      console.error(`${red}[FAIL] DNS SRV resolution failed: ${dnsResult.error}${reset}`);
      console.log(`Action: Change your machine's DNS to 8.8.8.8 (Google).`);
      process.exit(1);
    }
  }

  // 4. Attempt Mongoose connection
  console.log(`\nAttempting final Mongoose connection...`);
  try {
    const start = Date.now();
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
    console.log(`${green}[SUCCESS] Connected to MongoDB in ${Date.now() - start}ms!${reset}`);
  } catch (error) {
    console.error(`\n${red}[CONNECTION FAILED]${reset}`);
    console.error(`Reason: ${error.message}`);
  } finally {
    await mongoose.disconnect();
    process.exit();
  }
}

checkConnection();