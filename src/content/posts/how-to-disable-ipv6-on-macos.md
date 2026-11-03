---
title: "How to Disable IPv6 on macOS"
pubDatetime: 2025-07-15T14:22:00+03:00
description: How to manually disable IPv6 on macOS through the terminal.
tags:
- homelab
- macos
- network
---

[Kagi Search: “how to disable ipv6 on macos?”](https://kagi.com/search?q=how+to+disable+ipv6+on+macos%3F)

Clicked on [macOS: How to Disable IPv6](https://appletoolbox.com/macos-how-to-disable-ipv6/)

I used the terminal method, as I just don’t want it on, and the `off` option was not available on GUI. The articles recommends setting it to `Link-local only`, but I wanted it set to `off`.

```bash
sudo networksetup -listallnetworkservices
sudo networksetup -setv6off Ethernet
sudo networksetup -setv6off Wi-Fi
```

I then check to make sure it said off:

```bash
networksetup -getinfo Wi-Fi
```

With the following output:

```console
DHCP Configuration
IP address: 192.168.0.XXX
Subnet mask: 255.255.255.0
Router: 192.168.0.1
Client ID:
IPv6: Off
Wi-Fi ID: #X:##:XX:##:##:X#
```
