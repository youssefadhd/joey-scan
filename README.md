# JOEY//SCAN

JOEY//SCAN is a fictional, on-device character dossier experience by JOEY LABS. It uses MediaPipe Face Landmarker to detect a face in the live preview; it does not recognize or identify a person.

## Run locally

```sh
npm install
npm run dev
```

Camera access requires HTTPS or `localhost`. The camera starts only after the user presses **Enable camera**. Video frames and facial landmarks are processed locally. Dossier fields are generated independently from a random fictional catalog, and the camera is stopped immediately after portrait capture.

The MediaPipe package may send limited performance and utilization metrics to its provider. Those metrics do not include camera frames or facial landmarks.

## Build and verify

```sh
npm test
npm run typecheck
npm run build
```

The PNG exporter renders a standalone 1800 × 1350 card in Canvas 2D using system fonts; it does not capture the webpage. Export and sharing stay on-device until the user downloads, copies, or chooses a share destination.

## Vite base paths

Local builds use `/`. GitHub Actions builds use `/joey-scan/` for project Pages deployment. Set `VITE_BASE_PATH` to override the base path. The local MediaPipe model and WASM files use Vite's `import.meta.env.BASE_URL`, so they follow the same deployment path.

## Device validation

Automated tests use mocked streams, a mocked MediaPipe task, and coordinate projections. They do not replace physical-device checks. Validate camera permission, inline playback, camera switching, orientation changes, interruption recovery, native file sharing, and PNG download on iPhone Safari, iPhone Chrome, Android Chrome, Samsung Internet, and desktop browsers before release.
