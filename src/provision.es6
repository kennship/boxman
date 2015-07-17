import {createBox, destroyBox} from './index';
import DO from './providers/digitalocean/index';
import dbg from 'debug';

const debug = require('debug')('boxman');

const providers = {
  digitalocean: DO
};

function *up({playbook, db, config, key, provider=config.providers.default}) {
  if (!provider) {
    throw new Error(`No provider specified for "boxman up"`);
  }
  // if (!playbook) {
  //   throw new Error('Must specify a playbook with `--playbook`');
  // }
  const Provider = providers[provider];
  if (!Provider) {
    throw new Error(`No provider available for "${provider}"`)
  }
  if (!config.providers[provider]) {
    throw new Error(`No configuration specified for provider "${provider}"`);
  }
  const p = new Provider(config.providers[provider]);
  const opts = Object.assign({}, config, {
    playbook,
    domain: config.hostnames.domain,
    template: config.hostnames.template,
    key,
    db
  });

  // Allow the user to specify groups as a comma-separated list.
  if (typeof opts.groups === 'string') {
    opts.groups = opts.groups.split(',');
  }
  yield p.up(opts);
}

function *destroy(args) {
  const {db, config, provider=config.providers.default} = args;

  if (!provider) {
    throw new Error(`No provider specified for "boxman destroy"`);
  }
  if (!args._.length) {
    throw new Error('Must specify a box to destroy');
  }
  const Provider = providers[provider];
  const boxName = args._[0];
  const p = new Provider(config.providers[provider]);
  const opts = Object.assign({}, args.config, {
    db,
    _: args._
  });
  yield p.destroy(opts);
}

export {up, destroy};
