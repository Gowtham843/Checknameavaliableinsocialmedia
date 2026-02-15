/* app.js - frontend logic */
(() => {
  const inputType = document.getElementById('inputType');
  const fileControls = document.getElementById('fileControls');
  const panelControls = document.getElementById('panelControls');
  const fileInput = document.getElementById('fileInput');
  const textPanel = document.getElementById('textPanel');
  const checkBtn = document.getElementById('checkBtn');
  const clearBtn = document.getElementById('clearBtn');
  const loader = document.getElementById('loader');
  const exampleSidebar = document.getElementById('exampleSidebar');
  const exampleContent = document.getElementById('exampleContent');
  const closeSidebar = document.getElementById('closeSidebar');
  const filterSelect = document.getElementById('filterSelect');
  const resultsMeta = document.getElementById('resultsMeta');
  const tableWrap = document.getElementById('tableWrap');
  const resultCard = document.getElementById('resultCard');

  let latestResults = [];
  let hasScrolledForThisRun = false;

  function openSidebar(html) {
    exampleContent.innerHTML = html;
    exampleSidebar.classList.add('open');
  }
  function closeSide() {
    exampleSidebar.classList.remove('open');
  }

  inputType.addEventListener('change', () => {
    const val = inputType.value;
    fileControls.style.display = (val === 'txt' || val === 'excel') ? 'block' : 'none';
    panelControls.style.display = (val === 'panel') ? 'block' : 'none';

    // show examples
    if (val === 'txt') {
      openSidebar('<h4>TXT format</h4><pre>Codexly\nLogiqo\nThinkbit\nCodezeno</pre>');
    } else if (val === 'excel') {
      openSidebar('<h4>Excel (.xlsx)</h4><p>Use the first (leftmost) column. Example:</p><pre>Name\nCodexly\nLogiqo\nThinkbit</pre>');
    } else if (val === 'panel') {
      openSidebar('<h4>Manual panel</h4><pre>Paste one name per line.\nExample:\nCodexly\nLogiqo\nThinkbit</pre>');
    } else {
      closeSide();
    }
  });

  closeSidebar.addEventListener('click', closeSide);

  clearBtn.addEventListener('click', () => {
    fileInput.value = '';
    textPanel.value = '';
    latestResults = [];
    tableWrap.innerHTML = '';
    resultCard.style.display = 'none';
    resultsMeta.textContent = '';
  });

  // Excel parsing using SheetJS (client-side)
  async function parseFileToNames(file) {
    const name = file.name.toLowerCase();
    if (name.endsWith('.txt') || name.endsWith('.csv')) {
      const txt = await file.text();
      return txt.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
    }
    if (name.endsWith('.xlsx') || name.endsWith('.xls')) {
      const ab = await file.arrayBuffer();
      const wb = XLSX.read(ab, { type: 'array' });
      const firstSheetName = wb.SheetNames[0];
      const ws = wb.Sheets[firstSheetName];
      // convert to JSON; take first column values
      const json = XLSX.utils.sheet_to_json(ws, { header: 1 });
      const names = json.map(row => row[0]).filter(Boolean).map(String);
      return names;
    }
    throw new Error('Unsupported file type');
  }

  async function collectNames() {
    const type = inputType.value;
    if (!type) throw new Error('Select input type');
    if (type === 'panel') {
      return textPanel.value.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
    }
    // txt/excel
    const file = fileInput.files[0];
    if (!file) throw new Error('Upload a file');
    return await parseFileToNames(file);
  }

  function getSelectedPlatforms() {
    return Array.from(document.querySelectorAll('.platform:checked')).map(n => n.value);
  }

  function renderTable(results, selectedPlatforms) {
    if (!results || !results.length) {
      tableWrap.innerHTML = '<div style="padding:14px;color:var(--muted)">No results</div>';
      resultCard.style.display = 'block';
      return;
    }
    // build header dynamically based on selected platforms
    const cols = ['name', ...selectedPlatforms];
    const headerHtml = cols.map(c => `<th>${c === 'name' ? 'Name' : c.charAt(0).toUpperCase() + c.slice(1)}</th>`).join('');
    let rowsHtml = results.map(r => {
      const rowCells = cols.map(col => {
        if (col === 'name') return `<td>${escapeHtml(r.name)}</td>`;
        const val = Boolean(r[col]);
        return `<td class="${val ? 'status-true' : 'status-false'}">${val ? 'Yes' : 'No'}</td>`;
      }).join('');
      return `<tr>${rowCells}</tr>`;
    }).join('');
    const table = `<div class="table-wrap"><table><thead><tr>${headerHtml}</tr></thead><tbody>${rowsHtml}</tbody></table></div>`;
    tableWrap.innerHTML = table;
    resultCard.style.display = 'block';
  }

  function escapeHtml(s){ return String(s||'').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch])); }

  // scroll once to results (per check)
  function scrollToResultsOnce() {
    if (hasScrolledForThisRun) return;
    hasScrolledForThisRun = true;
    setTimeout(() => {
      const el = document.getElementById('resultCard');
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 250);
  }

  // apply filter on latestResults
  filterSelect.addEventListener('change', () => {
    const filter = filterSelect.value;
    let filtered = latestResults || [];
    if (filter === 'available-any') filtered = latestResults.filter(r => Object.values(r).some((v,i)=> i>0 && v === true));
    if (filter === 'taken-any') filtered = latestResults.filter(r => Object.values(r).some((v,i)=> i>0 && v === true));
    const platforms = getSelectedPlatforms();
    renderTable(filtered, platforms.length ? platforms : ['instagram','youtube','x','linkedin']);
  });
  function capitalize(word) {
  return word.charAt(0).toUpperCase() + word.slice(1);
}


  // main check handler
  checkBtn.addEventListener('click', async () => {
    try {
      checkBtn.disabled = true;
      hasScrolledForThisRun = false;
      loader.style.display = 'inline-block';
      loader.setAttribute('aria-hidden','false');
      loader.querySelector('.dots').textContent = 'Checking';

      const names = await collectNames(); // throws if invalid
      if (!names.length) throw new Error('No names found');

      // create fake progress visual by updating dots while awaiting (gives "working" feel)
      const dotsEl = loader.querySelector('.dots');
      let dotCount = 0;
      const dotTimer = setInterval(()=> {
        dotCount = (dotCount + 1) % 4;
        dotsEl.textContent = 'Checking' + '.'.repeat(dotCount);
      }, 400);

      // call backend (relative path works on Vercel)
      const response = await fetch('/api/check', {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ names })
      });

      if (!response.ok) {
        throw new Error('Server error');
      }
      const payload = await response.json();
      latestResults = payload.results || [];

      // update metadata
      resultsMeta.textContent = `${latestResults.length} items checked • ${new Date().toLocaleTimeString()}`;

      // filter columns to selected platforms only (frontend rendering)
      const selectedPlatforms = getSelectedPlatforms();
      // ensure platform names exist in results: if backend didn't check a platform, fallback to false
      latestResults = latestResults.map(r => {
        const copy = { name: r.name };
        selectedPlatforms.forEach(p => { copy[p] = (r[p] === true); });
        return copy;
      });

      renderTable(latestResults, selectedPlatforms);

      clearInterval(dotTimer);
      loader.querySelector('.dots').textContent = 'Done';
      setTimeout(()=> {
        loader.style.display = 'none';
        loader.setAttribute('aria-hidden','true');
      }, 500);

      // scroll to results once
      scrollToResultsOnce();
    } catch (err) {
      alert(err.message || 'Error');
      console.error(err);
      loader.style.display = 'none';
      loader.setAttribute('aria-hidden','true');
    } finally {
      checkBtn.disabled = false;
    }
  });

  // init small UX: show sidebar collapsed unless input chosen
  if (!inputType.value) closeSide();

})();
