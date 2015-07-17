# Boxman

Provision and manage servers.

## Installation

You need [Ansible](http://docs.ansible.com/intro_installation.html) installed on your system in order to use Boxman.

```
npm install -g https://r24y@bitbucket.org/r24y/boxman.git
```

## Setup

Run initial setup:

```
boxman bootstrap
```

You should now have a `~/.boxman/config.yml` file. Edit it to look like the following:

```
# Boxman config file
database:
  type: local
providers:
  default: digitalocean
  digitalocean:
    token: <DigitalOcean API token; should be a long hex string>
hostnames:
# The domain needs to be a domain connected to your DigitalOcean account.
  domain: r24y.co
  template: '*.box'
```

To provision a new box, run `boxman up`. To run an Ansible playbook, run `boxman deploy --playbook <my-playbook>`.

A sample `requirements.yml` to get you going:

```
- src: https://github.com/Kennship/ansible-nginx-role
  path: roles/
  name: nginx
- src: https://github.com/Kennship/ansible-nodejs-role
  path: roles/
  name: nodejs
```

Run `boxman role update` to install these requirements.

You'll also need a sample playbook. Save this under `~/.boxman/ansible/playbooks/test-site.yml`:

```
---
- hosts: all
  roles:
    - role: ../roles/nginx
      nginx_sites:
        - server:
            file_name: test-site
            listen: 80
            server_name: '{{ canonicalName }}'
            root: '/usr/share/nginx/html'
            location1: {name: /, try_files: "$uri $uri/ /index.html"}
```

Once you've saved this, run `boxman deploy --playbook test-site`. This will connect to all existing boxes (there should only be one), install nginx, configure it to show the default test page, and start the service. Hooray!

Note: right now, groups don't work. So with Boxman you're currently best off managing a single box. Groups are coming soon though!
