/* ---------------- IndexedDB Setup ---------------- */
let db;
const request = indexedDB.open("NotionNotesDB", 1);

request.onupgradeneeded = e => {
  db = e.target.result;
  const store = db.createObjectStore("notes", {
    keyPath: "id",
    autoIncrement: true
  });
  store.createIndex("folder", "folder", { unique: false });
};

request.onsuccess = e => {
  db = e.target.result;
  loadFolders();
};

/* ---------------- Elements ---------------- */
const folderList = document.getElementById("folderList");
const addFolderBtn = document.getElementById("addFolder");
const noteTitle = document.getElementById("noteTitle");
const noteBody = document.getElementById("noteBody");
const searchInput = document.getElementById("search");

const undoBtn = document.getElementById("undo");
const redoBtn = document.getElementById("redo");
const exportBtn = document.getElementById("export");

/* ---------------- State ---------------- */
let currentFolder = null;
let currentNoteId = null;
let undoStack = [];
let redoStack = [];

/* ---------------- Toolbar Formatting ---------------- */
document.querySelectorAll("[data-cmd]").forEach(btn => {
  btn.onclick = () => {
    document.execCommand(btn.dataset.cmd);
    saveState();
  };
});

/* ---------------- Undo / Redo ---------------- */
function saveState() {
  undoStack.push({
    title: noteTitle.innerText,
    body: noteBody.innerHTML
  });
  redoStack = [];
}

undoBtn.onclick = () => {
  if (!undoStack.length) return;
  redoStack.push({
    title: noteTitle.innerText,
    body: noteBody.innerHTML
  });
  const state = undoStack.pop();
  noteTitle.innerText = state.title;
  noteBody.innerHTML = state.body;
};

redoBtn.onclick = () => {
  if (!redoStack.length) return;
  undoStack.push({
    title: noteTitle.innerText,
    body: noteBody.innerHTML
  });
  const state = redoStack.pop();
  noteTitle.innerText = state.title;
  noteBody.innerHTML = state.body;
};

/* ---------------- Folder Logic ---------------- */
addFolderBtn.onclick = () => {
  const name = prompt("Folder name?");
  if (!name) return;

  const li = document.createElement("li");
  li.textContent = "📁 " + name;
  li.onclick = () => {
    currentFolder = name;
    loadNotes(name);
    setActive(li);
  };
  folderList.appendChild(li);
};

function setActive(el) {
  [...folderList.children].forEach(li => li.classList.remove("active"));
  el.classList.add("active");
}

/* ---------------- Notes ---------------- */
function autoSave() {
  if (!currentFolder) return;

  const tx = db.transaction("notes", "readwrite");
  const store = tx.objectStore("notes");

  const data = {
    folder: currentFolder,
    title: noteTitle.innerText,
    content: noteBody.innerHTML,
    updatedAt: new Date()
  };

  if (currentNoteId) {
    data.id = currentNoteId;
    store.put(data);
  } else {
    const req = store.add(data);
    req.onsuccess = e => currentNoteId = e.target.result;
  }
}

noteBody.addEventListener("input", () => {
  saveState();
  autoSave();
});

noteTitle.addEventListener("input", autoSave);

function loadNotes(folder) {
  folderList.querySelectorAll("li").forEach(li => {
    if (!li.textContent.includes("📁")) li.remove();
  });

  const tx = db.transaction("notes", "readonly");
  const store = tx.objectStore("notes");
  const index = store.index("folder");

  index.getAll(folder).onsuccess = e => {
    e.target.result.forEach(note => {
      const li = document.createElement("li");
      li.textContent = note.title;
      li.onclick = () => openNote(note);
      folderList.appendChild(li);
    });
  };
}

function openNote(note) {
  currentNoteId = note.id;
  noteTitle.innerText = note.title;
  noteBody.innerHTML = note.content;
}

/* ---------------- Search ---------------- */
searchInput.addEventListener("input", () => {
  const val = searchInput.value.toLowerCase();
  [...folderList.children].forEach(li => {
    li.style.display = li.textContent.toLowerCase().includes(val)
      ? "block"
      : "none";
  });
});

/* ---------------- Export ---------------- */
exportBtn.onclick = () => {
  const text = noteBody.innerText;
  const blob = new Blob([text], { type: "text/plain" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = noteTitle.innerText + ".txt";
  a.click();
};

/* ---------------- Load Folders ---------------- */
function loadFolders() {
  // folders are created dynamically by user
}
