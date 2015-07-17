import sh from './promishe';
import path from 'path';
import loadDatabase from './db';

function *deploy(args) {
  const {
    playbook,
    config
  } = args;
  const host = args._[0];
  const cmd = [
    'ansible-playbook',
    `--private-key=${config.sshKey}`,
    '-u root',
    '-i $(which boxman-inventory)',
    path.join(config.ansible.directory, 'playbooks', playbook+'.yml'),
  ].join(' ');
  console.log(cmd)

  console.log(yield sh(cmd, {cwd: config.ansible.directory}));
}

export {deploy};
