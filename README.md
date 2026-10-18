# Chii Debugger for Home Assistant

Remote browser DevTools through authenticated Home Assistant ingress.
Supports Home Assistant OS on amd64 and aarch64.

[![Add repository to Home Assistant](https://my.home-assistant.io/badges/supervisor_add_addon_repository.svg)](https://my.home-assistant.io/redirect/supervisor_add_addon_repository/?repository_url=https%3A%2F%2Fgithub.com%2Fdei79%2Fha-chii-debugger)

## Installation

1. Add `https://github.com/dei79/ha-chii-debugger` under **Settings → Apps → Install app → ⋮ → Repositories**.
2. Install **Chii Debugger**.
3. Configure `inspector_user_ids` as described in [Inspector access](#inspector-access).
4. Start the app and select **Open Web UI**.

The app provides the debugger server. A target browser must explicitly connect
using the authenticated ingress session; installing this app alone does not
instrument dashboards. See [target requirements](#connecting-a-target).

## Inspector access

In your Home Assistant profile, enable advanced mode. As an administrator, open
**Settings → People → Users**, select the intended user and copy its user ID.
In the app's **Configuration** tab, enter the IDs of users allowed to inspect:

```yaml
inspector_user_ids:
  - "REPLACE_WITH_YOUR_HA_USER_ID"
```

Save and restart the app. An empty list denies access to the inspector UI.
Use the account you allowed when selecting **Open Web UI**. A 403 response usually
means that account is missing from the list.

## Connecting a target

The target must have an authenticated Home Assistant ingress session for this
app. Use that session's ingress path as the base URL. Load `chobitsu.js` and
connect the Chii protocol transport through a same-origin WebSocket at
`<ingress-path>/target/display-<uuid>`. The suffix must use lowercase hexadecimal
digits and hyphens. Target-side integration must bridge Chobitsu messages to that
transport. This app does not include a generic dashboard injection integration.

Target users can fetch `chobitsu.js` and connect target WebSockets, but cannot
list targets, open DevTools or issue inspector commands. Start and stop debugging
explicitly in your target integration. Do not persist ingress session URLs.

## Security and operation

Only connections from Home Assistant's standard ingress gateway (`172.30.32.2`)
are trusted. This is a platform address, not a user's LAN address. Authenticated
identity headers determine access. No host ports are exposed. No HA configuration
mount or Supervisor API permission is requested. The process drops to UID/GID
1000 after reading app options. The unused upstream resource proxy is disabled.

Chii and Chobitsu are pinned, with a committed dependency lockfile. Upstream
runtime dependencies have known audit findings; ingress isolation does not remove
those findings. Review dependencies before exposing this debugger to other users.

Use the app page to stop, restart or uninstall it. Enable **Start on boot** if
wanted. Changing the inspector list requires a restart.

## Development

Node.js 22.12+ is required. Run `npm test` and `npm run check`. Root scripts use Node built-ins and need no npm install.
The app dependencies are pinned in `chii_debugger/package-lock.json`.

## Publishing

The public repository is `dei79/ha-chii-debugger`; the image is
`ghcr.io/dei79/ha-chii-debugger`. No personal access token or Home Assistant secret
is needed in GitHub Actions. The workflow uses the temporary `GITHUB_TOKEN`.

### First publication

1. Run `npm test` and `npm run check` locally.
   Inspect `git status --short --untracked-files=all` before staging.
   No local environment file is needed. Do not upload a ZIP of the working directory.
2. Create the GitHub repository, commit the reviewed files and push `main`.
   Git commit author name/email are public metadata: configure a suitable public
   identity (for example your GitHub noreply email) before your first commit.
3. Wait for **Validate and build** to succeed. It builds amd64 and arm64 without
   publishing an image on branch pushes, pull requests and manual runs.
4. Publish the initial version with `git tag v1.15.5-3` and
   `git push origin v1.15.5-3`. The tag must match `version` in `config.yaml`.
   Tag pushes build and publish the multi-architecture image to GHCR.
5. In GitHub package settings, make the `ha-chii-debugger` container package
   **public**. Repository visibility alone does not make the package public.
6. Confirm an anonymous pull works with a clean Docker configuration, then add
   the repository to HA using the README badge and test installation and ingress.
   Do not advertise installation until the image is available.

### Updates

Increase `version` in `chii_debugger/config.yaml`, update the [changelog](#changelog) below and push
for validation. Push the matching `v<version>` tag only after validation passes.
Never reuse a released version: the workflow refuses to overwrite existing tags.
There is a short interval between pushing the manifest version and the image
becoming available; users cannot install that version during this interval.
For a coordinated release, validate on a branch, build by tagging that commit,
then merge the version change into `main` after the image is available.

### Build isolation

- The image context is only `chii_debugger/`; its `.dockerignore` allowlists the
  Dockerfile, runtime sources, package manifest and lockfile.
- Local credentials, logs, archives, backups and dependencies are ignored by Git.
- GitHub builds use Git checkout and never connect to a Home Assistant instance.
- The ingress gateway IP is a documented HA platform constant. The
  documentation-only test address is not an installation detail.

Upstream dependency vulnerabilities are not resolved by this packaging work.
No physical-device or live-HA installation test is implied by a successful build.

## Changelog

### 1.15.5-3

- Initial repository distribution with amd64 and aarch64 images.
- Authenticated HA ingress with explicit inspector access control.
- Pinned Chii 1.15.5 and Chobitsu 1.8.6 runtime dependencies.
