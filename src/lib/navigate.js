// Helper kecil untuk memicu pindah menu dari komponen manapun tanpa perlu
// prop-drilling activeMenu/setActiveMenu. Didengarkan oleh App.jsx lewat
// window.addEventListener('persona:navigate', ...).
export function navigateToMenu(menuId) {
  window.dispatchEvent(new CustomEvent('persona:navigate', { detail: { menuId } }))
}
