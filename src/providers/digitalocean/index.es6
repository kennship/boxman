import DigitalOceanAPI from 'doapi';
import haiku from 'haiku.js';
import request from 'request';
import url from 'url';
import spinner from '../../spinner';

const API_TOKEN = Symbol();
const API = Symbol();

class DigitalOcean {

  constructor({token}) {
    if (!token) {
      throw new Error('Cannot connect to DigitalOcean API v2 without a token');
    }
    this[API_TOKEN] = token;
    this[API] = new DigitalOceanAPI({token});

    this[API].domainRecordNew = function(name, body) {
      const headers = {
        'Authorization': `Bearer ${this._token}`,
        'Content-Type': 'application/json'
      };
      let url=`${this.API_URL}/domains/${name}/records`;
      return new Promise((resolve, reject) => {
        request.post(url, {
          body,
          headers,
          json: true
        }, (err, response, body) => {
          if (err) {
            return reject(err);
          } else if (response.statusCode >= 400) {
            return reject(response.statusMessage);
          } else {
            return resolve(body.domain_record);
          }
        });
      });
    };

    this[API].sshKeyAdd = function(body) {
      const headers = {
        'Authorization': `Bearer ${this._token}`,
        'Content-Type': 'application/json'
      };
      let url=`${this.API_URL}/account/keys`;
      return new Promise((resolve, reject) => {
        request.post(url, {
          body,
          headers,
          json: true
        }, (err, response, body) => {
          if (err) {
            return reject(err);
          } else if (response.statusCode >= 400) {
            return reject(response.statusMessage);
          } else {
            return resolve(body.ssh_key);
          }
        });
      });
    }
  }

  *up(opts={}) {
    const {
      name,
      playbook,
      region,
      size,
      image,
      groups,
      db,
      key,
      domain
    } = opts;

    const box = yield createBox({
      playbook,
      name,
      region,
      size,
      image,
      groups,
      domain,
      key,
      token: this[API_TOKEN],
      digitalOcean: this[API]
    });
    yield db.post(box);
  }

  *destroy(args = {}) {
    const {db} = args;

    if (!args._.length) {
      throw new Error('Must specify a box to destroy');
    }
    const boxName = args._[0];
    const box = ((yield db.query({
      map: `function (doc) {
        if (doc.type === 'box' && doc.name === "${boxName}") {
          emit(null, doc);
        }
      }`
    })).rows[0] || {}).value;
    if (!box) {
      throw new Error(`No such box ${boxName}`);
    }
    yield destroyBox(this[API], box.providerID);
    yield db.remove(box);
  }
}

function *createBox(opts = {}) {

  const {
    name = haiku(),
    // playbook = (() => {throw new Error('No playbook specified')})(),
    region = 'nyc3',
    size = '512mb',
    image = 'ubuntu-14-04-x64',
    groups = [],
    domain,
    digitalOcean,
    key,
    db
  } = opts;

  const sshKeys = (yield digitalOcean.sshKeyGetAll())
    .filter(isBoxmanKey);

  console.log('TODO: automatic key management');

  if (!sshKeys.length) {
    const newKey = yield digitalOcean.sshKeyAdd({
      name: `boxman ${new Date()}`,
      public_key: key
    });
    sshKeys.push(newKey);
  }

  const nodeDetails = {
    name,
    region,
    size,
    image,
    ssh_keys: sshKeys.map(k => k.id)
  };

  const sp = spinner.brailleCircle(`Creating machine ${name}...`);

  let droplet = yield digitalOcean.dropletNew(nodeDetails);

  do {
    yield delay(10e3);
    droplet = yield digitalOcean.dropletGet(droplet.id);
  } while (droplet.status !== 'active');

  const ip =
    droplet.networks.v4
      .filter(i => i.type === 'public')
      .map(i => i.ip_address)[0];

  sp.stop();

  console.log(`Machine is ready, ip = ${ip}`);
  droplet.fqdn = ip;
  droplet.provider = 'digitalocean';
  droplet.groups = [];

  if (domain) {

    console.log(`Setting DNS...`);

    yield digitalOcean.domainRecordNew(domain, {
      type: 'A',
      name: `${name}.box`,
      data: ip
    });

    droplet.fqdn = `${name}.box.${domain}`;

    console.log(`Created ${name}.box.${domain}`);

  }

  return {
    name: droplet.name,
    providerID: droplet.id,
    canonicalName: droplet.fqdn,
    networks: droplet.networks,
    provider: 'digitalocean',
    created: droplet.created_at,
    type: 'box',
    vars: {},
    groups
  };

  function isBoxmanKey(key) {
    return key.name.indexOf('boxman') >= 0;
  }

  function delay(time) {
    return new Promise((fulfill) => setTimeout(fulfill, time));
  }
}


function *destroyBox(digitalOcean, id) {
  yield digitalOcean.dropletDestroy(id);
}

export default DigitalOcean;
