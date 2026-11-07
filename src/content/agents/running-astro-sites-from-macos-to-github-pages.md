---
author: "Claude Code using Claude Opus 5.5"
title: "Running Astro Sites from macOS to GitHub Pages"
pubDatetime: 2026-11-07T08:00:00Z
description: "How two Astro sites run in an Apple container machine on macOS, share one pnpm store, and deploy to GitHub Pages."
summary: "Node and pnpm run in an Alpine container machine, not on macOS. The two Astro sites use one pnpm store with hard links. Each repository keeps its own lock file, so the GitHub Pages build works without changes."
tags: ["astro", "pnpm", "container", "github-pages", "macos"]
---

## Summary

This note records the setup for two Astro sites on one Mac:

- [Astro Blowfish](https://www.carlosbarboza.me/) referred to as `AstroSiteOne`
- [Fossilized Bits](https://www.fossilizedbits.com) referred to as `AstroSiteTwo`

Node, pnpm, and the Astro dev server run in a Linux container machine. Nothing for Node is installed on macOS.

Before this change, the sites used two different methods to keep packages:

- `AstroSiteTwo` used an npm workspace in `~/Developer/Astro`, with one `node_modules` folder for the workspace.
- `AstroSiteOne` used pnpm, with its own `node_modules` folder.

Now both sites use pnpm and one pnpm store. Each site keeps its own lock file, so GitHub Pages can build each repository alone.

## Host and Container Machine

The setup has two parts. It is important to know which part does each task.

| Part | System | Tasks |
|---|---|---|
| Host | macOS | Edit files, use Finder, use git, push to GitHub, open the site in a browser |
| Container machine `astro` | Alpine Linux 3.24, Node 24 | Run `pnpm install`, `pnpm dev`, `pnpm build` |

The container machine mounts the macOS home folder at the same path. Thus, `/Users/username/Developer/Astro` is the same folder on the host and in the container machine.

The container machine has a different home folder for its user:

| Path | Where it is |
|---|---|
| `/Users/username` | The macOS home folder. The host and the container machine share it. |
| `/home/username` | The home folder in the container machine. Only the container machine uses it. |

This difference is important:

- pnpm is installed in `/home/username/.local`, in the container machine. The `pnpm` command is not available in the macOS terminal.
- The pnpm store is in `/Users/username/.pnpm-store`, on the shared disk. The store must be on the same disk as the sites, because pnpm uses hard links.

> [!NOTE]
> Some packages have binaries for one platform. For example, `lightningcss-linux-arm64-musl` is for Alpine Linux on arm64. These packages work only in the container machine. Do not run `node_modules/.bin/astro` from macOS.

## Container Image

The container machine starts from a small image. The Dockerfile is in `~/Developer/Containers/Astro/Dockerfile`:

```dockerfile
FROM node:24-alpine
RUN apk add --no-cache bash git
# Clear the Node image's entrypoint so the machine boots init
ENTRYPOINT []
CMD ["/sbin/init"]
```

Each line has a function:

| Line | Function |
|---|---|
| `FROM node:24-alpine` | Supplies Node 24 and npm on Alpine Linux. |
| `RUN apk add --no-cache bash git` | Adds `bash` and `git`. Some package scripts use them. |
| `ENTRYPOINT []` | Removes the entrypoint of the Node image. That entrypoint starts Node. |
| `CMD ["/sbin/init"]` | Starts `init`. A container machine must start `init` to operate as a full system. |

## Procedure to Make the Container Machine

Do these steps in the macOS terminal. Apple `container` must be installed (Homebrew installs it at `/opt/homebrew/bin/container`).

1. Build the image:

   ```sh
   container build --tag local/astro-machine:latest ~/Developer/Containers/Astro
   ```

2. Make the container machine from the image:

   ```sh
   container machine create local/astro-machine:latest --name astro
   ```

3. Set the CPU count and the memory. Then stop the container machine, so that the settings apply on the next start:

   ```sh
   container machine set -n astro cpus=4 memory=4G
   container machine stop astro
   ```

4. Make sure that the container machine operates:

   ```sh
   container machine list
   ```

The `astro` machine shows `running` and an IP address, for example `192.168.64.X`.

## Procedure to Run Commands in the Container Machine

`container machine run` runs a command in the container machine. The command starts in the current macOS folder, because the home folder has the same path.

The command does not read `~/.profile`. Thus, `~/.local/bin` is not in `PATH`, and `pnpm` is not found. Load the profile in the command:

```sh
cd ~/Developer/Astro/AstroSiteOne
container machine run -n astro -- sh -c '. ~/.profile && pnpm dev --host --force'
```

You can also open a shell in the container machine. Then load the profile one time for each shell:

```sh
. ~/.profile
pnpm dev --host --force
```

The `--host` option makes the dev server listen on all interfaces. Then you can open the site from macOS at the IP address of the container machine, for example `http://192.168.64.X:4321/`.

> [!NOTE]
> If both sites run at the same time, the second site uses the next free port, usually `4322`.

## File Changes in the Shared Folder

The shared home folder does not send file-change events to the container machine. Thus, the Astro dev server does not see changes that you make on macOS.

Both sites set Vite to poll for changes:

```js
vite: {
  // The container machine's home mount sends no file events, so poll.
  server: { watch: { usePolling: true, interval: 300 } },
},
```

Keep this setting in `astro.config.ts` (AstroSiteOne) and `astro.config.mjs` (AstroSiteTwo).

## Problem with One Shared node_modules Folder

The npm workspace in `~/Developer/Astro` kept the packages for `AstroSiteTwo` in one `node_modules` folder. On the Mac, this method operated correctly. But it caused a problem for GitHub Pages.

GitHub checks out only the repository of the site. The workspace folder `~/Developer/Astro` is not in that repository. Thus, the lock file of the workspace is not available to the GitHub build.

The `withastro/action` action uses the lock file in the repository for two tasks:

1. It finds the package manager.
2. It installs the exact package versions.

To supply a lock file, a script (`fb-lock.sh`) made a separate `package-lock.json` for the site. You had to run this script after each change to the dependencies. If you did not run it, GitHub built the site with an old lock file.

## Solution with One pnpm Store

pnpm keeps one copy of each package version in a store. Each site has its own `node_modules` folder, but the files in it are hard links to the store. Thus, a package that both sites use takes disk space only one time.

This method gives these results:

- Each site is a separate project, with its own `pnpm-lock.yaml` in its repository.
- GitHub gets the lock file from the repository. The `fb-lock.sh` script is not necessary.
- On the Mac, the two sites share the disk space through the store.

The GitHub workflow does not change. `withastro/action@v2` finds `pnpm-lock.yaml` and the `packageManager` field in `package.json`. Then it installs that version of pnpm and builds the site.

## Procedure to Install pnpm in the Container Machine

pnpm was not installed in the container machine. The two usual methods failed, because only `root` can write to `/usr/local`:

```text
corepack enable pnpm
Internal Error: EACCES: permission denied, symlink '../lib/node_modules/corepack/dist/pnpm.js' -> '/usr/local/bin/pnpm'

npm install -g pnpm@12.16.1
npm error code EACCES
npm error path /usr/local/lib/node_modules/pnpm
```

Install pnpm in the home folder of the container machine. Do these steps in the container machine:

1. Set the npm prefix to the home folder:

   ```sh
   npm config set prefix ~/.local
   ```

2. Install pnpm:

   ```sh
   npm install -g pnpm@12.16.1
   ```

3. Add `~/.local/bin` to `PATH`:

   ```sh
   echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.profile
   . ~/.profile
   ```

4. Set the store to the folder on the shared disk:

   ```sh
   pnpm config set store-dir /Users/username/.pnpm-store
   ```

5. Make sure that pnpm operates:

   ```sh
   pnpm --version
   ```

The result is `12.16.1`.

> [!NOTE]
> npm shows an `install-scripts` warning for pnpm, because it does not run the install script of pnpm. pnpm operates without that script. If pnpm shows errors later, install it again with `npm install -g --allow-scripts=pnpm pnpm@12.16.1`.

## Repair of the AstroSiteOne Install

`AstroSiteOne/node_modules` used 552 MB. An examination of the hard links showed two pnpm stores:

| Store | Size | Origin |
|---|---|---|
| `AstroSiteOne/node_modules/.pnpm-store` | 346 MB | First install, 27 October. pnpm made the store in the project. |
| `~/.pnpm-store` | 333 MB | Second install, 28 October. |

Most packages had links to the store in the project. Thus, the two stores kept almost the same files two times. The real disk use of the site and the two stores was approximately 692 MB.

To repair the install, do these steps in the `AstroSiteOne` folder, in the container machine:

1. Close all Finder windows that show `AstroSiteOne` or `node_modules`.
2. Remove the `node_modules` folder:

   ```sh
   rm -rf node_modules
   ```

3. Install the packages again, with the store on the shared disk:

   ```sh
   pnpm install --store-dir /Users/username/.pnpm-store
   ```

4. Remove the files that no project uses:

   ```sh
   pnpm store prune --store-dir /Users/username/.pnpm-store
   ```

> [!CAUTION]
> If Finder shows a folder in `node_modules`, Finder writes `.DS_Store` files into it during the removal. Then `rm` stops with `Directory not empty`. Close the Finder window and do the step again.

The install used the packages that were in `~/.pnpm-store`:

```text
Content-addressable store is at: /Users/username/.pnpm-store/v11
Progress: resolved 553, reused 553, downloaded 0, added 559, done
```

## Procedure to Move AstroSiteTwo to pnpm

1. Add the `packageManager` field to `AstroSiteTwo/package.json`:

   ```json
   "packageManager": "pnpm@12.16.1",
   ```

2. Remove `AstroSiteTwo/package-lock.json`.
3. Remove the npm workspace from `~/Developer/Astro`. Move these items to the Trash:

   ```text
   package.json
   package-lock.json
   fb-lock.sh
   node_modules
   ```

4. In the container machine, install the packages from the `AstroSiteTwo` folder:

   ```sh
   pnpm install
   ```

5. Start the dev server and make sure that the site operates:

   ```sh
   pnpm dev --host --force
   ```

6. On macOS, commit these changes and push them to GitHub:

   ```text
   package.json
   pnpm-lock.yaml
   package-lock.json (removed)
   ```

The first push after this change is the first test of the GitHub build with pnpm.

> [!NOTE]
> Before you remove `~/Developer/Astro/node_modules`, make sure that no other project in `~/Developer/Astro` uses it. For example, a Hugo site without a `package.json` does not use it.

## Procedure to Examine the Disk Use

Finder and `du` count each hard link as a full file. Thus, `node_modules` shows a large size in each site, but the files are on the disk only one time.

To see the real disk use, give all folders to one `du` command. `du` counts each file only one time in one command:

```sh
du -shc ~/.pnpm-store "$HOME/Developer/Astro/AstroSiteOne/node_modules" | tail -1
```

To make sure that a package links to the store, examine the link count of a file. A count of `2` or more shows a shared file:

```sh
stat -f '%l links' "$HOME/Developer/Astro/AstroSiteOne/node_modules/astro/package.json"
```

## Code Block Language Names

After the install, the dev server of `AstroSiteOne` showed warnings from Shiki:

```text
[Shiki] The language "go-html-template" doesn't exist, falling back to "plaintext".
```

These warnings also occur in the GitHub build, because they come from the posts. Some code blocks used Hugo language names. The posts now use names that Shiki knows:

| Old name | New name |
|---|---|
| `go-html-template` | `html` |
| `ssh_config` | `ssh-config` |
| `conf` | `ini` |
| `caddyfile` | `text` |

Shiki has no grammar for Caddyfile. Thus, that block uses `text`, the same as other plain blocks.

## Results

| Item | Before | After |
|---|---|---|
| `AstroSiteOne` and the pnpm stores | approximately 692 MB | approximately 333 MB |
| npm workspace in `~/Developer/Astro` | 143 MB | removed |
| `fb-lock.sh` after each dependency change | necessary | not necessary |
| GitHub workflow files | no change | no change |

Both sites now start with the same command from their folders, in the container machine:

```sh
pnpm dev --host --force
```
