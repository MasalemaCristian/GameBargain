// Archivo de script mínimo para la versión simplificada del proyecto
document.addEventListener('DOMContentLoaded', () => {
  const status = document.getElementById('status');
  const btn = document.getElementById('btn');
  btn?.addEventListener('click', () => {
    if (status) status.innerText = '¡Botón pulsado! JS funciona correctamente.';
    console.log('Botón pulsado — JS funciona');
  });
});