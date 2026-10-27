---
title: "Disabling IPv6 in Debian based LXC Containers"
date: 2025-03-08T07:30:00
description: How to programmatically disable IPv6 using terminal commands.
tags:
- proxmox
- lxc
---


I have been creating containers by hand for a bit now, as I start to create my own scripts, I wanted a single line command that disables IPv6. I found the solution in this article[^1] to be pretty much what I needed:
## For Ubuntu/Debian based Containers
> Edit sysctl.conf: Open the `/etc/sysctl.conf` file in a text editor with superuser privileges. For example, use `sudo nano /etc/sysctl.conf`. Add the following lines to the end of the file:
> 
```sh
net.ipv6.conf.all.disable_ipv6 = 1
net.ipv6.conf.default.disable_ipv6 = 1
net.ipv6.conf.lo.disable_ipv6 = 1
```
> Save and close the file.
> Apply Changes: Run the command `sudo sysctl -p` to apply the changes without rebooting.

While this worked great for manually changing things, I wanted something I could add to my custom scripts, and deactivate all at once during container creation. I do not currently have any plans of exposing anything to the outside world, so the IPs provided by IPv4 are more than I need, and I can use tailscale[^2] for anything else.  I assembled the single line command as below:
```sh
pct exec 125 -- sh -c 'echo "net.ipv6.conf.all.disable_ipv6 = 1\nnet.ipv6.conf.default.disable_ipv6 = 1\nnet.ipv6.conf.lo.disable_ipv6 = 1\nnet.ipv6.conf.eth0.disable_ipv6 = 1" >> /etc/sysctl.conf && sysctl -p'
```

This did it for me, but what if I had an Alpine Linux based container? 

## For Alpine based Containers
I needed a different solution, as the commands wouldn’t be the same, and I have a few Alpine based containers. Based on their documentation, the `sysctl.conf` can be updated[^3] to have the following text do the work for us.
```sh
##Force IPv6 off
#net.ipv6.conf.all.disable_ipv6 = 1
#net.ipv6.conf.default.disable_ipv6 = 1
#net.ipv6.conf.lo.disable_ipv6 = 1
#net.ipv6.conf.eth0.disable_ipv6 = 1
```

The first line I saw said this `# content of this file will override /etc/sysctl.d/*`, so will have to be careful with what we add in the future, but for now this works:
```sh
pct exec <vmid> -- sh -c 'printf "net.ipv6.conf.all.disable_ipv6 = 1\nnet.ipv6.conf.default.disable_ipv6 = 1\nnet.ipv6.conf.lo.disable_ipv6 = 1\nnet.ipv6.conf.eth0.disable_ipv6 = 1\n" >> /etc/sysctl.conf && sysctl -p'
```

I also found that you can simply issue commands[^4] like `sysctl -w net.ipv6.conf.all.disable_ipv6=0` and `sysctl -w net.ipv6.conf.default.disable_ipv6=0` to accomplish the same, but I much prefer to have the commands above.

## But what does it all mean? 
I am not a network engineer, so had not clue what I was doing, so I asked copilot to explain each line to me… and here is the response:
### Prompt
> Can you explain the purpose of each of these lines in the sysctl.conf file? 
> net.ipv6.conf.all.disable_ipv6 = 1 
> net.ipv6.conf.default.disable_ipv6 = 1 
> net.ipv6.conf.lo.disable_ipv6 = 1 
> net.ipv6.conf.eth0.disable_ipv6 = 1

### Response

Absolutely, Carlos! Let's break down each line in the `sysctl.conf` file:
1. `net.ipv6.conf.all.disable_ipv6 = 1`
   - This line disables IPv6 for all network interfaces on the system. By setting this value to `1`, the system disables IPv6 across all network interfaces by default.
2. `net.ipv6.conf.default.disable_ipv6 = 1`
   - This line disables IPv6 for any new network interfaces that are added to the system. So, any new interface that appears will have IPv6 disabled by default.
3. `net.ipv6.conf.lo.disable_ipv6 = 1`
   - This line disables IPv6 specifically for the loopback interface (often referred to as `lo`). The loopback interface is primarily used for inter-process communication on the local machine.
4. `net.ipv6.conf.eth0.disable_ipv6 = 1`
   - This line disables IPv6 for the `eth0` network interface, which is typically the primary Ethernet interface on many systems. Setting this value to `1` disables IPv6 specifically for this interface.

Together, these lines ensure that IPv6 is disabled for all current and new interfaces, as well as specific interfaces like the loopback and `eth0`. This setup is often used in environments where IPv6 is not required or desired.

[^1]: [Disabling IPv6 in Ubuntu/Debian and CentOS/RedHat](https://mangohost.net/blog/disabling-ipv6-in-ubuntu-debian-and-centos-redhat/)
[^2]: [Tailscale: Best VPN Service for Secure Networks](https://tailscale.com)
[^3]:[sysctl.conf#IPv6](https://wiki.alpinelinux.org/wiki/Sysctl.conf#IPv6)
[^4]:[How to Disable IPv6 on Linux](https://www.techrepublic.com/article/how-to-disable-ipv6-on-linux/)
