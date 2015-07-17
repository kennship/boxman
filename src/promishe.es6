import {exec} from 'child_process';
import path from 'path';

function sh(command, opts={}) {
  return new Promise((resolve, reject) => {
    exec(command, opts, (err, stdout, stderr) => {
      if (err) {
        err.stderr = stderr;
        reject(err);
      } else {
        resolve(stdout);
      }
    });
  });
}

export default sh;
