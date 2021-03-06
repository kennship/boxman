# Boxman

Provision and manage servers.

## Installation

You need [Ansible](http://docs.ansible.com/intro_installation.html) installed on your system in order to use Boxman.

```
npm install -g boxman
```

## Cheat sheet

```
# Create a box with some associated groups, and associates DNS.
boxman up --groups webserver,database

# List your boxes.
boxman list

# Modify a box's groups.
# Accepts single groups, or comma-separated sets of groups.
boxman group wispy-mountain-1315 --add caching
boxman group wispy-mountain-1315 --remove database
boxman group wispy-mountain-1315 --replace auth,webserver

# Deploy a playbook.
# Expects playbooks to be in `playbooks/$NAME.yml` in your Ansible directory.
# A playbook will deploy to groups listed in "hosts" in the playbook.
boxman deploy website

# Update Ansible roles from `requirements.yml` in the Ansible directory.
boxman role update

# Destroy a particular box.
boxman destroy wispy-mountain-1315
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

To provision a new box, run `boxman up --groups testing` to create a new box in the "testing" group. To run an Ansible playbook, run `boxman deploy --playbook <my-playbook>`.

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
- hosts: testing
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
