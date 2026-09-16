# Linux Command Simulator

A ready-to-use browser-based Linux terminal simulator built with HTML, CSS and vanilla JavaScript.

## Run it

1. Extract the ZIP.
2. Open `index.html` in Chrome, Edge, Firefox, or another modern browser.
3. Start typing Linux-style commands.

No Node.js, Python server, database, or installation is required.

## Supported commands

`pwd`, `ls`, `cd`, `mkdir`, `touch`, `cat`, `echo`, `rm`, `rmdir`, `cp`, `mv`, `tree`, `whoami`, `hostname`, `date`, `uname`, `clear`, `history`, `help`

Also supported:
- `ls -l`
- `ls -a`
- `ls -la`
- command history with Up/Down
- basic Tab completion for commands
- virtual filesystem reset

## Important

This simulator does NOT execute commands on your actual computer. The filesystem exists only in the browser's JavaScript memory, so it is safe to experiment with.

## Project files

- `index.html` — interface
- `style.css` — terminal/UI styling
- `script.js` — virtual filesystem and command interpreter
