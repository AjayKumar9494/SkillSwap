# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.

---

## Android app: updates without reinstalling

The app is configured to **load the live website** (see `capacitor.config.json` → `server.url`). That means:

1. **One-time setup:** Rebuild and reinstall the app once with this config (e.g. after adding `server.url`).
2. **After that:** When you push changes to Git and your site deploys (e.g. Vercel), **users get the new version by simply opening the app again** — no reinstall. The app loads the same URL as the website, so it always shows the latest deployment.

**If your production URL is different:** Edit `capacitor.config.json` and set `server.url` to your frontend URL (e.g. `https://your-app.vercel.app`).

**To ship a bundled version instead** (e.g. for store or offline): remove the `server` block from `capacitor.config.json`, run `npm run build`, then `npx cap sync android` and build the APK. The app will then use the built files inside the APK until the user reinstalls.
