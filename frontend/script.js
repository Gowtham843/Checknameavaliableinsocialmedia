const inputType = document.getElementById("inputType");
const fileBox = document.getElementById("fileBox");
const panelBox = document.getElementById("panelBox");
const fileInput = document.getElementById("fileInput");
const textInput = document.getElementById("textInput");
const submitBtn = document.getElementById("submitBtn");
const loader = document.getElementById("loader");
const preview = document.getElementById("preview");
const resultSection = document.getElementById("resultSection");
const resultTable = document.getElementById("resultTable");

let running = false;

inputType.addEventListener("change", () => {

  fileBox.style.display =
    ["txt","csv","excel"].includes(inputType.value) ? "block" : "none";

  panelBox.style.display =
    inputType.value === "panel" ? "block" : "none";

  // TXT preview
  if (inputType.value === "txt") {
    preview.textContent =
`Codexly
Logiqo
Thinkbit
Codezeno`;
  }

  // CSV preview
  else if (inputType.value === "csv") {
    preview.textContent =
`name
Codexly
Logiqo
Thinkbit
Codezeno`;
  }

  // Excel preview
  else if (inputType.value === "excel") {
    preview.innerHTML = `
<table style="width:100%;border-collapse:collapse">
<tr><th style="border:1px solid #555;padding:4px">Name</th></tr>
<tr><td style="border:1px solid #555;padding:4px">Codexly</td></tr>
<tr><td style="border:1px solid #555;padding:4px">Logiqo</td></tr>
<tr><td style="border:1px solid #555;padding:4px">Thinkbit</td></tr>
<tr><td style="border:1px solid #555;padding:4px">Codezeno</td></tr>
</table>`;
  }

  else {
    preview.innerHTML = "";
  }
});

submitBtn.addEventListener("click", checkHandles);

async function checkHandles() {
  if (running) return;
  running = true;

  submitBtn.disabled = true;
  loader.style.display = "block";

  try {
    const names = await collectNames();
    if (!names.length) return reset("No names found");

    const platforms = [...document.querySelectorAll(".platform-item input:checked")]
      .map(p => p.value);

    const res = await fetch("/api/check", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ names })
    });

    const data = await res.json();

    buildTable(data.results, platforms);

    resultSection.style.display = "block";
    resultSection.scrollIntoView({ behavior: "smooth" });

  } catch (err) {
    alert(err.message);
  }

  reset();
}

async function collectNames() {

  if (inputType.value === "panel") {
    return textInput.value.split(/\r?\n/).filter(n => n.trim());
  }

  const file = fileInput.files[0];
  if (!file) throw new Error("Upload a file");

  if (inputType.value === "txt") {
    const txt = await file.text();
    return txt.split(/\r?\n/).filter(n => n.trim());
  }

  if (inputType.value === "csv") {
    const txt = await file.text();
    return txt.split(/\r?\n/).map(r => r.split(",")[0]).filter(n => n.trim());
  }

  if (inputType.value === "excel") {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: "array" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const json = XLSX.utils.sheet_to_json(sheet, { header: 1 });
    return json.map(row => row[0]).filter(n => n);
  }

  return [];
}

function reset(msg) {
  if (msg) alert(msg);
  loader.style.display = "none";
  submitBtn.disabled = false;
  running = false;
}

function buildTable(data, platforms) {

  let html = "<table><tr><th>Name</th>";

  platforms.forEach(p => html += `<th>${p}</th>`);

  html += "</tr>";

  data.forEach(row => {
    html += `<tr><td>${row.name}</td>`;
    platforms.forEach(p => {
      html += `<td class="${row[p] ? "true" : "false"}">${row[p]}</td>`;
    });
    html += "</tr>";
  });

  html += "</table>";

  resultTable.innerHTML = html;
}
