
import Network from '../lib/network.mjs';
Network.ipAddresses().forEach(ip => {
  console.log(ip);
});
