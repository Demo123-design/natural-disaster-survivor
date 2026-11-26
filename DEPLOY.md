# Putting the game online

The game is a folder of static files once it is built — no server, no
database, nothing that has to keep running. That makes it cheap and simple
to host anywhere.

```bash
npm run build
```

That writes everything into `dist/`. Whatever you host, `dist/` is what you
upload.

## Render (the same place Punch-a-Bomb is)

Render deploys from a Git repository, so the project has to be on GitHub
first. It is not a repository yet.

**1. Put it on GitHub**

The repository is already set up here with one commit and a `.gitignore`
that keeps `node_modules` and `dist` out of it. Create an **empty**
repository on GitHub — no README, no .gitignore, no licence, or the first
push will be rejected — then:

```bash
git remote add origin https://github.com/YOUR-NAME/natural-disaster-survivor.git && git branch -M main && git push -u origin main
```

**2. Create the site on Render**

- Go to [dashboard.render.com](https://dashboard.render.com) → **New** → **Static Site**
- Connect the GitHub repository
- Render reads `render.yaml` and fills the rest in. If you are setting it up
  by hand instead, the two settings that matter are:
  - **Build command:** `npm install && npm run build`
  - **Publish directory:** `dist`
- Click **Create Static Site**

The first build takes a couple of minutes. After that the game is at
`https://whatever-you-named-it.onrender.com`, and every push to `main`
redeploys it automatically.

**Why a Static Site and not a Web Service:** a free web service on Render
goes to sleep when nobody uses it, and takes about a minute to wake up. A
static site does not sleep. This game has no server code, so there is no
reason to use a web service.

## Other options, all free

| Host | How |
|---|---|
| **Netlify** | Drag the `dist` folder onto [app.netlify.com/drop](https://app.netlify.com/drop). No account needed to try it. |
| **Vercel** | `npx vercel --prod` from this folder. |
| **GitHub Pages** | Push `dist/` to a `gh-pages` branch, then enable Pages in the repository settings. |
| **Cloudflare Pages** | Connect the repository; build command `npm run build`, output `dist`. |

Netlify Drop is the quickest if you just want a link in the next two minutes
— it takes the built folder straight from your computer with no repository
and no sign-up.

## A note on the mouse

The game grabs the mouse pointer for looking around. Browsers only allow
that on a normal page, not inside an embedded frame. On any of the hosts
above the game has a page of its own, so it works. If you ever embed the
game inside another page, mouse-look will not work unless that page allows
it.
