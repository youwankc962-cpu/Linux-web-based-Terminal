(() => {
  const terminal = document.getElementById("terminal");
  const input = document.getElementById("commandInput");
  const promptEl = document.getElementById("prompt");
  const clearBtn = document.getElementById("clearBtn");
  const resetBtn = document.getElementById("resetBtn");
  const helpBtn = document.getElementById("helpBtn");
  const commandList = document.getElementById("commandList");

  const COMMANDS = {
    pwd: "print working directory",
    ls: "list directory contents",
    cd: "change directory",
    mkdir: "create a directory",
    touch: "create an empty file",
    cat: "display file contents",
    echo: "print text",
    rm: "remove files/directories",
    rmdir: "remove an empty directory",
    cp: "copy files/directories",
    mv: "move or rename files/directories",
    tree: "show filesystem tree",
    whoami: "show current user",
    hostname: "show hostname",
    date: "show current date/time",
    uname: "show system information",
    clear: "clear the terminal",
    history: "show command history",
    help: "show command help"
  };

  const initialFS = () => ({
    type: "dir", name: "/", children: {
      home: { type: "dir", name: "home", children: {
        student: { type: "dir", name: "student", children: {
          Documents: { type: "dir", name: "Documents", children: {
            "readme.txt": { type: "file", name: "readme.txt", content: "Welcome to the Linux Command Simulator!\\nTry commands such as ls, cd, mkdir, touch and cat." }
          }},
          Downloads: { type: "dir", name: "Downloads", children: {} },
          Projects: { type: "dir", name: "Projects", children: {
            "hello.txt": { type: "file", name: "hello.txt", content: "Hello, Linux simulator!" }
          }},
          "notes.txt": { type: "file", name: "notes.txt", content: "Learn Linux one command at a time." }
        }}
      }},
      etc: { type: "dir", name: "etc", children: {
        "hostname": { type: "file", name: "hostname", content: "linux-simulator" }
      }},
      tmp: { type: "dir", name: "tmp", children: {} },
      var: { type: "dir", name: "var", children: {} }
    }
  });

  let fs = initialFS();
  let cwd = ["home", "student"];
  let history = [];
  let historyIndex = 0;

  const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[c]));

  function getNode(parts) {
    let node = fs;
    for (const part of parts) {
      if (part === "") continue;
      if (node.type !== "dir" || !node.children[part]) return null;
      node = node.children[part];
    }
    return node;
  }

  function normalizePath(path) {
    let parts = path.startsWith("/") ? [] : [...cwd];
    for (const p of path.split("/")) {
      if (!p || p === ".") continue;
      if (p === "..") parts.pop();
      else parts.push(p);
    }
    return parts;
  }

  function displayPath(parts = cwd) {
    if (parts.length === 0) return "/";
    return "~" + "/" + parts.join("/");
  }

  function promptText() {
    return `student@linux-simulator:${displayPath()}$`;
  }

  function updatePrompt() { promptEl.textContent = promptText(); }

  function print(text = "", cls = "output") {
    const div = document.createElement("div");
    div.className = cls;
    div.textContent = text;
    terminal.appendChild(div);
    terminal.scrollTop = terminal.scrollHeight;
  }

  function printPromptCommand(cmd) {
    const div = document.createElement("div");
    div.innerHTML = `<span class="prompt">${esc(promptText())}</span> <span class="command">${esc(cmd)}</span>`;
    terminal.appendChild(div);
  }

  function tokenize(line) {
    const tokens = [];
    const re = /"([^"]*)"|'([^']*)'|(\S+)/g;
    let m;
    while ((m = re.exec(line)) !== null) tokens.push(m[1] ?? m[2] ?? m[3]);
    return tokens;
  }

  function resolveTarget(path, allowMissing = false) {
    const parts = normalizePath(path);
    const name = parts.pop();
    const parent = getNode(parts);
    if (!parent || parent.type !== "dir") return { error: `No such directory: ${parts.join("/") || "/"}` };
    if (!name) return { node: parent, parts, name };
    if (!parent.children[name] && !allowMissing) return { error: `No such file or directory: ${path}` };
    return { parent, node: parent.children[name] || null, parts, name };
  }

  function cmdLs(args) {
    let long = false, all = false, paths = [];
    for (const a of args) {
      if (a.startsWith("-")) {
        if (a.includes("l")) long = true;
        if (a.includes("a")) all = true;
      } else paths.push(a);
    }
    if (!paths.length) paths = ["."];
    const outputs = [];
    for (const path of paths) {
      const node = getNode(normalizePath(path));
      if (!node) { print(`ls: cannot access '${path}': No such file or directory`, "error"); continue; }
      if (node.type === "file") { outputs.push(long ? `-rw-r--r-- 1 student student ${node.content.length} ${node.name}` : node.name); continue; }
      let names = Object.keys(node.children).sort();
      if (all) names = [".", "..", ...names];
      if (long) {
        outputs.push(...names.map(n => {
          if (n === ".") return "drwxr-xr-x 1 student student 4096 .";
          if (n === "..") return "drwxr-xr-x 1 student student 4096 ..";
          const c = node.children[n];
          return `${c.type === "dir" ? "drwxr-xr-x" : "-rw-r--r--"} 1 student student ${c.type === "file" ? c.content.length : 4096} ${n}`;
        }));
      } else outputs.push(names.join("  "));
    }
    print(outputs.join("\n"));
  }

  function cmdCd(args) {
    const path = args[0] || "~";
    let parts = path === "~" ? ["home","student"] : normalizePath(path);
    const node = getNode(parts);
    if (!node) { print(`cd: no such file or directory: ${path}`, "error"); return; }
    if (node.type !== "dir") { print(`cd: not a directory: ${path}`, "error"); return; }
    cwd = parts; updatePrompt();
  }

  function cmdMkdir(args) {
    if (!args.length) return print("mkdir: missing operand", "error");
    for (const path of args) {
      const r = resolveTarget(path, true);
      if (r.error) { print(`mkdir: ${r.error}`, "error"); continue; }
      if (r.node) { print(`mkdir: cannot create directory '${path}': File exists`, "error"); continue; }
      r.parent.children[r.name] = { type:"dir", name:r.name, children:{} };
    }
  }

  function cmdTouch(args) {
    if (!args.length) return print("touch: missing file operand", "error");
    for (const path of args) {
      const r = resolveTarget(path, true);
      if (r.error) { print(`touch: ${r.error}`, "error"); continue; }
      if (!r.node) r.parent.children[r.name] = { type:"file", name:r.name, content:"" };
    }
  }

  function cmdCat(args) {
    if (!args.length) return print("cat: missing operand", "error");
    for (const path of args) {
      const node = getNode(normalizePath(path));
      if (!node) print(`cat: ${path}: No such file or directory`, "error");
      else if (node.type === "dir") print(`cat: ${path}: Is a directory`, "error");
      else print(node.content);
    }
  }

  function cmdRm(args) {
    if (!args.length) return print("rm: missing operand", "error");
    const recursive = args.includes("-r") || args.includes("-rf") || args.includes("-fr");
    for (const path of args.filter(a => !a.startsWith("-"))) {
      const r = resolveTarget(path);
      if (r.error) { print(`rm: ${r.error}`, "error"); continue; }
      if (r.node.type === "dir" && Object.keys(r.node.children).length && !recursive) {
        print(`rm: cannot remove '${path}': Directory not empty`, "error"); continue;
      }
      delete r.parent.children[r.name];
    }
  }

  function cmdRmdir(args) {
    if (!args.length) return print("rmdir: missing operand", "error");
    for (const path of args) {
      const r = resolveTarget(path);
      if (r.error) { print(`rmdir: ${r.error}`, "error"); continue; }
      if (r.node.type !== "dir") { print(`rmdir: failed to remove '${path}': Not a directory`, "error"); continue; }
      if (Object.keys(r.node.children).length) { print(`rmdir: failed to remove '${path}': Directory not empty`, "error"); continue; }
      delete r.parent.children[r.name];
    }
  }

  function cmdCp(args) {
    if (args.length < 2) return print("cp: missing destination file operand", "error");
    const srcPath = args[args.length - 2], destPath = args[args.length - 1];
    const src = getNode(normalizePath(srcPath));
    if (!src) return print(`cp: cannot stat '${srcPath}': No such file or directory`, "error");
    if (src.type === "dir") return print("cp: -r not specified; omitting directory", "error");
    let dest = resolveTarget(destPath, true);
    if (dest.error) return print(`cp: ${dest.error}`, "error");
    if (dest.node && dest.node.type === "dir") {
      dest.parent = dest.node; dest.parts = normalizePath(destPath); dest.name = src.name;
    }
    dest.parent.children[dest.name] = { type:"file", name:dest.name, content:src.content };
  }

  function cmdMv(args) {
    if (args.length < 2) return print("mv: missing destination file operand", "error");
    const srcPath = args[args.length - 2], destPath = args[args.length - 1];
    const src = getNode(normalizePath(srcPath));
    if (!src) return print(`mv: cannot stat '${srcPath}': No such file or directory`, "error");
    const srcR = resolveTarget(srcPath);
    let dest = resolveTarget(destPath, true);
    if (dest.error) return print(`mv: ${dest.error}`, "error");
    if (dest.node && dest.node.type === "dir") {
      dest.parent = dest.node; dest.parts = normalizePath(destPath); dest.name = src.name;
    }
    src.name = dest.name;
    dest.parent.children[dest.name] = src;
    delete srcR.parent.children[srcR.name];
  }

  function treeString(node, prefix = "", isRoot = true) {
    const lines = [];
    if (isRoot) lines.push(".");
    const entries = Object.values(node.children || {}).sort((a,b) => a.name.localeCompare(b.name));
    entries.forEach((child, i) => {
      const last = i === entries.length - 1;
      lines.push(prefix + (last ? "└── " : "├── ") + child.name);
      if (child.type === "dir") lines.push(...treeString(child, prefix + (last ? "    " : "│   "), false));
    });
    return lines;
  }

  function cmdHelp(args) {
    if (args[0] && COMMANDS[args[0]]) {
      const details = {
        pwd:"Usage: pwd", ls:"Usage: ls [-la] [path]", cd:"Usage: cd [directory]",
        mkdir:"Usage: mkdir DIRECTORY...", touch:"Usage: touch FILE...", cat:"Usage: cat FILE...",
        echo:"Usage: echo TEXT", rm:"Usage: rm [-r] FILE...", rmdir:"Usage: rmdir DIRECTORY...",
        cp:"Usage: cp SOURCE DEST", mv:"Usage: mv SOURCE DEST", tree:"Usage: tree",
        whoami:"Usage: whoami", hostname:"Usage: hostname", date:"Usage: date",
        uname:"Usage: uname [-a]", clear:"Usage: clear", history:"Usage: history", help:"Usage: help [command]"
      };
      print(`${details[args[0]]}\n${COMMANDS[args[0]]}`, "info");
      return;
    }
    print("Available commands:\n" + Object.entries(COMMANDS).map(([c,d]) => `  ${c.padEnd(9)} ${d}`).join("\n") + "\n\nType 'help COMMAND' for usage.", "info");
  }

  function execute(line) {
    const args = tokenize(line.trim());
    if (!args.length) return;
    const command = args.shift();
    switch(command) {
      case "pwd": print("/" + cwd.join("/")); break;
      case "ls": cmdLs(args); break;
      case "cd": cmdCd(args); break;
      case "mkdir": cmdMkdir(args); break;
      case "touch": cmdTouch(args); break;
      case "cat": cmdCat(args); break;
      case "echo": print(args.join(" ")); break;
      case "rm": cmdRm(args); break;
      case "rmdir": cmdRmdir(args); break;
      case "cp": cmdCp(args); break;
      case "mv": cmdMv(args); break;
      case "tree": print(treeString(fs).join("\n")); break;
      case "whoami": print("student"); break;
      case "hostname": print("linux-simulator"); break;
      case "date": print(new Date().toString()); break;
      case "uname": print(args.includes("-a") ? "Linux linux-simulator 6.8.0-simulator #1 SMP x86_64 GNU/Linux" : "Linux"); break;
      case "clear": terminal.innerHTML = ""; break;
      case "history": history.forEach((h,i) => print(`${String(i+1).padStart(4)}  ${h}`)); break;
      case "help": cmdHelp(args); break;
      default: print(`${command}: command not found. Type 'help' for available commands.`, "error");
    }
  }

  function reset() {
    fs = initialFS(); cwd = ["home","student"]; history = []; historyIndex = 0;
    terminal.innerHTML = "";
    print("Linux Command Simulator v1.0", "success");
    print("Safe virtual terminal — commands run inside the simulator only.", "muted");
    print("Type 'help' to get started.\n");
    updatePrompt();
  }

  Object.entries(COMMANDS).forEach(([cmd, desc]) => {
    const div = document.createElement("div");
    div.className = "command-item";
    div.innerHTML = `<code>${cmd}</code><span>${desc}</span>`;
    commandList.appendChild(div);
  });

  input.addEventListener("keydown", e => {
    if (e.key === "Enter") {
      const line = input.value;
      if (line.trim()) {
        printPromptCommand(line);
        history.push(line);
        historyIndex = history.length;
        execute(line);
      } else printPromptCommand("");
      input.value = "";
      updatePrompt();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (historyIndex > 0) historyIndex--;
      input.value = history[historyIndex] || "";
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (historyIndex < history.length) historyIndex++;
      input.value = history[historyIndex] || "";
    } else if (e.key === "Tab") {
      e.preventDefault();
      const value = input.value.trim();
      const candidates = Object.keys(COMMANDS).filter(c => c.startsWith(value));
      if (candidates.length === 1) input.value = candidates[0] + " ";
    }
  });

  terminal.addEventListener("click", () => input.focus());
  clearBtn.addEventListener("click", () => { terminal.innerHTML = ""; input.focus(); });
  resetBtn.addEventListener("click", () => { reset(); input.focus(); });
  helpBtn.addEventListener("click", () => { printPromptCommand("help"); cmdHelp([]); input.focus(); });

  reset();
  input.focus();
})();
