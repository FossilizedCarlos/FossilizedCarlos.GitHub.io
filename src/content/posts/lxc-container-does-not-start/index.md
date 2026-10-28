---
title: LXC Container Does Not Start
date: 2025-03-08T07:30:00
description: How to update your LXC Debian version after an update, so it can start.
---

We experienced a few power outages over the last couple of days, so I did what any sane person does, and shut the server down... not really, the UPS ran out of juice unfortunately, but all is well. We regained power, and I began start up procedures. All my containers started up as usual, except the last 2. I had recently built a Jellyfin container on Debian 11, and a Plex container on the same OS. Everything else appeared fine, except I kept getting errors and no starts, and no real indications as to what was failing.

```text
systemd[1]: Started Proxmox VE replication runner.
pct[9026]: starting CT 111: UPID:Olympus:00002342:00183454:6181BB52:vzstart:111:root@pam:
pct[9024]: <root@pam> starting task UPID:Olympus:00002342:00183454:6181BB52:vzstart:111:root@pam:
systemd[1]: Started PVE LXC Container: 111.
pct[9026]: startup for container '111' failed
pct[9024]: <root@pam> end task UPID:Olympus:00002342:00183454:6181BB52:vzstart:111:root@pam:
	startup for container '111' failed
systemd[1]: pve-container@111.service: Main process exited, code=exited, status=1/FAILURE
systemd[1]: pve-container@111.service: Failed with result 'exit-code'.
```
## Hopeless Searching
Searching for these type of errors is sometimes difficult, and I  tried a couple of solutions ranging from ZFS unmount and mount and deleting `/dev` in the `subvol-111-disk-0`, to a few other Hail Marys. None worked, so I kept searching, but did take note that everyone recommended looking at the logs... so I did.

```bash
lxc-start -n 111 -F -l DEBUG -o /tmp/lxc-111.log
# The logs that follow have been cleaned up to fit the page better.
```

```text
lxc-start 111 20211102222139.384 INFO     conf - conf.c:run_script_argv:340 -
	Executing script "/usr/share/lxc/hooks/lxc-pve-prestart-hook" for container "111",
	config section "lxc"
lxc-start 111 20211102222139.759 DEBUG    conf - conf.c:run_buffer:312 -
	Script exec /usr/share/lxc/hooks/lxc-pve-prestart-hook 111 lxc pre-start produced output:
	unsupported debian version '11.1'
```

I noticed the `unsupported debian version '11.1'` and remembered a forum post[^1] about a Debian.pm file, so I went searching for it. The following commands allowed me to see the issue, which was my LXC OS being apparently higher than the one my version of Proxmox supported. Full disclosure: I am still running PVE 6.3-3, because I haven't learnt to update my VMs.

{{< center-image
  src="/assets/img/Proxmox.png"
  alt="Neofetch screenshot showing current proxmox information"
  title="Neofetch screenshot showing current proxmox information"
  width="60%"
>}}

```bash
cat /<disk name>/subvol-111-disk-0/etc/debian_version
>> 11.1
```

```bash
nano /usr/share/perl5/PVE/LXC/Setup/Debian.pm
```

```perl
die "unsupported debian version '$version'\n"
    if !($version >= 4 && $version <= 11);
```


## Solution

I changed a single number, and the containers started right up... it was madness, but made sense at the same time.

```perl
die "unsupported debian version '$version'\n"
    if !($version >= 4 && $version <= 11.1); #Changed from 11 to 11.1
```
I would like to assume a seasoned vet in these systems would know what to look for, but a rookie homelabber learned the hard lesson. I think I have previously nuked containers that had this behavior, but at least now I know the why.

```text
pct[16866]: <root@pam> starting task UPID:Olympus:000041E9:00210651:6181D1E7:vzstart:111:root@pam:
pct[16873]: starting CT 111: UPID:Olympus:000041E9:00210651:6181D1E7:vzstart:111:root@pam:
systemd[1]: Started PVE LXC Container: 111.
kernel: [21644.593851] audit: type=1400 audit(1635897831.466:24):
	apparmor="STATUS" operation="profile_load" profile="/usr/bin/lxc-start"
	name="lxc-111_</var/lib/lxc>" pid=16899 comm="apparmor_parser"
```


[^1]:[Proxmox Forum: lxc-start fails! --> unsupported debian version '9.1'](https://forum.proxmox.com/threads/lxc-start-fails-unsupported-debian-version-9-1.35860/)
