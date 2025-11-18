/* Script principal para el examen: interacción con CheapShark API
   Implementa: carga inicial de deals, búsqueda, filtros por tienda,
   orden, paginación (Ver más), modal con detalle, indicador de carga y manejo de errores.
*/

const API_BASE = 'https://www.cheapshark.com/api/1.0';

let currentPage = 0;
const pageSize = 12; // pedimos al menos 12
let currentStoreID = '1';
let isSearching = false;
let lastQuery = '';

let currentItems = [];

// Elementos del DOM
const searchForm = document.getElementById('searchForm');
const searchInput = document.getElementById('searchInput');
const searchBtn = document.getElementById('searchBtn');
const storeSelect = document.getElementById('storeSelect');
const sortSelect = document.getElementById('sortSelect');

const statusArea = document.getElementById('statusArea');
const errorArea = document.getElementById('errorArea');
const loader = document.getElementById('loader');
const gamesGrid = document.getElementById('gamesGrid');
const loadMoreBtn = document.getElementById('loadMoreBtn');

const detailModal = document.getElementById('detailModal');
const modalCloseBtn = document.getElementById('modalCloseBtn');
const modalThumb = document.getElementById('modalThumb');
const modalTitleFull = document.getElementById('modalTitleFull');
const modalExtra = document.getElementById('modalExtra');
const modalDealLink = document.getElementById('modalDealLink');

function showLoader() { loader.classList.remove('hidden'); }
function hideLoader() { loader.classList.add('hidden'); }
function showError(msg) { errorArea.textContent = msg; errorArea.classList.remove('hidden'); }
function clearError() { errorArea.textContent = ''; errorArea.classList.add('hidden'); }
function setStatus(msg) { statusArea.textContent = msg; }

async function fetchJSON(url) {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
    return await res.json();
  } catch (err) {
    throw err;
  }
}

async function populateStores() {
  try {
    const stores = await fetchJSON(`${API_BASE}/stores`);
    // añadir opciones principales
    const preferred = ['Steam', 'Epic', 'Humble Store', 'GOG', 'Origin'];
    const map = new Map();
    stores.forEach(s => map.set(s.storeName, s));
    storeSelect.innerHTML = '';
    preferred.forEach(name => {
      if (map.has(name)) {
        const s = map.get(name);
        const opt = document.createElement('option'); opt.value = s.storeID; opt.textContent = s.storeName; storeSelect.appendChild(opt);
        map.delete(name);
      }
    });
    Array.from(map.values()).sort((a,b)=>a.storeName.localeCompare(b.storeName)).forEach(s=>{
      const opt = document.createElement('option'); opt.value = s.storeID; opt.textContent = s.storeName; storeSelect.appendChild(opt);
    });
    // seleccionar store por defecto
    const opt = Array.from(storeSelect.options).find(o=>o.value===currentStoreID); if (opt) opt.selected = true;
  } catch (err) {
    console.error('populateStores', err); showError('No se pudo cargar la lista de tiendas.');
  }
}

function clearGrid() { gamesGrid.innerHTML = ''; }

function toNumber(v) { const n = parseFloat(v); return Number.isFinite(n) ? n : Infinity; }

function renderCurrentItems() {
  clearGrid();
  if (!currentItems || currentItems.length===0) {
    const empty = document.createElement('div'); empty.className='col-span-full text-center text-gray-600'; empty.textContent = isSearching ? 'No se encontraron resultados.' : 'No hay ofertas disponibles.'; gamesGrid.appendChild(empty); return;
  }

  let items = [...currentItems];
  const sort = sortSelect.value;
  if (sort==='sale_asc') items.sort((a,b)=>toNumber(a.salePrice)-toNumber(b.salePrice));
  if (sort==='sale_desc') items.sort((a,b)=>toNumber(b.salePrice)-toNumber(a.salePrice));
  if (sort==='normal_asc') items.sort((a,b)=>toNumber(a.normalPrice)-toNumber(b.normalPrice));
  if (sort==='normal_desc') items.sort((a,b)=>toNumber(b.normalPrice)-toNumber(a.normalPrice));

  items.forEach(it=>{
    const card = createCard(it); gamesGrid.appendChild(card);
  });
}

