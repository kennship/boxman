import minimist from 'minimist';
import fs from 'q-io/fs';
import path from 'path';
import co from 'co';
import yaml from 'js-yaml';

import {up, destroy} from './provision';
import {inventory} from './inventory';
import loadDatabase from './db';
import {getPublicKey} from './key';
import {deploy} from './deploy';
import {role} from './role';
import {group} from './group';
import sh from './promishe';

const debug = require('debug')('boxman');

const DATA_DIR = path.join(process.env.HOME, '.boxman');
const POUCH_FNM = path.join(DATA_DIR, 'db');
const CONFIG_FNM = path.join(DATA_DIR, 'config.yml');

const args = minimist(process.argv.slice(2));

const command = args.command = args._.shift();
const operations = mkOps();

if (!command || !operations[command]) {
  co(operations.help);
}

if (args.help) {
  if (operations[command].help) {
    co(operations[command].help).catch(err => console.log(err.stack));
  } else {
    console.log(`No help documentation yet for command "${command}".
Submit a request at https://github.com/Kennship/boxman/issues.`);
    co(operations.help);
  }
  process.exit(0);
}

co(function *() {
  try {
    args.config = yield readConfig();
  } catch (err) {
    throw new Error('Invalid YAML. Check the format of your config.yml file.');
  }
  args.config.configDir = DATA_DIR;
  args.config.sshKey = args.config.sshKey || path.join(DATA_DIR, 'ssh-key');
  args.config.ansible = args.config.ansible || {};
  args.config.ansible.directory = args.config.ansible.directory || path.join(DATA_DIR, 'ansible');
  args.dbIn = args.db;
  [args.key, args.db] = yield [
    getPublicKey(args.config),
    // Don't load the db if we're doing a deploy.
    // Ansible will try to read the inventory, and if we're using
    // a local DB will get locked out (PouchDB lockfile).
    command === 'deploy' ? null : loadDatabase(args.config),
    ensureDir(args.config.ansible.directory)
  ];
  yield operations[command](args);
}).catch(err => {
  console.error(err.message);
  debug(err.stack);
  process.exit(-1);
});

function *ensureDir(fnm) {
  if (!(yield fs.isDirectory(fnm))) {
    console.log(`making dir ${fnm}`);
    yield fs.makeTree(fnm);
  }
}

function *ensureDataDir() {
  yield ensureDir(POUCH_FNM);
  if (!(yield fs.isFile(CONFIG_FNM))) {
    yield fs.write(CONFIG_FNM, '# Boxman config file');
  }
}

function *readConfig() {
  yield ensureDataDir();
  return yaml.safeLoad(yield fs.read(CONFIG_FNM)) || {};
}

function mkOps() {
  return {
    up, destroy, inventory,
    deploy, role,
    group,
    *bootstrap(args) {
      const repo = args._[0];
      const dir = args.config.ansible.directory;
      try {
        yield sh('which ansible');
      } catch (err) {
        console.log("It looks like you don't have Ansible installed!");
        console.log("Please follow the instructions at "+
          "http://docs.ansible.com/intro_installation.html .");
        return;
      }
      if (yield fs.isFile(path.join(dir, 'requirements.yml'))) {
        console.log('Looks like boxman is already ready to go!');
        console.log(`Try editing ${CONFIG_FNM} to get going.`);
        return;
      }
      if (repo) {
        // If the user passed in a repo, clone it.
        yield sh(`git clone ${repo} ${dir}`);
      } else {
        // Initialize an empty Ansible directory.
        yield [
          fs.write('# Ansible requirements',
            path.join(dir, 'requirements.yml')),
          fs.makeTree(path.join(dir, 'roles')),
          fs.makeTree(path.join(dir, 'playbooks')),
          fs.write(['.*.sw*','roles/'].join('\n')+'\n', path.join(dir, '.gitignore')),
          fs.write('# ansible-repo', path.join(dir, 'README.md'))
        ];
      }
    },
    *config(args) {
      console.log(args.config);
    },
    *list({db}) {
      const hosts = yield db.query({
        map: `function (doc) {
          if (doc.type === 'box') {
            emit(null, doc.canonicalName);
          }
        }`
      });
      console.log(hosts.rows.map(r => r.value).join('\n'));
    },
    *register(args) {
      console.log(`Registering provider ${args.provider}`);
    },
    *help(args) {
      console.log(`
Usage: boxman <command> [opts...]

Commands:

  up           Provision a box
  list         Show a plain list of boxes
  inventory    Display Ansible-compatible inventory of boxes
  role         Update local Ansible roles
  group        Manage groups
  destroy      Destroy a box

Use boxman <command> --help for more details about a particular command.
`);
    }
  };
}
