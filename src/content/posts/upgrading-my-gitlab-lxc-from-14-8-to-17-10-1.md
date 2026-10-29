---
title: "Upgrading GitLab LXC from 14.8 to 17.10.1"
pubDatetime: 2025-03-31T07:30:00-03:00
description: How to upgrade GitLab LXC from 14.8 to 17.10.1, ensuring all dependencies are updated as well in the process.
tags:
- proxmox
- lxc
---

I noticed while setting up my [Homepage](https://gethomepage.dev) widget that my GitLab LXC container was very out of date, as it was giving me a 404 for the API, so attempted to run `apt-get update` and `apt-get upgrade` and got the following:
```bash
root@GitLab ~# apt-get upgrade
Reading package lists... Done
Building dependency tree       
Reading state information... Done
Calculating upgrade... Done
The following packages will be upgraded:
  gitlab-ce
1 upgraded, 0 newly installed, 0 to remove and 0 not upgraded.
Need to get 0 B/1312 MB of archives.
After this operation, 966 MB of additional disk space will be used.
Do you want to continue? [Y/n] Y
debconf: delaying package configuration, since apt-utils is not installed
(Reading database ... 112194 files and directories currently installed.)
Preparing to unpack .../gitlab-ce_17.5.5-ce.0_amd64.deb ...
gitlab preinstall: It seems you are upgrading from 14.8 to 17.5.
gitlab preinstall: It is required to upgrade to the latest 17.3.x version first before proceeding.
gitlab preinstall: Please follow the upgrade documentation at https://docs.gitlab.com/ee/update/#upgrading-to-a-new-major-version
dpkg: error processing archive /var/cache/apt/archives/gitlab-ce_17.5.5-ce.0_amd64.deb (--unpack):
 new gitlab-ce package pre-installation script subprocess returned error exit status 1
Errors were encountered while processing:
 /var/cache/apt/archives/gitlab-ce_17.5.5-ce.0_amd64.deb
Enumerating objects: 1505, done.
Counting objects: 100% (1505/1505), done.
Delta compression using up to 4 threads
Compressing objects: 100% (834/834), done.
Writing objects: 100% (1505/1505), done.
Total 1505 (delta 230), reused 1505 (delta 230)
E: Sub-process /usr/bin/dpkg returned an error code (1)
```

So I did a quick [search](https://www.google.com/search?q=how+to+upgrade+gitlab+to+17.3+debian&client=safari&sca_esv=90fe3ab6b3a05dbb&rls=en&ei=4CXqZ5PHKLW1i-gPjaSD6AY&ved=0ahUKEwiTt92DybOMAxW12gIHHQ3SAG0Q4dUDCBA&uact=5&oq=how+to+upgrade+gitlab+to+17.3+debian&gs_lp=Egxnd3Mtd2l6LXNlcnAiJGhvdyB0byB1cGdyYWRlIGdpdGxhYiB0byAxNy4zIGRlYmlhbjIFECEYoAFI1jZQsQxY_jRwBHgAkAEAmAHKAaAB5QuqAQUwLjguMbgBA8gBAPgBAZgCDaACuAzCAg4QABiABBiwAxiGAxiKBcICCBAAGLADGO8FwgILEAAYsAMYogQYiQXCAgcQIRigARgKmAMAiAYBkAYIkgcFNC44LjGgB5ca&sclient=gws-wiz-serp), and found that it was not that easy… I found a questions[^1] on StackOverflow that mentioned a script, and noticed that I would basically have to step up version by version. I did a new [search](https://www.google.com/search?q=install+gitlab-ce+15.11.1&client=safari&sca_esv=90fe3ab6b3a05dbb&rls=en&ei=aSnqZ6XpB4r-7_UPhavmwQs&ved=0ahUKEwjlwYGzzLOMAxUK_7sIHYWVObgQ4dUDCBA&uact=5&oq=install+gitlab-ce+15.11.1&gs_lp=Egxnd3Mtd2l6LXNlcnAiGWluc3RhbGwgZ2l0bGFiLWNlIDE1LjExLjEyBRAAGO8FMgUQABjvBTIFEAAY7wUyBRAAGO8FMgUQABjvBUjgGlDSEFjPFnAFeACQAQCYAbMBoAG3CqoBAzAuOLgBA8gBAPgBAZgCB6AChQPCAg4QABiABBiwAxiGAxiKBcICCBAAGLADGO8FmAMAiAYBkAYFkgcDNS4yoAftHw&sclient=gws-wiz-serp) to see what going to gitlab-ce 15.11.1 would look like, and found a Reddit[^2] comment that led me to the [Official Upgrade Path Tool](https://gitlab-com.gitlab.io/support/toolbox/upgrade-path/).  I entered my info, choosing ubuntu since I was on Debian, and saw I needed 13 steps to get to the latest version… fun times.

```bash
apt-get install gitlab-ce=14.9.5-ce.0
apt-get install gitlab-ce=14.10.5-ce.0
apt-get install gitlab-ce=15.0.5-ce.0
apt-get install gitlab-ce=15.4.6-ce.0
apt-get install gitlab-ce=15.11.13-ce.0
apt-get install gitlab-ce=16.3.9-ce.0
apt-get install gitlab-ce=16.7.10-ce.0
apt-get install gitlab-ce=16.11.10-ce.0
apt-get install gitlab-ce=17.1.8-ce.0
apt-get install gitlab-ce=17.3.7-ce.0
apt-get install gitlab-ce=17.5.5-ce.0
apt-get install gitlab-ce=17.8.6-ce.0
apt-get install gitlab-ce=17.10.1-ce.0
```

I was also very behind on OS upgrades, since this was a Turnkey container from the olden days, and I remember seeing something in the past that led me to neglect it. After a little review of the [versions of Debian supported](https://docs.gitlab.com/administration/package_information/supported_os/), I decided to upgrade the container to Debian 11 before GitLab 16, and Debian 12 right after… but began the upgrade after `gitlab-ce=15.11.13-ce.0` as I saw some errors I was sure were due to older debian version stuff. 

```console
root@GitLab ~# cat /etc/os-release
PRETTY_NAME="Debian GNU/Linux 10 (buster)"
NAME="Debian GNU/Linux"
VERSION_ID="10"
VERSION="10 (buster)"
VERSION_CODENAME=buster
ID=debian
HOME_URL="https://www.debian.org/"
SUPPORT_URL="https://www.debian.org/support"
BUG_REPORT_URL="https://bugs.debian.org/"
```

I followed a couple of guides[^3]  [^4] on the upgrade process, because I am not an expert, but  found that my `sources.list` was actually at `/etc/apt/sources.list.d/sources.list`. The upgrades went well enough, but the error still persisted. Turns out it was actually a PostgreSQL version that was too low inside of GitLab itself, so followed the [Upgrade packaged PostgreSQL server](https://docs.gitlab.com/omnibus/settings/database/#upgrade-packaged-postgresql-server) instructions using the `gitlab-ctl pg-upgrade` command. This happend twice, the first time to geit it to v13 after `gitlab-ce=15.11.13-ce.0` and the second to get it to v14 after  `gitlab-ce=16.11.10-ce.0`. In the middle of the whole mess, at some point my container reassined itself a new IP, which had me chasing ghost for like 30 min… until I realized something was off. In the end, it was a pretty easy process, just time consuming. 

Lastly, I decided I would like to update the bits of the Turnkey container that might need some updating, but first I had to deal with out of date security keys for their repos. I did a [search](https://www.google.com/search?client=safari&rls=en&q=where+do+turnkey+containers+keep+source.list&ie=UTF-8&oe=UTF-8) looking for how to update their stuff, but stumbled upon a post[^5] that had a process for updating the keys from their repo with a script. The version didn’t match what I needed, so tweaked the script a bit:
```bash
#!/bin/bash
git clone https://github.com/turnkeylinux/common.git /tmp/common
CODENAME=bookworm
key_dir=/usr/share/keyrings
base_url=/tmp/common/overlays/bootstrap_apt
repos=(main security testing)
for repo in ${repos[@]}; do
    local_path=$key_dir/tkl-$CODENAME-$repo
    keyring=$local_path.gpg
    keyfile=$local_path.asc
     key_url=${base_url}${keyfile}
    #wget -O $keyfile $key_url
    cp $key_url $keyfile
    gpg --no-default-keyring --keyring $keyring --import $keyfile
    rm $keyfile
done
rm -r /tmp/common
```

I ran the script with `bash keys.sh`, followed with `apt-get update && apt-get upgrade`, and the rest is history.

**Side note**: the widget started working on its own after all the upgrades, so that was good.

[^1]: [Why can't I upgrade to Gitlab Community Edition 17.0.1](https://stackoverflow.com/questions/78541212/why-cant-i-upgrade-to-gitlab-community-edition-17-0-1)
[^2]: [alzgh's comment on "Gitlab CE 15.11.13 to 16+"](https://www.reddit.com/r/gitlab/comments/18ctfcd/comment/kccrob8/?utm_source=share&utm_medium=web3x&utm_name=web3xcss&utm_term=1&utm_content=share_button)
[^3]: [How to upgrade Debian 10 to Debian 11 Bullseye using the CLI](https://www.cyberciti.biz/faq/update-upgrade-debian-10-to-debian-11-bullseye/)
[^4]: [How to upgrade Debian 11 to Debian 12 Bookworm using CLI](https://www.cyberciti.biz/faq/update-upgrade-debian-11-to-debian-12-bookworm/)
[^5]: [Upgrading Proxmox and Turnkey Debian](https://www.fuzzygrim.com/posts/upgrade-homelab-os)
[^6]: [Download and install GitLab](https://about.gitlab.com/install/#debian)