function createCard(item) {
  const el = document.createElement('article'); el.className='bg-white rounded shadow p-3 flex flex-col';
  const img = document.createElement('img'); img.src = item.thumb || 'https://via.placeholder.com/300x170?text=No+image'; img.alt = item.title; img.className='h-40 object-contain mb-3 bg-gray-100';
  const title = document.createElement('h4'); title.className='font-semibold text-sm mb-1'; title.textContent = item.title;
  const priceRow = document.createElement('div'); priceRow.className='mt-auto flex items-center gap-2';
  const normal = document.createElement('span'); normal.className='text-gray-500 text-sm line-through'; normal.textContent = item.normalPrice ? `$${Number(item.normalPrice).toFixed(2)}` : '';
  const sale = document.createElement('span'); sale.className='text-red-600 font-bold'; sale.textContent = item.salePrice ? `$${Number(item.salePrice).toFixed(2)}` : 'N/A';
  priceRow.appendChild(normal); priceRow.appendChild(sale);

  // Botones: Ver detalle + Ir a la oferta
  const actions = document.createElement('div'); actions.className = 'mt-3 flex gap-2';

  const btn = document.createElement('button');
  btn.className='bg-blue-600 text-white px-3 py-1 rounded text-sm';
  btn.textContent='Ver detalle';
  btn.addEventListener('click', ()=>openModal(item));

  const offerLink = document.createElement('a');
  offerLink.className = 'bg-green-600 text-white px-3 py-1 rounded text-sm text-center';
  offerLink.textContent = 'Ir a la oferta';
  // Determinar enlace a la oferta
  const dealId = item.dealID || (item._raw && item._raw.cheapestDealID) || null;
  if (dealId) {
    offerLink.href = `https://www.cheapshark.com/redirect?dealID=${encodeURIComponent(dealId)}`;
    offerLink.target = '_blank';
    offerLink.rel = 'noopener noreferrer';
  } else {
    // Si no hay enlace, deshabilitamos el botón visualmente
    offerLink.href = '#';
    offerLink.classList.add('opacity-50', 'pointer-events-none');
  }

  actions.appendChild(btn);
  actions.appendChild(offerLink);

  el.appendChild(img); el.appendChild(title); el.appendChild(priceRow); el.appendChild(actions);
  return el;
}

function openModal(item) {
  modalThumb.src = item.thumb || '';
  modalTitleFull.textContent = item.title || 'Detalle';
  modalExtra.textContent = item._raw ? JSON.stringify(item._raw).slice(0,400) : '';
  if (item.dealID) { modalDealLink.href = `https://www.cheapshark.com/redirect?dealID=${encodeURIComponent(item.dealID)}`; modalDealLink.classList.remove('hidden'); }
  else { modalDealLink.href='#'; modalDealLink.classList.add('hidden'); }
  detailModal.classList.remove('hidden'); detailModal.classList.add('flex');
}

function closeModal() { detailModal.classList.add('hidden'); detailModal.classList.remove('flex'); }

async function loadDeals(append=false) {
  if (isSearching) return;
  try {
    showLoader(); clearError(); setStatus('Cargando ofertas...');
    const url = `${API_BASE}/deals?storeID=${encodeURIComponent(currentStoreID)}&pageSize=${pageSize}&pageNumber=${currentPage}`;
    const data = await fetchJSON(url);
    if (append) currentItems = currentItems.concat(data); else currentItems = data;
    if (data.length===pageSize) loadMoreBtn.classList.remove('hidden'); else loadMoreBtn.classList.add('hidden');
    renderCurrentItems(); setStatus('');
  } catch (err) { console.error(err); showError('Error al cargar ofertas.'); setStatus(''); }
  finally { hideLoader(); }
}

async function searchGames(query) {
  try {
    showLoader(); clearError(); setStatus('Buscando...'); isSearching = true; lastQuery = query; currentPage=0;
    const url = `${API_BASE}/games?title=${encodeURIComponent(query)}&limit=20`;
    const results = await fetchJSON(url);
    currentItems = results.map(r=>({ title: r.external||r.title||'Sin título', thumb: r.thumb||'', dealID: r.cheapestDealID||null, normalPrice: r.cheapest || null, salePrice: r.cheapest || null, _raw: r }));
    loadMoreBtn.classList.add('hidden'); renderCurrentItems(); setStatus('');
  } catch (err) { console.error(err); showError('Error en búsqueda.'); setStatus(''); }
  finally { hideLoader(); }
}

// Listeners
document.addEventListener('DOMContentLoaded', async ()=>{
  searchForm.addEventListener('submit', (e)=>{ e.preventDefault(); const q=searchInput.value.trim(); if (q===''){ isSearching=false; currentPage=0; loadDeals(false); } else searchGames(q); });
  searchBtn.addEventListener('click', ()=>{ const q=searchInput.value.trim(); if (q===''){ isSearching=false; currentPage=0; loadDeals(false); } else searchGames(q); });
  storeSelect.addEventListener('change', (e)=>{ currentStoreID = e.target.value; isSearching=false; currentPage=0; loadDeals(false); });
  sortSelect.addEventListener('change', ()=>{ renderCurrentItems(); });
  loadMoreBtn.addEventListener('click', ()=>{ currentPage += 1; loadDeals(true); });
  modalCloseBtn.addEventListener('click', closeModal);
  detailModal.addEventListener('click', (e)=>{ if (e.target===detailModal) closeModal(); });

  await populateStores();
  currentPage = 0; await loadDeals(false);
});