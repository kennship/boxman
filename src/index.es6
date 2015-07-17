import DigitalOceanAPI from 'doapi';
import haiku from 'haiku.js';
import url from 'url';
import request from 'request';

const digitalOcean = new DigitalOceanAPI({token: process.env.DIGITAL_OCEAN_TOKEN});
const sshKeys = [];

digitalOcean.domainRecordNew = function(name, body) {
  const headers = {
    'Authorization': `Bearer ${this._token}`,
    'Content-Type': 'application/json'
  };
  let url=`${this.API_URL}/domains/${name}/records`;
  return new Promise((resolve, reject) => {
    request.post(url, {
      body,
      json: true,
      headers: {
        Authorization: `Bearer ${this._token}`,
        'Content-Type': 'application/json'
      }
    }, (err, response, body) => {
      if (err) {
        return reject(err);
      } else if (response.statusCode >= 400) {
        return reject(response.statusMessage);
      } else {
        return resolve(body.domain_record);
      }
    })
  });
}

function *createBox(opts = {}) {

  const {
    name = haiku(),
    playbook = (() => {throw new Error('No playbook specified')})(),
    region = 'nyc3',
    size = '512mb',
    image = 'ubuntu-14-04-x64',
    groups = [],
    token,
    key
  } = opts;

  console.log('TODO: automatic key management');

  const keys = (yield digitalOcean.sshKeyGetAll())
    .filter(isBoxmanKey);

  if (!keys.length) {
  }

  if (!token) {
    throw new Error('No DigitalOcean v2 API token provided');
  }

  const nodeDetails = {
    name,
    region,
    size,
    image,
    ssh_keys: keys.map(k => k.id)
  };

  console.log(`Creating machine ${name}`);

  let droplet = yield digitalOcean.dropletNew(nodeDetails);

  do {
    yield delay(10e3);
    droplet = yield digitalOcean.dropletGet(droplet.id);
  } while (droplet.status !== 'active');

  const ip =
    droplet.networks.v4
      .filter(i => i.type === 'public')
      .map(i => i.ip_address)[0];

  console.log(`Machine is ready, ip = ${ip}`);
  // console.log(JSON.stringify(droplet,null,2));

  console.log(`Setting DNS...`);

  yield digitalOcean.domainRecordNew(BOXMAN_BOX_DOMAIN, {
    type: 'A',
    name: `${name}.box`,
    data: ip
  });

  droplet.fqdn = `${name}.box.${BOXMAN_BOX_DOMAIN}`;
  droplet.provider = 'digitalocean';
  droplet.groups = [];

  console.log(`Created ${name}.box.${BOXMAN_BOX_DOMAIN}`);

  return {
    name: droplet.name,
    providerID: droplet.id,
    fqdn: droplet.fqdn,
    networks: droplet.networks,
    provider: 'digitalocean',
    created: droplet.created_at,
    type: 'box',
    vars: {},
    groups
  };

  function isBoxmanKey(key) {
    return k.public_key.trim() === key.trim();
  }

  function delay(time) {
    return new Promise((fulfill) => setTimeout(fulfill, time));
  }
}

function *destroyBox(id) {
  yield digitalOcean.dropletDestroy(id);
}

export {createBox, destroyBox};
