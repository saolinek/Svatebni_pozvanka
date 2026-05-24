const countdown = document.querySelector("[data-wedding-date]");

if (countdown) {
  const target = new Date(countdown.dataset.weddingDate).getTime();
  const daysEl = countdown.querySelector("[data-countdown-days]");
  const hoursEl = countdown.querySelector("[data-countdown-hours]");
  const minutesEl = countdown.querySelector("[data-countdown-minutes]");
  const secondsEl = countdown.querySelector("[data-countdown-seconds]");

  const renderCountdown = () => {
    const remaining = Math.max(target - Date.now(), 0);
    const seconds = Math.floor(remaining / 1000);
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const restSeconds = seconds % 60;

    daysEl.textContent = String(days);
    hoursEl.textContent = String(hours).padStart(2, "0");
    minutesEl.textContent = String(minutes).padStart(2, "0");
    secondsEl.textContent = String(restSeconds).padStart(2, "0");
  };

  renderCountdown();
  window.setInterval(renderCountdown, 1000);
}
