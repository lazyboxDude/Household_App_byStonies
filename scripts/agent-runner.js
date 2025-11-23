#!/usr/bin/env node
const { spawnSync } = require('child_process');
const env = process.env;

function run(cmd, args, opts = {}){
  console.log('> ' + [cmd].concat(args).join(' '));
  const res = spawnSync(cmd, args, { stdio: 'inherit', shell: true, env, ...opts });
  if (res.status !== 0) {
    console.error(`${cmd} ${args.join(' ')} failed with code ${res.status}`);
    process.exit(res.status);
  }
}

try {
  run('npm', ['ci']);
  run('npm', ['run', 'lint']);
  run('npm', ['run', 'build']);

  if (env.VERCEL_TOKEN && env.VERCEL_PROJECT_ID) {
    // Optional deploy using Vercel CLI
    console.log('VERCEL_TOKEN detected, attempting optional deploy (requires vercel CLI installed)');
    try { run('npx', ['vercel', 'deploy', '--prod', '--token', env.VERCEL_TOKEN]); } catch (e) { console.warn('Vercel deploy failed or not installed'); }
  } else {
    console.log('VERCEL_TOKEN not set — skipping deploy');
  }
  console.log('Agent run completed successfully');
} catch (err) {
  console.error('Agent run failed', err);
  process.exit(1);
}
