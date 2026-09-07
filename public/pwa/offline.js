const status = document.getElementById("connection");
const updateStatus = () => {
  status.textContent = navigator.onLine
    ? "Pots tornar-ho a provar. Si la botiga encara no respon, espera un moment."
    : "El dispositiu continua sense connexió.";
};
document.getElementById("retry").addEventListener("click", () => {
  // This standalone fallback deliberately has no Next.js runtime or router.
  // eslint-disable-next-line @next/next/no-location-assign-relative-destination
  if (window.location.pathname === "/offline.html") window.location.assign("/");
  else window.location.reload();
});
window.addEventListener("online", updateStatus);
window.addEventListener("offline", updateStatus);
updateStatus();
