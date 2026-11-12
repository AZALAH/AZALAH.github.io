# Ahmed Salah Portfolio

My personal portfolio site, styled like a blocky game title screen. Built with plain HTML, CSS, and JavaScript, no framework.

Live at **https://azalah.github.io**

## What's inside
- **Projects:** SecureDrop (with a narrated slide walkthrough), Assembly Tokenizer, and more
- **How to Use & Test:** step-by-step guides to run my projects
- **About Me** and an interactive **Resume**
- **Current Work & Reviews**

## The Gallery
`gallery.html` is a walkable pixel-art museum of my work, built on a plain 2D canvas. It plays like a small game:
- Keyboard, touch and controller support
- A pause menu with a journal, settings and a controls screen
- 21 achievements, an objective tracker and a save that picks up where you left off
- A café, an elevator and a cat
- A piano with 12 pieces and a falling-note performance mode with scores and ranks
- A fourth floor of animated landscapes you can step into, each with a postcard to find

## Desktop launcher
`launcher/` is an Electron app for Windows that installs the gallery, runs it in its own window and keeps it up to date.
- It serves the game from a private `azalah://` scheme, so it works offline.
- On start it compares `game-manifest.json` on this site with its own copy, downloads only the files that changed and checks each one against its SHA-256 hash before using it.
- Windows are sandboxed, and links to other sites open in the normal browser.

Download it from the [latest release](https://github.com/AZALAH/AZALAH.github.io/releases/latest).

To build it yourself: `cd launcher && npm install && npm run dist` (needs NSIS for the installer step).
After changing the site, run `node tools/make-manifest.js "What changed"` so installed launchers pick up the update.

## Credits
- Music: "Lofi Chill Vlog Beats" by alex-morgan (Pixabay)
- Piano pieces are public-domain compositions. Scores from the Mutopia Project (Für Elise, Gymnopédie No. 1, The Entertainer, Rondo alla Turca, Ode to Joy, Eine kleine Nachtmusik, In the Hall of the Mountain King; Piano Sonata No. 16 by A. Sierra, CC BY-SA 3.0).
- The Blue Danube is a piano reduction of the MEI score encoding by the Signature Sound Vienna project (mdw – University of Music and Performing Arts Vienna), CC BY 4.0.
- Symphony No. 40 is a piano reduction built from the note table in DanChitwood/MozartPCA.
- Waltz of the Flowers (Tchaikovsky, public domain) is a short easy-piano version of the main themes.
- Not an official Minecraft product. Not affiliated with Mojang or Microsoft.
