import sh from './promishe';

function *role(args) {
  const command = args._[0];
  switch (command) {
    case 'update':
      const output = yield sh(
        'ansible-galaxy install -r requirements.yml',
        {cwd: args.config.ansible.directory});
      console.log(output);
      break;
  }
}

export {role};
